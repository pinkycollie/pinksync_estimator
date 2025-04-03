import { HfInference } from '@huggingface/inference';

/**
 * Generate embeddings using HuggingFace's feature extraction API
 * @param text Text to generate embeddings for
 * @returns Array of embeddings or null on error
 */
export const generateHfEmbedding = async (text: string): Promise<number[] | null> => {
  try {
    // Check if we have a Hugging Face API key
    if (!process.env.HUGGINGFACE_API_KEY) {
      console.error('HUGGINGFACE_API_KEY is not set in environment variables');
      return null;
    }

    // Initialize HuggingFace client
    const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    
    // Use sentence-transformers model for embeddings
    // This is a lightweight model that works well for semantic search
    const model = 'sentence-transformers/all-MiniLM-L6-v2';
    
    // Call the feature-extraction endpoint
    const responseAny: any = await hf.featureExtraction({
      model,
      inputs: text,
    });
    
    // Handle different response formats that the API might return
    if (Array.isArray(responseAny)) {
      if (responseAny.every(item => typeof item === 'number')) {
        return responseAny as number[];
      } else if (Array.isArray(responseAny[0])) {
        return responseAny[0] as number[];
      }
    } else if (typeof responseAny === 'object' && responseAny !== null) {
      // Some additional cases if needed
    }
    
    console.warn('Unexpected response format from HuggingFace:', responseAny);
    return null;
  } catch (error) {
    console.error('Error generating embeddings with HuggingFace:', error);
    return null;
  }
};

/**
 * Calculate cosine similarity between two vectors
 * @param a First vector 
 * @param b Second vector
 * @returns Similarity score between 0 and 1
 */
export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Check if Hugging Face API key is configured
 */
export const isHuggingFaceConfigured = (): boolean => {
  return !!process.env.HUGGINGFACE_API_KEY;
};

/**
 * Test the Hugging Face connection by generating a simple embedding
 */
export const testHuggingFaceConnection = async (): Promise<boolean> => {
  try {
    const result = await generateHfEmbedding('This is a test sentence.');
    return !!result && Array.isArray(result) && result.length > 0;
  } catch (error) {
    console.error('Error testing Hugging Face connection:', error);
    return false;
  }
};