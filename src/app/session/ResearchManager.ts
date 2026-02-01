/**
 * ResearchManager
 * Performs deep web research using Firecrawl and LLM synthesis
 *
 * Responsibilities:
 * - Execute research queries (people, companies, topics)
 * - Scrape and extract content from URLs
 * - Synthesize research results with LLM
 * - Track research progress and broadcast updates
 * - Cache results for quick access
 */

import FirecrawlApp from "@mendable/firecrawl-js";
import type {
  ResearchRequest,
  ResearchResult,
  ResearchStatus,
  Meeting,
} from "./types";
import {
  createProviderFromEnv,
  extractText,
  type AgentProvider,
  type UnifiedMessage,
} from "../../services/llm";

/**
 * Interface for the parts of UserSession that ResearchManager needs
 */
export interface ResearchManagerDeps {
  userId: string;
  logger: {
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
  meeting: {
    isInMeeting: () => boolean;
    getActiveMeetingId: () => string | undefined;
    linkResearch: (researchId: string) => Promise<void>;
  };
  broadcast: {
    sendResearchProgress: (
      researchId: string,
      query: string,
      progress: number,
      currentStep: string,
    ) => void;
    broadcast: (data: Record<string, unknown>) => void;
  };
  display: {
    showResearchProgress: (query: string, progress: number) => void;
    showResearchComplete: (summary: string) => void;
    showError: (message: string) => void;
    showMessage: (text: string, options?: { duration?: number }) => void;
    showDashboardResearching: (query?: string) => void;
    showDashboardIdle: () => void;
  };
}

/** Research synthesis prompt template */
const RESEARCH_SYNTHESIS_PROMPT = `You are a research assistant synthesizing information from web sources.

Research Query: {{QUERY}}
Research Type: {{TYPE}}

Sources Found:
{{SOURCES}}

Synthesize the information into a comprehensive research report. Focus on:
- Key facts and findings relevant to the query
- Important background information
- Recent developments or news
- Actionable insights

Respond with ONLY valid JSON (no markdown):
{
  "summary": "2-3 sentence executive summary",
  "keyFacts": ["array of key facts discovered"],
  "content": "full research report in markdown format with sections",
  "confidence": 0.0-1.0
}`;

/** Search query generation prompt */
const SEARCH_QUERY_PROMPT = `Generate optimal search queries for researching the following:

Query: {{QUERY}}
Type: {{TYPE}}

Context: The user is in a professional meeting and needs quick, relevant information.

Generate 2-3 focused search queries that will find the most relevant information.
Respond with ONLY a JSON array of strings:
["query 1", "query 2", "query 3"]`;

/**
 * ResearchManager - performs deep web research using Firecrawl
 */
export class ResearchManager {
  /** Reference to parent session dependencies */
  private readonly deps: ResearchManagerDeps;

  /** Firecrawl client */
  private firecrawl: FirecrawlApp | null = null;

  /** LLM provider for synthesis */
  private provider: AgentProvider | null = null;

  /** Active research requests */
  private activeResearch: Map<string, ResearchRequest> = new Map();

  /** Research results cache */
  private resultsCache: Map<string, ResearchResult> = new Map();

  /** Whether Firecrawl is available */
  private firecrawlAvailable: boolean = false;

  /** Whether the manager has been disposed */
  private disposed: boolean = false;

  constructor(deps: ResearchManagerDeps) {
    this.deps = deps;

    // Initialize Firecrawl if API key is available
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    if (firecrawlKey) {
      try {
        this.firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });
        this.firecrawlAvailable = true;
        this.deps.logger.info("[ResearchManager] Firecrawl initialized");
      } catch (error) {
        this.deps.logger.warn(
          "[ResearchManager] Failed to initialize Firecrawl:",
          error,
        );
      }
    } else {
      this.deps.logger.warn(
        "[ResearchManager] No FIRECRAWL_API_KEY - research disabled",
      );
    }

    // Initialize LLM provider
    try {
      this.provider = createProviderFromEnv();
      this.deps.logger.info("[ResearchManager] LLM provider initialized");
    } catch (error) {
      this.deps.logger.warn(
        "[ResearchManager] No LLM provider - synthesis disabled",
      );
    }

