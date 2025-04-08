import express, { type Express } from 'express';
import session from 'express-session';
import path from 'path';
import { createServer, type Server } from 'http';
import { WebSocketServer } from 'ws';
import { storage } from './storage';
import communicationRoutes from './api/communication-routes';
import realEstateRoutes from './api/real-estate-routes';
import insuranceRoutes from './api/insurance-routes';

// Set up WebSocket connections (for real-time communication)
const setupWebSockets = (server: Server) => {
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('New client connected');
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to Pinky\'s AI OS WebSocket server'
    }));
    
    // Handle messages from clients
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        console.log('Received message:', parsedMessage);
        
        // Echo back for now
        if (ws.readyState === 1) { // 1 means OPEN
          ws.send(JSON.stringify({
            type: 'echo',
            data: parsedMessage
          }));
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
    
    // Handle client disconnect
    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });
  
  return wss;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'pinky-ai-os-secret',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
  });
  
  app.use(sessionMiddleware);
  
  // Body parser middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Static files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  // API routes
  app.use('/api/communications', communicationRoutes);
  app.use('/api/real-estate', realEstateRoutes);
  app.use('/api/insurance', insuranceRoutes);
  
  // API health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });
  
  // Check if secrets are set
  app.get('/api/check-secrets', (_req, res) => {
    const secretsStatus = {
      signyapse: process.env.SIGNYAPSE_API_KEY !== undefined,
      openai: process.env.OPENAI_API_KEY !== undefined,
      huggingface: process.env.HUGGINGFACE_API_KEY !== undefined,
      astraDb: process.env.ASTRA_DB_TOKEN !== undefined
    };
    
    res.json(secretsStatus);
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSockets
  setupWebSockets(httpServer);
  
  return httpServer;
}