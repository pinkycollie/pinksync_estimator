import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { communicationLogger, CommunicationType, CommunicationDirection, CommunicationCategory, CommunicationStatus } from '../utils/communicationLogger';
import { emailImporter } from '../utils/emailImporter';
import { textMessageImporter } from '../utils/textMessageImporter';

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'communications');
    
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

// API endpoints for communication logger

/**
 * Get all communications
 */
router.get('/communications', async (req, res) => {
  try {
    const { 
      category, 
      tag, 
      type, 
      direction, 
      status,
      startDate,
      endDate,
      search
    } = req.query;
    
    let communications;
    
    if (category) {
      communications = await communicationLogger.getCommunicationsByCategory(category as CommunicationCategory);
    } else if (tag) {
      communications = await communicationLogger.getCommunicationsByTag(tag as string);
    } else if (search) {
      communications = await communicationLogger.searchCommunications(search as string);
    } else {
      communications = await communicationLogger.getAllCommunications();
    }
    
    // Apply additional filters
    if (type || direction || status || startDate || endDate) {
      communications = communications.filter(comm => {
        if (type && comm.type !== type) return false;
        if (direction && comm.direction !== direction) return false;
        if (status && comm.status !== status) return false;
        
        if (startDate) {
          const startDateObj = new Date(startDate as string);
          if (comm.timestamp < startDateObj) return false;
        }
        
        if (endDate) {
          const endDateObj = new Date(endDate as string);
          if (comm.timestamp > endDateObj) return false;
        }
        
        return true;
      });
    }
    
    res.json(communications);
  } catch (error) {
    console.error('Error fetching communications:', error);
    res.status(500).json({ error: 'Failed to fetch communications' });
  }
});

/**
 * Get a specific communication
 */
router.get('/communications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const communication = await communicationLogger.getCommunication(id);
    
    if (!communication) {
      return res.status(404).json({ error: 'Communication not found' });
    }
    
    res.json(communication);
  } catch (error) {
    console.error('Error fetching communication:', error);
    res.status(500).json({ error: 'Failed to fetch communication' });
  }
});

/**
 * Create a new communication
 */
router.post('/communications', async (req, res) => {
  try {
    const {
      participants,
      content,
      subject,
      type,
      direction,
      category,
      priority,
      status,
      metadata,
      tags
    } = req.body;
    
    // Validate required fields
    if (!participants || !content || !type || !direction || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const communication = await communicationLogger.logCommunication({
      participants,
      content,
      subject,
      type: type as CommunicationType,
      direction: direction as CommunicationDirection,
      category: category as CommunicationCategory,
      priority: priority || 'MEDIUM',
      status: status || 'UNREAD',
      metadata: metadata || {},
      tags: tags || []
    });
    
    // Analyze the communication
    await communicationLogger.analyzeCommunication(communication.id);
    
    res.status(201).json(communication);
  } catch (error) {
    console.error('Error creating communication:', error);
    res.status(500).json({ error: 'Failed to create communication' });
  }
});

/**
 * Update a communication
 */
router.patch('/communications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Validate if communication exists
    const communication = await communicationLogger.getCommunication(id);
    if (!communication) {
      return res.status(404).json({ error: 'Communication not found' });
    }
    
    // Update the communication
    // Note: We're calling a method that's not explicitly defined in the logger class
    // This would need to be implemented in the actual communicationLogger class
    const updatedCommunication = await communicationLogger.updateCommunication(id, updates);
    
    res.json(updatedCommunication);
  } catch (error) {
    console.error('Error updating communication:', error);
    res.status(500).json({ error: 'Failed to update communication' });
  }
});

/**
 * Get all threads
 */
