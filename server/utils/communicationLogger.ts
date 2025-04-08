import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { ModuleCategory } from './workflowEngine';

/**
 * Communication type enum for different communication channels
 */
export enum CommunicationType {
  EMAIL = 'email',
  TEXT = 'text',
  CHAT = 'chat',
  MEETING = 'meeting',
  CALL = 'call',
  VIDEO = 'video',
  SOCIAL = 'social',
  OTHER = 'other'
}

/**
 * Communication direction enum
 */
export enum CommunicationDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

/**
 * Communication priority enum
 */
export enum CommunicationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Communication status enum
 */
export enum CommunicationStatus {
  UNREAD = 'unread',
  READ = 'read',
  REPLIED = 'replied',
  ARCHIVED = 'archived',
  FLAGGED = 'flagged',
  DELETED = 'deleted'
}

/**
 * Communication category enum
 */
export enum CommunicationCategory {
  PERSONAL = 'personal',
  BUSINESS = 'business',
  REAL_ESTATE = 'real_estate',
  INVESTMENT = 'investment',
  LEGAL = 'legal',
  TAX = 'tax',
  INSURANCE = 'insurance',
  PROJECT = 'project',
  CLIENT = 'client',
  VENDOR = 'vendor',
  PARTNER = 'partner',
  OTHER = 'other'
}

/**
 * Communication entity interface
 */
export interface CommunicationEntity {
  id: string;
  participants: Array<{
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    role?: string;
  }>;
  content: string;
  subject?: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  category: CommunicationCategory;
  priority: CommunicationPriority;
  status: CommunicationStatus;
  timestamp: Date;
  metadata: Record<string, any>;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    path: string;
  }>;
  tags: string[];
  relatedEntityId?: string;
  relatedEntityType?: string;
  threadId?: string;
  parentId?: string;
  analysis?: {
    sentiment?: number;
    intent?: string;
    entities?: Array<{
      name: string;
      type: string;
      value: string;
    }>;
    topics?: string[];
    actionItems?: Array<{
      text: string;
      dueDate?: Date;
      assignee?: string;
    }>;
    followUpNeeded?: boolean;
    followUpDate?: Date;
  };
}

/**
 * Communication reference interface for versioning
 */
interface CommunicationRef {
  id: string;
  timestamp: Date;
  commitMessage?: string;
}

/**
 * Communication thread interface
 */
interface CommunicationThread {
  id: string;
  subject?: string;
  participants: Array<{
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    role?: string;
  }>;
  messages: string[]; // IDs of CommunicationEntity objects
  status: CommunicationStatus;
  category: CommunicationCategory;
  startDate: Date;
  lastUpdated: Date;
  metadata: Record<string, any>;
  tags: string[];
}

/**
 * Communication branch interface for git-like versioning
 */
interface CommunicationBranch {
  name: string;
  head: string; // ID of latest CommunicationRef
  history: CommunicationRef[];
  metadata: Record<string, any>;
}

/**
 * Communication Logger class
 * Logs and analyzes communication from various channels
 */
export class CommunicationLogger {
  private communications: Map<string, CommunicationEntity> = new Map();
  private threads: Map<string, CommunicationThread> = new Map();
  private branches: Map<string, CommunicationBranch> = new Map();
  private tags: Map<string, Set<string>> = new Map(); // tag name -> set of communication IDs
  
  constructor() {
    // Initialize master branch
    this.branches.set('master', {
      name: 'master',
      head: '',
      history: [],
      metadata: {
        description: 'Main communication log',
        createdAt: new Date()
      }
    });
    
    // Initialize common tags
    this.tags.set('important', new Set());
    this.tags.set('follow-up', new Set());
    this.tags.set('client', new Set());
    this.tags.set('personal', new Set());
    this.tags.set('business', new Set());
    this.tags.set('real-estate', new Set());
    this.tags.set('investment', new Set());
    this.tags.set('legal', new Set());
  }
  
