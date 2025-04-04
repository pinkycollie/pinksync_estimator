import { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage for temporary file handling
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate a unique filename with uuid
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// Define file size limits and allowed file types
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check for ChatGPT JSON exports and common document formats
  if (
    file.mimetype === "application/json" ||
    file.mimetype === "text/plain" ||
    file.mimetype === "application/csv" ||
    file.mimetype === "application/zip"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type. Please upload JSON, TXT, CSV or ZIP files."));
  }
};

// Create multer upload instance
export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter,
});

/**
 * Middleware to handle file upload errors
 */
export function handleUploadErrors(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "File too large. Maximum size is 50MB."
      });
    }
    return res.status(400).json({
      error: `Upload error: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      error: err.message
    });
  }
  next();
}

/**
 * Parse JSON file from uploaded file path
 * @param filePath Path to the uploaded file
 * @returns Parsed JSON object or null if parsing fails
 */
export function parseJsonFile(filePath: string): any {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (err) {
    console.error("Failed to parse JSON file:", err);
    return null;
  }
}

/**
 * Clean up temporary file after processing
 * @param filePath Path to the temporary file
 */
export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error("Failed to cleanup temporary file:", err);
  }
}

/**
 * Detect file type and format from uploaded file
 * @param file Uploaded file
 * @returns File type information
 */
export function detectFileType(file: Express.Multer.File): { 
  platform: "chatgpt" | "claude" | "unknown",
  format: "json" | "csv" | "zip" | "txt" | "unknown"
} {
  // Default to unknown
  const result = { 
    platform: "unknown" as "chatgpt" | "claude" | "unknown",
    format: "unknown" as "json" | "csv" | "zip" | "txt" | "unknown"
  };

  // Determine format from mimetype
  if (file.mimetype === "application/json") {
    result.format = "json";
  } else if (file.mimetype === "text/csv" || file.mimetype === "application/csv") {
    result.format = "csv";
  } else if (file.mimetype === "application/zip") {
    result.format = "zip";
  } else if (file.mimetype === "text/plain") {
    result.format = "txt";
  }

  // Try to determine platform from filename
  const filename = file.originalname.toLowerCase();
  if (filename.includes("chatgpt") || filename.includes("openai")) {
    result.platform = "chatgpt";
  } else if (filename.includes("claude") || filename.includes("anthropic")) {
    result.platform = "claude";
  }

  return result;
}