    this.deps.logger.info("[ResearchManager] Initialized");
  }

  // ===========================================================================
  // Research Operations
  // ===========================================================================

  /**
   * Start a research query
   */
  async startResearch(
    query: string,
    type: "person" | "company" | "topic" | "general" = "general",
  ): Promise<ResearchResult | null> {
    if (!this.firecrawlAvailable) {
      this.deps.logger.error("[ResearchManager] Firecrawl not available");
      this.deps.display.showError("Research unavailable");
      return null;
    }

    const researchId = `research_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Create research request
    const request: ResearchRequest = {
      _id: researchId,
      userId: this.deps.userId,
      meetingId: this.deps.meeting.getActiveMeetingId(),
      query,
      type,
      status: "pending",
      createdAt: new Date(),
    };

    this.activeResearch.set(researchId, request);

    this.deps.logger.info(
      `[ResearchManager] Starting research: "${query}" (${type})`,
    );
    this.deps.display.showMessage(`🔍 Researching: ${query}`, {
      duration: 3000,
    });

    try {
      // Update status
      request.status = "in_progress";
      this.broadcastProgress(
        researchId,
        query,
        10,
        "Generating search queries",
      );

      // Generate optimized search queries
      const searchQueries = await this.generateSearchQueries(query, type);
      this.broadcastProgress(researchId, query, 20, "Searching the web");

      // Search and scrape
      const sources = await this.searchAndScrape(
        searchQueries,
        researchId,
        query,
      );
      this.broadcastProgress(researchId, query, 70, "Synthesizing results");

      if (sources.length === 0) {
        this.deps.logger.warn("[ResearchManager] No sources found");
        this.deps.display.showError("No results found");
        request.status = "failed";
        return null;
      }

      // Synthesize with LLM
      const result = await this.synthesizeResults(
        query,
        type,
        sources,
        researchId,
      );

      if (!result) {
        request.status = "failed";
        return null;
      }

      // Complete
      request.status = "completed";
      this.activeResearch.delete(researchId);
      this.resultsCache.set(researchId, result);

      // Link to meeting if active
      if (this.deps.meeting.isInMeeting()) {
        await this.deps.meeting.linkResearch(researchId);
      }

      // Broadcast completion
      this.broadcastProgress(researchId, query, 100, "Complete");
      this.deps.broadcast.broadcast({
        type: "research_complete",
        researchId,
        query,
        summary: result.summary,
        keyFacts: result.keyFacts,
      });

      this.deps.display.showResearchComplete(result.summary);
      this.deps.logger.info(
        `[ResearchManager] Research complete: "${query}" (${result.sources.length} sources)`,
      );

      return result;
    } catch (error) {
      this.deps.logger.error("[ResearchManager] Research failed:", error);
      request.status = "failed";
      this.deps.display.showError("Research failed");
      return null;
    }
  }

  /**
   * Scrape a specific URL
   */
  async scrapeUrl(url: string): Promise<{
    title: string;
    content: string;
    url: string;
  } | null> {
    if (!this.firecrawl) {
      this.deps.logger.error("[ResearchManager] Firecrawl not available");
      return null;
    }

    try {
      this.deps.logger.info(`[ResearchManager] Scraping URL: ${url}`);

      const result = await this.firecrawl.scrapeUrl(url, {
        formats: ["markdown"],
      });

      if (!result.success) {
        this.deps.logger.warn(`[ResearchManager] Failed to scrape: ${url}`);
        return null;
      }

      return {
        title: result.metadata?.title || url,
        content: result.markdown || "",
        url,
      };
    } catch (error) {
      this.deps.logger.error(
        `[ResearchManager] Scrape error for ${url}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Quick research - returns just key facts without full synthesis
   */
  async quickResearch(query: string): Promise<string[]> {
    if (!this.firecrawlAvailable) {
      return [];
    }

    try {
      const searchQueries = [query];
      const sources = await this.searchAndScrape(searchQueries, "quick", query);

      if (sources.length === 0) {
        return [];
      }

      // Extract key facts with LLM
      if (!this.provider) {
        // Return first few lines from sources
        return sources
          .slice(0, 3)
          .map((s) => s.content.split("\n")[0])
          .filter((s) => s.length > 10);
      }

      const prompt = `Extract 3-5 key facts from these sources about "${query}":

${sources.map((s) => `Source: ${s.title}\n${s.content.substring(0, 500)}`).join("\n\n")}

Respond with ONLY a JSON array of strings:
["fact 1", "fact 2", "fact 3"]`;

      const response = await this.provider.chat(
        [{ role: "user", content: prompt }],
        { tier: "fast", maxTokens: 512, temperature: 0.3 },
      );

      const text = extractText(response);
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }

      return [];
    } catch (error) {
      this.deps.logger.error("[ResearchManager] Quick research failed:", error);
      return [];
    }
  }

  // ===========================================================================
  // Research Status
  // ===========================================================================

  /**
   * Get active research requests
   */
  getActiveResearch(): ResearchRequest[] {
    return Array.from(this.activeResearch.values());
  }

  /**
   * Check if research is in progress
   */
  isResearching(): boolean {
    return this.activeResearch.size > 0;
  }

  /**
   * Cancel active research
   */
  cancelResearch(researchId: string): void {
    const request = this.activeResearch.get(researchId);
    if (request) {
      request.status = "failed";
      this.activeResearch.delete(researchId);
      this.deps.logger.info(
        `[ResearchManager] Cancelled research: ${researchId}`,
      );
    }
  }

  /**
   * Get cached research result
   */
  getResult(researchId: string): ResearchResult | undefined {
    return this.resultsCache.get(researchId);
  }

  /**
   * Get all cached results
   */
  getAllResults(): ResearchResult[] {
    return Array.from(this.resultsCache.values());
  }

  /**
   * Check if Firecrawl is available
   */
  isAvailable(): boolean {
    return this.firecrawlAvailable;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Generate optimized search queries
   */
  private async generateSearchQueries(
    query: string,
    type: string,
  ): Promise<string[]> {
    // If no LLM, use the query directly with type-specific prefixes
    if (!this.provider) {
      const prefixes: Record<string, string[]> = {
        person: [`${query} LinkedIn`, `${query} biography`],
        company: [`${query} company`, `${query} about`],
        topic: [`${query} explained`, `${query} overview`],
        general: [query],
      };
      return prefixes[type] || [query];
    }

    try {
      const prompt = SEARCH_QUERY_PROMPT.replace("{{QUERY}}", query).replace(
        "{{TYPE}}",
        type,
      );

      const response = await this.provider.chat(
        [{ role: "user", content: prompt }],
        { tier: "fast", maxTokens: 256, temperature: 0.5 },
      );

      const text = extractText(response);
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const queries = JSON.parse(match[0]);
        return Array.isArray(queries) ? queries.slice(0, 3) : [query];
      }

      return [query];
    } catch (error) {
      this.deps.logger.warn(
        "[ResearchManager] Failed to generate search queries:",
        error,
      );
      return [query];
    }
  }

  /**
   * Search and scrape multiple queries
   */
  private async searchAndScrape(
    queries: string[],
    researchId: string,
    originalQuery: string,
  ): Promise<Array<{ title: string; content: string; url: string }>> {
    if (!this.firecrawl) {
      return [];
    }

    const sources: Array<{ title: string; content: string; url: string }> = [];
    const seenUrls = new Set<string>();
    let progress = 20;
    const progressIncrement = 50 / queries.length;

    for (const query of queries) {
      try {
        this.broadcastProgress(
          researchId,
          originalQuery,
          Math.round(progress),
          `Searching: ${query}`,
        );

        // Use Firecrawl search
        const searchResult = await this.firecrawl.search(query, {
          limit: 3,
          scrapeOptions: {
            formats: ["markdown"],
          },
        });

        if (searchResult.success && searchResult.data) {
          for (const item of searchResult.data) {
            if (item.url && !seenUrls.has(item.url)) {
              seenUrls.add(item.url);
              sources.push({
                title: item.metadata?.title || item.url,
                content: item.markdown || item.metadata?.description || "",
                url: item.url,
              });
            }
          }
        }

        progress += progressIncrement;
      } catch (error) {
        this.deps.logger.warn(
          `[ResearchManager] Search failed for "${query}":`,
          error,
        );
      }
    }

    return sources;
  }

  /**
   * Synthesize research results with LLM
   */
  private async synthesizeResults(
    query: string,
    type: string,
    sources: Array<{ title: string; content: string; url: string }>,
    researchId: string,
  ): Promise<ResearchResult | null> {
    this.broadcastProgress(researchId, query, 80, "Synthesizing findings");

    // Format sources for LLM
    const sourcesText = sources
      .map(
        (s, i) =>
          `Source ${i + 1}: ${s.title}\nURL: ${s.url}\nContent:\n${s.content.substring(0, 1500)}\n`,
      )
      .join("\n---\n");

    if (!this.provider) {
      // Return basic result without synthesis
      return {
        _id: researchId,
        userId: this.deps.userId,
        meetingId: this.deps.meeting.getActiveMeetingId(),
        query,
        type: type as ResearchResult["type"],
        summary: `Found ${sources.length} sources about "${query}"`,
        keyFacts: sources.slice(0, 5).map((s) => s.title),
        sources: sources.map((s) => ({
          url: s.url,
          title: s.title,
          snippet: s.content.substring(0, 200),
        })),
        content: sources
          .map((s) => `## ${s.title}\n\n${s.content}`)
          .join("\n\n"),
        completedAt: new Date(),
        createdAt: new Date(),
      };
    }

    try {
      const prompt = RESEARCH_SYNTHESIS_PROMPT.replace("{{QUERY}}", query)
        .replace("{{TYPE}}", type)
        .replace("{{SOURCES}}", sourcesText);

      const response = await this.provider.chat(
        [{ role: "user", content: prompt }],
        { tier: "smart", maxTokens: 2048, temperature: 0.5 },
      );

      const text = extractText(response);
      const parsed = this.parseSynthesisResponse(text);

      if (!parsed) {
        return null;
      }

      this.broadcastProgress(researchId, query, 95, "Finalizing report");

      return {
        _id: researchId,
        userId: this.deps.userId,
        meetingId: this.deps.meeting.getActiveMeetingId(),
        query,
        type: type as ResearchResult["type"],
        summary: parsed.summary,
        keyFacts: parsed.keyFacts,
        sources: sources.map((s) => ({
          url: s.url,
          title: s.title,
          snippet: s.content.substring(0, 200),
        })),
        content: parsed.content,
        completedAt: new Date(),
        createdAt: new Date(),
      };
    } catch (error) {
      this.deps.logger.error("[ResearchManager] Synthesis failed:", error);
      return null;
    }
  }

  /**
   * Parse synthesis response
   */
  private parseSynthesisResponse(text: string): {
    summary: string;
    keyFacts: string[];
    content: string;
  } | null {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        return null;
      }

      const parsed = JSON.parse(match[0]);
      return {
        summary: parsed.summary || "",
        keyFacts: Array.isArray(parsed.keyFacts) ? parsed.keyFacts : [],
        content: parsed.content || "",
      };
    } catch (error) {
      this.deps.logger.error(
        "[ResearchManager] Failed to parse synthesis response:",
        error,
      );
      return null;
    }
  }

  /**
   * Broadcast research progress
   */
  private broadcastProgress(
    researchId: string,
    query: string,
    progress: number,
    currentStep: string,
  ): void {
    this.deps.broadcast.sendResearchProgress(
      researchId,
      query,
      progress,
      currentStep,
    );
    this.deps.display.showResearchProgress(query, progress);
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Dispose of the manager and clean up resources
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // Cancel any active research
    for (const [id] of this.activeResearch) {
      this.cancelResearch(id);
    }

    this.activeResearch.clear();
    this.resultsCache.clear();

    this.deps.logger.info("[ResearchManager] Disposed");
  }
}