  /**
   * Log a new communication
   */
  async logCommunication(communication: Omit<CommunicationEntity, 'id' | 'timestamp'>): Promise<CommunicationEntity> {
    const id = uuidv4();
    const timestamp = new Date();
    
    const newCommunication: CommunicationEntity = {
      ...communication,
      id,
      timestamp
    };
    
    // Store communication in memory
    this.communications.set(id, newCommunication);
    
    // Add to tags
    for (const tag of newCommunication.tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)?.add(id);
    }
    
    // Add to thread if threadId is provided
    if (newCommunication.threadId && this.threads.has(newCommunication.threadId)) {
      const thread = this.threads.get(newCommunication.threadId);
      if (thread) {
        thread.messages.push(id);
        thread.lastUpdated = timestamp;
        this.threads.set(newCommunication.threadId, thread);
      }
    }
    
    // Create a new ref for versioning
    const ref: CommunicationRef = {
      id,
      timestamp
    };
    
    // Update master branch
    const masterBranch = this.branches.get('master');
    if (masterBranch) {
      masterBranch.head = id;
      masterBranch.history.push(ref);
      this.branches.set('master', masterBranch);
    }
    
    // Store in database if available
    try {
      if (typeof storage.createCommunication === 'function') {
        await storage.createCommunication(newCommunication);
      }
    } catch (error) {
      console.error('Error storing communication in database:', error);
    }
    
