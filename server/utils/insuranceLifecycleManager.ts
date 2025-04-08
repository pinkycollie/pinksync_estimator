import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { communicationLogger, CommunicationCategory } from './communicationLogger';

/**
 * Insurance policy type enum
 */
export enum InsurancePolicyType {
  HOME = 'home',
  AUTO = 'auto',
  LIFE = 'life',
  HEALTH = 'health',
  DISABILITY = 'disability',
  BUSINESS = 'business',
  LIABILITY = 'liability',
  FLOOD = 'flood',
  EARTHQUAKE = 'earthquake',
  RENTERS = 'renters',
  TRAVEL = 'travel',
  PET = 'pet',
  UMBRELLA = 'umbrella',
  OTHER = 'other'
}

/**
 * Insurance policy status enum
 */
export enum InsurancePolicyStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  RENEWAL = 'renewal',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  ON_HOLD = 'on_hold',
  CLAIMED = 'claimed',
  LAPSED = 'lapsed'
}

/**
 * Insurance claim status enum
 */
export enum InsuranceClaimStatus {
  FILED = 'filed',
  UNDER_REVIEW = 'under_review',
  ADDITIONAL_INFO_NEEDED = 'additional_info_needed',
  APPROVED = 'approved',
  PARTIALLY_APPROVED = 'partially_approved',
  DENIED = 'denied',
  APPEALED = 'appealed',
  CLOSED = 'closed'
}

/**
 * Accessibility feature enum
 */
export enum AccessibilityFeature {
  SIGN_LANGUAGE_SUPPORT = 'sign_language_support',
  VIDEO_RELAY = 'video_relay',
  REAL_TIME_CAPTIONING = 'real_time_captioning',
  TEXT_TO_SPEECH = 'text_to_speech',
  VISUAL_NOTIFICATIONS = 'visual_notifications',
  VIBRATION_ALERTS = 'vibration_alerts',
  SIMPLIFIED_DOCUMENTS = 'simplified_documents',
  ASL_TRANSLATED_DOCUMENTS = 'asl_translated_documents',
  ACCESSIBLE_CUSTOMER_SERVICE = 'accessible_customer_service',
  DEAF_SPECIALIST_REPRESENTATION = 'deaf_specialist_representation'
}

/**
 * Insurance provider interface
 */
export interface InsuranceProvider {
  id: string;
  name: string;
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
  };
  accessibilityFeatures: AccessibilityFeature[];
  specializedPrograms?: Array<{
    name: string;
    description: string;
    eligibilityRequirements?: string;
    benefits?: string[];
  }>;
  deafFriendlyRating?: number; // 1-5 scale
  notes?: string;
  metadata: Record<string, any>;
}

/**
 * Insurance policy interface
 */
