import { chromium, Browser, BrowserContext, Page } from "playwright";

const APP_BASE = "https://app.jobscan.co";

export interface ScanReport {
  scanId: string;
  matchRate: number;
  hardSkills: { found: string[]; missing: string[] };
  softSkills: { found: string[]; missing: string[] };
  otherFindings: Array<{
    category: string;
    label: string;
    status: string;
    details?: string;
  }>;
  rawResponse?: unknown;
}

export class JobscanClient {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private authenticated = false;
  private email: string;
  private password: string;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  private async ensureBrowser(): Promise<Page> {
    if (this.page && !this.page.isClosed()) {
      return this.page;
    }

    this.browser = await chromium.launch({
      headless: false,
      channel: "chrome",
      args: ["--disable-blink-features=AutomationControlled"],
    });

    this.context = await this.browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 900 },
    });

    this.page = await this.context.newPage();
    return this.page;
  }

  async login(): Promise<{ success: boolean; error?: string }> {
    try {
      const page = await this.ensureBrowser();

      await page.goto(`${APP_BASE}/login`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await page.waitForSelector("#email", { timeout: 60000 });
      await page.locator("#email").fill(this.email);
      await page.locator("#password").fill(this.password);
      await page.locator('button:has-text("Log in")').click();

      // Dashboard is the landing page after login
      await page.waitForURL(/\/dashboard/, { timeout: 60000 });

      this.authenticated = true;
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: msg };
    }
  }

  async ensureAuth(): Promise<void> {
    if (!this.authenticated) {
      const result = await this.login();
      if (!result.success) {
        throw new Error(result.error ?? "Authentication failed");
      }
    }
  }

  async scan(resumeText: string, jdText: string): Promise<ScanReport> {
    await this.ensureAuth();
    const page = this.page!;

    // The scan form is on the dashboard itself
    await page.goto(`${APP_BASE}/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Wait for the scan form to render (resume textarea is already visible on dashboard)
    await page.waitForSelector("#resume-text-input", { timeout: 30000 });
    await page.waitForSelector("#jobDescriptionInput", { timeout: 30000 });

    // Fill resume text and job description
    await page.locator("#resume-text-input").click();
    await page.locator("#resume-text-input").fill(resumeText);
    await page.locator("#jobDescriptionInput").click();
    await page.locator("#jobDescriptionInput").fill(jdText);
    await page.waitForTimeout(1000);

    // Click the Scan button
    const scanBtn = page.locator('[data-test="scan-button"]');
    await scanBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await scanBtn.click({ force: true });

    // Wait for navigation to the match report page
    await page.waitForURL(/match-report/, { timeout: 120000 });

    // Give the results page time to fully render
    await page.waitForTimeout(10000);

    return await this.scrapeResults(page);
  }

  private async scrapeResults(page: Page): Promise<ScanReport> {
    // Wait for the match report page to fully render
    await page.waitForTimeout(5000);

    // Extract all data from the page text
    const pageText = await page.evaluate(() => document.body.innerText);

    // Extract match rate from "Match Rate\n82" pattern
    let matchRate = 0;
    const matchRateMatch = pageText.match(/Match Rate\s*\n?\s*(\d{1,3})/);
    if (matchRateMatch) {
      matchRate = parseInt(matchRateMatch[1], 10);
    }

    // Parse skills from the "Skills Comparison" table format:
    // Skill  Copy All\nResume\nJob Description\nMachine learning\n\n1\nKubernetes\n\n1\nPytorch\n1\n1
    const hardSkills = this.parseSkillsSection(pageText, "Hard skills", "Soft skills");
    const softSkills = this.parseSkillsSection(pageText, "Soft skills", "Recruiter tips");

    // Extract searchability issues
    const otherFindings: ScanReport["otherFindings"] = [];

    // Check for searchability issues
    const searchMatch = pageText.match(/Searchability\s*\n?\s*(\d+)\s*issues?\s*to\s*fix/i);
    if (searchMatch) {
      otherFindings.push({
        category: "searchability",
        label: "Issues to fix",
        status: searchMatch[1],
      });
    }

    // Check for recruiter tips
    const recruiterMatch = pageText.match(/Recruiter Tips\s*\n?\s*(\d+)\s*issues?\s*to\s*fix/i);
    if (recruiterMatch) {
      otherFindings.push({
        category: "recruiter_tips",
        label: "Issues to fix",
        status: recruiterMatch[1],
      });
    }

    // Extract the match report ID from URL
    const urlMatch = page.url().match(/match-report\/(\d+)/);
    const scanId = urlMatch ? urlMatch[1] : "scraped-" + Date.now();

    return {
      scanId,
      matchRate,
      hardSkills,
      softSkills,
      otherFindings,
    };
  }

  private parseSkillsSection(
    pageText: string,
    sectionStart: string,
    sectionEnd: string
  ): { found: string[]; missing: string[] } {
    const found: string[] = [];
    const missing: string[] = [];

    // Extract the section between sectionStart and sectionEnd
    const startIdx = pageText.indexOf(sectionStart);
    const endIdx = pageText.indexOf(sectionEnd, startIdx + sectionStart.length);
    if (startIdx === -1) return { found, missing };

    const section = pageText.slice(
      startIdx,
      endIdx !== -1 ? endIdx : startIdx + 3000
    );

    // Find the skills comparison table
    // Format: "Skill  Copy All\nResume\nJob Description\nSkillName\nResumeCount\nJDCount\n..."
    const tableStart = section.indexOf("Skills Comparison");
    if (tableStart === -1) return { found, missing };

    const tableSection = section.slice(tableStart);

    // Look for "No matching" message
    if (tableSection.includes("No matching")) {
      return { found, missing };
    }

    // Parse skill rows: each skill has format "SkillName\nResumeCount\nJDCount"
    // After "Job Description\n", skills start
    const afterHeader = tableSection.split(/Job Description\s*\n/)[1];
    if (!afterHeader) return { found, missing };

    // Stop at "Don't see skills" or "Add Skill"
    const skillsText = afterHeader.split(/Don't see|Add Skill|Required/)[0];

    // Parse lines - skills are on their own lines, counts follow
    const lines = skillsText.split("\n").map((l) => l.trim()).filter(Boolean);

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      // Skip "Copy All" and pure numbers
      if (line === "Copy All" || line === "Highlighted Skills" || line === "Skill") {
        i++;
        continue;
      }

      // Check if this is a skill name (not a pure number or UI text)
      const skipWords = ["Show more", "Show less", "Copy All", "Required", "Don't see"];
      if (!/^\d+$/.test(line) && !skipWords.some((w) => line.includes(w))) {
        const skillName = line;
        // Look ahead for resume count and JD count
        let resumeCount = 0;
        let jdCount = 0;

        // Next lines should be numbers (resume count, then JD count)
        if (i + 1 < lines.length && /^\d+$/.test(lines[i + 1])) {
          if (i + 2 < lines.length && /^\d+$/.test(lines[i + 2])) {
            // Both counts present: skill is found in both
            resumeCount = parseInt(lines[i + 1], 10);
            jdCount = parseInt(lines[i + 2], 10);
            i += 3;
          } else {
            // Only one number - could be JD-only (missing from resume)
            jdCount = parseInt(lines[i + 1], 10);
            i += 2;
          }
        } else {
          i++;
        }

        if (resumeCount > 0) {
          found.push(skillName);
        } else {
          missing.push(skillName);
        }
      } else {
        i++;
      }
    }

    return { found, missing };
  }

  private async dismissShepherdTour(page: Page): Promise<void> {
    const overlay = page.locator(".shepherd-modal-overlay-container");
    if ((await overlay.count()) > 0) {
      await page.evaluate(() => {
        document
          .querySelectorAll(
            ".shepherd-modal-overlay-container, .shepherd-element"
          )
          .forEach((el) => el.remove());
      });
      await page.waitForTimeout(500);
    }
  }

  async rescan(resumeText: string): Promise<ScanReport> {
    await this.ensureAuth();
    const page = this.page!;

    // Must already be on a match-report page
    if (!page.url().includes("match-report")) {
      throw new Error(
        "Not on a match report page. Run a full scan first with jobscan_scan."
      );
    }

    // Dismiss any Shepherd tour overlay
    await this.dismissShepherdTour(page);

    // Scroll to top where "Upload & rescan" button is
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    // Click "Upload & rescan" - use the first visible one, force through any overlays
    const rescanBtns = page.locator("#upload-and-scan");
    const count = await rescanBtns.count();
    let clicked = false;
    for (let i = 0; i < count; i++) {
      const vis = await rescanBtns.nth(i).isVisible().catch(() => false);
      if (vis) {
        await rescanBtns.nth(i).click({ force: true });
        clicked = true;
        break;
      }
    }
    if (!clicked && count > 0) {
      // Force click the first one even if not visible
      await rescanBtns.first().click({ force: true });
    }

    await page.waitForTimeout(3000);

    // Dismiss shepherd again in case it reappeared
    await this.dismissShepherdTour(page);

    // Fill only the resume text (JD is already loaded)
    await page.waitForSelector("#resume-text-input", { timeout: 30000 });
    await page.locator("#resume-text-input").click();
    await page.locator("#resume-text-input").fill(resumeText);
    await page.waitForTimeout(1000);

    // Record URL before scan to detect change
    const currentUrl = page.url();

    // Click Scan
    const scanBtn = page.locator('[data-test="scan-button"]');
    if ((await scanBtn.count()) > 0) {
      await scanBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await scanBtn.click({ force: true });
    } else {
      // Fallback: find visible Scan button near the form
      const visibleScan = page.locator('button:has-text("Scan"):visible');
      await visibleScan.last().click({ force: true });
    }

    // Wait for the page to reload with new results
    // Either URL changes to a new match-report ID, or page content updates
    const startTime = Date.now();
    while (Date.now() - startTime < 120000) {
      const url = page.url();
      if (url.includes("match-report") && url !== currentUrl) {
        break;
      }
      await page.waitForTimeout(1000);
    }

    await page.waitForTimeout(10000);
    return await this.scrapeResults(page);
  }

  isOnMatchReport(): boolean {
    return this.page?.url().includes("match-report") ?? false;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.authenticated = false;
    }
  }
}
