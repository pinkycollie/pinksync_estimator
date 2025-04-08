import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { communicationLogger, CommunicationType, CommunicationDirection, CommunicationStatus } from './communicationLogger';

/**
 * Email account configuration interface
 */
export interface EmailAccount {
  id: string;
  name: string;
  email: string;
  provider: 'gmail' | 'outlook' | 'imap' | 'pop3' | 'exchange' | 'other';
  credentials: {
    username?: string;
    password?: string;
    oauthToken?: string;
    refreshToken?: string;
    apiKey?: string;
  };
  serverSettings?: {
    imapServer?: string;
    imapPort?: number;
    smtpServer?: string;
    smtpPort?: number;
    useTLS?: boolean;
  };
  lastSyncDate?: Date;
  status: 'active' | 'inactive' | 'error';
  folderMapping?: Record<string, string>; // remote folder name -> local category
}

/**
 * Email message interface
 */
interface EmailMessage {
  id: string;
  from: {
    name: string;
    email: string;
  };
  to: Array<{
    name: string;
    email: string;
  }>;
  cc?: Array<{
    name: string;
    email: string;
  }>;
  bcc?: Array<{
    name: string;
    email: string;
  }>;
  subject: string;
  body: {
    text?: string;
    html?: string;
  };
  date: Date;
  attachments?: Array<{
    id: string;
    filename: string;
    contentType: string;
    size: number;
    content: Buffer;
  }>;
  headers?: Record<string, string>;
  flags?: string[];
  folder?: string;
  threadId?: string;
  accountId: string;
}

/**
 * Email importer class for fetching and processing emails
 */
export class EmailImporter {
  private accounts: Map<string, EmailAccount> = new Map();
  
  constructor() {}
  
  /**
   * Add or update an email account
   */
  addAccount(account: Omit<EmailAccount, 'id'>): EmailAccount {
    const id = uuidv4();
    const newAccount: EmailAccount = {
      ...account,
      id
    };
    
    this.accounts.set(id, newAccount);
    return newAccount;
  }
  
  /**
   * Update an existing account
   */
  updateAccount(id: string, updates: Partial<EmailAccount>): EmailAccount | null {
    const account = this.accounts.get(id);
    if (!account) return null;
    
    const updatedAccount = {
      ...account,
      ...updates
    };
    
    this.accounts.set(id, updatedAccount);
    return updatedAccount;
  }
  
  /**
   * Remove an account
   */
  removeAccount(id: string): boolean {
    return this.accounts.delete(id);
  }
  
  /**
   * Get all accounts
   */
  getAccounts(): EmailAccount[] {
    return Array.from(this.accounts.values());
  }
  
  /**
   * Get account by ID
   */
  getAccount(id: string): EmailAccount | undefined {
    return this.accounts.get(id);
  }
  
