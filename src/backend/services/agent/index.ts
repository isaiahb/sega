/**
 * SEGA Agent Services - Export all agent-related functionality
 */

export {
  ChatAgent,
  getChatAgent,
  removeChatAgent,
  clearAgentCache,
  type ChatResponse,
  type ToolExecutionResult,
  type UserProfile,
  type Note,
} from "./ChatAgent";

// Re-export LLM utilities for convenience
export {
  createProviderFromEnv,
  createProvider,
  getProviderFromEnv,
  extractText,
  extractToolCalls,
  hasToolCalls,
  type AgentProvider,
  type UnifiedMessage,
  type UnifiedTool,
  type UnifiedResponse,
} from "./llm";
