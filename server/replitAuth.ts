import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler, Request } from "express";
import { storage } from "./storage";
import { customDomain, getFullyQualifiedDomain, isCustomDomain } from "./customDomain";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

export async function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: true,
      sameSite: 'none',
    }
  };
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  const replId = process.env.REPL_ID!;
  const config = await client.discovery(
    new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
    replId,
  );

  // Dynamic callback URL function based on request's hostname
  const getCallbackURL = (req: Request): string => {
    if (isCustomDomain(req)) {
      return `https://${customDomain}/api/callback`;
    }
    const hostname = `${process.env.REPLIT_DOMAINS!.split(",")[0]}`;
    return `https://${hostname}/api/callback`;
  };

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback) => {
    const claims = tokens.claims();
    if (!claims) {
      return;
    }

    const userInfoResponse = await client.fetchUserInfo(config, tokens.access_token, claims.sub);

    // Save the authentication time to handle session expiry
    const nowTime = Math.floor(Date.now() / 1000);
    const userWithMeta = {
      ...userInfoResponse,
      auth_time: nowTime,
    };

    verified(null, userWithMeta);
  };

  // Configure the authentication strategy
  passport.use('replit', new Strategy({ config, scope: "openid email profile" }, verify));

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Login endpoint using dynamic callback URL
  app.get("/api/login", (req, res, next) => {
    const callbackURL = getCallbackURL(req);
    const strategy = new Strategy({ 
      config, 
      scope: "openid email profile",
      callbackURL 
    }, verify);
    
    passport.use('replit', strategy);
    passport.authenticate('replit', { prompt: 'login' })(req, res, next);
  });

  // Callback handler with dynamic callback URL
  app.get("/api/callback", (req, res, next) => {
    const callbackURL = getCallbackURL(req);
    const strategy = new Strategy({ 
      config, 
      scope: "openid email profile",
      callbackURL 
    }, verify);
    
    passport.use('replit', strategy);
    passport.authenticate('replit', {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login"
    })(req, res, next);
  });

  // Logout endpoint that redirects to the custom domain if applicable
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      const redirectUri = getFullyQualifiedDomain(req);
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: replId,
          post_logout_redirect_uri: redirectUri,
        }).href,
      );
    });
  });
  
  // Handle redirects to login page
  app.get("/login", (req, res) => {
    res.redirect("/api/login");
  });
}

// Enhanced authentication middleware that redirects to login for UI requests
// and returns 401 for API requests
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // If it's an API request, return 401
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Otherwise, redirect to login
  res.redirect("/api/login");
}