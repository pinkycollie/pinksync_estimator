import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { 
  insuranceLifecycleManager,
  InsurancePolicyType,
  InsurancePolicyStatus,
  InsuranceClaimStatus,
  AccessibilityFeature
} from '../utils/insuranceLifecycleManager';
import { signYapseIntegration } from '../utils/signYapseIntegration';

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'insurance');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueFilename = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({ storage });

// Create router
const router = Router();

// API endpoints for insurance lifecycle manager

/**
 * Provider endpoints
 */

/**
 * Get all providers
 */
router.get('/providers', (req, res) => {
  try {
    const providers = insuranceLifecycleManager.listProviders();
    res.json(providers);
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

/**
 * Get deaf-friendly providers
 */
router.get('/providers/deaf-friendly', (req, res) => {
  try {
    const { minRating } = req.query;
    const providers = insuranceLifecycleManager.findDeafFriendlyProviders(
      minRating ? Number(minRating) : 3
    );
    res.json(providers);
  } catch (error) {
    console.error('Error fetching deaf-friendly providers:', error);
    res.status(500).json({ error: 'Failed to fetch deaf-friendly providers' });
  }
});

/**
 * Get a specific provider
 */
router.get('/providers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const provider = insuranceLifecycleManager.getProvider(id);
    
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    res.json(provider);
  } catch (error) {
    console.error('Error fetching provider:', error);
    res.status(500).json({ error: 'Failed to fetch provider' });
  }
});

/**
 * Create a new provider
 */
router.post('/providers', (req, res) => {
  try {
    const {
      name,
      contactInfo,
      accessibilityFeatures,
      specializedPrograms,
      deafFriendlyRating,
      notes,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!name || !contactInfo || !accessibilityFeatures) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const provider = insuranceLifecycleManager.addProvider({
      name,
      contactInfo,
      accessibilityFeatures,
      specializedPrograms,
      deafFriendlyRating,
      notes,
      metadata: metadata || {}
    });
    
    res.status(201).json(provider);
  } catch (error) {
    console.error('Error creating provider:', error);
    res.status(500).json({ error: 'Failed to create provider' });
  }
});

/**
 * Update a provider
 */
router.patch('/providers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedProvider = insuranceLifecycleManager.updateProvider(id, updates);
    
    if (!updatedProvider) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    res.json(updatedProvider);
  } catch (error) {
    console.error('Error updating provider:', error);
    res.status(500).json({ error: 'Failed to update provider' });
  }
});

/**
 * Policy endpoints
 */

/**
 * Get all policies
 */
