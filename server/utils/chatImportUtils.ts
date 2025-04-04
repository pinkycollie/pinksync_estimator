import {
  InsertAiChatHistory,
  InsertAiChatMessage,
  AiPlatform
} from "@shared/schema";
import type { IStorage } from "../storage";

/**
 * Parse and import a ChatGPT data export
 * 
 * ChatGPT exports are JSON files containing arrays of conversation objects
 * Each conversation has metadata and an array of message objects
 * 
 * @param userId - The user ID to associate with imported chats
 * @param jsonData - The parsed JSON data from the ChatGPT export
 * @param storage - The storage interface
 * @returns Import stats
 */
export async function importChatGPTExport(
  userId: number,
  jsonData: any,
  storage: IStorage
): Promise<{ success: boolean; chatsImported: number; messagesImported: number; errors?: string[] }> {
  try {
    if (!jsonData || !Array.isArray(jsonData)) {
      return {
        success: false,
        chatsImported: 0,
        messagesImported: 0,
        errors: ["Invalid ChatGPT export format: Expected an array of conversations"]
      };
    }

    let chatsImported = 0;
    let messagesImported = 0;
    const errors: string[] = [];

    // Process each conversation in the export
    for (const conversation of jsonData) {
      try {
        if (!conversation.id || !conversation.title || !Array.isArray(conversation.messages)) {
          errors.push(`Skipping invalid conversation: ${conversation.title || "Untitled"}`);
          continue;
        }

        // Create chat history record
        const chatHistory: InsertAiChatHistory = {
          userId,
          platform: AiPlatform.OPENAI_CHATGPT,
          platformConversationId: conversation.id,
          title: conversation.title,
          summary: conversation.title, // Will be improved later with AI summarization
          importedAt: new Date(),
          conversationDate: conversation.create_time ? new Date(conversation.create_time) : new Date(),
          rawData: conversation,
          isProcessed: false,
          tags: determineTagsFromConversation(conversation)
        };

        // Save chat history to database
        const savedChatHistory = await storage.createChatHistory(chatHistory);
        chatsImported++;

        // Process messages for this conversation
        if (conversation.messages && Array.isArray(conversation.messages)) {
          let orderIndex = 0;
          
          for (const message of conversation.messages) {
            if (!message.role || !message.content || !message.content.parts) {
              continue;
            }

            // Combine all content parts into a single string
            const contentText = Array.isArray(message.content.parts) 
              ? message.content.parts.join("\n")
              : String(message.content.parts);

            const chatMessage: InsertAiChatMessage = {
              chatHistoryId: savedChatHistory.id,
              role: message.role,
              content: contentText,
              timestamp: message.create_time ? new Date(message.create_time) : null,
              orderIndex: orderIndex++,
              tokenCount: estimateTokenCount(contentText)
            };

            await storage.createChatMessage(chatMessage);
            messagesImported++;
          }
        }
      } catch (convError: any) {
        errors.push(`Error processing conversation: ${convError.message}`);
      }
    }

    return {
      success: true,
      chatsImported,
      messagesImported,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error: any) {
    return {
      success: false,
      chatsImported: 0,
      messagesImported: 0,
      errors: [error.message || "Unknown error during ChatGPT import"]
    };
  }
}

/**
 * Parse and import a Claude AI data export
 * 
 * Claude exports may have a different format from ChatGPT
 * This is a placeholder implementation that will need to be updated
 * with actual Claude export format when available
 * 
 * @param userId - The user ID to associate with imported chats
 * @param jsonData - The parsed JSON data from the Claude export
 * @param storage - The storage interface
 * @returns Import stats
 */
export async function importClaudeExport(
  userId: number,
  jsonData: any,
  storage: IStorage
): Promise<{ success: boolean; chatsImported: number; messagesImported: number; errors?: string[] }> {
  try {
    if (!jsonData || typeof jsonData !== 'object') {
      return {
        success: false,
        chatsImported: 0,
        messagesImported: 0,
        errors: ["Invalid Claude export format"]
      };
    }

    // Placeholder for Claude export parsing logic
    // Actual implementation will depend on the format of Claude exports
    // This function needs to be updated once we have a sample Claude export

    return {
      success: false,
      chatsImported: 0,
      messagesImported: 0,
      errors: ["Claude export format parsing not yet implemented"]
    };
  } catch (error: any) {
    return {
      success: false,
      chatsImported: 0,
      messagesImported: 0,
      errors: [error.message || "Unknown error during Claude import"]
    };
  }
}

/**
 * Determine appropriate tags based on conversation content
 * This is a simple implementation that looks for keywords in the title
 * In a real app, this would use AI to analyze and tag content
 * 
 * @param conversation - The conversation object
 * @returns Comma-separated tags
 */
function determineTagsFromConversation(conversation: any): string {
  const tags: Set<string> = new Set();
  const title = (conversation.title || "").toLowerCase();
  
  // Tag based on title keywords
  if (title.includes("code") || title.includes("programming")) tags.add("coding");
  if (title.includes("business") || title.includes("startup")) tags.add("business");
  if (title.includes("idea") || title.includes("brainstorm")) tags.add("ideas");
  if (title.includes("research") || title.includes("study")) tags.add("research");
  if (title.includes("plan") || title.includes("project")) tags.add("planning");
  
  return Array.from(tags).join(",");
}

/**
 * Simple function to estimate token count based on text length
 * This is an approximation, as actual token count depends on the tokenizer used
 * In a real app, this would use the actual tokenizer from the AI model
 * 
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
function estimateTokenCount(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}