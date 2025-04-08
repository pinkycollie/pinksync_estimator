import { Express, Request, Response, NextFunction } from 'express';

// Custom domain configuration
const CUSTOM_DOMAIN = 'pinkyaihub.mbtquniverse.com';

/**
 * Middleware to handle custom domain redirection and configuration
 */
export function setupCustomDomain(app: Express) {
  // Set up the custom domain middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Set the custom domain as a local variable for use in templates
    res.locals.customDomain = CUSTOM_DOMAIN;
    
    // If on custom domain, ensure https
    if (req.hostname === CUSTOM_DOMAIN && req.protocol !== 'https') {
      return res.redirect(`https://${CUSTOM_DOMAIN}${req.originalUrl}`);
    }
    
    next();
  });
  
  // Add a health check endpoint for domain verification
  app.get('/domain-verify', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'success',
      message: 'Domain verification successful',
      domain: CUSTOM_DOMAIN,
      timestamp: new Date().toISOString()
    });
  });
}

/**
 * Get the fully qualified domain name for use in URLs
 */
export function getFullyQualifiedDomain(req: Request): string {
  if (req.hostname === CUSTOM_DOMAIN) {
    return `${req.protocol}://${CUSTOM_DOMAIN}`;
  }
  
  // Fallback to the Replit domain
  return `${req.protocol}://${req.hostname}`;
}

/**
 * Function to check if the request is coming from the custom domain
 */
export function isCustomDomain(req: Request): boolean {
  return req.hostname === CUSTOM_DOMAIN;
}

/**
 * Export the custom domain for use in other files
 */
export const customDomain = CUSTOM_DOMAIN;