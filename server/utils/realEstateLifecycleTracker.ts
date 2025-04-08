import { v4 as uuidv4 } from 'uuid';
import { communicationLogger, CommunicationCategory } from './communicationLogger';

/**
 * Real estate transaction stage enum
 */
export enum RealEstateStage {
  INQUIRY = 'inquiry',
  SHOWING = 'showing',
  OFFER_MADE = 'offer_made',
  OFFER_ACCEPTED = 'offer_accepted',
  UNDER_CONTRACT = 'under_contract',
  INSPECTION = 'inspection',
  APPRAISAL = 'appraisal',
  FINANCING = 'financing',
  TITLE_WORK = 'title_work',
  CLOSING_PREP = 'closing_prep',
  CLOSED = 'closed',
  POST_CLOSING = 'post_closing'
}

/**
 * Real estate transaction type enum
 */
export enum RealEstateTransactionType {
  BUYING = 'buying',
  SELLING = 'selling',
  RENTING = 'renting',
  LEASING = 'leasing',
  INVESTMENT = 'investment',
  DEVELOPMENT = 'development',
  PROPERTY_MANAGEMENT = 'property_management'
}

/**
 * Party role in real estate transaction
 */
export enum RealEstatePartyRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  BUYER_AGENT = 'buyer_agent',
  SELLER_AGENT = 'seller_agent',
  MORTGAGE_BROKER = 'mortgage_broker',
  MORTGAGE_LENDER = 'mortgage_lender',
  TITLE_COMPANY = 'title_company',
  INSURANCE_AGENT = 'insurance_agent',
  PROPERTY_INSPECTOR = 'property_inspector',
  APPRAISER = 'appraiser',
  ATTORNEY = 'attorney',
  PROPERTY_MANAGER = 'property_manager'
}

/**
 * Document type for real estate transactions
 */
export enum RealEstateDocumentType {
  LISTING_AGREEMENT = 'listing_agreement',
  PURCHASE_AGREEMENT = 'purchase_agreement',
  DISCLOSURE = 'disclosure',
  INSPECTION_REPORT = 'inspection_report',
  APPRAISAL_REPORT = 'appraisal_report',
  LOAN_ESTIMATE = 'loan_estimate',
  CLOSING_DISCLOSURE = 'closing_disclosure',
  TITLE_REPORT = 'title_report',
  DEED = 'deed',
  MORTGAGE_NOTE = 'mortgage_note',
  INSURANCE_POLICY = 'insurance_policy',
  TAX_DOCUMENT = 'tax_document',
  LEASE_AGREEMENT = 'lease_agreement',
  PROPERTY_MANAGEMENT_AGREEMENT = 'property_management_agreement'
}

/**
 * Property interface
 */
