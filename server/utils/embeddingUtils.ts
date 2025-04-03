import OpenAI from 'openai';
import { File } from '@shared/schema';

// Initialize OpenAI client
let openai: OpenAI | null = null;

// Check for OpenAI API key and initialize client
const initOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OpenAI API key not found. Vector embeddings will not be available.');
    return false;
  }

  try {
    openai = new OpenAI({
      apiKey: apiKey
    });
    return true;
  } catch (error) {
    console.error('Error initializing OpenAI client:', error);
    return false;
  }
};

/**
 * Generate a text embedding using OpenAI's API
 * @param text The text to generate an embedding for
 * @returns An array of numbers representing the embedding vector, or null if failed
 */
export const generateEmbedding = async (text: string): Promise<number[] | null> => {
  // Initialize OpenAI if not already done
  if (!openai) {
    const initialized = initOpenAI();
    if (!initialized) return null;
  }

  try {
    const response = await openai!.embeddings.create({
      model: "text-embedding-3-small",  // Using a smaller, faster model
      input: text.slice(0, 8000),  // Limit to 8000 characters to stay within token limits
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
};

/**
 * Generate a content summary for a file using its name, path, and metadata
 * @param file The file to generate a summary for
 * @returns A text summary of the file's content
 */
export const generateContentSummary = (file: File): string => {
  // Extract filename and extension
  const fileName = file.name || '';
  const fileExtension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';
  
  // Get category as a string
  const category = file.fileCategory || 'unknown';
  
  // Extract any metadata
  const metadata = file.metadata || {};
  
  // Create a summary string
  let summary = `File: ${fileName}\n`;
  summary += `Category: ${category}\n`;
  summary += `Type: ${file.fileType || fileExtension || 'unknown'}\n`;
  summary += `Source: ${file.source}\n`;
  
  // Add path information if available
  if (file.path) {
    summary += `Path: ${file.path}\n`;
  }
  
  // Add metadata fields if available
  if (Object.keys(metadata).length > 0) {
    summary += 'Metadata:\n';
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        summary += `- ${key}: ${value}\n`;
      }
    }
  }
  
  return summary;
};

/**
 * Calculate cosine similarity between two vectors
 * @param vecA First vector
 * @param vecB Second vector
 * @returns Similarity score between 0 and 1, where 1 is identical
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Process a file to generate and store embeddings
 * @param file The file to process
 * @returns The processed file with content summary and vector
 */
export const processFileForEmbeddings = async (file: File): Promise<File> => {
  // Generate content summary
  const contentSummary = generateContentSummary(file);
  
  // Generate vector embedding
  let contentVector = null;
  if (contentSummary) {
    contentVector = await generateEmbedding(contentSummary);
  }
  
  // Create updated file object
  return {
    ...file,
    contentSummary,
    contentVector,
    isProcessed: true
  };
};

/**
 * Find similar files based on vector similarity
 * @param files Array of files with vector embeddings
 * @param queryVector Query vector to compare against
 * @param limit Maximum number of results
 * @param threshold Minimum similarity score (0-1)
 * @returns Array of files sorted by similarity
 */
export const findSimilarFiles = (
  files: File[], 
  queryVector: number[], 
  limit: number = 10, 
  threshold: number = 0.7
): File[] => {
  // Filter files that have vector embeddings
  const filesWithVectors = files.filter(file => 
    file.contentVector && Array.isArray(file.contentVector) && file.contentVector.length > 0
  );
  
  // Calculate similarity scores
  const scoredFiles = filesWithVectors.map(file => {
    const similarity = cosineSimilarity(queryVector, file.contentVector as number[]);
    return { file, similarity };
  });
  
  // Filter by threshold and sort by similarity (highest first)
  return scoredFiles
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(item => item.file);
};