    return newCommunication;
  }
  
  /**
   * Create a new thread for related communications
   */
  createThread(thread: Omit<CommunicationThread, 'id' | 'startDate' | 'lastUpdated'>): CommunicationThread {
    const id = uuidv4();
    const now = new Date();
    
    const newThread: CommunicationThread = {
      ...thread,
      id,
      startDate: now,
      lastUpdated: now
    };
    
    this.threads.set(id, newThread);
    return newThread;
  }
  
  /**
   * Add communication to a thread
   */
  addToThread(threadId: string, communicationId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;
    
    const communication = this.communications.get(communicationId);
    if (!communication) return false;
    
    // Update communication
    communication.threadId = threadId;
    this.communications.set(communicationId, communication);
    
    // Update thread
    thread.messages.push(communicationId);
    thread.lastUpdated = new Date();
    this.threads.set(threadId, thread);
    
    return true;
  }
  
  /**
   * Create a new branch for specialized categorization
   */
  createBranch(name: string, fromBranch: string = 'master', metadata: Record<string, any> = {}): CommunicationBranch | null {
    if (this.branches.has(name)) {
      return null; // Branch already exists
    }
    
    const sourceBranch = this.branches.get(fromBranch);
    if (!sourceBranch) {
      return null; // Source branch doesn't exist
    }
    
    const newBranch: CommunicationBranch = {
      name,
      head: sourceBranch.head,
      history: [...sourceBranch.history],
      metadata: {
        ...metadata,
        createdFrom: fromBranch,
        createdAt: new Date()
      }
    };
    
    this.branches.set(name, newBranch);
    return newBranch;
  }
  
  /**
   * Get communications by branch
   */
  getCommunicationsByBranch(branchName: string): CommunicationEntity[] {
    const branch = this.branches.get(branchName);
    if (!branch) return [];
    
    return branch.history
      .map(ref => this.communications.get(ref.id))
      .filter((comm): comm is CommunicationEntity => comm !== undefined);
  }
  
  /**
   * Get communications by tag
   */
  getCommunicationsByTag(tag: string): CommunicationEntity[] {
    const commIds = this.tags.get(tag);
    if (!commIds) return [];
    
    return Array.from(commIds)
      .map(id => this.communications.get(id))
      .filter((comm): comm is CommunicationEntity => comm !== undefined);
  }
  
  /**
   * Get communications by category
   */
  getCommunicationsByCategory(category: CommunicationCategory): CommunicationEntity[] {
    return Array.from(this.communications.values())
      .filter(comm => comm.category === category);
  }
  
  /**
   * Get thread by ID
   */
  getThread(threadId: string): CommunicationThread | undefined {
    return this.threads.get(threadId);
  }
  
  /**
   * Get all threads
   */
  getAllThreads(): CommunicationThread[] {
    return Array.from(this.threads.values());
  }
  
  /**
   * Get all communications in a thread
   */
  getThreadCommunications(threadId: string): CommunicationEntity[] {
    const thread = this.threads.get(threadId);
    if (!thread) return [];
    
    return thread.messages
      .map(id => this.communications.get(id))
      .filter((comm): comm is CommunicationEntity => comm !== undefined);
  }
  
  /**
   * Search communications by content or metadata
   */
  searchCommunications(query: string): CommunicationEntity[] {
    const lowercaseQuery = query.toLowerCase();
    
    return Array.from(this.communications.values())
      .filter(comm => {
        // Search in content
        if (comm.content.toLowerCase().includes(lowercaseQuery)) {
          return true;
        }
        
        // Search in subject
        if (comm.subject?.toLowerCase().includes(lowercaseQuery)) {
          return true;
        }
        
        // Search in participants
        for (const participant of comm.participants) {
          if (participant.name.toLowerCase().includes(lowercaseQuery)) {
            return true;
          }
          if (participant.email?.toLowerCase().includes(lowercaseQuery)) {
            return true;
          }
        }
        
        // Search in tags
        if (comm.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))) {
          return true;
        }
        
        return false;
      });
  }
  
  /**
   * Add a tag to a communication
   */
  tagCommunication(communicationId: string, tag: string): boolean {
    const communication = this.communications.get(communicationId);
    if (!communication) return false;
    
    // Add tag to communication
    if (!communication.tags.includes(tag)) {
      communication.tags.push(tag);
      this.communications.set(communicationId, communication);
    }
    
    // Add communication to tag set
    if (!this.tags.has(tag)) {
      this.tags.set(tag, new Set());
    }
    this.tags.get(tag)?.add(communicationId);
    
    return true;
  }
  
  /**
   * Remove a tag from a communication
   */
  untagCommunication(communicationId: string, tag: string): boolean {
    const communication = this.communications.get(communicationId);
    if (!communication) return false;
    
    // Remove tag from communication
    communication.tags = communication.tags.filter(t => t !== tag);
    this.communications.set(communicationId, communication);
    
    // Remove communication from tag set
    this.tags.get(tag)?.delete(communicationId);
    
    return true;
  }
  
  /**
   * Analyze a communication for sentiment, intent, and entities
   */
  async analyzeCommunication(communicationId: string): Promise<CommunicationEntity | null> {
    const communication = this.communications.get(communicationId);
    if (!communication) return null;
    
    try {
      // Mock analysis for now
      // In production, this would call a proper NLP service
      const analysis = {
        sentiment: Math.random() * 2 - 1, // -1 to 1
        intent: this.mockIntent(communication.content),
        entities: this.extractEntities(communication.content),
        topics: this.extractTopics(communication.content),
        actionItems: this.extractActionItems(communication.content),
        followUpNeeded: communication.content.toLowerCase().includes('follow up') || 
                       communication.content.toLowerCase().includes('let me know') ||
                       communication.content.toLowerCase().includes('get back to'),
        followUpDate: this.extractDate(communication.content)
      };
      
      // Update communication with analysis
      communication.analysis = analysis;
      this.communications.set(communicationId, communication);
      
      // If follow up needed, add to follow-up tag
      if (analysis.followUpNeeded) {
        this.tagCommunication(communicationId, 'follow-up');
      }
      
      return communication;
    } catch (error) {
      console.error('Error analyzing communication:', error);
      return null;
    }
  }
  
  /**
   * Export thread as JSON
   */
  exportThreadAsJson(threadId: string): string {
    const thread = this.threads.get(threadId);
    if (!thread) return JSON.stringify({ error: 'Thread not found' });
    
    const communications = this.getThreadCommunications(threadId);
    
    return JSON.stringify({ thread, communications }, null, 2);
  }
  
  /**
   * Import email from external source
   */
  async importEmail(email: {
    from: string;
    to: string[];
    subject: string;
    body: string;
    date: Date;
    attachments?: Array<{
      name: string;
      type: string;
      size: number;
      content: Buffer;
    }>;
  }): Promise<CommunicationEntity> {
    // Process attachments if any
    const processedAttachments = [];
    if (email.attachments && email.attachments.length > 0) {
      const uploadDir = path.join(process.cwd(), 'uploads', 'emails');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      for (const attachment of email.attachments) {
        const attachmentId = uuidv4();
        const attachmentPath = path.join(uploadDir, `${attachmentId}-${attachment.name}`);
        
        // Save attachment to disk
        fs.writeFileSync(attachmentPath, attachment.content);
        
        processedAttachments.push({
          id: attachmentId,
          name: attachment.name,
          type: attachment.type,
          size: attachment.size,
          path: attachmentPath
        });
      }
    }
    
    // Parse sender name and email
    const fromParts = email.from.match(/^(.*?)\s*<(.+)>$/) || [email.from, email.from, ''];
    const senderName = fromParts[1] || fromParts[0];
    const senderEmail = fromParts[2] || fromParts[0];
    
    // Create communication entity
    const communication = await this.logCommunication({
      participants: [
        {
          name: senderName,
          email: senderEmail,
          role: 'sender'
        },
        ...email.to.map(to => {
          const toParts = to.match(/^(.*?)\s*<(.+)>$/) || [to, to, ''];
          return {
            name: toParts[1] || toParts[0],
            email: toParts[2] || toParts[0],
            role: 'recipient'
          };
        })
      ],
      content: email.body,
      subject: email.subject,
      type: CommunicationType.EMAIL,
      direction: CommunicationDirection.INBOUND,
      category: this.determineCategoryFromContent(email.subject + ' ' + email.body),
      priority: this.determinePriorityFromContent(email.subject + ' ' + email.body),
      status: CommunicationStatus.UNREAD,
      metadata: {
        importedAt: new Date(),
        originalDate: email.date
      },
      attachments: processedAttachments,
      tags: this.determineTagsFromContent(email.subject + ' ' + email.body)
    });
    
    // Analyze the communication
    await this.analyzeCommunication(communication.id);
    
    return communication;
  }
  
  /**
   * Determine category from content
   */
  private determineCategoryFromContent(content: string): CommunicationCategory {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('property') || 
        lowerContent.includes('real estate') || 
        lowerContent.includes('house') || 
        lowerContent.includes('apartment') ||
        lowerContent.includes('mortgage')) {
      return CommunicationCategory.REAL_ESTATE;
    } else if (lowerContent.includes('investment') || 
              lowerContent.includes('stock') || 
              lowerContent.includes('fund') ||
              lowerContent.includes('portfolio')) {
      return CommunicationCategory.INVESTMENT;
    } else if (lowerContent.includes('legal') || 
              lowerContent.includes('contract') || 
              lowerContent.includes('agreement') ||
              lowerContent.includes('lawsuit')) {
      return CommunicationCategory.LEGAL;
    } else if (lowerContent.includes('tax') || 
              lowerContent.includes('irs') || 
              lowerContent.includes('deduction')) {
      return CommunicationCategory.TAX;
    } else if (lowerContent.includes('insurance') || 
              lowerContent.includes('policy') || 
              lowerContent.includes('coverage') ||
              lowerContent.includes('claim')) {
      return CommunicationCategory.INSURANCE;
    } else if (lowerContent.includes('project') || 
              lowerContent.includes('deadline') || 
              lowerContent.includes('milestone')) {
      return CommunicationCategory.PROJECT;
    } else if (lowerContent.includes('client') || 
              lowerContent.includes('customer')) {
      return CommunicationCategory.CLIENT;
    } else if (lowerContent.includes('vendor') || 
              lowerContent.includes('supplier') ||
              lowerContent.includes('service provider')) {
      return CommunicationCategory.VENDOR;
    } else if (lowerContent.includes('partner') || 
              lowerContent.includes('collaboration') ||
              lowerContent.includes('joint')) {
      return CommunicationCategory.PARTNER;
    }
    
    // Default to business category
    return CommunicationCategory.BUSINESS;
  }
  
  /**
   * Determine priority from content
   */
  private determinePriorityFromContent(content: string): CommunicationPriority {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('urgent') || 
        lowerContent.includes('asap') || 
        lowerContent.includes('emergency') ||
        lowerContent.includes('immediately')) {
      return CommunicationPriority.URGENT;
    } else if (lowerContent.includes('important') || 
              lowerContent.includes('high priority') || 
              lowerContent.includes('as soon as')) {
      return CommunicationPriority.HIGH;
    } else if (lowerContent.includes('when you can') || 
              lowerContent.includes('at your convenience')) {
      return CommunicationPriority.LOW;
    }
    
    // Default to medium priority
    return CommunicationPriority.MEDIUM;
  }
  
  /**
   * Determine tags from content
   */
  private determineTagsFromContent(content: string): string[] {
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
    
    if (lowerContent.includes('review') || lowerContent.includes('please check')) {
      tags.push('review');
    }
    
    if (lowerContent.includes('decision') || lowerContent.includes('approve')) {
      tags.push('decision');
    }
    
    return tags;
  }
  
  /**
   * Mock intent detection
   */
  private mockIntent(content: string): string {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('can you') || lowerContent.includes('could you')) {
      return 'request';
    } else if (lowerContent.includes('thank you') || lowerContent.includes('thanks')) {
      return 'appreciation';
    } else if (lowerContent.includes('sorry') || lowerContent.includes('apologize')) {
      return 'apology';
    } else if (lowerContent.includes('how are you') || lowerContent.includes('hope you')) {
      return 'greeting';
    } else if (lowerContent.includes('attached') || lowerContent.includes('please find')) {
      return 'information';
    } else if (lowerContent.includes('remind') || lowerContent.includes('don\'t forget')) {
      return 'reminder';
    } else if (lowerContent.includes('let\'s meet') || lowerContent.includes('schedule a')) {
      return 'scheduling';
    } else if (lowerContent.includes('what do you think') || lowerContent.includes('your opinion')) {
      return 'feedback';
    }
    
    return 'other';
  }
  
  /**
   * Extract entities from content
   */
  private extractEntities(content: string): Array<{ name: string; type: string; value: string }> {
    const entities: Array<{ name: string; type: string; value: string }> = [];
    
    // Extract dollar amounts
    const dollarRegex = /\$\s*(\d+(?:,\d+)*(?:\.\d+)?)/g;
    let dollarMatch;
    while ((dollarMatch = dollarRegex.exec(content)) !== null) {
      entities.push({
        name: 'money',
        type: 'currency',
        value: dollarMatch[0]
      });
    }
    
    // Extract dates
    const dateRegex = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?\b/gi;
    let dateMatch;
    while ((dateMatch = dateRegex.exec(content)) !== null) {
      entities.push({
        name: 'date',
        type: 'date',
        value: dateMatch[0]
      });
    }
    
    // Extract emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let emailMatch;
    while ((emailMatch = emailRegex.exec(content)) !== null) {
      entities.push({
        name: 'email',
        type: 'contact',
        value: emailMatch[0]
      });
    }
    
    // Extract phone numbers
    const phoneRegex = /\b(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
    let phoneMatch;
    while ((phoneMatch = phoneRegex.exec(content)) !== null) {
      entities.push({
        name: 'phone',
        type: 'contact',
        value: phoneMatch[0]
      });
    }
    
    // Extract URLs
    const urlRegex = /\bhttps?:\/\/[^\s]+\b/g;
    let urlMatch;
    while ((urlMatch = urlRegex.exec(content)) !== null) {
      entities.push({
        name: 'url',
        type: 'web',
        value: urlMatch[0]
      });
    }
    
    return entities;
  }
  
  /**
   * Extract topics from content
   */
  private extractTopics(content: string): string[] {
    const topics: string[] = [];
    const lowerContent = content.toLowerCase();
    
    // List of potential topics
    const topicKeywords: Record<string, string[]> = {
      'meeting': ['meeting', 'schedule', 'calendar', 'discuss', 'call'],
      'deadline': ['deadline', 'due date', 'by tomorrow', 'by friday', 'by next week'],
      'proposal': ['proposal', 'offer', 'suggest', 'plan'],
      'invoice': ['invoice', 'payment', 'bill', 'receipt', 'charge'],
      'contract': ['contract', 'agreement', 'terms', 'sign', 'signature'],
      'project': ['project', 'task', 'milestone', 'progress', 'status'],
      'feedback': ['feedback', 'review', 'opinion', 'suggestion', 'thoughts'],
      'introduction': ['introduce', 'meet', 'connection', 'network'],
      'real estate': ['property', 'house', 'apartment', 'real estate', 'mortgage', 'loan'],
      'investment': ['invest', 'stock', 'fund', 'portfolio', 'return'],
      'insurance': ['insurance', 'policy', 'coverage', 'claim', 'premium']
    };
    
    // Check each topic
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        topics.push(topic);
      }
    }
    
    return topics;
  }
  
  /**
   * Extract action items from content
   */
  private extractActionItems(content: string): Array<{ text: string; dueDate?: Date; assignee?: string }> {
    const actionItems: Array<{ text: string; dueDate?: Date; assignee?: string }> = [];
    
    // Split content into sentences
    const sentences = content.split(/(?<=[.!?])\s+/);
    
    // Action verbs that often indicate tasks
    const actionVerbs = [
      'please', 'need to', 'should', 'must', 'will', 'could you', 'can you',
      'send', 'review', 'complete', 'update', 'follow up', 'call', 'email',
      'prepare', 'check', 'confirm', 'schedule', 'book', 'arrange', 'organize',
      'provide', 'share', 'submit', 'upload', 'create', 'draft', 'finish'
    ];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      
      // Check if sentence contains an action verb
      if (actionVerbs.some(verb => lowerSentence.includes(verb))) {
        const actionItem = {
          text: sentence.trim(),
          dueDate: this.extractDate(sentence),
          assignee: this.extractAssignee(sentence)
        };
        
        actionItems.push(actionItem);
      }
    }
    
    return actionItems;
  }
  
  /**
   * Extract date from content
   */
  private extractDate(content: string): Date | undefined {
    // Basic date patterns
    const datePatterns = [
      {
        regex: /\b(tomorrow)\b/i,
        getDate: () => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow;
        }
      },
      {
        regex: /\b(next\s+monday|next\s+tuesday|next\s+wednesday|next\s+thursday|next\s+friday|next\s+saturday|next\s+sunday)\b/i,
        getDate: (match: RegExpMatchArray) => {
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayIndex = days.findIndex(day => match[1].toLowerCase().includes(day));
          
          if (dayIndex !== -1) {
            const today = new Date();
            const currentDayIndex = today.getDay();
            let daysUntilNext = dayIndex - currentDayIndex;
            if (daysUntilNext <= 0) {
              daysUntilNext += 7;
            }
            const nextDate = new Date();
            nextDate.setDate(today.getDate() + daysUntilNext);
            return nextDate;
          }
          
          return undefined;
        }
      },
      {
        regex: /\b(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?\b/,
        getDate: (match: RegExpMatchArray) => {
          try {
            const month = parseInt(match[1]) - 1; // JS months are 0-indexed
            const day = parseInt(match[2]);
            const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
            // Adjust 2-digit years
            const adjustedYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
            
            return new Date(adjustedYear, month, day);
          } catch {
            return undefined;
          }
        }
      }
    ];
    
    // Try each pattern
    for (const pattern of datePatterns) {
      const match = content.match(pattern.regex);
      if (match) {
        const date = pattern.getDate(match);
        if (date && !isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    return undefined;
  }
  
  /**
   * Extract assignee from content
   */
  private extractAssignee(content: string): string | undefined {
    // This would be more sophisticated with NLP, but here's a simple version
    const assigneePatterns = [
      /\bcan\s+you\b/i, // direct assignment to recipient
      /\bI\s+will\b/i,  // self-assignment
      /\b(John|Mary|Bob|Alice|David|Sarah|Mike|Lisa)\s+(?:will|should|needs\s+to|can)\b/i // explicit name
    ];
    
    for (const pattern of assigneePatterns) {
      const match = content.match(pattern);
      if (match) {
        if (pattern.toString().includes('can\\s+you')) {
          return 'you';
        } else if (pattern.toString().includes('I\\s+will')) {
          return 'me';
        } else if (match[1]) {
          return match[1]; // named person
        }
      }
    }
    
    return undefined;
  }
}

// Export singleton instance
export const communicationLogger = new CommunicationLogger();