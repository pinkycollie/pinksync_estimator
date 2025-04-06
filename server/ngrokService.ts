import { createServer, type Server } from "http";
import type { Express } from "express";
import fetch from "node-fetch";

interface NgrokTunnel {
  name: string;
  uri: string;
  public_url: string;
  proto: string;
  config: {
    addr: string;
    inspect: boolean;
  };
  metrics: {
    conns: {
      count: number;
      gauge: number;
      rate1: number;
      rate5: number;
      rate15: number;
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
    http: {
      count: number;
      rate1: number;
      rate5: number;
      rate15: number;
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
  };
}

interface NgrokApiResponse {
  tunnels: NgrokTunnel[];
  uri: string;
}

/**
 * Gets the active ngrok tunnel URL
 * @returns The public URL of the active ngrok tunnel or a hardcoded endpoint
 */
export async function getNgrokUrl(): Promise<string | null> {
  try {
    // Use the provided ngrok endpoint
    const hardcodedEndpoint = "https://logical-forcibly-jay.ngrok-free.app";
    console.log('Using configured ngrok endpoint:', hardcodedEndpoint);
    return hardcodedEndpoint;
    
    // Previous implementation - connecting to local ngrok API
    /* 
    const response = await fetch('http://localhost:4040/api/tunnels');
    
    if (!response.ok) {
      console.error('Failed to connect to ngrok API:', response.statusText);
      return null;
    }
    
    const data = await response.json() as NgrokApiResponse;
    
    // Find https tunnel
    const httpsTunnel = data.tunnels.find(tunnel => 
      tunnel.proto === 'https' && tunnel.public_url.startsWith('https://')
    );
    
    if (httpsTunnel) {
      console.log('Ngrok tunnel active at:', httpsTunnel.public_url);
      return httpsTunnel.public_url;
    } else if (data.tunnels.length > 0) {
      // Fall back to first tunnel if no https tunnel found
      console.log('Ngrok tunnel active at:', data.tunnels[0].public_url);
      return data.tunnels[0].public_url;
    }
    
    console.error('No active ngrok tunnels found');
    return null;
    */
  } catch (error) {
    console.error('Error with ngrok endpoint:', error);
    return null;
  }
}

/**
 * Provides ngrok status information for the API
 */
export async function getNgrokStatus() {
  try {
    const publicUrl = await getNgrokUrl();
    
    if (!publicUrl) {
      return {
        active: false,
        message: "Ngrok endpoint not available. Please check the configuration.",
        webInterface: "N/A"
      };
    }
    
    return {
      active: true,
      url: publicUrl,
      webInterface: "N/A",
      message: "Using configured ngrok endpoint"
    };
  } catch (error: any) {
    return {
      active: false,
      message: `Error checking ngrok status: ${error?.message || 'Unknown error'}`,
      webInterface: "N/A"
    };
  }
}

/**
 * Register ngrok-related routes to the Express app
 */
export function registerNgrokRoutes(app: Express) {
  // Endpoint to get ngrok status
  app.get('/api/system/ngrok-status', async (_req, res) => {
    const status = await getNgrokStatus();
    res.json(status);
  });
  
  // Middleware to include ngrok URL in responses if present
  app.use((req, res, next) => {
    // Store original send method
    const originalSend = res.send;
    
    // Override the send method
    res.send = function(body) {
      // Only modify JSON responses
      const contentType = this.getHeader('content-type');
      if (typeof contentType === 'string' && contentType.includes('application/json') && 
          typeof body === 'string' && 
          body.startsWith('{') && 
          !body.includes('ngrokUrl')) {
        try {
          // Parse the JSON, add ngrok URL if available from request
          const json = JSON.parse(body);
          if (req.app.locals.ngrokUrl) {
            json.ngrokUrl = req.app.locals.ngrokUrl;
          }
          // Stringify and send modified JSON
          return originalSend.call(this, JSON.stringify(json));
        } catch (e) {
          // If JSON parsing fails, send original body
          return originalSend.call(this, body);
        }
      }
      
      // For non-JSON responses, use original send
      return originalSend.call(this, body);
    };
    
    next();
  });
}

/**
 * Periodically check for and update ngrok URL in app locals
 */
export function startNgrokMonitor(app: Express) {
  // Check for ngrok URL immediately
  checkAndUpdateNgrokUrl(app);
  
  // Then check every 30 seconds
  setInterval(() => checkAndUpdateNgrokUrl(app), 30000);
}

/**
 * Check for ngrok URL and update app.locals if found
 */
async function checkAndUpdateNgrokUrl(app: Express) {
  try {
    const ngrokUrl = await getNgrokUrl();
    if (ngrokUrl) {
      app.locals.ngrokUrl = ngrokUrl;
    }
  } catch (error) {
    console.error('Error updating ngrok URL:', error);
  }
}