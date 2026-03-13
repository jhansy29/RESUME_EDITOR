import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_SERVER_PATH = path.resolve(__dirname, '../mcp-servers/jobscan/dist/index.js');

const MAX_CONCURRENT_SESSIONS = 3;

/**
 * MCP-based Jobscan client.
 * Spawns the existing MCP server as a child process and calls its tools via MCP protocol.
 */
class JobscanMCPClient {
  constructor(email, password) {
    this.client = null;
    this.transport = null;
    this.connected = false;
    this._authenticated = false;
    this._onMatchReport = false;
    this._idleTimer = null;
    this._email = email;
    this._password = password;
    this.IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
  }

  _resetIdleTimer() {
    clearTimeout(this._idleTimer);
    this._idleTimer = setTimeout(() => {
      console.log('[Jobscan MCP] Idle timeout, closing');
      this.close();
    }, this.IDLE_TIMEOUT);
  }

  async ensureConnected() {
    if (this.connected && this.client) {
      this._resetIdleTimer();
      return;
    }

    console.log('[Jobscan MCP] Spawning MCP server:', MCP_SERVER_PATH);

    this.transport = new StdioClientTransport({
      command: 'node',
      args: [MCP_SERVER_PATH],
      env: {
        ...process.env,
        JOBSCAN_EMAIL: this._email,
        JOBSCAN_PASSWORD: this._password,
      },
    });

    this.client = new Client({ name: 'resume-editor-server', version: '1.0.0' });
    await this.client.connect(this.transport);
    this.connected = true;
    this._authenticated = false;
    this._onMatchReport = false;
    this._resetIdleTimer();
    console.log('[Jobscan MCP] Connected');
  }

  async _callTool(name, args = {}) {
    await this.ensureConnected();
    this._resetIdleTimer();

    const result = await this.client.callTool({ name, arguments: args });

    // Extract text content from MCP response
    const textContent = result.content?.find(c => c.type === 'text');
    const text = textContent?.text || '';
    const isError = result.isError || false;

    return { text, isError };
  }

  async login() {
    const { text, isError } = await this._callTool('jobscan_login');
    if (!isError) {
      this._authenticated = true;
    }
    return { success: !isError, message: text, error: isError ? text : undefined };
  }

  async scan(resumeText, jdText) {
    const { text, isError } = await this._callTool('jobscan_scan', {
      resume_text: resumeText,
      jd_text: jdText,
    });

    if (isError) throw new Error(text);

    this._authenticated = true;
    this._onMatchReport = true;

    return this._parseReport(text);
  }

  async rescan(resumeText) {
    const { text, isError } = await this._callTool('jobscan_rescan', {
      resume_text: resumeText,
    });

    if (isError) throw new Error(text);

    this._onMatchReport = true;
    return this._parseReport(text);
  }

  async getGaps() {
    const { text, isError } = await this._callTool('jobscan_get_gaps');
    if (isError) throw new Error(text);
    return text;
  }

  async getRawResults() {
    const { text, isError } = await this._callTool('jobscan_raw_results');
    if (isError) throw new Error(text);
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  /**
   * Parse the MCP server's markdown response into a structured ScanReport.
   */
  _parseReport(text) {
    let matchRate = 0;
    const matchRateMatch = text.match(/Match Rate:\s*(\d+)%/);
    if (matchRateMatch) matchRate = parseInt(matchRateMatch[1], 10);

    const hardSkills = this._parseSkillBlock(text, 'Hard Skills');
    const softSkills = this._parseSkillBlock(text, 'Soft Skills');

    const otherFindings = [];
    const findingsSection = text.match(/### Other Findings\n([\s\S]*?)(?:\n###|$)/);
    if (findingsSection) {
      const lines = findingsSection[1].split('\n').filter(l => l.startsWith('- '));
      for (const line of lines) {
        const m = line.match(/\*\*(.+?)\*\*\s*\((.+?)\):\s*(.+)/);
        if (m) {
          otherFindings.push({ category: m[1], label: m[2], status: m[3] });
        }
      }
    }

    return {
      scanId: 'mcp-' + Date.now(),
      matchRate,
      hardSkills,
      softSkills,
      otherFindings,
    };
  }

  _parseSkillBlock(text, sectionName) {
    const found = [];
    const missing = [];

    // Match: **Found (N):** skill1, skill2
    const foundMatch = text.match(new RegExp(`### ${sectionName}[\\s\\S]*?\\*\\*Found \\(\\d+\\):\\*\\*\\s*(.+)`));
    if (foundMatch && foundMatch[1] && foundMatch[1] !== 'none') {
      found.push(...foundMatch[1].split(',').map(s => s.trim()).filter(Boolean));
    }

    const missingMatch = text.match(new RegExp(`### ${sectionName}[\\s\\S]*?\\*\\*Missing \\(\\d+\\):\\*\\*\\s*(.+)`));
    if (missingMatch && missingMatch[1] && missingMatch[1] !== 'none') {
      missing.push(...missingMatch[1].split(',').map(s => s.trim()).filter(Boolean));
    }

    return { found, missing };
  }

  isOnMatchReport() {
    return this._onMatchReport;
  }

  isActive() {
    return this.connected && this._authenticated;
  }

  async close() {
    clearTimeout(this._idleTimer);
    if (this.client) {
      try { await this.client.close(); } catch { /* ignore */ }
      this.client = null;
    }
    if (this.transport) {
      try { await this.transport.close(); } catch { /* ignore */ }
      this.transport = null;
    }
    this.connected = false;
    this._authenticated = false;
    this._onMatchReport = false;
    console.log('[Jobscan MCP] Closed');
  }
}

// Per-user client map
const _clients = new Map();

export async function getJobscanClient(userId) {
  if (_clients.has(userId)) {
    return _clients.get(userId);
  }

  if (_clients.size >= MAX_CONCURRENT_SESSIONS) {
    throw new Error(`Maximum ${MAX_CONCURRENT_SESSIONS} concurrent Jobscan sessions allowed. Try again later.`);
  }

  // Look up user's Jobscan credentials
  const user = await User.findById(userId);

  // Fall back to env vars if user has no stored credentials
  const email = user?.jobscanCredentials?.email || process.env.JOBSCAN_EMAIL;
  const password = user?.jobscanCredentials?.password || process.env.JOBSCAN_PASSWORD;

  if (!email || !password) {
    throw new Error('Jobscan credentials not configured. Set them in your profile settings or server .env.');
  }

  const client = new JobscanMCPClient(email, password);

  // Auto-remove from map when client closes
  const originalClose = client.close.bind(client);
  client.close = async () => {
    _clients.delete(userId);
    await originalClose();
  };

  _clients.set(userId, client);
  return client;
}
