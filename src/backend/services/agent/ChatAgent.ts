/**
 * SEGA ChatAgent - Smart Executive Glasses Assistant
 *
 * An AI-powered executive assistant that:
 * - Listens to meetings and conversations
 * - Takes contextual notes based on user profile
 * - Performs deep research using Firecrawl
 * - Sends summaries and reports via Resend
 *
 * Customize the SYSTEM_PROMPT and user profile for your use case!
 */

import Firecrawl from "@mendable/firecrawl-js";
import { Resend } from "resend";
import {
  createProviderFromEnv,
  extractText,
  extractToolCalls,
  hasToolCalls,
  type AgentProvider,
  type UnifiedMessage,
  type UnifiedTool,
} from "./llm";
import { broadcastToUser } from "../../api/sse";

// =============================================================================
// Configuration
// =============================================================================

// Initialize Firecrawl client
const firecrawl = process.env.FIRECRAWL_API_KEY
  ? new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY })
  : null;

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "sega@example.com";

// =============================================================================
// System Prompt - The heart of SEGA's personality
// =============================================================================

const SYSTEM_PROMPT = `You are SEGA (Smart Executive Glasses Assistant), an AI-powered personal assistant for smart glasses.

## Your Role
You adapt to help ANY professional by:
- Listening to meetings, conversations, and pitches
- Taking smart, contextual notes tailored to their needs
- Performing deep research on people, companies, topics, and more
- Sending email summaries, reports, and follow-ups

## User Profile
Each user has a profile that tells you:
- Who they are (name, role, industry)
- What matters to them (interests, priorities)
- What to listen for (varies by profession)
- How to help them (research style, note preferences)

**Adapt your behavior to the user's role.** For example:
- An investor might want founder backgrounds and market analysis
- A sales rep might want prospect research and meeting prep
- A journalist might want fact-checking and source verification
- A doctor might want patient context and medical research
- A lawyer might want case research and precedent lookup
- An executive might want competitive intel and briefings

## Response Format
Always respond with a JSON object:
{
  "glassesDisplay": "Short text for glasses (max 80 chars)",
  "webviewContent": "Full detailed response with **markdown** support",
  "reasoning": "Your internal reasoning (optional)"
}

## Guidelines
- Be proactive but not intrusive
- Keep glasses display text VERY short (max 80 chars)
- Use markdown for webview content (headers, lists, bold)
- When researching, cite your sources
- When taking notes, organize by topic/person
- For emails, use clear subject lines and professional formatting

## Available Tools
- search_web: Search the web for information
- scrape_url: Get detailed content from a specific URL
- save_note: Save a note for later reference
- get_notes: Retrieve saved notes
- send_email: Send an email report
- get_user_profile: Get the user's profile and preferences
`;

// =============================================================================
// Tool Definitions
// =============================================================================

const TOOLS: UnifiedTool[] = [
  {
    name: "search_web",
    description:
      "Search the web for information about people, companies, topics, or news. Use this for research.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (be specific for better results)",
        },
        limit: {
          type: "number",
          description: "Max number of results (default 5, max 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "scrape_url",
    description:
      "Get detailed content from a specific URL. Use this to deep-dive into a webpage, LinkedIn profile, company website, etc.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to scrape",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "save_note",
    description:
      "Save a note about the current conversation, meeting, or research. Notes are organized by topic.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "Topic or category (e.g., 'Meeting with John', 'Acme Corp Research')",
        },
        content: {
          type: "string",
          description: "The note content (markdown supported)",
        },
        tags: {
          type: "string",
          description: "Comma-separated tags for organization",
        },
      },
      required: ["topic", "content"],
    },
  },
  {
    name: "get_notes",
    description: "Retrieve saved notes, optionally filtered by topic or tags.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Filter by topic (optional)",
        },
        tags: {
          type: "string",
          description: "Filter by tags, comma-separated (optional)",
        },
        limit: {
          type: "number",
          description: "Max notes to return (default 10)",
        },
      },
    },
  },
  {
    name: "send_email",
    description:
      "Send an email report or summary. Use for meeting notes, research reports, or daily digests.",
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Recipient email address",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        body: {
          type: "string",
          description:
            "Email body (markdown supported, will be converted to HTML)",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "get_user_profile",
    description:
      "Get the user's profile and preferences. Use this to understand context about who the user is and how to help them.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_current_time",
    description: "Get the current date and time",
    parameters: {
      type: "object",
      properties: {},
    },
  },
];

// =============================================================================
// Types
// =============================================================================

export interface ChatResponse {
  glassesDisplay: string;
  webviewContent: string;
  reasoning?: string;
}

export interface ToolExecutionResult {
  success: boolean;
  result: string;
  error?: string;
}

