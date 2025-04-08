import { HfInference } from '@huggingface/inference';
import fs from 'fs';
import path from 'path';
import { storage } from '../storage';
import { type File } from '@shared/schema';

// Initialize API with Hugging Face
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

/**
 * Enhanced file analysis functions for text and code files
 */
export class EnhancedFileAnalysis {
  /**
   * Analyze a text file and extract key information
   * @param fileId ID of the file to analyze
   * @returns Analysis results with key information
   */
  public static async analyzeTextFile(fileId: number): Promise<{
    keywords: string[];
    summary: string;
    sentiment: string;
    categories: string[];
    entities: { text: string; type: string; relevance: number }[];
    readingLevel: string;
    language: string;
  }> {
    // Get the file from storage
    const file = await storage.getFile(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Only analyze text files
    if (!this.isTextFile(file)) {
      throw new Error(`File is not a text file: ${file.name}`);
    }

    // Get the file content
    const content = await this.getFileContent(file);
    if (!content) {
      throw new Error(`Failed to read file content: ${file.path}`);
    }

    try {
      // Extract keywords using Hugging Face
      const keywordsPrompt = `Extract the top 7 most important keywords from this text, separated by commas:\n\n${content.substring(0, 4000)}`;
      const keywordsResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: keywordsPrompt,
        parameters: { max_length: 100 }
      });
      const keywords = keywordsResponse.generated_text
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      // Generate summary using Hugging Face
      const summaryPrompt = `Summarize this text in 2-3 sentences:\n\n${content.substring(0, 4000)}`;
      const summaryResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: summaryPrompt,
        parameters: { max_length: 250 }
      });
      const summary = summaryResponse.generated_text;

      // Perform sentiment analysis
      const sentimentPrompt = `What is the sentiment of this text? Answer with only one word (positive, negative, or neutral):\n\n${content.substring(0, 4000)}`;
      const sentimentResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: sentimentPrompt,
        parameters: { max_length: 50 }
      });
      const sentiment = sentimentResponse.generated_text.toLowerCase().includes('positive') 
        ? 'positive' 
        : sentimentResponse.generated_text.toLowerCase().includes('negative')
          ? 'negative'
          : 'neutral';

      // Categorize the content
      const categoriesPrompt = `Assign 2-4 categories to this text. Choose from: business, technology, science, finance, marketing, personal, documentation, legal, creative, educational, research. Separate categories by commas:\n\n${content.substring(0, 4000)}`;
      const categoriesResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: categoriesPrompt,
        parameters: { max_length: 100 }
      });
      const categories = categoriesResponse.generated_text
        .split(',')
        .map(c => c.trim().toLowerCase())
        .filter(c => c.length > 0);

      // Extract named entities (simplified version)
      const entitiesPrompt = `Extract key entities (people, organizations, locations, dates) from this text and format as JSON with properties "text", "type", and "relevance" (0-10):\n\n${content.substring(0, 4000)}`;
      const entitiesResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: entitiesPrompt,
        parameters: { max_length: 500 }
      });
      
      // Extract JSON from the response or provide a fallback
      let entities = [];
      try {
        const jsonMatch = entitiesResponse.generated_text.match(/\{.*\}/s);
        if (jsonMatch) {
          entities = JSON.parse(jsonMatch[0]).entities || [];
        } else {
          // Fallback: extract entities manually
          const entityMatches = entitiesResponse.generated_text.match(/[A-Z][a-zA-Z]+ [A-Z][a-zA-Z]+|[A-Z][a-zA-Z]+/g) || [];
          entities = entityMatches.map(text => ({ 
            text, 
            type: 'unknown', 
            relevance: 5 
          }));
        }
      } catch (e) {
        console.error('Failed to parse entities:', e);
      }

      // Estimate reading level
      const readingLevelPrompt = `What is the reading level of this text? Answer with one option: elementary, middle school, high school, college, professional, or technical:\n\n${content.substring(0, 2000)}`;
      const readingLevelResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: readingLevelPrompt,
        parameters: { max_length: 50 }
      });
      const readingLevel = readingLevelResponse.generated_text.toLowerCase().includes('elementary') 
        ? 'elementary' 
        : readingLevelResponse.generated_text.toLowerCase().includes('middle')
          ? 'middle school'
          : readingLevelResponse.generated_text.toLowerCase().includes('high')
            ? 'high school'
            : readingLevelResponse.generated_text.toLowerCase().includes('college')
              ? 'college'
              : readingLevelResponse.generated_text.toLowerCase().includes('professional')
                ? 'professional'
                : readingLevelResponse.generated_text.toLowerCase().includes('technical')
                  ? 'technical'
                  : 'general';

      // Detect language
      const languagePrompt = `What language is this text written in? Answer with a single word:\n\n${content.substring(0, 2000)}`;
      const languageResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: languagePrompt,
        parameters: { max_length: 50 }
      });
      const language = languageResponse.generated_text.toLowerCase();

      // Update file metadata with the analysis results
      await storage.updateFile(fileId, {
        metadata: {
          ...file.metadata,
          analysis: {
            keywords,
            summary,
            sentiment,
            categories,
            entities,
            readingLevel,
            language,
            analyzedAt: new Date().toISOString()
          }
        },
        isProcessed: true
      });

      return {
        keywords,
        summary,
        sentiment,
        categories,
        entities,
        readingLevel,
        language
      };
    } catch (error) {
      console.error('Error analyzing text file:', error);
      throw new Error(`Failed to analyze file: ${error.message}`);
    }
  }

  /**
   * Detects related files based on content similarity
   * @param fileId ID of the reference file
   * @param maxResults Maximum number of results to return
   * @returns List of related files with similarity scores
   */
  public static async findRelatedFiles(fileId: number, maxResults: number = 5): Promise<Array<{
    file: File;
    similarityScore: number;
    matchedKeywords: string[];
  }>> {
    // Get the source file
    const sourceFile = await storage.getFile(fileId);
    if (!sourceFile) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Ensure the file has been analyzed
    if (!sourceFile.isProcessed || !sourceFile.metadata?.analysis?.keywords) {
      await this.analyzeTextFile(fileId);
    }

    // Find similar files using vector similarity
    const similarFiles = await storage.findSimilarFiles(fileId, maxResults);
    
    // Enhance the results with additional information
    const enhancedResults = await Promise.all(
      similarFiles.map(async (file) => {
        // Get matching keywords between the files
        const sourceKeywords = sourceFile.metadata?.analysis?.keywords || [];
        const fileKeywords = file.metadata?.analysis?.keywords || [];
        
        const matchedKeywords = sourceKeywords.filter(keyword => 
          fileKeywords.some(k => k.toLowerCase().includes(keyword.toLowerCase()) || 
                              keyword.toLowerCase().includes(k.toLowerCase()))
        );

        return {
          file,
          similarityScore: file.metadata?.similarityScore || 0,
          matchedKeywords
        };
      })
    );

    return enhancedResults;
  }

  /**
   * Extracts structured information from a file based on its content
   * @param fileId ID of the file to extract information from
   * @returns Structured information extracted from the file
   */
  public static async extractStructuredInfo(fileId: number): Promise<any> {
    // Get the file
    const file = await storage.getFile(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Get the file content
    const content = await this.getFileContent(file);
    if (!content) {
      throw new Error(`Failed to read file content: ${file.path}`);
    }

    try {
      // Determine the type of information to extract based on file contents
      const extractionPrompt = `Analyze this text and identify what kind of information it contains. 
      Choose from: contact details, meeting notes, project plan, code documentation, product specs, research notes, financial data, or other.
      Answer with a single term:\n\n${content.substring(0, 3000)}`;
      
      const typeResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: extractionPrompt,
        parameters: { max_length: 50 }
      });
      
      const infoType = typeResponse.generated_text.toLowerCase();
      let extractedInfo = {};

      // Extract different structures based on the type
      if (infoType.includes('contact')) {
        extractedInfo = await this.extractContactInfo(content);
      } else if (infoType.includes('meeting')) {
        extractedInfo = await this.extractMeetingNotes(content);
      } else if (infoType.includes('project plan') || infoType.includes('project')) {
        extractedInfo = await this.extractProjectInfo(content);
      } else if (infoType.includes('code') || infoType.includes('documentation')) {
        extractedInfo = await this.extractCodeDocumentation(content);
      } else {
        // Generic extraction
        extractedInfo = await this.extractGenericInfo(content);
      }

      // Update the file metadata
      await storage.updateFile(fileId, {
        metadata: {
          ...file.metadata,
          structuredInfo: extractedInfo,
          extractedAt: new Date().toISOString()
        }
      });

      return extractedInfo;
    } catch (error) {
      console.error('Error extracting structured info:', error);
      throw new Error(`Failed to extract structured information: ${error.message}`);
    }
  }

  // Helper methods for extracting specific types of information
  
  private static async extractContactInfo(content: string): Promise<any> {
    const prompt = `Extract contact information from this text. Return as JSON with name, email, phone, organization, and role fields:\n\n${content}`;
    const response = await hf.textGeneration({
      model: 'google/flan-t5-xl',
      inputs: prompt,
      parameters: { max_length: 500 }
    });
    
    try {
      // Try to parse JSON from the response
      const jsonMatch = response.generated_text.match(/\{.*\}/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse contact JSON:', e);
    }
    
    // Fallback to manual extraction
    return {
      name: this.extractPattern(content, /([A-Z][a-z]+ [A-Z][a-z]+)/),
      email: this.extractPattern(content, /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/),
      phone: this.extractPattern(content, /(\+?[0-9]{1,3}[-\s]?[0-9]{3}[-\s]?[0-9]{3}[-\s]?[0-9]{4})/),
      organization: null,
      role: null
    };
  }

  private static async extractMeetingNotes(content: string): Promise<any> {
    const prompt = `Extract meeting information from these notes. Return as JSON with date, attendees (array), topics (array), decisions (array), and action_items (array with owner and task):\n\n${content}`;
    const response = await hf.textGeneration({
      model: 'google/flan-t5-xl',
      inputs: prompt,
      parameters: { max_length: 800 }
    });
    
    try {
      // Try to parse JSON from the response
      const jsonMatch = response.generated_text.match(/\{.*\}/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse meeting JSON:', e);
    }

    // Fallback to simpler extraction
    return {
      date: this.extractPattern(content, /([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/),
      attendees: (content.match(/([A-Z][a-z]+ [A-Z][a-z]+)/g) || []).slice(0, 5),
      topics: [],
      decisions: [],
      action_items: []
    };
  }

  private static async extractProjectInfo(content: string): Promise<any> {
    const prompt = `Extract project information from this text. Return as JSON with name, start_date, end_date, objectives (array), stakeholders (array), and milestones (array with date and description):\n\n${content}`;
    const response = await hf.textGeneration({
      model: 'google/flan-t5-xl',
      inputs: prompt,
      parameters: { max_length: 800 }
    });
    
    try {
      // Try to parse JSON from the response
      const jsonMatch = response.generated_text.match(/\{.*\}/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse project JSON:', e);
    }

    // Fallback
    return {
      name: this.extractPattern(content, /Project:?\s*([^\n]+)/i) || this.extractPattern(content, /([A-Z][a-z]+ [A-Z][a-z]+)/),
      start_date: this.extractPattern(content, /start:?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i),
      end_date: this.extractPattern(content, /end:?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i),
      objectives: [],
      stakeholders: [],
      milestones: []
    };
  }

  private static async extractCodeDocumentation(content: string): Promise<any> {
    const prompt = `Extract code documentation information. Return as JSON with language, functions (array with name, params, return_value, description), classes (array with name, methods, properties), and dependencies (array):\n\n${content}`;
    const response = await hf.textGeneration({
      model: 'google/flan-t5-xl',
      inputs: prompt,
      parameters: { max_length: 800 }
    });
    
    try {
      // Try to parse JSON from the response
      const jsonMatch = response.generated_text.match(/\{.*\}/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse code JSON:', e);
    }

    // Fallback
    return {
      language: this.detectProgrammingLanguage(content),
      functions: [],
      classes: [],
      dependencies: []
    };
  }

  private static async extractGenericInfo(content: string): Promise<any> {
    const prompt = `Extract key information from this text. Return as JSON with title, main_points (array), dates (array), names (array), and organizations (array):\n\n${content}`;
    const response = await hf.textGeneration({
      model: 'google/flan-t5-xl',
      inputs: prompt,
      parameters: { max_length: 800 }
    });
    
    try {
      // Try to parse JSON from the response
      const jsonMatch = response.generated_text.match(/\{.*\}/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse generic JSON:', e);
    }

    // Fallback
    return {
      title: content.split('\n')[0],
      main_points: [],
      dates: (content.match(/[0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4}/g) || []),
      names: (content.match(/[A-Z][a-z]+ [A-Z][a-z]+/g) || []),
      organizations: []
    };
  }

  // Helper utility methods

  private static isTextFile(file: File): boolean {
    const textTypes = [
      'text/plain', 'text/markdown', 'text/html', 'text/css', 'text/xml',
      'application/json', 'application/xml', 'application/javascript'
    ];
    
    // Check by MIME type if available
    if (file.fileType && textTypes.includes(file.fileType)) {
      return true;
    }
    
    // Check by file extension
    const extension = path.extname(file.name).toLowerCase();
    const textExtensions = ['.txt', '.md', '.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.json', '.xml', '.yml', '.yaml'];
    
    return textExtensions.includes(extension);
  }

  private static async getFileContent(file: File): Promise<string | null> {
    // First check if content is in metadata
    if (file.metadata?.contentText) {
      return file.metadata.contentText;
    }
    
    // Otherwise try to read from filesystem
    if (file.path && fs.existsSync(file.path)) {
      try {
        return fs.readFileSync(file.path, 'utf-8');
      } catch (err) {
        console.error(`Failed to read file: ${file.path}`, err);
        return null;
      }
    }
    
    return null;
  }

  private static extractPattern(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match ? match[1] : null;
  }

  private static detectProgrammingLanguage(content: string): string {
    // Simple language detection based on file content
    if (content.includes('def ') && content.includes('import ') && (content.includes('print(') || content.includes('self.'))) {
      return 'python';
    }
    if (content.includes('function ') && content.includes('const ') && content.includes('let ')) {
      return 'javascript';
    }
    if (content.includes('public class ') || content.includes('private class ')) {
      return 'java';
    }
    if (content.includes('#include ') && (content.includes('int main') || content.includes('void main'))) {
      return 'c/c++';
    }
    if (content.includes('<?php')) {
      return 'php';
    }
    if (content.includes('<html') && content.includes('</html>')) {
      return 'html';
    }
    if (content.includes('interface ') && content.includes('export ') && (content.includes('type ') || content.includes('interface '))) {
      return 'typescript';
    }
    
    return 'unknown';
  }
}