export interface InsurancePolicy {
  id: string;
  policyNumber: string;
  providerId: string;
  policyType: InsurancePolicyType;
  status: InsurancePolicyStatus;
  policyHolders: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    relationship: string;
  }>;
  coverageDetails: {
    startDate: Date;
    endDate: Date;
    coverageAmount: number;
    deductible: number;
    premium: {
      amount: number;
      frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
      dueDate: Date;
      autoPay: boolean;
    };
    coverageItems?: Array<{
      name: string;
      description: string;
      value?: number;
      covered?: boolean;
    }>;
  };
  property?: {
    address: {
      street: string;
      unit?: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
    type: 'single_family' | 'multi_family' | 'condo' | 'townhouse' | 'apartment' | 'mobile_home' | 'other';
    yearBuilt?: number;
    squareFeet?: number;
  };
  vehicle?: {
    make: string;
    model: string;
    year: number;
    vin: string;
    licensePlate?: string;
    primaryDriver?: string;
  };
  documents: Array<{
    id: string;
    name: string;
    type: 'policy_document' | 'endorsement' | 'proof_of_insurance' | 'claim_document' | 'communication' | 'bill' | 'receipt' | 'other';
    url: string;
    dateAdded: Date;
    aslTranslationAvailable?: boolean;
    aslTranslationUrl?: string;
  }>;
  claims: string[]; // Claim IDs
  history: Array<{
    date: Date;
    action: 'created' | 'updated' | 'renewed' | 'cancelled' | 'payment' | 'claim_filed' | 'endorsement_added';
    description: string;
    performedBy: string;
  }>;
  accessibilityRequirements: AccessibilityFeature[];
  notes?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Insurance claim interface
 */
export interface InsuranceClaim {
  id: string;
  claimNumber: string;
  policyId: string;
  status: InsuranceClaimStatus;
  incidentDetails: {
    date: Date;
    description: string;
    location?: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
    type: 'theft' | 'fire' | 'water_damage' | 'accident' | 'medical' | 'liability' | 'natural_disaster' | 'other';
  };
  filedDate: Date;
  claimAmount: number;
  approvedAmount?: number;
  deductibleApplied: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'denied';
  paymentHistory: Array<{
    date: Date;
    amount: number;
    method: string;
    reference: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    type: 'claim_form' | 'evidence' | 'estimate' | 'invoice' | 'settlement' | 'communication' | 'other';
    url: string;
    dateAdded: Date;
    aslTranslationAvailable?: boolean;
    aslTranslationUrl?: string;
  }>;
  communications: string[]; // Communication IDs
  adjuster?: {
    name: string;
    email?: string;
    phone?: string;
    accessibilityTraining?: boolean;
  };
  accessibilityRequirements: AccessibilityFeature[];
  notes?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Premium payment interface
 */
export interface PremiumPayment {
  id: string;
  policyId: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: 'due' | 'paid' | 'late' | 'cancelled';
  paymentMethod?: string;
  transactionId?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Insurance lifecycle manager class
 */
export class InsuranceLifecycleManager {
  private providers: Map<string, InsuranceProvider> = new Map();
  private policies: Map<string, InsurancePolicy> = new Map();
  private claims: Map<string, InsuranceClaim> = new Map();
  private payments: Map<string, PremiumPayment> = new Map();
  
  constructor() {}
  
  /**
   * Add a new insurance provider
   */
  addProvider(provider: Omit<InsuranceProvider, 'id'>): InsuranceProvider {
    const id = uuidv4();
    
    const newProvider: InsuranceProvider = {
      ...provider,
      id
    };
    
    this.providers.set(id, newProvider);
    return newProvider;
  }
  
  /**
   * Update an insurance provider
   */
  updateProvider(id: string, updates: Partial<Omit<InsuranceProvider, 'id'>>): InsuranceProvider | null {
    const provider = this.providers.get(id);
    if (!provider) return null;
    
    const updatedProvider: InsuranceProvider = {
      ...provider,
      ...updates
    };
    
    this.providers.set(id, updatedProvider);
    return updatedProvider;
  }
  
  /**
   * Get provider by ID
   */
  getProvider(id: string): InsuranceProvider | undefined {
    return this.providers.get(id);
  }
  
  /**
   * List all providers
   */
  listProviders(): InsuranceProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * Find deaf-friendly providers
   */
  findDeafFriendlyProviders(minRating: number = 3): InsuranceProvider[] {
    return this.listProviders().filter(provider => {
      // Has deaf-friendly rating above minimum
      if (provider.deafFriendlyRating && provider.deafFriendlyRating >= minRating) {
        return true;
      }
      
      // Has at least 3 accessibility features
      if (provider.accessibilityFeatures.length >= 3) {
        return true;
      }
      
      // Has specialized programs for deaf individuals
      if (provider.specializedPrograms && provider.specializedPrograms.some(
        program => program.description.toLowerCase().includes('deaf') || 
                   program.description.toLowerCase().includes('hearing')
      )) {
        return true;
      }
      
      return false;
    });
  }
  
  /**
   * Create a new insurance policy
   */
  createPolicy(policy: Omit<InsurancePolicy, 'id' | 'history' | 'createdAt' | 'updatedAt'>): InsurancePolicy {
    const id = uuidv4();
    const now = new Date();
    
    const newPolicy: InsurancePolicy = {
      ...policy,
      id,
      history: [
        {
          date: now,
          action: 'created',
          description: 'Policy created',
          performedBy: 'system'
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    
    this.policies.set(id, newPolicy);
    
    // Create premium payment records based on policy information
    this.generatePremiumPayments(newPolicy);
    
    return newPolicy;
  }
  
  /**
   * Update an insurance policy
   */
  updatePolicy(id: string, updates: Partial<Omit<InsurancePolicy, 'id' | 'history' | 'createdAt' | 'updatedAt'>>, performedBy: string = 'system'): InsurancePolicy | null {
    const policy = this.policies.get(id);
    if (!policy) return null;
    
    const now = new Date();
    
    const updatedPolicy: InsurancePolicy = {
      ...policy,
      ...updates,
      history: [
        ...policy.history,
        {
          date: now,
          action: 'updated',
          description: 'Policy updated',
          performedBy
        }
      ],
      updatedAt: now
    };
    
    this.policies.set(id, updatedPolicy);
    
    // If premium info changed, update payment records
    if (updates.coverageDetails?.premium) {
      this.updatePremiumPayments(updatedPolicy);
    }
    
    return updatedPolicy;
  }
  
  /**
   * Get policy by ID
   */
  getPolicy(id: string): InsurancePolicy | undefined {
    return this.policies.get(id);
  }
  
  /**
   * List all policies
   */
  listPolicies(): InsurancePolicy[] {
    return Array.from(this.policies.values());
  }
  
  /**
   * Find policies by criteria
   */
  findPolicies(criteria: {
    policyType?: InsurancePolicyType;
    status?: InsurancePolicyStatus;
    providerId?: string;
    policyHolderId?: string;
    expiringWithinDays?: number;
    hasASLTranslation?: boolean;
  }): InsurancePolicy[] {
    const now = new Date();
    
    return this.listPolicies().filter(policy => {
      // Filter by policy type
      if (criteria.policyType && policy.policyType !== criteria.policyType) {
        return false;
      }
      
      // Filter by status
      if (criteria.status && policy.status !== criteria.status) {
        return false;
      }
      
      // Filter by provider
      if (criteria.providerId && policy.providerId !== criteria.providerId) {
        return false;
      }
      
      // Filter by policy holder
      if (criteria.policyHolderId && !policy.policyHolders.some(
        holder => holder.id === criteria.policyHolderId
      )) {
        return false;
      }
      
      // Filter by expiring within days
      if (criteria.expiringWithinDays) {
        const expiryDate = new Date(policy.coverageDetails.endDate);
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry > criteria.expiringWithinDays) {
          return false;
        }
      }
      
      // Filter by ASL translation availability
      if (criteria.hasASLTranslation === true) {
        if (!policy.documents.some(doc => doc.aslTranslationAvailable === true)) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Add a document to a policy
   */
  addPolicyDocument(
    policyId: string,
    document: {
      name: string;
      type: 'policy_document' | 'endorsement' | 'proof_of_insurance' | 'claim_document' | 'communication' | 'bill' | 'receipt' | 'other';
      url: string;
      aslTranslationAvailable?: boolean;
      aslTranslationUrl?: string;
    },
    performedBy: string = 'system'
  ): InsurancePolicy | null {
    const policy = this.policies.get(policyId);
    if (!policy) return null;
    
    const now = new Date();
    const docId = uuidv4();
    
    // Add document to policy
    policy.documents.push({
      id: docId,
      name: document.name,
      type: document.type,
      url: document.url,
      dateAdded: now,
      aslTranslationAvailable: document.aslTranslationAvailable,
      aslTranslationUrl: document.aslTranslationUrl
    });
    
    // Add to history
    policy.history.push({
      date: now,
      action: document.type === 'endorsement' ? 'endorsement_added' : 'updated',
      description: `Added document: ${document.name}`,
      performedBy
    });
    
    policy.updatedAt = now;
    this.policies.set(policyId, policy);
    
    return policy;
  }
  
  /**
   * Add ASL translation to a document
   */
  addASLTranslationToDocument(
    policyId: string,
    documentId: string,
    translationUrl: string,
    performedBy: string = 'system'
  ): InsurancePolicy | null {
    const policy = this.policies.get(policyId);
    if (!policy) return null;
    
    const docIndex = policy.documents.findIndex(doc => doc.id === documentId);
    if (docIndex === -1) return null;
    
    // Update document with ASL translation
    policy.documents[docIndex] = {
      ...policy.documents[docIndex],
      aslTranslationAvailable: true,
      aslTranslationUrl: translationUrl
    };
    
    // Add to history
    const now = new Date();
    policy.history.push({
      date: now,
      action: 'updated',
      description: `Added ASL translation for document: ${policy.documents[docIndex].name}`,
      performedBy
    });
    
    policy.updatedAt = now;
    this.policies.set(policyId, policy);
    
    return policy;
  }
  
  /**
   * Renew a policy
   */
  renewPolicy(
    policyId: string,
    renewalDetails: {
      newEndDate: Date;
      newPremium?: {
        amount: number;
        frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
        dueDate: Date;
        autoPay: boolean;
      };
      coverageChanges?: Record<string, any>;
    },
    performedBy: string = 'system'
  ): InsurancePolicy | null {
    const policy = this.policies.get(policyId);
    if (!policy) return null;
    
    const now = new Date();
    
    // Update policy with renewal information
    const updatedPolicy: InsurancePolicy = {
      ...policy,
      status: InsurancePolicyStatus.ACTIVE,
      coverageDetails: {
        ...policy.coverageDetails,
        endDate: renewalDetails.newEndDate,
        premium: renewalDetails.newPremium || policy.coverageDetails.premium,
        ...renewalDetails.coverageChanges
      },
      history: [
        ...policy.history,
        {
          date: now,
          action: 'renewed',
          description: `Policy renewed until ${renewalDetails.newEndDate.toISOString().split('T')[0]}`,
          performedBy
        }
      ],
      updatedAt: now
    };
    
    this.policies.set(policyId, updatedPolicy);
    
    // Generate new premium payments
    this.generatePremiumPayments(updatedPolicy);
    
    return updatedPolicy;
  }
  
  /**
   * Generate premium payments for a policy
   */
  private generatePremiumPayments(policy: InsurancePolicy): void {
    const { premium } = policy.coverageDetails;
    
    // Define the frequency in months
    const frequencyInMonths = {
      'monthly': 1,
      'quarterly': 3,
      'semi_annual': 6,
      'annual': 12
    };
    
    // Calculate number of payments based on policy duration
    const startDate = new Date(policy.coverageDetails.startDate);
    const endDate = new Date(policy.coverageDetails.endDate);
    
    const policyDurationMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                                (endDate.getMonth() - startDate.getMonth());
    
    const numberOfPayments = Math.ceil(policyDurationMonths / frequencyInMonths[premium.frequency]);
    
    // Generate payment records
    for (let i = 0; i < numberOfPayments; i++) {
      const dueDate = new Date(premium.dueDate);
      dueDate.setMonth(dueDate.getMonth() + (i * frequencyInMonths[premium.frequency]));
      
      // Skip if the due date is beyond the policy end date
      if (dueDate > endDate) continue;
      
      const paymentId = uuidv4();
      const now = new Date();
      
      const payment: PremiumPayment = {
        id: paymentId,
        policyId: policy.id,
        amount: premium.amount,
        dueDate,
        status: dueDate <= now ? 'due' : 'due',
        createdAt: now,
        updatedAt: now
      };
      
      this.payments.set(paymentId, payment);
    }
  }
  
  /**
   * Update premium payments for a policy
   */
  private updatePremiumPayments(policy: InsurancePolicy): void {
    // Delete future payments
    const now = new Date();
    
    // Find and delete future payments for this policy
    for (const [id, payment] of this.payments.entries()) {
      if (payment.policyId === policy.id && payment.dueDate > now && payment.status === 'due') {
        this.payments.delete(id);
      }
    }
    
    // Generate new payment schedule
    this.generatePremiumPayments(policy);
  }
  
  /**
   * Record a premium payment
   */
  recordPremiumPayment(
    paymentId: string,
    details: {
      paidDate: Date;
      paymentMethod: string;
      transactionId?: string;
      receiptUrl?: string;
      notes?: string;
    }
  ): PremiumPayment | null {
    const payment = this.payments.get(paymentId);
    if (!payment) return null;
    
    const updatedPayment: PremiumPayment = {
      ...payment,
      paidDate: details.paidDate,
      status: 'paid',
      paymentMethod: details.paymentMethod,
      transactionId: details.transactionId,
      receiptUrl: details.receiptUrl,
      notes: details.notes,
      updatedAt: new Date()
    };
    
    this.payments.set(paymentId, updatedPayment);
    
    // Update policy history
    const policy = this.policies.get(payment.policyId);
    if (policy) {
      policy.history.push({
        date: details.paidDate,
        action: 'payment',
        description: `Premium payment of ${payment.amount} recorded`,
        performedBy: 'system'
      });
      
      policy.updatedAt = new Date();
      this.policies.set(policy.id, policy);
    }
    
    return updatedPayment;
  }
  
  /**
   * List payments for a policy
   */
  listPolicyPayments(policyId: string): PremiumPayment[] {
    return Array.from(this.payments.values())
      .filter(payment => payment.policyId === policyId)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }
  
  /**
   * Create a new insurance claim
   */
  createClaim(claim: Omit<InsuranceClaim, 'id' | 'communications' | 'createdAt' | 'updatedAt'>): InsuranceClaim {
    const id = uuidv4();
    const now = new Date();
    
    const newClaim: InsuranceClaim = {
      ...claim,
      id,
      communications: [],
      createdAt: now,
      updatedAt: now
    };
    
    this.claims.set(id, newClaim);
    
    // Update policy history and claims
    const policy = this.policies.get(claim.policyId);
    if (policy) {
      // Add claim ID to policy
      if (!policy.claims.includes(id)) {
        policy.claims.push(id);
      }
      
      // Add to history
      policy.history.push({
        date: now,
        action: 'claim_filed',
        description: `Claim filed: ${claim.claimNumber}`,
        performedBy: 'system'
      });
      
      policy.updatedAt = now;
      this.policies.set(policy.id, policy);
    }
    
    return newClaim;
  }
  
  /**
   * Update claim status
   */
  updateClaimStatus(
    claimId: string,
    status: InsuranceClaimStatus,
    details?: {
      approvedAmount?: number;
      notes?: string;
    }
  ): InsuranceClaim | null {
    const claim = this.claims.get(claimId);
    if (!claim) return null;
    
    const updatedClaim: InsuranceClaim = {
      ...claim,
      status,
      approvedAmount: details?.approvedAmount !== undefined ? details.approvedAmount : claim.approvedAmount,
      notes: details?.notes !== undefined ? 
        (claim.notes ? `${claim.notes}\n\n${details.notes}` : details.notes) : 
        claim.notes,
      updatedAt: new Date()
    };
    
    // Update payment status based on claim status
    if (status === InsuranceClaimStatus.APPROVED || status === InsuranceClaimStatus.PARTIALLY_APPROVED) {
      updatedClaim.paymentStatus = 'pending';
    } else if (status === InsuranceClaimStatus.DENIED || status === InsuranceClaimStatus.CLOSED) {
      updatedClaim.paymentStatus = 'denied';
    }
    
    this.claims.set(claimId, updatedClaim);
    return updatedClaim;
  }
  
  /**
   * Add document to claim
   */
  addClaimDocument(
    claimId: string,
    document: {
      name: string;
      type: 'claim_form' | 'evidence' | 'estimate' | 'invoice' | 'settlement' | 'communication' | 'other';
      url: string;
      aslTranslationAvailable?: boolean;
      aslTranslationUrl?: string;
    }
  ): InsuranceClaim | null {
    const claim = this.claims.get(claimId);
    if (!claim) return null;
    
    const docId = uuidv4();
    
    claim.documents.push({
      id: docId,
      name: document.name,
      type: document.type,
      url: document.url,
      dateAdded: new Date(),
      aslTranslationAvailable: document.aslTranslationAvailable,
      aslTranslationUrl: document.aslTranslationUrl
    });
    
    claim.updatedAt = new Date();
    this.claims.set(claimId, claim);
    
    return claim;
  }
  
  /**
   * Record claim payment
   */
  recordClaimPayment(
    claimId: string,
    payment: {
      date: Date;
      amount: number;
      method: string;
      reference: string;
    }
  ): InsuranceClaim | null {
    const claim = this.claims.get(claimId);
    if (!claim) return null;
    
    // Add payment to history
    claim.paymentHistory.push(payment);
    
    // Calculate total paid amount
    const totalPaid = claim.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
    
    // Determine payment status
    if (claim.approvedAmount) {
      if (totalPaid >= claim.approvedAmount) {
        claim.paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        claim.paymentStatus = 'partial';
      }
    } else if (totalPaid > 0) {
      claim.paymentStatus = 'partial';
    }
    
    claim.updatedAt = new Date();
    this.claims.set(claimId, claim);
    
    return claim;
  }
  
  /**
   * Get claim by ID
   */
  getClaim(id: string): InsuranceClaim | undefined {
    return this.claims.get(id);
  }
  
  /**
   * List claims for a policy
   */
  listPolicyClaims(policyId: string): InsuranceClaim[] {
    return Array.from(this.claims.values())
      .filter(claim => claim.policyId === policyId)
      .sort((a, b) => b.filedDate.getTime() - a.filedDate.getTime());
  }
  
  /**
   * Link communication to claim
   */
  linkCommunicationToClaim(claimId: string, communicationId: string): InsuranceClaim | null {
    const claim = this.claims.get(claimId);
    if (!claim) return null;
    
    if (!claim.communications.includes(communicationId)) {
      claim.communications.push(communicationId);
      claim.updatedAt = new Date();
      this.claims.set(claimId, claim);
    }
    
    return claim;
  }
  
  /**
   * Process insurance-related communication
   */
  async processInsuranceCommunication(communicationId: string): Promise<{
    policyId?: string;
    claimId?: string;
    processed: boolean;
  }> {
    try {
      // In a real implementation, this would analyze the communication content
      // and link it to relevant policies or claims
      
      // For demonstration, we'll implement a simplified version
      
      // Get the communication from the logger
      // @ts-ignore - assuming this method exists in communicationLogger
      const communication = await communicationLogger.getCommunication(communicationId);
      
      if (!communication) {
        return { processed: false };
      }
      
      // Only process if it's related to insurance
      if (communication.category !== CommunicationCategory.INSURANCE) {
        return { processed: false };
      }
      
      // Look for policy or claim numbers in the content
      const policyMatch = communication.content.match(/policy[:\s#]*(\w{6,})/i);
      const claimMatch = communication.content.match(/claim[:\s#]*(\w{6,})/i);
      
      let processedPolicy = false;
      let processedClaim = false;
      let policyId;
      let claimId;
      
      // Check for policy match
      if (policyMatch && policyMatch[1]) {
        const policyNumber = policyMatch[1];
        
        // Find policy by policy number
        const policy = Array.from(this.policies.values()).find(
          p => p.policyNumber === policyNumber
        );
        
        if (policy) {
          // Add to policy history
          policy.history.push({
            date: communication.timestamp,
            action: 'updated',
            description: `Communication received regarding policy`,
            performedBy: 'system'
          });
          
          policy.updatedAt = new Date();
          this.policies.set(policy.id, policy);
          
          processedPolicy = true;
          policyId = policy.id;
        }
      }
      
      // Check for claim match
      if (claimMatch && claimMatch[1]) {
        const claimNumber = claimMatch[1];
        
        // Find claim by claim number
        const claim = Array.from(this.claims.values()).find(
          c => c.claimNumber === claimNumber
        );
        
        if (claim) {
          // Link communication to claim
          this.linkCommunicationToClaim(claim.id, communicationId);
          
          processedClaim = true;
          claimId = claim.id;
          
          // Also link to associated policy if not already processed
          if (!processedPolicy) {
            const policy = this.policies.get(claim.policyId);
            if (policy) {
              policy.history.push({
                date: communication.timestamp,
                action: 'updated',
                description: `Communication received regarding claim ${claim.claimNumber}`,
                performedBy: 'system'
              });
              
              policy.updatedAt = new Date();
              this.policies.set(policy.id, policy);
              
              processedPolicy = true;
              policyId = policy.id;
            }
          }
        }
      }
      
      // If no explicit matches, try matching by participants
      if (!processedPolicy && !processedClaim) {
        // Get all policies and their participants' contact info
        for (const policy of this.policies.values()) {
          // Check if any policy holder matches communication participants
          const matchingHolder = policy.policyHolders.find(holder => 
            communication.participants.some(participant => 
              (holder.email && participant.email === holder.email) ||
              (holder.phone && participant.phone === holder.phone)
            )
          );
          
          if (matchingHolder) {
            policy.history.push({
              date: communication.timestamp,
              action: 'updated',
              description: `Communication with policy holder ${matchingHolder.name}`,
              performedBy: 'system'
            });
            
            policy.updatedAt = new Date();
            this.policies.set(policy.id, policy);
            
            processedPolicy = true;
            policyId = policy.id;
            break;
          }
        }
      }
      
      return {
        policyId,
        claimId,
        processed: processedPolicy || processedClaim
      };
    } catch (error) {
      console.error('Error processing insurance communication:', error);
      return { processed: false };
    }
  }
  
  /**
   * Generate renewal notices for policies expiring soon
   */
  generateRenewalNotices(daysInAdvance: number = 30): Array<{
    policyId: string;
    policyNumber: string;
    expiryDate: Date;
    policyHolder: string;
    contactInfo: {
      email?: string;
      phone?: string;
    };
    accessibilityRequirements: AccessibilityFeature[];
  }> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysInAdvance);
    
    const renewalCandidates = this.listPolicies().filter(policy => {
      const expiryDate = new Date(policy.coverageDetails.endDate);
      
      // Check if policy expires between now and the future date
      return expiryDate >= now && expiryDate <= futureDate &&
             policy.status === InsurancePolicyStatus.ACTIVE;
    });
    
    // Format the notices
    return renewalCandidates.map(policy => {
      const primaryHolder = policy.policyHolders.find(h => h.relationship === 'primary') || 
                          policy.policyHolders[0];
                          
      return {
        policyId: policy.id,
        policyNumber: policy.policyNumber,
        expiryDate: policy.coverageDetails.endDate,
        policyHolder: primaryHolder.name,
        contactInfo: {
          email: primaryHolder.email,
          phone: primaryHolder.phone
        },
        accessibilityRequirements: policy.accessibilityRequirements
      };
    });
  }
  
  /**
   * Check policy compliance with accessibility requirements
   */
  checkAccessibilityCompliance(policyId: string): {
    compliant: boolean;
    missingFeatures: AccessibilityFeature[];
    recommendations: string[];
  } {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return {
        compliant: false,
        missingFeatures: [],
        recommendations: ['Policy not found']
      };
    }
    
    const provider = this.providers.get(policy.providerId);
    if (!provider) {
      return {
        compliant: false,
        missingFeatures: [],
        recommendations: ['Provider information not found']
      };
    }
    
    // Get missing accessibility features
    const missingFeatures = policy.accessibilityRequirements.filter(
      feature => !provider.accessibilityFeatures.includes(feature)
    );
    
    // Check if ASL translations are available for key documents
    const hasASLTranslations = policy.documents.some(doc => 
      doc.type === 'policy_document' && doc.aslTranslationAvailable === true
    );
    
    if (!hasASLTranslations && 
        policy.accessibilityRequirements.includes(AccessibilityFeature.ASL_TRANSLATED_DOCUMENTS)) {
      missingFeatures.push(AccessibilityFeature.ASL_TRANSLATED_DOCUMENTS);
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (missingFeatures.includes(AccessibilityFeature.ASL_TRANSLATED_DOCUMENTS)) {
      recommendations.push('Request ASL translations for key policy documents');
    }
    
    if (missingFeatures.includes(AccessibilityFeature.SIGN_LANGUAGE_SUPPORT)) {
      recommendations.push('Request a sign language interpreter for policy discussions');
    }
    
    if (missingFeatures.includes(AccessibilityFeature.VIDEO_RELAY)) {
      recommendations.push('Set up video relay service for communication with the provider');
    }
    
    if (missingFeatures.includes(AccessibilityFeature.ACCESSIBLE_CUSTOMER_SERVICE)) {
      recommendations.push('Request a dedicated customer service representative trained in deaf communication');
    }
    
    if (recommendations.length === 0 && missingFeatures.length > 0) {
      recommendations.push('Contact the provider to address missing accessibility features');
    }
    
    return {
      compliant: missingFeatures.length === 0,
      missingFeatures,
      recommendations
    };
  }
  
  /**
   * Request ASL translation for a document
   */
  async requestASLTranslation(
    policyId: string,
    documentId: string,
    requestDetails: {
      priority: 'standard' | 'rush' | 'urgent';
      notes?: string;
    }
  ): Promise<{
    success: boolean;
    estimatedCompletionDate?: Date;
    message: string;
  }> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return {
        success: false,
        message: 'Policy not found'
      };
    }
    
    const document = policy.documents.find(doc => doc.id === documentId);
    if (!document) {
      return {
        success: false,
        message: 'Document not found'
      };
    }
    
    // In a real implementation, this would send a request to a translation service
    // For this example, we'll simulate the process
    
    const now = new Date();
    let estimatedCompletionDate = new Date();
    
    // Set estimated completion date based on priority
    switch (requestDetails.priority) {
      case 'urgent':
        estimatedCompletionDate.setDate(now.getDate() + 1);
        break;
      case 'rush':
        estimatedCompletionDate.setDate(now.getDate() + 3);
        break;
      case 'standard':
      default:
        estimatedCompletionDate.setDate(now.getDate() + 7);
        break;
    }
    
    // Add to policy history
    policy.history.push({
      date: now,
      action: 'updated',
      description: `Requested ASL translation for document: ${document.name}`,
      performedBy: 'system'
    });
    
    policy.updatedAt = now;
    this.policies.set(policyId, policy);
    
    return {
      success: true,
      estimatedCompletionDate,
      message: `ASL translation requested. Estimated completion: ${estimatedCompletionDate.toISOString().split('T')[0]}`
    };
  }
}

// Export singleton instance
export const insuranceLifecycleManager = new InsuranceLifecycleManager();