export interface UserProfile {
  name: string;
  role: string;
  company?: string;
  industry?: string;
  email: string;
  interests: string[];
  listenFor: string[];
  researchFocus: string[];
  noteStyle: string;
  customInstructions?: string;
}

export interface Note {
  id: string;
  topic: string;
  content: string;
  tags: string[];
  createdAt: Date;
  userId: string;
}

// =============================================================================
// Default User Profile (customize per user)
// =============================================================================

const DEFAULT_PROFILE: UserProfile = {
  name: "User",
  role: "Professional",
  company: "",
  industry: "",
  email: "",
  interests: [],
  listenFor: [
    "Key decisions and action items",
    "Names and contact info",
    "Important dates and deadlines",
    "Questions to follow up on",
  ],
  researchFocus: [
    "People and their backgrounds",
    "Companies and organizations",
    "Recent news and updates",
    "Relevant context",
  ],
  noteStyle: "Clear, organized notes with highlights",
};

// =============================================================================
// ChatAgent Class
// =============================================================================

export class ChatAgent {
  private provider: AgentProvider;
  private userId: string;
  private conversationHistory: UnifiedMessage[] = [];
  private notes: Note[] = [];
  private userProfile: UserProfile;

  constructor(userId: string, profile?: Partial<UserProfile>) {
    this.userId = userId;
    this.provider = createProviderFromEnv();
    this.userProfile = { ...DEFAULT_PROFILE, ...profile };

    console.log(
      `[SEGA] Created agent for ${userId} using ${this.provider.name}`,
    );
  }

  /**
   * Update the user profile
   */
  setProfile(profile: Partial<UserProfile>): void {
    this.userProfile = { ...this.userProfile, ...profile };
    console.log(`[SEGA] Updated profile for ${this.userId}`);
  }

  /**
   * Get the current user profile
   */
  getProfile(): UserProfile {
    return { ...this.userProfile };
  }