export interface Property {
  id: string;
  address: {
    street: string;
    unit?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  propertyType: 'single_family' | 'multi_family' | 'condo' | 'townhouse' | 'commercial' | 'land' | 'other';
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSize?: string;
  yearBuilt?: number;
  description?: string;
  features?: string[];
  listingPrice?: number;
  status: 'active' | 'pending' | 'sold' | 'off_market' | 'rented' | 'leased';
  primaryImageUrl?: string;
  images?: string[];
  documents?: Array<{
    id: string;
    type: RealEstateDocumentType;
    name: string;
    url: string;
    dateAdded: Date;
  }>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Party interface (person or organization involved in real estate transaction)
 */
export interface Party {
  id: string;
  type: 'person' | 'organization';
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    unit?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  company?: string;
  licenseNumber?: string;
  notes?: string;
  tags?: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transaction task interface
 */
export interface TransactionTask {
  id: string;
  transactionId: string;
  name: string;
  description?: string;
  category: 'document' | 'inspection' | 'financing' | 'title' | 'closing' | 'other';
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  stage: RealEstateStage;
  assignedTo?: string; // Party ID
  dueDate?: Date;
  completedDate?: Date;
  reminderDate?: Date;
  documents?: string[]; // Document IDs
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transaction interface
 */
export interface Transaction {
  id: string;
  propertyId: string;
  transactionType: RealEstateTransactionType;
  currentStage: RealEstateStage;
  stageHistory: Array<{
    stage: RealEstateStage;
    enteredAt: Date;
    completedAt?: Date;
    notes?: string;
  }>;
  parties: Array<{
    partyId: string;
    role: RealEstatePartyRole;
    primaryContact: boolean;
  }>;
  price?: number;
  startDate: Date;
  estimatedCloseDate?: Date;
  actualCloseDate?: Date;
  tasks: string[]; // Task IDs
  documents: Array<{
    id: string;
    type: RealEstateDocumentType;
    name: string;
    url: string;
    dateAdded: Date;
    addedBy?: string; // Party ID
  }>;
  communications: string[]; // Communication IDs
  notes?: string;
  tags?: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Real Estate Lifecycle Tracker class
 */
export class RealEstateLifecycleTracker {
  private properties: Map<string, Property> = new Map();
  private parties: Map<string, Party> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private tasks: Map<string, TransactionTask> = new Map();
  
  constructor() {}
  
  /**
   * Add a new property
   */
  addProperty(property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Property {
    const id = uuidv4();
    const now = new Date();
    
    const newProperty: Property = {
      ...property,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.properties.set(id, newProperty);
    return newProperty;
  }
  
  /**
   * Update an existing property
   */
  updateProperty(id: string, updates: Partial<Omit<Property, 'id' | 'createdAt' | 'updatedAt'>>): Property | null {
    const property = this.properties.get(id);
    if (!property) return null;
    
    const updatedProperty: Property = {
      ...property,
      ...updates,
      updatedAt: new Date()
    };
    
    this.properties.set(id, updatedProperty);
    return updatedProperty;
  }
  
  /**
   * Get property by ID
   */
  getProperty(id: string): Property | undefined {
    return this.properties.get(id);
  }
  
  /**
   * Delete property
   */
  deleteProperty(id: string): boolean {
    return this.properties.delete(id);
  }
  
  /**
   * List all properties
   */
  listProperties(): Property[] {
    return Array.from(this.properties.values());
  }
  
  /**
   * Search properties by criteria
   */
  searchProperties(criteria: {
    status?: string;
    propertyType?: string;
    city?: string;
    state?: string;
    minPrice?: number;
    maxPrice?: number;
    minBedrooms?: number;
    minBathrooms?: number;
  }): Property[] {
    return Array.from(this.properties.values()).filter(property => {
      if (criteria.status && property.status !== criteria.status) return false;
      if (criteria.propertyType && property.propertyType !== criteria.propertyType) return false;
      if (criteria.city && property.address.city.toLowerCase() !== criteria.city.toLowerCase()) return false;
      if (criteria.state && property.address.state.toLowerCase() !== criteria.state.toLowerCase()) return false;
      if (criteria.minPrice && property.listingPrice && property.listingPrice < criteria.minPrice) return false;
      if (criteria.maxPrice && property.listingPrice && property.listingPrice > criteria.maxPrice) return false;
      if (criteria.minBedrooms && property.bedrooms && property.bedrooms < criteria.minBedrooms) return false;
      if (criteria.minBathrooms && property.bathrooms && property.bathrooms < criteria.minBathrooms) return false;
      return true;
    });
  }
  
  /**
   * Add a new party
   */
  addParty(party: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>): Party {
    const id = uuidv4();
    const now = new Date();
    
    const newParty: Party = {
      ...party,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.parties.set(id, newParty);
    return newParty;
  }
  
  /**
   * Update an existing party
   */
  updateParty(id: string, updates: Partial<Omit<Party, 'id' | 'createdAt' | 'updatedAt'>>): Party | null {
    const party = this.parties.get(id);
    if (!party) return null;
    
    const updatedParty: Party = {
      ...party,
      ...updates,
      updatedAt: new Date()
    };
    
    this.parties.set(id, updatedParty);
    return updatedParty;
  }
  
  /**
   * Get party by ID
   */
  getParty(id: string): Party | undefined {
    return this.parties.get(id);
  }
  
  /**
   * Delete party
   */
  deleteParty(id: string): boolean {
    return this.parties.delete(id);
  }
  
  /**
   * List all parties
   */
  listParties(): Party[] {
    return Array.from(this.parties.values());
  }
  
  /**
   * Search parties by criteria
   */
  searchParties(criteria: {
    type?: 'person' | 'organization';
    name?: string;
    email?: string;
    phone?: string;
    tag?: string;
  }): Party[] {
    return Array.from(this.parties.values()).filter(party => {
      if (criteria.type && party.type !== criteria.type) return false;
      if (criteria.name && !party.name.toLowerCase().includes(criteria.name.toLowerCase())) return false;
      if (criteria.email && party.email && !party.email.toLowerCase().includes(criteria.email.toLowerCase())) return false;
      if (criteria.phone && party.phone && !party.phone.includes(criteria.phone)) return false;
      if (criteria.tag && party.tags && !party.tags.includes(criteria.tag)) return false;
      return true;
    });
  }
  
  /**
   * Create a new transaction
   */
  createTransaction(transaction: Omit<Transaction, 'id' | 'stageHistory' | 'createdAt' | 'updatedAt'>): Transaction {
    const id = uuidv4();
    const now = new Date();
    
    const newTransaction: Transaction = {
      ...transaction,
      id,
      stageHistory: [
        {
          stage: transaction.currentStage,
          enteredAt: now,
          notes: 'Transaction created'
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }
  
  /**
   * Update transaction stage
   */
  updateTransactionStage(id: string, stage: RealEstateStage, notes?: string): Transaction | null {
    const transaction = this.transactions.get(id);
    if (!transaction) return null;
    
    const now = new Date();
    
    // Mark previous stage as completed
    if (transaction.stageHistory.length > 0) {
      const lastStage = transaction.stageHistory[transaction.stageHistory.length - 1];
      if (!lastStage.completedAt) {
        lastStage.completedAt = now;
      }
    }
    
    // Add new stage
    transaction.stageHistory.push({
      stage,
      enteredAt: now,
      notes
    });
    
    // Update current stage
    transaction.currentStage = stage;
    transaction.updatedAt = now;
    
    this.transactions.set(id, transaction);
    return transaction;
  }
  
  /**
   * Add a party to a transaction
   */
  addPartyToTransaction(
    transactionId: string, 
    partyId: string, 
    role: RealEstatePartyRole, 
    primaryContact: boolean = false
  ): Transaction | null {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return null;
    
    const party = this.parties.get(partyId);
    if (!party) return null;
    
    // Check if party already exists in this role
    const existingPartyIndex = transaction.parties.findIndex(
      p => p.partyId === partyId && p.role === role
    );
    
    if (existingPartyIndex >= 0) {
      // Update existing party
      transaction.parties[existingPartyIndex].primaryContact = primaryContact;
    } else {
      // Add new party
      transaction.parties.push({
        partyId,
        role,
        primaryContact
      });
    }
    
    transaction.updatedAt = new Date();
    this.transactions.set(transactionId, transaction);
    
    return transaction;
  }
  
  /**
   * Remove a party from a transaction
   */
  removePartyFromTransaction(transactionId: string, partyId: string, role: RealEstatePartyRole): Transaction | null {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return null;
    
    transaction.parties = transaction.parties.filter(
      p => !(p.partyId === partyId && p.role === role)
    );
    
    transaction.updatedAt = new Date();
    this.transactions.set(transactionId, transaction);
    
    return transaction;
  }
  
  /**
   * Add a document to a transaction
   */
  addDocumentToTransaction(
    transactionId: string,
    document: {
      type: RealEstateDocumentType;
      name: string;
      url: string;
      addedBy?: string;
    }
  ): Transaction | null {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return null;
    
    const docId = uuidv4();
    
    transaction.documents.push({
      id: docId,
      type: document.type,
      name: document.name,
      url: document.url,
      dateAdded: new Date(),
      addedBy: document.addedBy
    });
    
    transaction.updatedAt = new Date();
    this.transactions.set(transactionId, transaction);
    
    return transaction;
  }
  
  /**
   * Remove a document from a transaction
   */
  removeDocumentFromTransaction(transactionId: string, documentId: string): Transaction | null {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return null;
    
    transaction.documents = transaction.documents.filter(d => d.id !== documentId);
    
    transaction.updatedAt = new Date();
    this.transactions.set(transactionId, transaction);
    
    return transaction;
  }
  
  /**
   * Link a communication to a transaction
   */
  linkCommunicationToTransaction(transactionId: string, communicationId: string): Transaction | null {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return null;
    
    if (!transaction.communications.includes(communicationId)) {
      transaction.communications.push(communicationId);
      transaction.updatedAt = new Date();
      this.transactions.set(transactionId, transaction);
    }
    
    return transaction;
  }
  
  /**
   * Create a task for a transaction
   */
  createTransactionTask(task: Omit<TransactionTask, 'id' | 'createdAt' | 'updatedAt'>): TransactionTask {
    const id = uuidv4();
    const now = new Date();
    
    const newTask: TransactionTask = {
      ...task,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.tasks.set(id, newTask);
    
    // Add task to transaction
    const transaction = this.transactions.get(task.transactionId);
    if (transaction) {
      if (!transaction.tasks.includes(id)) {
        transaction.tasks.push(id);
        transaction.updatedAt = now;
        this.transactions.set(task.transactionId, transaction);
      }
    }
    
    return newTask;
  }
  
  /**
   * Update a transaction task
   */
  updateTransactionTask(
    id: string, 
    updates: Partial<Omit<TransactionTask, 'id' | 'transactionId' | 'createdAt' | 'updatedAt'>>
  ): TransactionTask | null {
    const task = this.tasks.get(id);
    if (!task) return null;
    
    const updatedTask: TransactionTask = {
      ...task,
      ...updates,
      updatedAt: new Date()
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  /**
   * Get task by ID
   */
  getTask(id: string): TransactionTask | undefined {
    return this.tasks.get(id);
  }
  
  /**
   * Delete task
   */
  deleteTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    
    // Remove from transaction
    const transaction = this.transactions.get(task.transactionId);
    if (transaction) {
      transaction.tasks = transaction.tasks.filter(taskId => taskId !== id);
      transaction.updatedAt = new Date();
      this.transactions.set(task.transactionId, transaction);
    }
    
    return this.tasks.delete(id);
  }
  
  /**
   * Get transaction by ID
   */
  getTransaction(id: string): Transaction | undefined {
    return this.transactions.get(id);
  }
  
  /**
   * List all transactions
   */
  listTransactions(): Transaction[] {
    return Array.from(this.transactions.values());
  }
  
  /**
   * Get transaction tasks
   */
  getTransactionTasks(transactionId: string): TransactionTask[] {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return [];
    
    return transaction.tasks
      .map(taskId => this.tasks.get(taskId))
      .filter((task): task is TransactionTask => task !== undefined);
  }
  
  /**
   * Get transaction communications
   */
  getTransactionCommunications(transactionId: string): string[] {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return [];
    
    return transaction.communications;
  }
  
  /**
   * Get transaction parties
   */
  getTransactionParties(transactionId: string): Array<Party & { role: RealEstatePartyRole; primaryContact: boolean }> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return [];
    
    return transaction.parties
      .map(partyRelation => {
        const party = this.parties.get(partyRelation.partyId);
        if (!party) return null;
        
        return {
          ...party,
          role: partyRelation.role,
          primaryContact: partyRelation.primaryContact
        };
      })
      .filter((party): party is Party & { role: RealEstatePartyRole; primaryContact: boolean } => party !== null);
  }
  
  /**
   * Search transactions by criteria
   */
  searchTransactions(criteria: {
    propertyId?: string;
    transactionType?: RealEstateTransactionType;
    currentStage?: RealEstateStage;
    partyId?: string;
    startDateMin?: Date;
    startDateMax?: Date;
    tag?: string;
  }): Transaction[] {
    return Array.from(this.transactions.values()).filter(transaction => {
      if (criteria.propertyId && transaction.propertyId !== criteria.propertyId) return false;
      if (criteria.transactionType && transaction.transactionType !== criteria.transactionType) return false;
      if (criteria.currentStage && transaction.currentStage !== criteria.currentStage) return false;
      if (criteria.partyId && !transaction.parties.some(p => p.partyId === criteria.partyId)) return false;
      if (criteria.startDateMin && transaction.startDate < criteria.startDateMin) return false;
      if (criteria.startDateMax && transaction.startDate > criteria.startDateMax) return false;
      if (criteria.tag && transaction.tags && !transaction.tags.includes(criteria.tag)) return false;
      return true;
    });
  }
  
  /**
   * Process a communication related to real estate
   */
  async processRealEstateCommunication(communicationId: string): Promise<Transaction | null> {
    try {
      // In a real implementation, this would analyze the communication content
      // and automatically link it to the relevant transaction(s)
      
      // For demonstration, we'll implement a simplified version
      
      // Get the communication from the logger
      // @ts-ignore - assuming this method exists in communicationLogger
      const communication = await communicationLogger.getCommunication(communicationId);
      
      if (!communication) return null;
      
      // Only process if it's related to real estate
      if (communication.category !== CommunicationCategory.REAL_ESTATE) return null;
      
      // Find the most relevant transaction
      // In a more sophisticated implementation, this would use NLP to extract property details
      
      // For now, we'll check all active transactions and look for matching participants
      const activeTransactions = this.listTransactions().filter(
        t => t.actualCloseDate === undefined
      );
      
      if (activeTransactions.length === 0) return null;
      
      // Look for matching participants (very simplified)
      for (const transaction of activeTransactions) {
        const parties = this.getTransactionParties(transaction.id);
        
        // Check if any communication participant matches a transaction party
        const matchingParty = parties.find(party => 
          communication.participants.some(participant => 
            participant.email === party.email || 
            participant.phone === party.phone
          )
        );
        
        if (matchingParty) {
          // Link the communication to this transaction
          this.linkCommunicationToTransaction(transaction.id, communication.id);
          return transaction;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error processing real estate communication:', error);
      return null;
    }
  }
  
  /**
   * Generate a transaction timeline
   */
  generateTransactionTimeline(transactionId: string): Array<{
    date: Date;
    type: 'stage_change' | 'document_added' | 'task_created' | 'task_completed' | 'communication';
    title: string;
    description: string;
    entityId: string;
  }> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return [];
    
    const timeline: Array<{
      date: Date;
      type: 'stage_change' | 'document_added' | 'task_created' | 'task_completed' | 'communication';
      title: string;
      description: string;
      entityId: string;
    }> = [];
    
    // Add stage changes
    for (const stageChange of transaction.stageHistory) {
      timeline.push({
        date: stageChange.enteredAt,
        type: 'stage_change',
        title: `Stage: ${this.formatStage(stageChange.stage)}`,
        description: stageChange.notes || `Transaction moved to ${this.formatStage(stageChange.stage)} stage`,
        entityId: transaction.id
      });
    }
    
    // Add documents
    for (const document of transaction.documents) {
      timeline.push({
        date: document.dateAdded,
        type: 'document_added',
        title: `Document: ${document.name}`,
        description: `${this.formatDocumentType(document.type)} was added`,
        entityId: document.id
      });
    }
    
    // Add tasks
    const tasks = this.getTransactionTasks(transactionId);
    for (const task of tasks) {
      // Task created
      timeline.push({
        date: task.createdAt,
        type: 'task_created',
        title: `Task: ${task.name}`,
        description: task.description || 'New task added to transaction',
        entityId: task.id
      });
      
      // Task completed (if applicable)
      if (task.status === 'completed' && task.completedDate) {
        timeline.push({
          date: task.completedDate,
          type: 'task_completed',
          title: `Completed: ${task.name}`,
          description: `Task marked as completed`,
          entityId: task.id
        });
      }
    }
    
    // Sort by date (newest first)
    timeline.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return timeline;
  }
  
  /**
   * Format stage for display
   */
  private formatStage(stage: RealEstateStage): string {
    return stage.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  
  /**
   * Format document type for display
   */
  private formatDocumentType(type: RealEstateDocumentType): string {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  
  /**
   * Generate tasks for a transaction stage
   */
  generateTasksForStage(transactionId: string, stage: RealEstateStage): TransactionTask[] {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return [];
    
    const tasks: TransactionTask[] = [];
    const now = new Date();
    
    // Define task templates by stage
    const taskTemplates: Record<RealEstateStage, Array<{
      name: string;
      description: string;
      category: 'document' | 'inspection' | 'financing' | 'title' | 'closing' | 'other';
      daysUntilDue?: number;
    }>> = {
      [RealEstateStage.INQUIRY]: [
        {
          name: 'Initial consultation',
          description: 'Schedule and complete initial client consultation',
          category: 'other',
          daysUntilDue: 3
        },
        {
          name: 'Client needs assessment',
          description: 'Document client requirements and preferences',
          category: 'document',
          daysUntilDue: 5
        }
      ],
      [RealEstateStage.SHOWING]: [
        {
          name: 'Schedule property viewings',
          description: 'Arrange showings for properties that match client criteria',
          category: 'other',
          daysUntilDue: 7
        },
        {
          name: 'Prepare property comparison',
          description: 'Create a comparison sheet of viewed properties',
          category: 'document',
          daysUntilDue: 10
        }
      ],
      [RealEstateStage.OFFER_MADE]: [
        {
          name: 'Prepare offer documents',
          description: 'Draft and review offer to purchase',
          category: 'document',
          daysUntilDue: 1
        },
        {
          name: 'Submit earnest money',
          description: 'Ensure earnest money deposit is submitted',
          category: 'other',
          daysUntilDue: 3
        }
      ],
      [RealEstateStage.OFFER_ACCEPTED]: [
        {
          name: 'Schedule home inspection',
          description: 'Arrange for professional home inspection',
          category: 'inspection',
          daysUntilDue: 7
        },
        {
          name: 'Apply for mortgage',
          description: 'Submit mortgage application',
          category: 'financing',
          daysUntilDue: 5
        }
      ],
      [RealEstateStage.UNDER_CONTRACT]: [
        {
          name: 'Review purchase agreement',
          description: 'Carefully review all terms of the purchase agreement',
          category: 'document',
          daysUntilDue: 3
        },
        {
          name: 'Verify earnest money receipt',
          description: 'Confirm earnest money has been received and documented',
          category: 'other',
          daysUntilDue: 2
        }
      ],
      [RealEstateStage.INSPECTION]: [
        {
          name: 'Review inspection report',
          description: 'Review home inspection findings',
          category: 'inspection',
          daysUntilDue: 2
        },
        {
          name: 'Negotiate repairs',
          description: 'Discuss and negotiate necessary repairs with seller',
          category: 'other',
          daysUntilDue: 5
        }
      ],
      [RealEstateStage.APPRAISAL]: [
        {
          name: 'Schedule appraisal',
          description: 'Arrange for property appraisal',
          category: 'other',
          daysUntilDue: 7
        },
        {
          name: 'Review appraisal report',
          description: 'Review appraisal results and address any issues',
          category: 'document',
          daysUntilDue: 10
        }
      ],
      [RealEstateStage.FINANCING]: [
        {
          name: 'Submit financial documents',
          description: 'Provide all required financial documentation to lender',
          category: 'document',
          daysUntilDue: 3
        },
        {
          name: 'Review loan estimate',
          description: 'Review loan estimate and address any concerns',
          category: 'financing',
          daysUntilDue: 5
        }
      ],
      [RealEstateStage.TITLE_WORK]: [
        {
          name: 'Order title search',
          description: 'Request title search and review results',
          category: 'title',
          daysUntilDue: 7
        },
        {
          name: 'Resolve title issues',
          description: 'Address any title defects or liens',
          category: 'title',
          daysUntilDue: 14
        }
      ],
      [RealEstateStage.CLOSING_PREP]: [
        {
          name: 'Schedule closing',
          description: 'Coordinate closing date and time with all parties',
          category: 'closing',
          daysUntilDue: 7
        },
        {
          name: 'Review closing disclosure',
          description: 'Review closing disclosure and verify all costs',
          category: 'document',
          daysUntilDue: 3
        },
        {
          name: 'Final walkthrough',
          description: 'Schedule and complete final property walkthrough',
          category: 'inspection',
          daysUntilDue: 1
        }
      ],
      [RealEstateStage.CLOSED]: [
        {
          name: 'Transfer utilities',
          description: 'Ensure all utilities are transferred to new owner',
          category: 'other',
          daysUntilDue: 3
        },
        {
          name: 'Distribute closing documents',
          description: 'Provide copies of all closing documents to client',
          category: 'document',
          daysUntilDue: 5
        },
        {
          name: 'Record deed',
          description: 'Ensure deed is properly recorded',
          category: 'document',
          daysUntilDue: 7
        }
      ],
      [RealEstateStage.POST_CLOSING]: [
        {
          name: 'Client follow-up',
          description: 'Check in with client after move-in',
          category: 'other',
          daysUntilDue: 14
        },
        {
          name: 'Address any outstanding issues',
          description: 'Resolve any remaining concerns or questions',
          category: 'other',
          daysUntilDue: 30
        }
      ]
    };
    
    // Get task templates for the current stage
    const templates = taskTemplates[stage] || [];
    
    // Create tasks from templates
    for (const template of templates) {
      // Calculate due date
      const dueDate = template.daysUntilDue 
        ? new Date(now.getTime() + template.daysUntilDue * 24 * 60 * 60 * 1000) 
        : undefined;
      
      // Create the task
      const task = this.createTransactionTask({
        transactionId,
        name: template.name,
        description: template.description,
        category: template.category,
        status: 'not_started',
        stage,
        dueDate
      });
      
      tasks.push(task);
    }
    
    return tasks;
  }
}

// Export singleton instance
export const realEstateLifecycleTracker = new RealEstateLifecycleTracker();