router.get('/threads', async (req, res) => {
  try {
    const threads = await communicationLogger.getAllThreads();
    res.json(threads);
  } catch (error) {
    console.error('Error fetching threads:', error);
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

/**
 * Get a specific thread with its communications
 */
router.get('/threads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const thread = await communicationLogger.getThread(id);
    
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    
    const communications = await communicationLogger.getThreadCommunications(id);
    
    res.json({
      thread,
      communications
    });
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

/**
 * Create a new thread
 */
router.post('/threads', async (req, res) => {
  try {
    const {
      subject,
      participants,
      category,
      tags,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!participants) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const thread = communicationLogger.createThread({
      subject,
      participants,
      messages: [],
      status: CommunicationStatus.UNREAD,
      category: category || CommunicationCategory.OTHER,
      metadata: metadata || {},
      tags: tags || []
    });
    
    res.status(201).json(thread);
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

/**
 * Add a communication to a thread
 */
router.post('/threads/:id/communications', async (req, res) => {
  try {
    const { id } = req.params;
    const { communicationId } = req.body;
    
    // Validate if thread and communication exist
    const thread = await communicationLogger.getThread(id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    
    const communication = await communicationLogger.getCommunication(communicationId);
    if (!communication) {
      return res.status(404).json({ error: 'Communication not found' });
    }
    
    // Add communication to thread
    const success = communicationLogger.addToThread(id, communicationId);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to add communication to thread' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding communication to thread:', error);
    res.status(500).json({ error: 'Failed to add communication to thread' });
  }
});

/**
 * Get all tags with communication counts
 */
router.get('/tags', async (req, res) => {
  try {
    // This assumes there's a method to get all tags with counts
    // This would need to be implemented in the actual communicationLogger class
    const tags = await communicationLogger.getAllTags();
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

/**
 * Email import endpoints
 */

/**
 * Get all email accounts
 */
router.get('/email-accounts', (req, res) => {
  try {
    const accounts = emailImporter.getAccounts();
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching email accounts:', error);
    res.status(500).json({ error: 'Failed to fetch email accounts' });
  }
});

/**
 * Add a new email account
 */
router.post('/email-accounts', (req, res) => {
  try {
    const {
      name,
      email,
      provider,
      credentials,
      serverSettings,
      status,
      folderMapping
    } = req.body;
    
    // Validate required fields
    if (!name || !email || !provider) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const account = emailImporter.addAccount({
      name,
      email,
      provider,
      credentials: credentials || {},
      serverSettings,
      status: status || 'inactive',
      folderMapping
    });
    
    res.status(201).json(account);
  } catch (error) {
    console.error('Error creating email account:', error);
    res.status(500).json({ error: 'Failed to create email account' });
  }
});

/**
 * Synchronize an email account
 */
router.post('/email-accounts/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate if account exists
    const account = emailImporter.getAccount(id);
    if (!account) {
      return res.status(404).json({ error: 'Email account not found' });
    }
    
    const result = await emailImporter.synchronizeAccount(id);
    res.json(result);
  } catch (error) {
    console.error('Error synchronizing email account:', error);
    res.status(500).json({ error: 'Failed to synchronize email account' });
  }
});

/**
 * Import email from file
 */
router.post('/import-email-file', upload.single('emailFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const success = await emailImporter.importFromEmlFile(filePath);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to import email from file' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error importing email from file:', error);
    res.status(500).json({ error: 'Failed to import email from file' });
  }
});

/**
 * Import emails from directory
 */
router.post('/import-emails-directory', (req, res) => {
  try {
    const { directoryPath } = req.body;
    
    if (!directoryPath) {
      return res.status(400).json({ error: 'No directory path provided' });
    }
    
    emailImporter.importFromDirectory(directoryPath)
      .then(result => {
        res.json(result);
      })
      .catch(error => {
        console.error('Error importing emails from directory:', error);
        res.status(500).json({ error: 'Failed to import emails from directory' });
      });
  } catch (error) {
    console.error('Error importing emails from directory:', error);
    res.status(500).json({ error: 'Failed to import emails from directory' });
  }
});

/**
 * Text message import endpoints
 */

/**
 * Get all message service providers
 */
router.get('/message-providers', (req, res) => {
  try {
    const providers = textMessageImporter.getAllServiceProviders();
    res.json(providers);
  } catch (error) {
    console.error('Error fetching message providers:', error);
    res.status(500).json({ error: 'Failed to fetch message providers' });
  }
});

/**
 * Add a new message service provider
 */
router.post('/message-providers', (req, res) => {
  try {
    const {
      name,
      type,
      credentials,
      status
    } = req.body;
    
    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const provider = textMessageImporter.addServiceProvider({
      name,
      type,
      credentials,
      status: status || 'inactive'
    });
    
    res.status(201).json(provider);
  } catch (error) {
    console.error('Error creating message provider:', error);
    res.status(500).json({ error: 'Failed to create message provider' });
  }
});

/**
 * Synchronize with a message service provider
 */
router.post('/message-providers/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate if provider exists
    const provider = textMessageImporter.getServiceProvider(id);
    if (!provider) {
      return res.status(404).json({ error: 'Message provider not found' });
    }
    
    const result = await textMessageImporter.synchronizeWithProvider(id);
    res.json(result);
  } catch (error) {
    console.error('Error synchronizing with message provider:', error);
    res.status(500).json({ error: 'Failed to synchronize with message provider' });
  }
});

/**
 * Import text messages from JSON file
 */
router.post('/import-messages-json', upload.single('messagesFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const result = await textMessageImporter.importFromJsonFile(filePath);
    
    res.json(result);
  } catch (error) {
    console.error('Error importing messages from JSON file:', error);
    res.status(500).json({ error: 'Failed to import messages from JSON file' });
  }
});

/**
 * Import text messages from CSV file
 */
router.post('/import-messages-csv', upload.single('messagesFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const result = await textMessageImporter.importFromCsvFile(filePath);
    
    res.json(result);
  } catch (error) {
    console.error('Error importing messages from CSV file:', error);
    res.status(500).json({ error: 'Failed to import messages from CSV file' });
  }
});

/**
 * Add a single message
 */
router.post('/messages', async (req, res) => {
  try {
    const {
      sender,
      recipient,
      content,
      timestamp,
      type,
      direction,
      serviceProviderId,
      mediaAttachments
    } = req.body;
    
    // Validate required fields
    if (!sender || !recipient || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const message = {
      id: uuidv4(),
      sender,
      recipient,
      content,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      type: type || 'sms',
      direction: direction || 'inbound',
      serviceProviderId: serviceProviderId || 'manual',
      mediaAttachments: mediaAttachments || []
    };
    
    const success = await textMessageImporter.importMessage(message);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to import message' });
    }
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error importing message:', error);
    res.status(500).json({ error: 'Failed to import message' });
  }
});

// Export router
export default router;