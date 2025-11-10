import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  communicationLogger, 
  CommunicationType, 
  CommunicationDirection, 
  CommunicationStatus,
  CommunicationCategory,
  CommunicationPriority
} from './communicationLogger';

/**
 * Message service provider interface
 */
export interface MessageServiceProvider {
  id: string;
  name: string;
  type: 'sms' | 'whatsapp' | 'telegram' | 'signal' | 'imessage' | 'line' | 'wechat' | 'other';
  credentials?: {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    phoneNumber?: string;
  };
  lastSyncDate?: Date;
  status: 'active' | 'inactive' | 'error';
}

/**
 * Text Message interface
 */
interface TextMessage {
  id: string;
  sender: {
    name: string;
    phoneNumber: string;
    contactId?: string;
  };
  recipient: {
    name: string;
    phoneNumber: string;
    contactId?: string;
  };
  content: string;
  timestamp: Date;
  type: 'sms' | 'mms' | 'chat';
  direction: 'inbound' | 'outbound';
  mediaAttachments?: Array<{
    id: string;
    type: string;
    url?: string;
    data?: Buffer;
    size?: number;
  }>;
  metadata?: Record<string, any>;
  serviceProviderId: string;
}

/**
 * Contact interface
 */
interface Contact {
  id: string;
  name: string;
  phoneNumbers: Array<{
    type: string;
    number: string;
    isPrimary: boolean;
  }>;
  email?: string;
  organization?: string;
  category?: string;
  notes?: string;
  tags?: string[];
}

/**
 * Text message importer class for importing and processing messages
 */
export class TextMessageImporter {
  private serviceProviders: Map<string, MessageServiceProvider> = new Map();
  private contacts: Map<string, Contact> = new Map();
  
  constructor() {}
  
  /**
   * Add a new service provider
   */
  addServiceProvider(provider: Omit<MessageServiceProvider, 'id'>): MessageServiceProvider {
    const id = uuidv4();
    const newProvider: MessageServiceProvider = {
      ...provider,
      id
    };
    
    this.serviceProviders.set(id, newProvider);
    return newProvider;
  }
  
  /**
   * Get service provider by ID
   */
  getServiceProvider(id: string): MessageServiceProvider | undefined {
    return this.serviceProviders.get(id);
  }
  
  /**
   * Get all service providers
   */
  getAllServiceProviders(): MessageServiceProvider[] {
    return Array.from(this.serviceProviders.values());
  }
  
  /**
   * Add a contact
   */
  addContact(contact: Omit<Contact, 'id'>): Contact {
    const id = uuidv4();
    const newContact: Contact = {
      ...contact,
      id
    };
    
    this.contacts.set(id, newContact);
    return newContact;
  }
  
  /**
   * Get contact by ID
   */
  getContact(id: string): Contact | undefined {
    return this.contacts.get(id);
  }
  
  /**
   * Find contact by phone number
   */
  findContactByPhoneNumber(phoneNumber: string): Contact | undefined {
    return Array.from(this.contacts.values()).find(contact => 
      contact.phoneNumbers.some(p => p.number === phoneNumber));
  }
  
  /**
   * Import a single text message
   */
  async importMessage(message: TextMessage): Promise<boolean> {
    try {
      // Find contact information
      const senderContact = this.findContactByPhoneNumber(message.sender.phoneNumber);
      const recipientContact = this.findContactByPhoneNumber(message.recipient.phoneNumber);
      
      // Determine direction for communication logger
      const direction = message.direction === 'inbound' 
        ? CommunicationDirection.INBOUND 
        : CommunicationDirection.OUTBOUND;
      
      // Determine message type
      let type: CommunicationType;
      switch (message.type) {
        case 'sms':
        case 'mms':
          type = CommunicationType.TEXT;
          break;
        case 'chat':
          type = CommunicationType.CHAT;
          break;
        default:
          type = CommunicationType.TEXT;
      }
      
      // Determine message category - this could be more sophisticated
      // based on content analysis or previous message classification
      const defaultCategory = CommunicationCategory.PERSONAL;
      
      // Process attachments if any
      const attachments = [];
      if (message.mediaAttachments && message.mediaAttachments.length > 0) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'messages');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        for (const media of message.mediaAttachments) {
          if (media.data) {
            const mediaId = uuidv4();
            const mediaPath = path.join(uploadDir, `${mediaId}`);
            
            // Save media to disk
            fs.writeFileSync(mediaPath, media.data);
            
            attachments.push({
              id: mediaId,
              name: `${media.type} attachment`,
              type: media.type,
              size: media.size || media.data.length,
              path: mediaPath
            });
          } else if (media.url) {
            attachments.push({
              id: media.id,
              name: `${media.type} attachment`,
              type: media.type,
              size: media.size || 0,
              path: media.url
            });
          }
        }
      }
      
