import OpenAI from 'openai';
import { File } from '@shared/schema';

// Initialize OpenAI client
let openai: OpenAI | null = null;

// Define category tags based on the user's data categorization structure
export const CATEGORY_TAGS = {
  // Device types
  DEVICE_TYPES: ['Laptop', 'Phone', 'Tablet', 'Desktop', 'Server', 'Cloud'],
  
  // File types
  FILE_TYPES: ['Document', 'Spreadsheet', 'Code', 'Image', 'Video', 'PDF', 'Presentation', 'Audio'],
  
  // Data status
  DATA_STATUS: ['In Progress', 'Completed', 'Archived', 'Reviewed', 'Pending', 'To Be Processed'],
  
  // Priority levels
  PRIORITY: ['High Priority', 'Medium Priority', 'Low Priority'],
  
  // Business projects
  BUSINESS_PROJECTS: ['360 Business Magician', '360 Job Magician', '+Deaf', '+Q', 'MCP'],
  
  // Client projects
  CLIENT_PROJECTS: ['Amazon Delivery Startup', 'Deaf Women Empowerment', 'Vocational Rehabilitation'],
  
  // Development projects
  DEV_PROJECTS: ['App Development', 'AI Integration', 'Web Development', 'Automation', 'Full-stack', 'Database'],
  
  // Content creation
  CONTENT_CREATION: ['Blog', 'News', 'Policy Updates', 'TikTok-style Videos'],
  
  // Coaching/consulting
  COACHING: ['Business Coaching', 'Career Coaching', 'Startup Consulting'],
  
  // Learning & certification
  LEARNING: ['UNT Certification', 'Job & Business Specialist Training'],
  
  // AI integration
  AI_INTEGRATION: ['Data Processing', 'Automation', 'API Integration', 'AI Workflow', 'AI Model Training', 'AI-Driven Tagging'],
  
  // Tools & software
  TOOLS: ['Notion', 'Google Workspace', 'Anytype', 'TidyCal', 'Zapier', 'HubSpot', 'Taskade', 'Flask', 'Vercel', 'GitHub Copilot'],
  
  // Cloud services
  CLOUD_SERVICES: ['Google Cloud', 'DataStax', 'Neon Tech'],
  
  // Automation platforms
  AUTOMATION: ['Make.com', 'Zapier', 'AISQL', 'Pushcut', 'Shortcuts'],
  
  // Personal projects
  PERSONAL: ['Personal Development', 'Goal Setting', 'Self Improvement', 'Productivity'],
  
  // Files & notes
  FILES_NOTES: ['Research', 'Client Notes', 'Code Snippets', 'Meeting Notes', 'Work In Progress', 'Archive'],
  
  // Technologies
  TECHNOLOGIES: ['Python', 'JavaScript', 'React', 'Next.js', 'PostgreSQL', 'AI Models', 'APIs', 'Machine Learning'],
  
  // Workflow/task type
  WORKFLOW: ['Admin', 'Marketing', 'Development', 'Client Interaction', 'Support', 'Research', 'Testing', 'Implementation'],
  
  // Task status
  TASK_STATUS: ['To Do', 'In Progress', 'Completed', 'On Hold', 'Cancelled'],
  
  // Time sensitivity
  TIME_SENSITIVITY: ['Urgent', 'Next Week', 'Long-Term', 'Short-Term'],
  
  // Collaboration
  COLLABORATION: ['Team', 'Partner', 'Client'],
  
  // File/document status
  FILE_STATUS: ['Final', 'Draft', 'In Review'],
  
  // Communication
  COMMUNICATION: ['Email', 'Message', 'Call Log', 'Meeting', 'Follow-Up'],
  
  // Client-specific
  CLIENT_SPECIFIC: ['Amazon Delivery Business', 'Deaf Women Empowerment', 'Single Mothers', 'Amazon Partner', 
                    'Vocational Rehabilitation', 'VRS Support', 'Client Intake', 'Business Coaching', 
                    'Deaf Community', 'Accessibility', 'Deaf Entrepreneurs', 'Deaf Employment'],
  
  // Automation types
  AUTOMATION_TYPES: ['AI-Powered', 'Manual', 'Bot-Driven', 'Event-Triggered', 'Scheduled'],
  
  // API integrations
  API_INTEGRATIONS: ['Custom API', 'Third-Party API', 'Internal API']
};

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
 * Analyze file content and automatically tag with relevant categories
 * @param file The file to analyze
 * @returns Array of relevant tags for the file
 */
export const analyzeAndTagFile = async (
  fileContent: string, 
  fileName: string,
  fileType: string
): Promise<string[]> => {
  if (!openai) {
    const initialized = initOpenAI();
    if (!initialized) return [];
  }

  try {
    // Create a prompt that asks the model to identify relevant tags
    const prompt = `
      Analyze this file information and identify the most relevant tags from the provided categories.
      
      File name: ${fileName}
      File type: ${fileType}
      Content preview: ${fileContent.slice(0, 1000)}
      
      Select only the most relevant tags from the following categories. Return ONLY the tags as a JSON array, nothing else.
      
      Available tags:
      ${Object.entries(CATEGORY_TAGS).map(([category, tags]) => 
        `${category}: ${tags.join(', ')}`
      ).join('\n')}
    `;

    const response = await openai!.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    // Parse the JSON response
    const content = response.choices[0].message.content || '{"tags": []}';
    const parsedResponse = JSON.parse(content);
    return parsedResponse.tags || [];
  } catch (error) {
    console.error('Error analyzing file for tags:', error);
    return [];
  }
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
  return generateEmbedding(query);
};