router.get('/policies', (req, res) => {
  try {
    const { 
      policyType,
      status,
      providerId,
      policyHolderId,
      expiringWithinDays,
      hasASLTranslation
    } = req.query;
    
    // If search criteria provided, use search method
    if (policyType || status || providerId || policyHolderId || expiringWithinDays || hasASLTranslation) {
      const criteria: any = {};
      
      if (policyType) criteria.policyType = policyType;
      if (status) criteria.status = status;
      if (providerId) criteria.providerId = providerId;
      if (policyHolderId) criteria.policyHolderId = policyHolderId;
      if (expiringWithinDays) criteria.expiringWithinDays = Number(expiringWithinDays);
      if (hasASLTranslation) criteria.hasASLTranslation = hasASLTranslation === 'true';
      
      const policies = insuranceLifecycleManager.findPolicies(criteria);
      res.json(policies);
    } else {
      // Otherwise, return all policies
      const policies = insuranceLifecycleManager.listPolicies();
      res.json(policies);
    }
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

/**
 * Get a specific policy
 */
router.get('/policies/:id', (req, res) => {
  try {
    const { id } = req.params;
    const policy = insuranceLifecycleManager.getPolicy(id);
    
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    res.json(policy);
  } catch (error) {
    console.error('Error fetching policy:', error);
    res.status(500).json({ error: 'Failed to fetch policy' });
  }
});

/**
 * Create a new policy
 */
router.post('/policies', (req, res) => {
  try {
    const {
      policyNumber,
      providerId,
      policyType,
      status,
      policyHolders,
      coverageDetails,
      property,
      vehicle,
      accessibilityRequirements,
      notes,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!policyNumber || !providerId || !policyType || !status || !policyHolders || !coverageDetails) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate coverage details
    if (!coverageDetails.startDate || !coverageDetails.endDate || 
        !coverageDetails.coverageAmount || !coverageDetails.deductible || 
        !coverageDetails.premium) {
      return res.status(400).json({ error: 'Missing required coverage details' });
    }
    
    // Create policy
    const policy = insuranceLifecycleManager.createPolicy({
      policyNumber,
      providerId,
      policyType: policyType as InsurancePolicyType,
      status: status as InsurancePolicyStatus,
      policyHolders,
      coverageDetails: {
        ...coverageDetails,
        startDate: new Date(coverageDetails.startDate),
        endDate: new Date(coverageDetails.endDate),
        premium: {
          ...coverageDetails.premium,
          dueDate: new Date(coverageDetails.premium.dueDate)
        }
      },
      property,
      vehicle,
      documents: [],
      claims: [],
      accessibilityRequirements: accessibilityRequirements || [],
      notes,
      metadata: metadata || {}
    });
    
    res.status(201).json(policy);
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

/**
 * Update a policy
 */
router.patch('/policies/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { updates, performedBy } = req.body;
    
    const updatedPolicy = insuranceLifecycleManager.updatePolicy(id, updates, performedBy);
    
    if (!updatedPolicy) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    res.json(updatedPolicy);
  } catch (error) {
    console.error('Error updating policy:', error);
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

/**
 * Upload and add document to policy
 */
router.post('/policies/:id/documents', upload.single('document'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      type, 
      aslTranslationAvailable, 
      aslTranslationUrl,
      performedBy 
    } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create document URL
    const documentUrl = `/uploads/insurance/${req.file.filename}`;
    
    // Add document to policy
    const updatedPolicy = insuranceLifecycleManager.addPolicyDocument(
      id,
      {
        name,
        type,
        url: documentUrl,
        aslTranslationAvailable: aslTranslationAvailable === 'true',
        aslTranslationUrl
      },
      performedBy
    );
    
    if (!updatedPolicy) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    res.json(updatedPolicy);
  } catch (error) {
    console.error('Error adding document to policy:', error);
    res.status(500).json({ error: 'Failed to add document to policy' });
  }
});

/**
 * Add ASL translation to a document
 */
router.post('/policies/:id/documents/:documentId/asl-translation', (req, res) => {
  try {
    const { id, documentId } = req.params;
    const { translationUrl, performedBy } = req.body;
    
    // Validate required fields
    if (!translationUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Add ASL translation to document
    const updatedPolicy = insuranceLifecycleManager.addASLTranslationToDocument(
      id,
      documentId,
      translationUrl,
      performedBy
    );
    
    if (!updatedPolicy) {
      return res.status(404).json({ error: 'Policy or document not found' });
    }
    
    res.json(updatedPolicy);
  } catch (error) {
    console.error('Error adding ASL translation to document:', error);
    res.status(500).json({ error: 'Failed to add ASL translation to document' });
  }
});

/**
 * Renew a policy
 */
router.post('/policies/:id/renew', (req, res) => {
  try {
    const { id } = req.params;
    const { newEndDate, newPremium, coverageChanges, performedBy } = req.body;
    
    // Validate required fields
    if (!newEndDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Renew policy
    const renewedPolicy = insuranceLifecycleManager.renewPolicy(
      id,
      {
        newEndDate: new Date(newEndDate),
        newPremium: newPremium ? {
          ...newPremium,
          dueDate: new Date(newPremium.dueDate)
        } : undefined,
        coverageChanges
      },
      performedBy
    );
    
    if (!renewedPolicy) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    res.json(renewedPolicy);
  } catch (error) {
    console.error('Error renewing policy:', error);
    res.status(500).json({ error: 'Failed to renew policy' });
  }
});

/**
 * Payment endpoints
 */

/**
 * Get policy payments
 */
router.get('/policies/:id/payments', (req, res) => {
  try {
    const { id } = req.params;
    
    // Get payments for policy
    const payments = insuranceLifecycleManager.listPolicyPayments(id);
    res.json(payments);
  } catch (error) {
    console.error('Error fetching policy payments:', error);
    res.status(500).json({ error: 'Failed to fetch policy payments' });
  }
});

/**
 * Record a payment
 */
router.post('/payments/:id/record', (req, res) => {
  try {
    const { id } = req.params;
    const { paidDate, paymentMethod, transactionId, receiptUrl, notes } = req.body;
    
    // Validate required fields
    if (!paidDate || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Record payment
    const payment = insuranceLifecycleManager.recordPremiumPayment(
      id,
      {
        paidDate: new Date(paidDate),
        paymentMethod,
        transactionId,
        receiptUrl,
        notes
      }
    );
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json(payment);
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

/**
 * Claim endpoints
 */

/**
 * Get policy claims
 */
router.get('/policies/:id/claims', (req, res) => {
  try {
    const { id } = req.params;
    
    // Get claims for policy
    const claims = insuranceLifecycleManager.listPolicyClaims(id);
    res.json(claims);
  } catch (error) {
    console.error('Error fetching policy claims:', error);
    res.status(500).json({ error: 'Failed to fetch policy claims' });
  }
});

/**
 * Get a specific claim
 */
router.get('/claims/:id', (req, res) => {
  try {
    const { id } = req.params;
    const claim = insuranceLifecycleManager.getClaim(id);
    
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    res.json(claim);
  } catch (error) {
    console.error('Error fetching claim:', error);
    res.status(500).json({ error: 'Failed to fetch claim' });
  }
});

/**
 * Create a new claim
 */
router.post('/claims', (req, res) => {
  try {
    const {
      claimNumber,
      policyId,
      status,
      incidentDetails,
      filedDate,
      claimAmount,
      deductibleApplied,
      adjuster,
      accessibilityRequirements,
      notes,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!claimNumber || !policyId || !status || !incidentDetails || !filedDate || !claimAmount || !deductibleApplied) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate incident details
    if (!incidentDetails.date || !incidentDetails.description || !incidentDetails.type) {
      return res.status(400).json({ error: 'Missing required incident details' });
    }
    
    // Create claim
    const claim = insuranceLifecycleManager.createClaim({
      claimNumber,
      policyId,
      status: status as InsuranceClaimStatus,
      incidentDetails: {
        ...incidentDetails,
        date: new Date(incidentDetails.date)
      },
      filedDate: new Date(filedDate),
      claimAmount,
      deductibleApplied,
      paymentStatus: 'pending',
      paymentHistory: [],
      documents: [],
      communications: [],
      adjuster,
      accessibilityRequirements: accessibilityRequirements || [],
      notes,
      metadata: metadata || {}
    });
    
    res.status(201).json(claim);
  } catch (error) {
    console.error('Error creating claim:', error);
    res.status(500).json({ error: 'Failed to create claim' });
  }
});

/**
 * Update claim status
 */
router.post('/claims/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, approvedAmount, notes } = req.body;
    
    // Validate required fields
    if (!status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Update claim status
    const updatedClaim = insuranceLifecycleManager.updateClaimStatus(
      id,
      status as InsuranceClaimStatus,
      {
        approvedAmount,
        notes
      }
    );
    
    if (!updatedClaim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    res.json(updatedClaim);
  } catch (error) {
    console.error('Error updating claim status:', error);
    res.status(500).json({ error: 'Failed to update claim status' });
  }
});

/**
 * Upload and add document to claim
 */
router.post('/claims/:id/documents', upload.single('document'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      type, 
      aslTranslationAvailable, 
      aslTranslationUrl 
    } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create document URL
    const documentUrl = `/uploads/insurance/${req.file.filename}`;
    
    // Add document to claim
    const updatedClaim = insuranceLifecycleManager.addClaimDocument(
      id,
      {
        name,
        type,
        url: documentUrl,
        aslTranslationAvailable: aslTranslationAvailable === 'true',
        aslTranslationUrl
      }
    );
    
    if (!updatedClaim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    res.json(updatedClaim);
  } catch (error) {
    console.error('Error adding document to claim:', error);
    res.status(500).json({ error: 'Failed to add document to claim' });
  }
});

/**
 * Record claim payment
 */
router.post('/claims/:id/payments', (req, res) => {
  try {
    const { id } = req.params;
    const { date, amount, method, reference } = req.body;
    
    // Validate required fields
    if (!date || !amount || !method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Record claim payment
    const updatedClaim = insuranceLifecycleManager.recordClaimPayment(
      id,
      {
        date: new Date(date),
        amount: Number(amount),
        method,
        reference
      }
    );
    
    if (!updatedClaim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    res.json(updatedClaim);
  } catch (error) {
    console.error('Error recording claim payment:', error);
    res.status(500).json({ error: 'Failed to record claim payment' });
  }
});

/**
 * Link communication to claim
 */
router.post('/claims/:id/communications', (req, res) => {
  try {
    const { id } = req.params;
    const { communicationId } = req.body;
    
    // Validate required fields
    if (!communicationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Link communication to claim
    const updatedClaim = insuranceLifecycleManager.linkCommunicationToClaim(
      id,
      communicationId
    );
    
    if (!updatedClaim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    res.json(updatedClaim);
  } catch (error) {
    console.error('Error linking communication to claim:', error);
    res.status(500).json({ error: 'Failed to link communication to claim' });
  }
});

/**
 * Helper endpoints
 */

/**
 * Process insurance-related communication
 */
router.post('/process-communication', async (req, res) => {
  try {
    const { communicationId } = req.body;
    
    // Validate required fields
    if (!communicationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Process communication
    const result = await insuranceLifecycleManager.processInsuranceCommunication(communicationId);
    res.json(result);
  } catch (error) {
    console.error('Error processing insurance communication:', error);
    res.status(500).json({ error: 'Failed to process insurance communication' });
  }
});

/**
 * Generate renewal notices
 */
router.get('/renewal-notices', (req, res) => {
  try {
    const { daysInAdvance } = req.query;
    
    // Generate renewal notices
    const notices = insuranceLifecycleManager.generateRenewalNotices(
      daysInAdvance ? Number(daysInAdvance) : 30
    );
    
    res.json(notices);
  } catch (error) {
    console.error('Error generating renewal notices:', error);
    res.status(500).json({ error: 'Failed to generate renewal notices' });
  }
});

/**
 * Check accessibility compliance
 */
router.get('/policies/:id/accessibility-compliance', (req, res) => {
  try {
    const { id } = req.params;
    
    // Check compliance
    const compliance = insuranceLifecycleManager.checkAccessibilityCompliance(id);
    res.json(compliance);
  } catch (error) {
    console.error('Error checking accessibility compliance:', error);
    res.status(500).json({ error: 'Failed to check accessibility compliance' });
  }
});

/**
 * SignYapse integration endpoints
 */

/**
 * Check if SignYapse API key is set
 */
router.get('/signyapse/status', (req, res) => {
  try {
    const hasApiKey = signYapseIntegration.hasApiKey();
    res.json({ hasApiKey });
  } catch (error) {
    console.error('Error checking SignYapse API key:', error);
    res.status(500).json({ error: 'Failed to check SignYapse API key' });
  }
});

/**
 * Set SignYapse API key
 */
router.post('/signyapse/set-api-key', (req, res) => {
  try {
    const { apiKey } = req.body;
    
    // Validate required fields
    if (!apiKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Set API key
    signYapseIntegration.setApiKey(apiKey);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting SignYapse API key:', error);
    res.status(500).json({ error: 'Failed to set SignYapse API key' });
  }
});

/**
 * Request ASL translation for a document
 */
router.post('/policies/:id/request-asl-translation', async (req, res) => {
  try {
    const { id } = req.params;
    const { documentId, priority, notes } = req.body;
    
    // Validate required fields
    if (!documentId || !priority) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Request ASL translation
    const result = await insuranceLifecycleManager.requestASLTranslation(
      id,
      documentId,
      {
        priority,
        notes
      }
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error requesting ASL translation:', error);
    res.status(500).json({ error: 'Failed to request ASL translation' });
  }
});

/**
 * Submit document for translation
 */
router.post('/signyapse/translate', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { 
      sourceDocumentType, 
      priority, 
      entityType, 
      entityId, 
      notes,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!sourceDocumentType || !priority || !entityType || !entityId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if API key is set
    if (!signYapseIntegration.hasApiKey()) {
      return res.status(400).json({ 
        error: 'SignYapse API key not set. Please set the API key first.' 
      });
    }
    
    // Create document URL
    const documentUrl = `/uploads/insurance/${req.file.filename}`;
    
    // Submit for translation
    const translation = await signYapseIntegration.submitDocumentForTranslation(
      documentUrl,
      {
        sourceDocumentType,
        priority,
        entityType: entityType as 'policy' | 'claim' | 'legal' | 'general',
        entityId,
        requestMetadata: metadata ? JSON.parse(metadata) : undefined,
        notes
      }
    );
    
    res.status(201).json(translation);
  } catch (error) {
    console.error('Error submitting document for translation:', error);
    res.status(500).json({ error: 'Failed to submit document for translation' });
  }
});

/**
 * Get translation status
 */
router.get('/signyapse/translations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if API key is set
    if (!signYapseIntegration.hasApiKey()) {
      return res.status(400).json({ 
        error: 'SignYapse API key not set. Please set the API key first.' 
      });
    }
    
    // Get translation status
    const translation = await signYapseIntegration.getTranslationStatus(id);
    res.json(translation);
  } catch (error) {
    console.error('Error getting translation status:', error);
    res.status(500).json({ error: 'Failed to get translation status' });
  }
});

/**
 * Cancel translation
 */
router.post('/signyapse/translations/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if API key is set
    if (!signYapseIntegration.hasApiKey()) {
      return res.status(400).json({ 
        error: 'SignYapse API key not set. Please set the API key first.' 
      });
    }
    
    // Cancel translation
    const translation = await signYapseIntegration.cancelTranslation(id);
    res.json(translation);
  } catch (error) {
    console.error('Error cancelling translation:', error);
    res.status(500).json({ error: 'Failed to cancel translation' });
  }
});

/**
 * Get all translations for an entity
 */
router.get('/signyapse/translations', (req, res) => {
  try {
    const { entityType, entityId } = req.query;
    
    // Validate required fields
    if (!entityType || !entityId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if API key is set
    if (!signYapseIntegration.hasApiKey()) {
      return res.status(400).json({ 
        error: 'SignYapse API key not set. Please set the API key first.' 
      });
    }
    
    // Get translations
    const translations = signYapseIntegration.getTranslationsForEntity(
      entityType as 'policy' | 'claim' | 'legal' | 'general',
      entityId as string
    );
    
    res.json(translations);
  } catch (error) {
    console.error('Error getting translations:', error);
    res.status(500).json({ error: 'Failed to get translations' });
  }
});

/**
 * Get translation cost estimate
 */
router.post('/signyapse/estimate', async (req, res) => {
  try {
    const { documentType, pageCount, priority } = req.body;
    
    // Validate required fields
    if (!documentType || !pageCount || !priority) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if API key is set
    if (!signYapseIntegration.hasApiKey()) {
      return res.status(400).json({ 
        error: 'SignYapse API key not set. Please set the API key first.' 
      });
    }
    
    // Get cost estimate
    const estimate = await signYapseIntegration.getTranslationCostEstimate(
      documentType,
      Number(pageCount),
      priority
    );
    
    res.json(estimate);
  } catch (error) {
    console.error('Error getting translation cost estimate:', error);
    res.status(500).json({ error: 'Failed to get translation cost estimate' });
  }
});

/**
 * Get available translators
 */
router.get('/signyapse/translators', async (req, res) => {
  try {
    const { specialization } = req.query;
    
    // Check if API key is set
    if (!signYapseIntegration.hasApiKey()) {
      return res.status(400).json({ 
        error: 'SignYapse API key not set. Please set the API key first.' 
      });
    }
    
    // Get available translators
    const translators = await signYapseIntegration.getAvailableTranslators(
      specialization as 'legal' | 'medical' | 'insurance' | 'technical' | 'general' | undefined
    );
    
    res.json(translators);
  } catch (error) {
    console.error('Error getting available translators:', error);
    res.status(500).json({ error: 'Failed to get available translators' });
  }
});

// Export router
export default router;