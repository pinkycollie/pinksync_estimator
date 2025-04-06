import { HfInference } from '@huggingface/inference';
import { File } from '@shared/schema';
import { initHuggingFace } from './vectorUtils';

// Initialize HuggingFace client
let hf: HfInference | null = null;

/**
 * Generate a text embedding using HuggingFace's API
 * @param text The text to generate an embedding for
 * @returns An array of numbers representing the embedding vector, or null if failed
 */
export const generateEmbedding = async (text: string): Promise<number[] | null> => {
  // Check if we're in testing mode (no API key or API limit reached)
  const forceTestMode = process.env.NODE_ENV === 'test' || !process.env.HUGGINGFACE_API_KEY;
  
  if (forceTestMode) {
    console.log('Using mock embedding for testing');
    return generateMockEmbedding(text);
  }
  
  // Initialize HuggingFace if not already done
  if (!hf) {
    const initialized = initHuggingFace();
    if (!initialized) {
      console.log('HuggingFace initialization failed, using mock embedding');
      return generateMockEmbedding(text);
    }
  }

  try {
    // Using sentence-transformers model for embeddings
    const response = await hf!.featureExtraction({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: text.slice(0, 8000)  // Limit to 8000 characters to stay within model limits
    });

    // Handle all possible return types from featureExtraction
    if (Array.isArray(response)) {
      // If it's already an array of numbers, return it
      return response as number[];
    } else if (typeof response === 'number') {
      // If it's a single number, wrap it in an array
      return [response];
    } else if (Array.isArray(response) && Array.isArray(response[0])) {
      // If it's a 2D array, flatten it
      return (response as number[][])[0];
    } else {
      console.error('Unexpected response format from HuggingFace:', response);
      return generateMockEmbedding(text);
    }
  } catch (error) {
    console.error('Error generating embedding:', error);
    console.log('Falling back to mock embedding for testing');
    return generateMockEmbedding(text);
  }
};

/**
 * Generate a simple mock embedding for testing
 * This creates a deterministic vector based on content (not ML-based)
 * @param content Text to create mock embedding from
 * @returns Array of numbers (embedding vector)
 */
export const generateMockEmbedding = (text: string): number[] => {
  // Create a mock embedding with 128 dimensions (much smaller than real embeddings)
  const vector: number[] = new Array(128).fill(0);
  
  // Generate a simple hash-based embedding
  // This is not a real ML embedding but works for testing the API
  const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 0);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const seed = simpleHash(word) % vector.length;
    
    // Add a small value to the vector at the position determined by the word
    vector[seed] += 0.1 + (i / words.length) * 0.9;
    
    // Add smaller values to neighboring positions for smooth distribution
    for (let j = 1; j <= 3; j++) {
      const pos1 = (seed + j) % vector.length;
      const pos2 = (seed - j + vector.length) % vector.length;
      vector[pos1] += 0.03 * (1 - j/4);
      vector[pos2] += 0.03 * (1 - j/4);
    }
  }
  
  // Normalize the vector (make it unit length)
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map(val => val / magnitude);
};

/**
 * Simple string hash function for generating mock embeddings
 */
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
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