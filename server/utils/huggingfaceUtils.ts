import { HfInference } from '@huggingface/inference';
import { File } from '@shared/schema';

// Define types for HuggingFace responses to handle various formats
type EmbeddingResponse = number[] | number[][] | Record<string, number>;

interface ClassificationResponse {
  sequence?: string;
  labels?: string[];
  scores?: number[];
  [key: string]: any;
}

// Initialize HuggingFace client
let hf: HfInference | null = null;

/**
 * Initialize the HuggingFace client with API token
 */
const initHuggingFace = () => {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    console.warn('HuggingFace API key not found. Vector embeddings will use fallback.');
    return false;
  }

  try {
    hf = new HfInference(apiKey);
    return true;
  } catch (error) {
    console.error('Error initializing HuggingFace client:', error);
    return false;
  }
};

/**
 * Generate text embeddings using HuggingFace's embedding models
 * @param text The text to generate an embedding for
 * @returns An array of numbers representing the embedding vector, or null if failed
 */
export const generateHfEmbedding = async (text: string): Promise<number[] | null> => {
  // Use a mock embedding if no API key or in test mode
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
    // Using sentence-transformers embedding model
    const response = await hf!.featureExtraction({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: text.slice(0, 8000), // Limit to 8000 characters
    }) as EmbeddingResponse;
    
    // Handle different types of responses from HuggingFace
    if (Array.isArray(response)) {
      return response;
    } else if (response !== null && typeof response === 'object') {
      // If it's a nested array, flatten it
      if (Array.isArray(response[0])) {
        return response[0];
      }
      // Convert object to array if needed
      const values = Object.values(response);
      if (values.length > 0) {
        return values.map(v => Number(v));
      }
    }
    
    console.warn('Unexpected response format from HuggingFace:', response);
    return null;
  } catch (error) {
    console.error('Error generating HuggingFace embedding:', error);
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
  // Create a mock embedding with 128 dimensions (smaller than real embeddings)
  const vector: number[] = new Array(128).fill(0);
  
  // Generate a simple hash-based embedding
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
 * Generate a semantic query vector for searching similar content
 * @param query The search query text
 * @returns The query embedding vector
 */
export const generateQueryVector = async (query: string): Promise<number[] | null> => {
  return generateHfEmbedding(query);
};

/**
 * Tag content using HuggingFace's zero-shot classification
 * @param text Content text to classify
 * @param categories Array of possible categories
 * @returns Array of relevant tags
 */
export const tagContentWithHf = async (
  text: string, 
  categories: string[]
): Promise<string[]> => {
  // Use mock tagging if no API key or in test mode
  const forceTestMode = process.env.NODE_ENV === 'test' || !process.env.HUGGINGFACE_API_KEY;
  
  if (forceTestMode) {
    console.log('Using mock tagging for testing');
    // Return some mock tags based on simple keyword matching
    return generateMockTags(text, categories);
  }
  
  // Initialize HuggingFace if not already done
  if (!hf) {
    const initialized = initHuggingFace();
    if (!initialized) {
      console.log('HuggingFace initialization failed, using mock tagging');
      return generateMockTags(text, categories);
    }
  }

  try {
    // Using zero-shot classification to assign tags
    const response = await hf!.zeroShotClassification({
      model: 'facebook/bart-large-mnli',
      inputs: text.slice(0, 1000), // Limit text length
      parameters: {
        candidate_labels: categories.slice(0, 10).join(',') // Limit to 10 categories
      }
    }) as ClassificationResponse;
    
    // Filter results based on a confidence threshold
    const threshold = 0.3;
    let relevantLabels: string[] = [];
    
    // Handle different response formats from HuggingFace
    if (response && typeof response === 'object') {
      if (Array.isArray(response.labels) && Array.isArray(response.scores)) {
        // Standard format expected from HuggingFace
        relevantLabels = response.labels.filter((_: string, index: number) => {
          return response.scores[index] >= threshold;
        });
      } else if ('sequence' in response) {
        // Alternative format sometimes returned
        const sequence = response.sequence as string;
        const matchingCategories = categories.filter(cat => 
          sequence.toLowerCase().includes(cat.toLowerCase())
        );
        relevantLabels = matchingCategories.length > 0 ? matchingCategories : [categories[0]];
      }
    }
    
    return relevantLabels.length > 0 ? relevantLabels : generateMockTags(text, categories);
  } catch (error) {
    console.error('Error tagging content with HuggingFace:', error);
    console.log('Falling back to mock tagging');
    return generateMockTags(text, categories);
  }
};

/**
 * Generate mock tags based on simple keyword matching
 * Used for testing when HuggingFace API is unavailable
 */
const generateMockTags = (text: string, categories: string[]): string[] => {
  const textLower = text.toLowerCase();
  const selectedTags: string[] = [];
  
  // Simple keyword-based approach for mock tagging
  categories.forEach(category => {
    const categoryLower = category.toLowerCase();
    
    // Check if any word in the category appears in the text
    const words = categoryLower.split(/\W+/).filter(word => word.length > 3);
    const matches = words.some(word => textLower.includes(word));
    
    if (matches) {
      selectedTags.push(category);
    }
  });
  
  // Ensure we have at least some tags
  if (selectedTags.length === 0 && categories.length > 0) {
    // If no matches, select a few random categories
    const numTags = Math.min(3, categories.length);
    for (let i = 0; i < numTags; i++) {
      const randomIndex = Math.floor(Math.random() * categories.length);
      if (!selectedTags.includes(categories[randomIndex])) {
        selectedTags.push(categories[randomIndex]);
      }
    }
  }
  
  return selectedTags;
};