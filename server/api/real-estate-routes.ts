import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { 
  realEstateLifecycleTracker, 
  RealEstateStage, 
  RealEstateTransactionType,
  RealEstatePartyRole,
  RealEstateDocumentType
} from '../utils/realEstateLifecycleTracker';

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'real-estate');
    
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

// API endpoints for real estate lifecycle tracker

/**
 * Property endpoints
 */

/**
 * Get all properties
 */
router.get('/properties', (req, res) => {
  try {
    const { 
      status, 
      propertyType, 
      city, 
      state,
      minPrice,
      maxPrice,
      minBedrooms,
      minBathrooms
    } = req.query;
    
    // If search criteria provided, use search method
    if (status || propertyType || city || state || minPrice || maxPrice || minBedrooms || minBathrooms) {
      const criteria: any = {};
      
      if (status) criteria.status = status;
      if (propertyType) criteria.propertyType = propertyType;
      if (city) criteria.city = city;
      if (state) criteria.state = state;
      if (minPrice) criteria.minPrice = Number(minPrice);
      if (maxPrice) criteria.maxPrice = Number(maxPrice);
      if (minBedrooms) criteria.minBedrooms = Number(minBedrooms);
      if (minBathrooms) criteria.minBathrooms = Number(minBathrooms);
      
      const properties = realEstateLifecycleTracker.searchProperties(criteria);
      res.json(properties);
    } else {
      // Otherwise, return all properties
      const properties = realEstateLifecycleTracker.listProperties();
      res.json(properties);
    }
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

/**
 * Get a specific property
 */
router.get('/properties/:id', (req, res) => {
  try {
    const { id } = req.params;
    const property = realEstateLifecycleTracker.getProperty(id);
    
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    res.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

/**
 * Create a new property
 */
router.post('/properties', (req, res) => {
  try {
    const {
      address,
      propertyType,
      bedrooms,
      bathrooms,
      squareFeet,
      lotSize,
      yearBuilt,
      description,
      features,
      listingPrice,
      status,
      primaryImageUrl,
      images,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!address || !propertyType || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const property = realEstateLifecycleTracker.addProperty({
      address,
      propertyType,
      bedrooms,
      bathrooms,
      squareFeet,
      lotSize,
      yearBuilt,
      description,
      features,
      listingPrice,
      status,
      primaryImageUrl,
      images,
      documents: [],
      metadata: metadata || {}
    });
    
    res.status(201).json(property);
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

/**
 * Update a property
 */
router.patch('/properties/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedProperty = realEstateLifecycleTracker.updateProperty(id, updates);
    
    if (!updatedProperty) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    res.json(updatedProperty);
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

/**
 * Delete a property
 */
router.delete('/properties/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = realEstateLifecycleTracker.deleteProperty(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

/**
 * Party endpoints
 */

/**
 * Get all parties
 */
router.get('/parties', (req, res) => {
  try {
    const { type, name, email, phone, tag } = req.query;
    
    // If search criteria provided, use search method
    if (type || name || email || phone || tag) {
      const criteria: any = {};
      
      if (type) criteria.type = type;
      if (name) criteria.name = name;
      if (email) criteria.email = email;
      if (phone) criteria.phone = phone;
      if (tag) criteria.tag = tag;
      
      const parties = realEstateLifecycleTracker.searchParties(criteria);
      res.json(parties);
    } else {
      // Otherwise, return all parties
      const parties = realEstateLifecycleTracker.listParties();
      res.json(parties);
    }
  } catch (error) {
    console.error('Error fetching parties:', error);
    res.status(500).json({ error: 'Failed to fetch parties' });
  }
});

/**
 * Get a specific party
 */
router.get('/parties/:id', (req, res) => {
  try {
    const { id } = req.params;
    const party = realEstateLifecycleTracker.getParty(id);
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    res.json(party);
  } catch (error) {
    console.error('Error fetching party:', error);
    res.status(500).json({ error: 'Failed to fetch party' });
  }
});

/**
 * Create a new party
 */
router.post('/parties', (req, res) => {
  try {
    const {
      type,
      name,
      email,
      phone,
      address,
      company,
      licenseNumber,
      notes,
      tags,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!type || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const party = realEstateLifecycleTracker.addParty({
      type,
      name,
      email,
      phone,
      address,
      company,
      licenseNumber,
      notes,
      tags,
      metadata: metadata || {}
    });
    
    res.status(201).json(party);
  } catch (error) {
    console.error('Error creating party:', error);
    res.status(500).json({ error: 'Failed to create party' });
  }
});

/**
 * Update a party
 */
router.patch('/parties/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedParty = realEstateLifecycleTracker.updateParty(id, updates);
    
    if (!updatedParty) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    res.json(updatedParty);
  } catch (error) {
    console.error('Error updating party:', error);
    res.status(500).json({ error: 'Failed to update party' });
  }
});

/**
 * Delete a party
 */
router.delete('/parties/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = realEstateLifecycleTracker.deleteParty(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting party:', error);
    res.status(500).json({ error: 'Failed to delete party' });
  }
});

/**
 * Transaction endpoints
 */

/**
 * Get all transactions
 */
router.get('/transactions', (req, res) => {
  try {
    const { 
      propertyId, 
      transactionType, 
      currentStage, 
      partyId,
      startDateMin,
      startDateMax,
      tag
    } = req.query;
    
    // If search criteria provided, use search method
    if (propertyId || transactionType || currentStage || partyId || startDateMin || startDateMax || tag) {
      const criteria: any = {};
      
      if (propertyId) criteria.propertyId = propertyId;
      if (transactionType) criteria.transactionType = transactionType;
      if (currentStage) criteria.currentStage = currentStage;
      if (partyId) criteria.partyId = partyId;
      
      if (startDateMin) {
        criteria.startDateMin = new Date(startDateMin as string);
      }
      
      if (startDateMax) {
        criteria.startDateMax = new Date(startDateMax as string);
      }
      
      if (tag) criteria.tag = tag;
      
      const transactions = realEstateLifecycleTracker.searchTransactions(criteria);
      res.json(transactions);
    } else {
      // Otherwise, return all transactions
      const transactions = realEstateLifecycleTracker.listTransactions();
      res.json(transactions);
    }
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * Get a specific transaction
 */
router.get('/transactions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const transaction = realEstateLifecycleTracker.getTransaction(id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

/**
 * Create a new transaction
 */
router.post('/transactions', (req, res) => {
  try {
    const {
      propertyId,
      transactionType,
      currentStage,
      parties,
      price,
      startDate,
      estimatedCloseDate,
      tags,
      notes,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!propertyId || !transactionType || !currentStage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate property exists
    const property = realEstateLifecycleTracker.getProperty(propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    // Create transaction
    const transaction = realEstateLifecycleTracker.createTransaction({
      propertyId,
      transactionType: transactionType as RealEstateTransactionType,
      currentStage: currentStage as RealEstateStage,
      parties: parties || [],
      price,
      startDate: startDate ? new Date(startDate) : new Date(),
      estimatedCloseDate: estimatedCloseDate ? new Date(estimatedCloseDate) : undefined,
      actualCloseDate: undefined,
      tasks: [],
      documents: [],
      communications: [],
      notes,
      tags,
      metadata: metadata || {}
    });
    
    // Generate tasks for the initial stage
    realEstateLifecycleTracker.generateTasksForStage(transaction.id, transaction.currentStage);
    
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

/**
 * Update transaction stage
 */
router.post('/transactions/:id/stage', (req, res) => {
  try {
    const { id } = req.params;
    const { stage, notes } = req.body;
    
    // Validate stage
    if (!stage || !Object.values(RealEstateStage).includes(stage as RealEstateStage)) {
      return res.status(400).json({ error: 'Invalid stage' });
    }
    
    // Update stage
    const updatedTransaction = realEstateLifecycleTracker.updateTransactionStage(
      id, 
      stage as RealEstateStage,
      notes
    );
    
    if (!updatedTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Generate tasks for the new stage
    realEstateLifecycleTracker.generateTasksForStage(id, stage as RealEstateStage);
    
    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error updating transaction stage:', error);
    res.status(500).json({ error: 'Failed to update transaction stage' });
  }
});

/**
 * Add party to transaction
 */
router.post('/transactions/:id/parties', (req, res) => {
  try {
    const { id } = req.params;
    const { partyId, role, primaryContact } = req.body;
    
    // Validate required fields
    if (!partyId || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate role
    if (!Object.values(RealEstatePartyRole).includes(role as RealEstatePartyRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Add party to transaction
    const updatedTransaction = realEstateLifecycleTracker.addPartyToTransaction(
      id,
      partyId,
      role as RealEstatePartyRole,
      primaryContact
    );
    
    if (!updatedTransaction) {
      return res.status(404).json({ error: 'Transaction or party not found' });
    }
    
    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error adding party to transaction:', error);
    res.status(500).json({ error: 'Failed to add party to transaction' });
  }
});

/**
 * Remove party from transaction
 */
router.delete('/transactions/:id/parties', (req, res) => {
  try {
    const { id } = req.params;
    const { partyId, role } = req.body;
    
    // Validate required fields
    if (!partyId || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Remove party from transaction
    const updatedTransaction = realEstateLifecycleTracker.removePartyFromTransaction(
      id,
      partyId,
      role as RealEstatePartyRole
    );
    
    if (!updatedTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error removing party from transaction:', error);
    res.status(500).json({ error: 'Failed to remove party from transaction' });
  }
});

/**
 * Upload and add document to transaction
 */
router.post('/transactions/:id/documents', upload.single('document'), async (req, res) => {
  try {
    const { id } = req.params;
    const { type, name, addedBy } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Validate required fields
    if (!type || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate document type
    if (!Object.values(RealEstateDocumentType).includes(type as RealEstateDocumentType)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }
    
    // Create document URL
    const documentUrl = `/uploads/real-estate/${req.file.filename}`;
    
    // Add document to transaction
    const updatedTransaction = realEstateLifecycleTracker.addDocumentToTransaction(
      id,
      {
        type: type as RealEstateDocumentType,
        name,
        url: documentUrl,
        addedBy
      }
    );
    
    if (!updatedTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error adding document to transaction:', error);
    res.status(500).json({ error: 'Failed to add document to transaction' });
  }
});

/**
 * Remove document from transaction
 */
router.delete('/transactions/:id/documents/:documentId', (req, res) => {
  try {
    const { id, documentId } = req.params;
    
    // Remove document from transaction
    const updatedTransaction = realEstateLifecycleTracker.removeDocumentFromTransaction(
      id,
      documentId
    );
    
    if (!updatedTransaction) {
      return res.status(404).json({ error: 'Transaction or document not found' });
    }
    
    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error removing document from transaction:', error);
    res.status(500).json({ error: 'Failed to remove document from transaction' });
  }
});

/**
 * Link communication to transaction
 */
router.post('/transactions/:id/communications', (req, res) => {
  try {
    const { id } = req.params;
    const { communicationId } = req.body;
    
    // Validate required fields
    if (!communicationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Link communication to transaction
    const updatedTransaction = realEstateLifecycleTracker.linkCommunicationToTransaction(
      id,
      communicationId
    );
    
    if (!updatedTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error linking communication to transaction:', error);
    res.status(500).json({ error: 'Failed to link communication to transaction' });
  }
});

/**
 * Task endpoints
 */

/**
 * Get tasks for a transaction
 */
router.get('/transactions/:id/tasks', (req, res) => {
  try {
    const { id } = req.params;
    
    // Get tasks for transaction
    const tasks = realEstateLifecycleTracker.getTransactionTasks(id);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching transaction tasks:', error);
    res.status(500).json({ error: 'Failed to fetch transaction tasks' });
  }
});

/**
 * Create a task for a transaction
 */
router.post('/transactions/:id/tasks', (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      status,
      stage,
      assignedTo,
      dueDate,
      documents,
      notes
    } = req.body;
    
    // Validate required fields
    if (!name || !category || !status || !stage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create task
    const task = realEstateLifecycleTracker.createTransactionTask({
      transactionId: id,
      name,
      description,
      category,
      status,
      stage,
      assignedTo,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      documents,
      notes
    });
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating transaction task:', error);
    res.status(500).json({ error: 'Failed to create transaction task' });
  }
});

/**
 * Update a task
 */
router.patch('/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Update task
    const updatedTask = realEstateLifecycleTracker.updateTransactionTask(id, updates);
    
    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

/**
 * Delete a task
 */
router.delete('/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete task
    const deleted = realEstateLifecycleTracker.deleteTask(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

/**
 * Helper endpoints
 */

/**
 * Get transaction timeline
 */
router.get('/transactions/:id/timeline', (req, res) => {
  try {
    const { id } = req.params;
    
    // Generate timeline
    const timeline = realEstateLifecycleTracker.generateTransactionTimeline(id);
    res.json(timeline);
  } catch (error) {
    console.error('Error generating transaction timeline:', error);
    res.status(500).json({ error: 'Failed to generate transaction timeline' });
  }
});

/**
 * Process real estate communication
 */
router.post('/process-communication', async (req, res) => {
  try {
    const { communicationId } = req.body;
    
    // Validate required fields
    if (!communicationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Process communication
    const result = await realEstateLifecycleTracker.processRealEstateCommunication(communicationId);
    res.json(result);
  } catch (error) {
    console.error('Error processing real estate communication:', error);
    res.status(500).json({ error: 'Failed to process real estate communication' });
  }
});

// Export router
export default router;