  /**
   * Process a user query and return a response
   */
  async processQuery(query: string): Promise<ChatResponse> {
    console.log(`[SEGA] Processing: "${query.substring(0, 50)}..."`);

    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: query,
    });

    // Broadcast progress
    broadcastToUser(this.userId, {
      type: "agent_progress",
      stage: "thinking",
      message: "Processing your request...",
    });

    try {
      const response = await this.runAgentLoop();

      // Add assistant response to history
      this.conversationHistory.push({
        role: "assistant",
        content: response.webviewContent,
      });

      // Broadcast completion
      broadcastToUser(this.userId, {
        type: "agent_complete",
        response,
      });

      return response;
    } catch (error) {
      console.error("[SEGA] Error:", error);

      const errorResponse: ChatResponse = {
        glassesDisplay: "Error occurred",
        webviewContent: `An error occurred: ${error instanceof Error ? error.message : "Unknown error"}`,
      };

      broadcastToUser(this.userId, {
        type: "agent_error",
        error: errorResponse.webviewContent,
      });

      return errorResponse;
    }
  }

  /**
   * Run the agent loop with tool calling
   */
  private async runAgentLoop(): Promise<ChatResponse> {
    const messages: UnifiedMessage[] = [...this.conversationHistory];
    let iterations = 0;
    const maxIterations = 15;

    while (iterations < maxIterations) {
      iterations++;

      const response = await this.provider.chat(messages, {
        tier: "fast",
        maxTokens: 4096,
        systemPrompt: this.buildSystemPrompt(),
        tools: TOOLS,
        temperature: 0.7,
      });

      // Check for tool calls
      if (hasToolCalls(response)) {
        const toolCalls = extractToolCalls(response);

        messages.push({
          role: "assistant",
          content: response.content,
        });

        for (const toolCall of toolCalls) {
          console.log(`[SEGA] Tool: ${toolCall.name}`);

          broadcastToUser(this.userId, {
            type: "agent_progress",
            stage: "tool_use",
            tool: toolCall.name,
            message: this.getToolProgressMessage(toolCall.name),
          });

          const result = await this.executeTool(toolCall.name, toolCall.input);

          messages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                toolUseId: toolCall.id,
                content: result.success
                  ? result.result
                  : `Error: ${result.error}`,
                isError: !result.success,
              },
            ],
          });
        }

        continue;
      }

      // No tool calls - extract final response
      const text = extractText(response);
      return this.parseResponse(text);
    }

    return {
      glassesDisplay: "Request too complex",
      webviewContent:
        "The request required too many steps. Please try a simpler query.",
    };
  }

  /**
   * Build system prompt with user profile context
   */
  private buildSystemPrompt(): string {
    const profileContext = `
## Current User Profile
- **Name**: ${this.userProfile.name}
- **Role**: ${this.userProfile.role}
${this.userProfile.company ? `- **Company**: ${this.userProfile.company}` : ""}
${this.userProfile.industry ? `- **Industry**: ${this.userProfile.industry}` : ""}
- **Interests**: ${this.userProfile.interests.length > 0 ? this.userProfile.interests.join(", ") : "Not specified"}
- **Listen For**: ${this.userProfile.listenFor.join("; ")}
- **Research Focus**: ${this.userProfile.researchFocus.join("; ")}
- **Note Style**: ${this.userProfile.noteStyle}
${this.userProfile.customInstructions ? `- **Custom Instructions**: ${this.userProfile.customInstructions}` : ""}

Remember: Adapt your assistance style to this user's specific role and needs.
`;

    return SYSTEM_PROMPT + "\n" + profileContext;
  }

  /**
   * Get progress message for tool
   */
  private getToolProgressMessage(toolName: string): string {
    const messages: Record<string, string> = {
      search_web: "Searching the web...",
      scrape_url: "Reading webpage...",
      save_note: "Saving note...",
      get_notes: "Retrieving notes...",
      send_email: "Sending email...",
      get_user_profile: "Loading profile...",
      get_current_time: "Getting time...",
    };
    return messages[toolName] || "Working...";
  }

  /**
   * Execute a tool
   */
  private async executeTool(
    name: string,
    input: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    try {
      switch (name) {
        case "search_web":
          return await this.toolSearchWeb(input);

        case "scrape_url":
          return await this.toolScrapeUrl(input);

        case "save_note":
          return await this.toolSaveNote(input);

        case "get_notes":
          return await this.toolGetNotes(input);

        case "send_email":
          return await this.toolSendEmail(input);

        case "get_user_profile":
          return await this.toolGetUserProfile();

        case "get_current_time":
          return {
            success: true,
            result: `Current time: ${new Date().toLocaleString()}`,
          };

        default:
          return {
            success: false,
            result: "",
            error: `Unknown tool: ${name}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        result: "",
        error: error instanceof Error ? error.message : "Tool execution failed",
      };
    }
  }

  // ===========================================================================
  // Tool Implementations
  // ===========================================================================

  private async toolSearchWeb(
    input: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    if (!firecrawl) {
      return {
        success: false,
        result: "",
        error: "Firecrawl not configured. Set FIRECRAWL_API_KEY.",
      };
    }

    const query = input.query as string;
    const limit = Math.min((input.limit as number) || 5, 10);

    try {
      const results = await firecrawl.search(query, { limit });

      if (!results.success || !results.data || results.data.length === 0) {
        return {
          success: true,
          result: `No results found for: "${query}"`,
        };
      }

      const formatted = results.data
        .map((r: any, i: number) => {
          return `### ${i + 1}. ${r.title || "Untitled"}\n**URL**: ${r.url}\n${r.description || r.markdown?.substring(0, 300) || "No description"}\n`;
        })
        .join("\n");

      return {
        success: true,
        result: `## Search Results for "${query}"\n\n${formatted}`,
      };
    } catch (error) {
      return {
        success: false,
        result: "",
        error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async toolScrapeUrl(
    input: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    if (!firecrawl) {
      return {
        success: false,
        result: "",
        error: "Firecrawl not configured. Set FIRECRAWL_API_KEY.",
      };
    }

    const url = input.url as string;

    try {
      const result = await firecrawl.scrapeUrl(url, {
        formats: ["markdown"],
      });

      if (!result.success || !result.markdown) {
        return {
          success: false,
          result: "",
          error: "Failed to scrape URL",
        };
      }

      // Truncate if too long
      const content =
        result.markdown.length > 8000
          ? result.markdown.substring(0, 8000) + "\n\n[Content truncated...]"
          : result.markdown;

      return {
        success: true,
        result: `## Content from ${url}\n\n${content}`,
      };
    } catch (error) {
      return {
        success: false,
        result: "",
        error: `Scrape failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async toolSaveNote(
    input: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const topic = input.topic as string;
    const content = input.content as string;
    const tagsStr = (input.tags as string) || "";
    const tags = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const note: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      topic,
      content,
      tags,
      createdAt: new Date(),
      userId: this.userId,
    };

    this.notes.push(note);

    // TODO: Persist to MongoDB

    return {
      success: true,
      result: `Note saved!\n\n**Topic**: ${topic}\n**Tags**: ${tags.join(", ") || "None"}\n\n${content.substring(0, 200)}${content.length > 200 ? "..." : ""}`,
    };
  }

  private async toolGetNotes(
    input: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const topicFilter = input.topic as string | undefined;
    const tagsFilter = (input.tags as string)
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const limit = (input.limit as number) || 10;

    let filtered = [...this.notes];

    if (topicFilter) {
      filtered = filtered.filter((n) =>
        n.topic.toLowerCase().includes(topicFilter.toLowerCase()),
      );
    }

    if (tagsFilter && tagsFilter.length > 0) {
      filtered = filtered.filter((n) =>
        tagsFilter.some((tag) =>
          n.tags.some((nt) => nt.toLowerCase().includes(tag.toLowerCase())),
        ),
      );
    }

    filtered = filtered.slice(-limit);

    if (filtered.length === 0) {
      return {
        success: true,
        result: "No notes found matching your criteria.",
      };
    }

    const formatted = filtered
      .map((n) => {
        return `### ${n.topic}\n**Date**: ${n.createdAt.toLocaleString()}\n**Tags**: ${n.tags.join(", ") || "None"}\n\n${n.content}\n`;
      })
      .join("\n---\n\n");

    return {
      success: true,
      result: `## Notes (${filtered.length})\n\n${formatted}`,
    };
  }

  private async toolSendEmail(
    input: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    if (!resend) {
      return {
        success: false,
        result: "",
        error: "Resend not configured. Set RESEND_API_KEY.",
      };
    }

    const to = input.to as string;
    const subject = input.subject as string;
    const body = input.body as string;

    // Convert markdown to simple HTML
    const htmlBody = this.markdownToHtml(body);

    try {
      const { data, error } = await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to,
        subject,
        html: htmlBody,
        text: body, // Plain text fallback
      });

      if (error) {
        return {
          success: false,
          result: "",
          error: `Email failed: ${error.message}`,
        };
      }

      return {
        success: true,
        result: `Email sent successfully!\n\n**To**: ${to}\n**Subject**: ${subject}\n**ID**: ${data?.id}`,
      };
    } catch (error) {
      return {
        success: false,
        result: "",
        error: `Email failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async toolGetUserProfile(): Promise<ToolExecutionResult> {
    const profile = this.userProfile;

    const formatted = `## User Profile

**Name**: ${profile.name}
**Role**: ${profile.role}
**Company**: ${profile.company}
**Email**: ${profile.email || "Not set"}

### Interests
${profile.interests.map((i) => `- ${i}`).join("\n")}

### What to Listen For
${profile.listenFor.map((i) => `- ${i}`).join("\n")}

### Research Focus
${profile.researchFocus.map((i) => `- ${i}`).join("\n")}

### Note-Taking Style
${profile.noteStyle}

${profile.customInstructions ? `### Custom Instructions\n${profile.customInstructions}` : ""}
`;

    return {
      success: true,
      result: formatted,
    };
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Simple markdown to HTML conversion
   */
  private markdownToHtml(markdown: string): string {
    return markdown
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^- (.*$)/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
      .replace(/\n/g, "<br>");
  }

  /**
   * Parse LLM response into structured ChatResponse
   */
  private parseResponse(text: string): ChatResponse {
    try {
      const jsonMatch = text.match(/\{[\s\S]*"glassesDisplay"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          glassesDisplay: this.truncateForGlasses(parsed.glassesDisplay || ""),
          webviewContent: parsed.webviewContent || text,
          reasoning: parsed.reasoning,
        };
      }
    } catch {
      // JSON parsing failed
    }

    return {
      glassesDisplay: this.truncateForGlasses(text),
      webviewContent: text,
    };
  }

  /**
   * Truncate text for glasses display (max 80 chars)
   */
  private truncateForGlasses(text: string): string {
    let clean = text
      .replace(/```[\s\S]*?```/g, "[code]")
      .replace(/\*\*/g, "")
      .replace(/\n+/g, " ")
      .trim();

    const firstSentence = clean.match(/^[^.!?]+[.!?]/);
    if (firstSentence && firstSentence[0].length <= 80) {
      return firstSentence[0];
    }

    if (clean.length > 80) {
      return clean.substring(0, 77) + "...";
    }

    return clean;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    console.log(`[SEGA] Cleared history for ${this.userId}`);
  }

  /**
   * Get conversation history
   */
  getHistory(): UnifiedMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Get all notes
   */
  getNotes(): Note[] {
    return [...this.notes];
  }
}

// =============================================================================
// Agent Cache
// =============================================================================

const agentCache = new Map<string, ChatAgent>();

export function getChatAgent(userId: string): ChatAgent {
  let agent = agentCache.get(userId);
  if (!agent) {
    agent = new ChatAgent(userId);
    agentCache.set(userId, agent);
  }
  return agent;
}

export function removeChatAgent(userId: string): void {
  agentCache.delete(userId);
  console.log(`[SEGA] Removed agent for ${userId}`);
}

export function clearAgentCache(): void {
  agentCache.clear();
  console.log("[SEGA] Cleared all agents");
}
