/**
 * SegaApp - Smart Executive Glasses Assistant
 *
 * Extends AppServer to handle smart glasses sessions.
 * Integrates ChatAgent for AI-powered executive assistance.
 */

import { AppServer, AppSession } from "@mentra/sdk";
import {
  getChatAgent,
  removeChatAgent,
  type ChatResponse,
} from "./services/agent";
import { broadcastToUser } from "./api/sse";

export interface SegaAppConfig {
  packageName: string;
  apiKey: string;
  port: number;
  cookieSecret?: string;
}

/**
 * SegaApp - Smart Executive Glasses Assistant
 *
 * Handles glasses connections and manages AI-powered conversations
 * for executives, investors, and busy professionals.
 */
export class SegaApp extends AppServer {
  constructor(config: SegaAppConfig) {
    super({
      packageName: config.packageName,
      apiKey: config.apiKey,
      port: config.port,
      cookieSecret: config.cookieSecret,
    });
  }

  /**
   * Called when a user connects their glasses to SEGA
   */
  protected async onSession(
    session: AppSession,
    sessionId: string,
    userId: string,
  ): Promise<void> {
    console.log(`\n🎯 SEGA session started for ${userId}`);

    // Initialize ChatAgent for this user
    const agent = getChatAgent(userId);

    // Show welcome message on glasses
    session.layouts.showTextWall("SEGA Ready 🎯");

    // After a moment, show hint
    setTimeout(() => {
      session.layouts.showTextWall("Listening...\nSpeak to get started");
    }, 2000);

    // Listen for voice transcription
    session.events.onTranscription(async (data) => {
      if (data.isFinal && data.text.trim().length > 0) {
        console.log(`[${userId}] 🎤 "${data.text}"`);

        // Show processing indicator
        session.layouts.showTextWall("Processing... 🤔");

        // Broadcast to webview that we're processing
        broadcastToUser(userId, {
          type: "transcription",
          text: data.text,
          isFinal: true,
        });

        try {
          // Process with ChatAgent
          const response = await agent.processQuery(data.text);

          // Display response on glasses
          session.layouts.showTextWall(response.glassesDisplay);

          // Speak the response if glasses have a speaker
          if (session.capabilities?.hasSpeaker) {
            // Use shorter text for speech
            const speakText =
              response.glassesDisplay.length > 100
                ? response.glassesDisplay.substring(0, 100)
                : response.glassesDisplay;
            await session.audio.speak(speakText);
          }
        } catch (error) {
          console.error(`[${userId}] Error:`, error);
          session.layouts.showTextWall("Error occurred\nPlease try again");
        }
      } else if (!data.isFinal) {
        // Show partial transcription (optional - can be noisy)
        // session.layouts.showTextWall(`"${data.text}..."`);

        // Broadcast partial to webview
        broadcastToUser(userId, {
          type: "transcription",
          text: data.text,
          isFinal: false,
        });
      }
    });

    // Listen for button presses
    session.events.onButtonPress(async (data) => {
      console.log(`[${userId}] 🔘 Button: ${data.button}`);

      switch (data.button) {
        case "single_press":
          // Show current notes summary
          const notes = agent.getNotes();
          if (notes.length > 0) {
            session.layouts.showTextWall(`📝 ${notes.length} notes saved`);
          } else {
            session.layouts.showTextWall("No notes yet\nSpeak to take notes");
          }
          break;

        case "double_press":
          // Clear conversation history
          agent.clearHistory();
          session.layouts.showTextWall("Chat cleared! 🧹");
          break;

        case "long_press":
          // Show profile summary
          const profile = agent.getProfile();
          session.layouts.showTextWall(`👤 ${profile.name}\n${profile.role}`);
          break;

        default:
          session.layouts.showTextWall(`Button: ${data.button}`);
      }
    });

    // Log device capabilities
    const caps = session.capabilities;
    if (caps) {
      console.log(`   Device: ${caps.modelName}`);
      console.log(`   Camera: ${caps.hasCamera ? "✅" : "❌"}`);
      console.log(`   Display: ${caps.hasDisplay ? "✅" : "❌"}`);
      console.log(`   Microphone: ${caps.hasMicrophone ? "✅" : "❌"}`);
      console.log(`   Speaker: ${caps.hasSpeaker ? "✅" : "❌"}`);
    }

    console.log(`✅ SEGA ready for ${userId}\n`);
  }

  /**
   * Called when a user disconnects from SEGA
   */
  protected async onStop(
    sessionId: string,
    userId: string,
    reason: string,
  ): Promise<void> {
    console.log(`👋 SEGA session ended for ${userId}: ${reason}`);

    // Note: We don't remove the agent on disconnect so conversation
    // persists if they reconnect. Uncomment to clear on disconnect:
    // removeChatAgent(userId);
  }
}