      // Format for communication logger
      const communication = await communicationLogger.logCommunication({
        participants: [
          {
            id: senderContact?.id,
            name: senderContact?.name || message.sender.name,
            phone: message.sender.phoneNumber,
            role: 'sender'
          },
          {
            id: recipientContact?.id,
            name: recipientContact?.name || message.recipient.name,
            phone: message.recipient.phoneNumber,
            role: 'recipient'
          }
        ],
        content: message.content,
        type,
        direction,
        category: defaultCategory,
        priority: this.determinePriority(message.content),
        status: CommunicationStatus.READ,
        metadata: {
          ...message.metadata,
          importedAt: new Date(),
          originalTimestamp: message.timestamp,
          serviceProviderId: message.serviceProviderId,
          messageType: message.type
        },
        attachments,
        tags: this.determineTags(message.content)
      });
      
      // Analyze the communication
      await communicationLogger.analyzeCommunication(communication.id);
      
      return true;
    } catch (error) {
      console.error('Error importing message:', error);
      return false;
    }
  }
  
  /**
   * Import messages from JSON file
   */
  async importFromJsonFile(filePath: string): Promise<{
    success: boolean;
    imported: number;
    failed: number;
  }> {
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return { success: false, imported: 0, failed: 0 };
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      // Validate data structure
      if (!Array.isArray(data)) {
        console.error('Invalid JSON format: expected an array of messages');
        return { success: false, imported: 0, failed: 0 };
      }
      
      let imported = 0;
      let failed = 0;
      
      // Process each message
      for (const item of data) {
        // Verify the item has required fields
        if (!item.sender || !item.recipient || !item.content) {
          console.error('Invalid message format:', item);
          failed++;
          continue;
        }
        
        // Create a message object
        const message: TextMessage = {
          id: item.id || uuidv4(),
          sender: {
            name: item.sender.name || 'Unknown',
            phoneNumber: item.sender.phoneNumber || '0000000000',
            contactId: item.sender.contactId
          },
          recipient: {
            name: item.recipient.name || 'Unknown',
            phoneNumber: item.recipient.phoneNumber || '0000000000',
            contactId: item.recipient.contactId
          },
          content: item.content,
          timestamp: new Date(item.timestamp || Date.now()),
          type: item.type || 'sms',
          direction: item.direction || 'inbound',
          mediaAttachments: item.mediaAttachments,
          metadata: item.metadata,
          serviceProviderId: item.serviceProviderId || 'unknown'
        };
        
        // Import the message
        const success = await this.importMessage(message);
        if (success) {
          imported++;
        } else {
          failed++;
        }
      }
      
      return {
        success: imported > 0,
        imported,
        failed
      };
    } catch (error) {
      console.error('Error importing from JSON file:', error);
      return { success: false, imported: 0, failed: 0 };
    }
  }
  
  /**
   * Import messages from CSV file
   */
  async importFromCsvFile(filePath: string): Promise<{
    success: boolean;
    imported: number;
    failed: number;
  }> {
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return { success: false, imported: 0, failed: 0 };
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Extract headers from the first line
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Define required fields
      const requiredFields = ['sender_phone', 'recipient_phone', 'content', 'timestamp'];
      
      // Check if all required fields are present
      const missingFields = requiredFields.filter(field => !headers.includes(field));
      if (missingFields.length > 0) {
        console.error(`CSV is missing required fields: ${missingFields.join(', ')}`);
        return { success: false, imported: 0, failed: 0 };
      }
      
      let imported = 0;
      let failed = 0;
      
      // Process each line (skip the header)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Split the line by comma, handling quoted values
        const values = this.parseCSVLine(line);
        
        // Create a record object by mapping headers to values
        const record: Record<string, string> = {};
        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });
        
        // Check if all required fields have values
        if (!record.sender_phone || !record.recipient_phone || !record.content) {
          console.error(`Line ${i + 1} is missing required fields`);
          failed++;
          continue;
        }
        
        // Create a message object
        const message: TextMessage = {
          id: uuidv4(),
          sender: {
            name: record.sender_name || 'Unknown',
            phoneNumber: record.sender_phone
          },
          recipient: {
            name: record.recipient_name || 'Unknown',
            phoneNumber: record.recipient_phone
          },
          content: record.content,
          timestamp: new Date(record.timestamp || Date.now()),
          type: (record.type as 'sms' | 'mms' | 'chat') || 'sms',
          direction: (record.direction as 'inbound' | 'outbound') || 'inbound',
          serviceProviderId: record.service_provider_id || 'unknown'
        };
        
        // Import the message
        const success = await this.importMessage(message);
        if (success) {
          imported++;
        } else {
          failed++;
        }
      }
      
      return {
        success: imported > 0,
        imported,
        failed
      };
    } catch (error) {
      console.error('Error importing from CSV file:', error);
      return { success: false, imported: 0, failed: 0 };
    }
  }
  
  /**
   * Synchronize with service provider
   */
  async synchronizeWithProvider(providerId: string): Promise<{
    success: boolean;
    imported: number;
    error?: string;
  }> {
    const provider = this.serviceProviders.get(providerId);
    if (!provider) {
      return {
        success: false,
        imported: 0,
        error: 'Provider not found'
      };
    }
    
    try {
      // In a real implementation, this would connect to the service provider API
      // For this example, we'll simulate with mock data
      
      const mockMessages = this.generateMockMessages(provider, 10);
      
      let imported = 0;
      
      for (const message of mockMessages) {
        const success = await this.importMessage(message);
        if (success) {
          imported++;
        }
      }
      
      // Update last sync date
      provider.lastSyncDate = new Date();
      this.serviceProviders.set(providerId, provider);
      
      return {
        success: true,
        imported
      };
    } catch (error) {
      console.error('Error synchronizing with provider %s:', providerId, error);
      
      // Update provider status
      provider.status = 'error';
      this.serviceProviders.set(providerId, provider);
      
      return {
        success: false,
        imported: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Generate mock messages for testing
   */
  private generateMockMessages(provider: MessageServiceProvider, count: number): TextMessage[] {
    const messages: TextMessage[] = [];
    
    const mockContacts = [
      { name: 'John Smith', phoneNumber: '+1234567890' },
      { name: 'Sarah Johnson', phoneNumber: '+1987654321' },
      { name: 'Mike Wilson', phoneNumber: '+1456789012' },
      { name: 'Lisa Brown', phoneNumber: '+1567890123' },
      { name: 'Robert Davis', phoneNumber: '+1678901234' }
    ];
    
    const mockContent = [
      'Can we schedule a call tomorrow to discuss the property?',
      'I just sent you the contract via email.',
      'The insurance company approved your claim. They will send the payment next week.',
      'Did you see the investment opportunity I shared with you?',
      'Let us meet for coffee on Friday to finalize the details.',
      'The tax documents are ready for your review.',
      'Your application was approved. Congratulations!',
      'Please confirm receipt of the documents I sent.',
      'Do not forget our meeting at 3pm today.',
      'I need your signature on the agreement by tomorrow.'
    ];
    
    for (let i = 0; i < count; i++) {
      const contactIndex = Math.floor(Math.random() * mockContacts.length);
      const contentIndex = Math.floor(Math.random() * mockContent.length);
      
      // Generate a random date within the last 14 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 14));
      
      // Determine direction randomly
      const direction = Math.random() > 0.5 ? 'inbound' : 'outbound';
      
      messages.push({
        id: uuidv4(),
        sender: direction === 'inbound' 
          ? mockContacts[contactIndex]
          : { name: 'Me', phoneNumber: '+10000000000' },
        recipient: direction === 'inbound'
          ? { name: 'Me', phoneNumber: '+10000000000' }
          : mockContacts[contactIndex],
        content: mockContent[contentIndex],
        timestamp: date,
        type: 'sms',
        direction,
        serviceProviderId: provider.id
      });
    }
    
    return messages;
  }
  
  /**
   * Parse a CSV line, handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current);
    
    return result;
  }
  
  /**
   * Determine message priority based on content
   */
  private determinePriority(content: string): CommunicationPriority {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('urgent') || 
        lowerContent.includes('asap') || 
        lowerContent.includes('emergency')) {
      return CommunicationPriority.URGENT;
    }
    
    return CommunicationPriority.MEDIUM;
  }
  
  /**
   * Determine tags from message content
   */
  private determineTags(content: string): string[] {
    const lowerContent = content.toLowerCase();
    const tags: string[] = [];
    
    // Business category tags
    if (lowerContent.includes('property') || lowerContent.includes('real estate')) {
      tags.push('real-estate');
    }
    
    if (lowerContent.includes('investment') || lowerContent.includes('stock')) {
      tags.push('investment');
    }
    
    if (lowerContent.includes('legal') || lowerContent.includes('contract')) {
      tags.push('legal');
    }
    
    if (lowerContent.includes('tax') || lowerContent.includes('irs')) {
      tags.push('tax');
    }
    
    if (lowerContent.includes('insurance') || lowerContent.includes('policy')) {
      tags.push('insurance');
    }
    
    // Priority tags
    if (lowerContent.includes('urgent') || lowerContent.includes('asap')) {
      tags.push('urgent');
    }
    
    if (lowerContent.includes('important')) {
      tags.push('important');
    }
    
    // Action tags
    if (lowerContent.includes('follow up') || 
        lowerContent.includes('get back to') || 
        lowerContent.includes('let me know')) {
      tags.push('follow-up');
    }
    
    return tags;
  }
}

// Export singleton instance
export const textMessageImporter = new TextMessageImporter();