  /**
   * Synchronize emails from an account
   * This is a mock implementation - in production this would connect to real email services
   */
  async synchronizeAccount(accountId: string): Promise<{
    success: boolean;
    emailsImported: number;
    error?: string;
  }> {
    const account = this.accounts.get(accountId);
    if (!account) {
      return {
        success: false,
        emailsImported: 0,
        error: 'Account not found'
      };
    }
    
    try {
      // In a real implementation, this would fetch emails from the provider
      // Here we're just simulating the process with mock data
      
      // Update account sync date
      account.lastSyncDate = new Date();
      this.accounts.set(accountId, account);
      
      // Generate 5 mock emails for testing
      const mockEmails = this.generateMockEmails(account, 5);
      
      // Process each email
      for (const email of mockEmails) {
        await this.processEmail(email);
      }
      
      return {
        success: true,
        emailsImported: mockEmails.length
      };
    } catch (error) {
      console.error(`Error synchronizing account ${accountId}:`, error);
      
      // Update account status to error
      account.status = 'error';
      this.accounts.set(accountId, account);
      
      return {
        success: false,
        emailsImported: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Process an email message
   */
  private async processEmail(email: EmailMessage): Promise<void> {
    // Format participants
    const participants = [
      {
        name: email.from.name,
        email: email.from.email,
        role: 'sender'
      },
      ...email.to.map(recipient => ({
        name: recipient.name,
        email: recipient.email,
        role: 'recipient'
      }))
    ];
    
    // Add CC recipients if present
    if (email.cc && email.cc.length > 0) {
      participants.push(
        ...email.cc.map(recipient => ({
          name: recipient.name,
          email: recipient.email,
          role: 'cc'
        }))
      );
    }
    
    // Extract text content
    const textContent = email.body.text || this.extractTextFromHtml(email.body.html || '');
    
    // Format attachments
    const attachments = email.attachments?.map(attachment => ({
      name: attachment.filename,
      type: attachment.contentType,
      size: attachment.size,
      content: attachment.content
    })) || [];
    
    // Import into communication logger
    await communicationLogger.importEmail({
      from: `${email.from.name} <${email.from.email}>`,
      to: email.to.map(recipient => `${recipient.name} <${recipient.email}>`),
      subject: email.subject,
      body: textContent,
      date: email.date,
      attachments
    });
  }
  
  /**
   * Extract text from HTML
   */
  private extractTextFromHtml(html: string): string {
    // This would ideally use a proper HTML parser
    // For this example, we'll use a simplified approach
    
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, ' ');
    
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");
    
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }
  
  /**
   * Generate mock emails for testing
   * In a real implementation, this would be replaced with actual email fetching
   */
  private generateMockEmails(account: EmailAccount, count: number): EmailMessage[] {
    const emails: EmailMessage[] = [];
    
    const mockTopics = [
      {
        subject: 'Property Listing Update',
        body: 'Here is the latest update on the property listing at 123 Main St. The seller has accepted our offer of $450,000. We need to schedule the home inspection by next Friday. Let me know what times work for you.',
        category: 'real_estate'
      },
      {
        subject: 'Investment Portfolio Review',
        body: 'I\'ve reviewed your investment portfolio and have some recommendations for rebalancing. Your technology stocks have performed well, but I suggest diversifying more into healthcare and renewable energy. Can we schedule a call next week to discuss this in detail?',
        category: 'investment'
      },
      {
        subject: 'Insurance Policy Renewal',
        body: 'Your home insurance policy is up for renewal on 12/15/2023. The new premium is $1,200 for the year, which is a 5% increase from last year. Please review the attached policy document and let me know if you have any questions or if you\'d like to make any changes to your coverage.',
        category: 'insurance'
      },
      {
        subject: 'Legal Document Review',
        body: 'Please find attached the partnership agreement for your review. We need your signature by next Wednesday to proceed with the filing. Pay special attention to sections 3.2 and 4.5 regarding profit sharing and dispute resolution.',
        category: 'legal'
      },
      {
        subject: 'Tax Planning Meeting',
        body: 'I would like to schedule a tax planning meeting before the end of the quarter. We should discuss strategies to minimize your tax liability for the coming year. I have availability on Monday or Wednesday afternoon next week.',
        category: 'tax'
      }
    ];
    
    const mockSenders = [
      { name: 'John Smith', email: 'john.smith@example.com' },
      { name: 'Sarah Johnson', email: 'sarah.j@example.com' },
      { name: 'Michael Williams', email: 'mwilliams@example.com' },
      { name: 'Emma Davis', email: 'emma.davis@example.com' },
      { name: 'Robert Brown', email: 'rbrown@example.com' }
    ];
    
    // Generate random emails
    for (let i = 0; i < count; i++) {
      const topicIndex = Math.floor(Math.random() * mockTopics.length);
      const senderIndex = Math.floor(Math.random() * mockSenders.length);
      
      const topic = mockTopics[topicIndex];
      const sender = mockSenders[senderIndex];
      
      // Generate a random date within the last 30 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      // Randomly decide if there should be an attachment
      const hasAttachment = Math.random() > 0.7;
      const attachments = hasAttachment ? [
        {
          id: uuidv4(),
          filename: `${topic.category}_document.pdf`,
          contentType: 'application/pdf',
          size: Math.floor(Math.random() * 1000000) + 10000,
          content: Buffer.from('Mock PDF content')
        }
      ] : undefined;
      
      emails.push({
        id: uuidv4(),
        from: sender,
        to: [{
          name: account.name,
          email: account.email
        }],
        subject: topic.subject,
        body: {
          text: topic.body,
          html: `<html><body><p>${topic.body}</p></body></html>`
        },
        date,
        attachments,
        accountId: account.id,
        folder: 'INBOX'
      });
    }
    
    return emails;
  }
  
  /**
   * Import emails from a .eml file
   */
  async importFromEmlFile(filePath: string): Promise<boolean> {
    try {
      // In a real implementation, this would parse the .eml file format
      // For this example, we'll just read the file and extract basic info
      
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return false;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Very simple parser for demonstration
      const subject = content.match(/^Subject: (.*)$/m)?.[1] || 'No Subject';
      const from = content.match(/^From: (.*)$/m)?.[1] || 'unknown@example.com';
      const to = content.match(/^To: (.*)$/m)?.[1] || '';
      const date = content.match(/^Date: (.*)$/m)?.[1] || new Date().toString();
      
      // Extract body (very simplified)
      const bodyMatch = content.match(/\r?\n\r?\n([\s\S]*)/);
      const body = bodyMatch ? bodyMatch[1] : '';
      
      // Import into communication logger
      await communicationLogger.importEmail({
        from,
        to: to.split(','),
        subject,
        body,
        date: new Date(date),
        attachments: []
      });
      
      return true;
    } catch (error) {
      console.error('Error importing from EML file:', error);
      return false;
    }
  }
  
  /**
   * Import emails from a directory of .eml files
   */
  async importFromDirectory(directoryPath: string): Promise<{
    success: boolean;
    importedCount: number;
    failedCount: number;
  }> {
    try {
      if (!fs.existsSync(directoryPath)) {
        console.error(`Directory not found: ${directoryPath}`);
        return {
          success: false,
          importedCount: 0,
          failedCount: 0
        };
      }
      
      const files = fs.readdirSync(directoryPath)
        .filter(file => file.endsWith('.eml'))
        .map(file => path.join(directoryPath, file));
      
      let importedCount = 0;
      let failedCount = 0;
      
      for (const file of files) {
        const success = await this.importFromEmlFile(file);
        if (success) {
          importedCount++;
        } else {
          failedCount++;
        }
      }
      
      return {
        success: importedCount > 0,
        importedCount,
        failedCount
      };
    } catch (error) {
      console.error('Error importing from directory:', error);
      return {
        success: false,
        importedCount: 0,
        failedCount: 0
      };
    }
  }
}

// Export singleton instance
export const emailImporter = new EmailImporter();