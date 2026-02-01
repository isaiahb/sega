/**
 * SegaApp - Smart Executive Glasses Assistant
 *
 * Main application class that extends MentraOS AppServer.
 * Manages user sessions and routes events to the appropriate managers.
 *
 * Architecture:
 * - SegaApp handles MentraOS lifecycle (onSession, onStop)
 * - Each user gets a UserSession that contains all managers
 * - Managers handle specific responsibilities (transcripts, meetings, notes, etc.)
 */

import { AppServer, AppSession } from "@mentra/sdk";
import { UserSession } from "./session";
import { connectDB, disconnectDB } from "../services/db";

export interface SegaAppConfig {
  packageName: string;
  apiKey: string;
  port: number;
  cookieSecret?: string;
}

/**
 * SegaApp - Smart Executive Glasses Assistant
 *
 * Handles glasses connections and manages AI-powered assistance
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

    // Connect to MongoDB on startup
    this.initDatabase();
  }

  /**
   * Initialize database connection
   */
  private async initDatabase(): Promise<void> {
    try {
      await connectDB();
    } catch (error) {
      console.error("[SegaApp] Failed to connect to database:", error);
      // Continue without DB - app will work with in-memory storage
    }
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
    session.dashboard.content.write("// SEGA Ready");

    // Get or create UserSession for this user
    const userSession = await UserSession.getOrCreate(userId, session);

    // Log device capabilities
    const caps = session.capabilities;
    if (caps) {
      console.log(`   Device: ${caps.modelName}`);
      console.log(`   Camera: ${caps.hasCamera ? "✅" : "❌"}`);
      console.log(`   Display: ${caps.hasDisplay ? "✅" : "❌"}`);
      console.log(`   Microphone: ${caps.hasMicrophone ? "✅" : "❌"}`);
      console.log(`   Speaker: ${caps.hasSpeaker ? "✅" : "❌"}`);
    }

    // Subscribe to transcription events
    session.events.onTranscription((data) => {
      // Route to UserSession for processing
      userSession.onTranscription(data.text, data.isFinal, data.speakerId);
    });

    // Subscribe to button events
    session.events.onButtonPress((data) => {
      console.log(`[${userId}] 🔘 Button: ${data.buttonId}`);
      this.handleButtonPress(userSession, data.buttonId);
    });

    // Show initial ready state
    setTimeout(() => {
      userSession.display.showListening();
    }, 2000);

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

    // Note: We don't remove the UserSession on disconnect so state
    // persists if they reconnect. The session will be cleaned up
    // when the server shuts down or after a timeout.
    //
    // To immediately clean up:
    // await UserSession.remove(userId);
  }

  /**
   * Graceful shutdown - disconnect from database
   */
  async shutdown(): Promise<void> {
    console.log("[SegaApp] Shutting down...");

    // Clean up all user sessions
    for (const userId of UserSession.getActiveUserIds()) {
      await UserSession.remove(userId);
    }

    // Disconnect from database
    await disconnectDB();

    console.log("[SegaApp] Shutdown complete");
  }

  /**
   * Handle button press events from glasses
   */
  private handleButtonPress(userSession: UserSession, button: string): void {
    switch (button) {
      case "single_press":
        // Show current status
        if (userSession.meeting.isInMeeting()) {
          const meeting = userSession.meeting.getActiveMeeting();
          if (meeting) {
            const duration = userSession.meeting.getCurrentMeetingDuration();
            const minutes = Math.floor(duration / 60000);
            userSession.display.showMessage(
              `📋 ${meeting.title}\n${minutes}m in meeting`,
              { duration: 3000 },
            );
          }
        } else {
          userSession.display.showStatus("SEGA Ready 🎯");
        }
        break;

      case "double_press":
        // Toggle transcript display
        if (userSession.display.isTranscriptEnabled()) {
          userSession.display.disableTranscript();
          userSession.display.showMessage("Transcript OFF", { duration: 2000 });
        } else {
          userSession.display.enableTranscript();
          userSession.display.showMessage("Transcript ON", { duration: 2000 });
        }
        break;

      case "long_press":
        // End meeting if active, otherwise show help
        if (userSession.meeting.isInMeeting()) {
          userSession.meeting.endMeeting().catch((err) => {
            userSession.logger.error("Error ending meeting:", err);
          });
        } else {
          userSession.display.showMessage(
            "SEGA Help:\n• Single: Status\n• Double: Toggle transcript\n• Long: End meeting",
            { duration: 5000 },
          );
        }
        break;

      default:
        userSession.display.showStatus(`Button: ${button}`);
    }
  }

  /**
   * Get a UserSession by userId (for API routes)
   */
  getUserSession(userId: string): UserSession | undefined {
    return UserSession.get(userId);
  }

  /**
   * Get all active user IDs
   */
  getActiveUserIds(): string[] {
    return UserSession.getActiveUserIds();
  }

  /**
   * Get count of active sessions
   */
  getActiveSessionCount(): number {
    return UserSession.getActiveSessionCount();
  }
}
