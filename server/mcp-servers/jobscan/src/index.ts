import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { JobscanClient, ScanReport } from "./jobscan-client.js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env manually (no dotenv dependency)
function loadEnv(): void {
  try {
    const envPath = resolve(import.meta.dirname, "../.env");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env file not found, rely on environment variables
  }
}

loadEnv();

const email = process.env.JOBSCAN_EMAIL;
const password = process.env.JOBSCAN_PASSWORD;

if (!email || !password) {
  console.error(
    "Missing JOBSCAN_EMAIL or JOBSCAN_PASSWORD. Create a .env file from .env.example"
  );
  process.exit(1);
}

const client = new JobscanClient(email, password);
let lastScanReport: ScanReport | null = null;

const server = new McpServer({
  name: "jobscan",
  version: "1.0.0",
});

// Tool: Login
server.tool(
  "jobscan_login",
  "Authenticate with Jobscan via browser. Call this first, or it auto-runs on first scan. Opens a Chrome window for Cloudflare bypass.",
  {},
  async () => {
    try {
      const result = await client.login();
      if (result.success) {
        return {
          content: [{ type: "text", text: "Logged in to Jobscan successfully." }],
        };
      }
      return {
        content: [{ type: "text", text: `Login failed: ${result.error}` }],
        isError: true,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        content: [{ type: "text", text: `Login error: ${msg}` }],
        isError: true,
      };
    }
  }
);

// Tool: Scan resume against JD
server.tool(
  "jobscan_scan",
  "Scan a resume against a job description using Jobscan. Returns match rate, found/missing hard skills, found/missing soft skills. Auto-logs in if needed.",
  {
    resume_text: z
      .string()
      .describe("The full resume text (plain text, no markdown formatting)"),
    jd_text: z.string().describe("The full job description text"),
  },
  async ({ resume_text, jd_text }) => {
    try {
      const report = await client.scan(resume_text, jd_text);
      lastScanReport = report;

      const lines: string[] = [
        `## Jobscan Match Rate: ${report.matchRate}%`,
        "",
        `### Hard Skills`,
        `**Found (${report.hardSkills.found.length}):** ${report.hardSkills.found.join(", ") || "none"}`,
        `**Missing (${report.hardSkills.missing.length}):** ${report.hardSkills.missing.join(", ") || "none"}`,
        "",
        `### Soft Skills`,
        `**Found (${report.softSkills.found.length}):** ${report.softSkills.found.join(", ") || "none"}`,
        `**Missing (${report.softSkills.missing.length}):** ${report.softSkills.missing.join(", ") || "none"}`,
      ];

      if (report.otherFindings.length > 0) {
        lines.push("", "### Other Findings");
        for (const f of report.otherFindings) {
          lines.push(
            `- **${f.category}** (${f.label}): ${f.status}${f.details ? " - " + f.details : ""}`
          );
        }
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        content: [{ type: "text", text: `Scan error: ${msg}` }],
        isError: true,
      };
    }
  }
);

// Tool: Rescan with updated resume (stays on match report page, JD already loaded)
server.tool(
  "jobscan_rescan",
  "Rescan with an updated resume on the current match report page. Only pastes resume text (JD is already loaded from the previous scan). Much faster than a full scan. Must run jobscan_scan first.",
  {
    resume_text: z
      .string()
      .describe("The updated resume text (plain text, no markdown formatting)"),
  },
  async ({ resume_text }) => {
    try {
      if (!client.isOnMatchReport()) {
        return {
          content: [
            {
              type: "text",
              text: "Not on a match report page. Run jobscan_scan first with resume + JD, then use jobscan_rescan for subsequent iterations.",
            },
          ],
          isError: true,
        };
      }

      const report = await client.rescan(resume_text);
      lastScanReport = report;

      const lines: string[] = [
        `## Jobscan Rescan Match Rate: ${report.matchRate}%`,
        "",
        `### Hard Skills`,
        `**Found (${report.hardSkills.found.length}):** ${report.hardSkills.found.join(", ") || "none"}`,
        `**Missing (${report.hardSkills.missing.length}):** ${report.hardSkills.missing.join(", ") || "none"}`,
        "",
        `### Soft Skills`,
        `**Found (${report.softSkills.found.length}):** ${report.softSkills.found.join(", ") || "none"}`,
        `**Missing (${report.softSkills.missing.length}):** ${report.softSkills.missing.join(", ") || "none"}`,
      ];

      if (report.otherFindings.length > 0) {
        lines.push("", "### Other Findings");
        for (const f of report.otherFindings) {
          lines.push(
            `- **${f.category}** (${f.label}): ${f.status}${f.details ? " - " + f.details : ""}`
          );
        }
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        content: [{ type: "text", text: `Rescan error: ${msg}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get keyword gaps from last scan
server.tool(
  "jobscan_get_gaps",
  "Get the missing keywords from the most recent scan. Use after jobscan_scan to get a focused list of what to add.",
  {},
  async () => {
    if (!lastScanReport) {
      return {
        content: [
          {
            type: "text",
            text: "No scan results available. Run jobscan_scan first.",
          },
        ],
        isError: true,
      };
    }

    const r = lastScanReport;
    const lines: string[] = [
      `## Keyword Gaps (Match Rate: ${r.matchRate}%)`,
      "",
      "### Missing Hard Skills (add these to resume)",
    ];

    if (r.hardSkills.missing.length === 0) {
      lines.push("All hard skills covered!");
    } else {
      for (const s of r.hardSkills.missing) {
        lines.push(`- ${s}`);
      }
    }

    lines.push("", "### Missing Soft Skills");
    if (r.softSkills.missing.length === 0) {
      lines.push("All soft skills covered!");
    } else {
      for (const s of r.softSkills.missing) {
        lines.push(`- ${s}`);
      }
    }

    lines.push(
      "",
      "### Recommendations",
      "1. Add missing hard skills to the **Skills section** (primary ATS keyword zone)",
      "2. Weave missing soft skills into bullet points naturally",
      "3. Run jobscan_scan again after updating to verify improvement"
    );

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// Tool: Get full scan details as JSON
server.tool(
  "jobscan_raw_results",
  "Get the raw JSON from the most recent scan. Useful for detailed analysis.",
  {},
  async () => {
    if (!lastScanReport) {
      return {
        content: [
          {
            type: "text",
            text: "No scan results available. Run jobscan_scan first.",
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        { type: "text", text: JSON.stringify(lastScanReport, null, 2) },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Server error:", err);
  process.exit(1);
});
