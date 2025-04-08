import { HfInference } from '@huggingface/inference';
import fs from 'fs';
import path from 'path';
import { storage } from '../storage';
import { type File } from '@shared/schema';

// Initialize API with Hugging Face
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

/**
 * Text Content Organization utilities
 * For organizing and extracting knowledge from text files
 */
export class TextOrganization {
  /**
   * Categorizes a text file based on its content
   * @param fileId ID of the file to categorize
   * @returns Category information and confidence scores
   */
  public static async categorizeText(fileId: number): Promise<{
    primaryCategory: string;
    secondaryCategories: string[];
    confidenceScore: number;
    topics: string[];
    categoryHierarchy: string[];
  }> {
    // Get the file from storage
    const file = await storage.getFile(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Only process text files
    if (!this.isTextFile(file)) {
      throw new Error(`File is not a text file: ${file.name}`);
    }

    // Get the file content
    const content = await this.getFileContent(file);
    if (!content) {
      throw new Error(`Failed to read file content: ${file.path}`);
    }

    try {
      // Create categorization prompt
      const categoriesPrompt = `Analyze this text and determine the primary category, secondary categories, and topics.
Primary categories to choose from: Business, Technology, Science, Finance, Marketing, Personal, Documentation, Legal, Creative, Educational, Research, Programming, Project Management, Meeting Notes, Product, Development, Design, Healthcare, Communications, Other.

Text to analyze:
${content.substring(0, 5000)}

Response format (JSON):
{
  "primaryCategory": "Category name",
  "secondaryCategories": ["Category 1", "Category 2"],
  "confidenceScore": 0.9,
  "topics": ["Topic 1", "Topic 2", "Topic 3"],
  "categoryHierarchy": ["Top Level", "Sub Category", "Specific Area"]
}`;

      const categoriesResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: categoriesPrompt,
        parameters: { max_length: 800, temperature: 0.2 }
      });

      // Extract the JSON response
      let categorization;
      try {
        const jsonMatch = categoriesResponse.generated_text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          categorization = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to extract JSON from response');
        }
      } catch (e) {
        console.error('Failed to parse categorization JSON:', e);
        
        // Fallback: extract information manually
        const primaryMatch = categoriesResponse.generated_text.match(/primary\s*category:?\s*([a-z0-9 ]+)/i);
        const secondaryMatch = categoriesResponse.generated_text.match(/secondary\s*categories:?\s*([a-z0-9 ,]+)/i);
        const confidenceMatch = categoriesResponse.generated_text.match(/confidence:?\s*([0-9.]+)/i);
        const topicsMatch = categoriesResponse.generated_text.match(/topics:?\s*([a-z0-9 ,]+)/i);
        
        categorization = {
          primaryCategory: primaryMatch ? primaryMatch[1].trim() : 'Uncategorized',
          secondaryCategories: secondaryMatch ? 
            secondaryMatch[1].split(',').map(c => c.trim()).filter(Boolean) : [],
          confidenceScore: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
          topics: topicsMatch ? 
            topicsMatch[1].split(',').map(t => t.trim()).filter(Boolean) : [],
          categoryHierarchy: []
        };
      }

      // Update file metadata with categorization
      await storage.updateFile(fileId, {
        fileCategory: categorization.primaryCategory,
        metadata: {
          ...file.metadata,
          categorization: {
            ...categorization,
            categorizedAt: new Date().toISOString()
          }
        },
        isProcessed: true
      });

      return categorization;
    } catch (error) {
      console.error('Error categorizing text:', error);
      throw new Error(`Failed to categorize text: ${error.message}`);
    }
  }

  /**
   * Extracts key knowledge points from text content
   * @param fileId ID of the file to extract knowledge from
   * @returns Extracted knowledge points and related information
   */
  public static async extractKnowledge(fileId: number): Promise<{
    keyPoints: string[];
    concepts: string[];
    entities: Array<{ name: string; type: string }>;
    relationships: Array<{ source: string; relation: string; target: string }>;
    summaries: {
      oneLineSummary: string;
      shortSummary: string;
      detailedSummary: string;
    };
  }> {
    // Get the file from storage
    const file = await storage.getFile(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Only process text files
    if (!this.isTextFile(file)) {
      throw new Error(`File is not a text file: ${file.name}`);
    }

    // Get the file content
    const content = await this.getFileContent(file);
    if (!content) {
      throw new Error(`Failed to read file content: ${file.path}`);
    }

    try {
      // Extract key points and concepts
      const keyPointsPrompt = `Extract the 5-7 most important key points from this text:
${content.substring(0, 5000)}

Format as a JSON array: { "keyPoints": ["Point 1", "Point 2", ...] }`;

      const keyPointsResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: keyPointsPrompt,
        parameters: { max_length: 800 }
      });

      // Extract key concepts
      const conceptsPrompt = `Identify the 5-7 most important concepts or terms from this text:
${content.substring(0, 5000)}

Format as a JSON array: { "concepts": ["Concept 1", "Concept 2", ...] }`;

      const conceptsResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: conceptsPrompt,
        parameters: { max_length: 500 }
      });

      // Extract entities
      const entitiesPrompt = `Extract important named entities (people, organizations, locations, products) from this text:
${content.substring(0, 5000)}

Format as a JSON array: { "entities": [{"name": "Entity 1", "type": "person"}, {"name": "Entity 2", "type": "organization"}, ...] }`;

      const entitiesResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: entitiesPrompt,
        parameters: { max_length: 800 }
      });

      // Extract relationships
      const relationshipsPrompt = `Identify key relationships between concepts or entities in this text:
${content.substring(0, 5000)}

Format as a JSON array: { "relationships": [{"source": "Entity/Concept 1", "relation": "relationship", "target": "Entity/Concept 2"}, ...] }`;

      const relationshipsResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: relationshipsPrompt,
        parameters: { max_length: 800 }
      });

      // Generate summaries
      const summariesPrompt = `Generate three summaries of this text:
1. A one-line summary (maximum 20 words)
2. A short summary (maximum 50 words)
3. A detailed summary (maximum 200 words)

${content.substring(0, 5000)}

Format as JSON: { "oneLineSummary": "...", "shortSummary": "...", "detailedSummary": "..." }`;

      const summariesResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: summariesPrompt,
        parameters: { max_length: 1000 }
      });

      // Parse the responses
      const keyPoints = this.extractJsonArray(keyPointsResponse.generated_text, 'keyPoints') || [];
      const concepts = this.extractJsonArray(conceptsResponse.generated_text, 'concepts') || [];
      const entities = this.extractJsonArray(entitiesResponse.generated_text, 'entities') || [];
      const relationships = this.extractJsonArray(relationshipsResponse.generated_text, 'relationships') || [];

      // Parse summaries
      let summaries;
      try {
        const summariesMatch = summariesResponse.generated_text.match(/\{[\s\S]*\}/);
        if (summariesMatch) {
          summaries = JSON.parse(summariesMatch[0]);
        } else {
          // Extract manually
          const oneLineMatch = summariesResponse.generated_text.match(/one-line summary:?\s*([^\n]+)/i);
          const shortMatch = summariesResponse.generated_text.match(/short summary:?\s*([^\n]+)/i);
          const detailedMatch = summariesResponse.generated_text.match(/detailed summary:?\s*([^\n]+)/i);
          
          summaries = {
            oneLineSummary: oneLineMatch ? oneLineMatch[1].trim() : '',
            shortSummary: shortMatch ? shortMatch[1].trim() : '',
            detailedSummary: detailedMatch ? detailedMatch[1].trim() : ''
          };
        }
      } catch (e) {
        console.error('Failed to parse summaries JSON:', e);
        summaries = {
          oneLineSummary: '',
          shortSummary: '',
          detailedSummary: ''
        };
      }

      // Build the result
      const knowledgeResult = {
        keyPoints,
        concepts,
        entities,
        relationships,
        summaries
      };

      // Update file metadata
      await storage.updateFile(fileId, {
        metadata: {
          ...file.metadata,
          knowledge: knowledgeResult,
          extractedAt: new Date().toISOString()
        },
        contentSummary: summaries.shortSummary
      });

      return knowledgeResult;
    } catch (error) {
      console.error('Error extracting knowledge:', error);
      throw new Error(`Failed to extract knowledge: ${error.message}`);
    }
  }

  /**
   * Organizes a collection of text files into a coherent knowledge base
   * @param fileIds Array of file IDs to organize
   * @param title Title for the knowledge base
   * @returns Structure of the organized knowledge base
   */
  public static async organizeKnowledgeBase(
    fileIds: number[],
    title: string
  ): Promise<{
    title: string;
    sections: Array<{
      title: string;
      content: string;
      sourceFileIds: number[];
    }>;
    concepts: Array<{
      name: string;
      description: string;
      relatedConcepts: string[];
      sourceFileIds: number[];
    }>;
    hierarchy: {
      nodes: Array<{ id: string; label: string; level: number }>;
      edges: Array<{ source: string; target: string; type: string }>;
    };
  }> {
    // Verify that all files exist
    const files: File[] = [];
    for (const fileId of fileIds) {
      const file = await storage.getFile(fileId);
      if (!file) {
        throw new Error(`File not found: ${fileId}`);
      }
      
      // Only include text files
      if (this.isTextFile(file)) {
        files.push(file);
      }
    }

    if (files.length === 0) {
      throw new Error('No valid text files provided');
    }

    try {
      // Extract content from all files
      const fileContents: Array<{ id: number; name: string; content: string }> = [];
      for (const file of files) {
        const content = await this.getFileContent(file);
        if (content) {
          fileContents.push({
            id: file.id,
            name: file.name,
            content: content.substring(0, 2000) // Limit content length
          });
        }
      }

      // Create a summary of all file contents
      const allContentSummary = fileContents.map(f => `File: ${f.name}\n\n${f.content.substring(0, 300)}`).join('\n\n---\n\n');

      // Create section organization prompt
      const sectionPrompt = `Organize these documents into a coherent knowledge base with 3-5 sections.
For each section, create a title and provide content that synthesizes information from the source files.

Documents:
${allContentSummary}

Response format (JSON):
{
  "sections": [
    {
      "title": "Section Title",
      "content": "Synthesized content for this section...",
      "sourceFileIds": [file IDs that contributed to this section]
    }
  ]
}`;

      const sectionResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: sectionPrompt,
        parameters: { max_length: 2000 }
      });

      // Extract concepts prompt
      const conceptsPrompt = `Identify the most important concepts across these documents and create a mini-encyclopedia entry for each.
For each concept, provide a short description and list related concepts.

Documents:
${allContentSummary}

Response format (JSON):
{
  "concepts": [
    {
      "name": "Concept Name",
      "description": "Description of the concept",
      "relatedConcepts": ["Related concept 1", "Related concept 2"],
      "sourceFileIds": [file IDs that mention this concept]
    }
  ]
}`;

      const conceptsResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: conceptsPrompt,
        parameters: { max_length: 2000 }
      });

      // Create hierarchy prompt
      const hierarchyPrompt = `Create a hierarchical knowledge graph that organizes the concepts and information in these documents.
Create nodes for key concepts, categories, or topics, and connect them with meaningful relationships.

Documents:
${allContentSummary}

Response format (JSON):
{
  "hierarchy": {
    "nodes": [
      {"id": "node1", "label": "Node Label", "level": 1}
    ],
    "edges": [
      {"source": "node1", "target": "node2", "type": "contains/related_to/part_of"}
    ]
  }
}`;

      const hierarchyResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: hierarchyPrompt,
        parameters: { max_length: 2000 }
      });

      // Parse responses
      let sections = [];
      try {
        const sectionMatch = sectionResponse.generated_text.match(/\{[\s\S]*\}/);
        if (sectionMatch) {
          const sectionData = JSON.parse(sectionMatch[0]);
          sections = sectionData.sections || [];
        }
      } catch (e) {
        console.error('Failed to parse sections JSON:', e);
        sections = [];
      }

      let concepts = [];
      try {
        const conceptsMatch = conceptsResponse.generated_text.match(/\{[\s\S]*\}/);
        if (conceptsMatch) {
          const conceptsData = JSON.parse(conceptsMatch[0]);
          concepts = conceptsData.concepts || [];
        }
      } catch (e) {
        console.error('Failed to parse concepts JSON:', e);
        concepts = [];
      }

      let hierarchy = { nodes: [], edges: [] };
      try {
        const hierarchyMatch = hierarchyResponse.generated_text.match(/\{[\s\S]*\}/);
        if (hierarchyMatch) {
          const hierarchyData = JSON.parse(hierarchyMatch[0]);
          hierarchy = hierarchyData.hierarchy || { nodes: [], edges: [] };
        }
      } catch (e) {
        console.error('Failed to parse hierarchy JSON:', e);
        hierarchy = { nodes: [], edges: [] };
      }

      // Build the knowledge base
      const knowledgeBase = {
        title,
        sections,
        concepts,
        hierarchy
      };

      // Save knowledge base to database as a file
      const knowledgeBaseContent = JSON.stringify(knowledgeBase, null, 2);
      const knowledgeBaseFile = await storage.createFile({
        userId: files[0].userId, // Use the first file's user ID
        name: `${title} - Knowledge Base.json`,
        fileType: 'application/json',
        source: 'generated',
        fileCategory: 'Knowledge Base',
        lastModified: new Date(),
        metadata: {
          sourceFileIds: fileIds,
          generatedAt: new Date().toISOString(),
          knowledgeBase
        },
        isProcessed: true
      });

      return knowledgeBase;
    } catch (error) {
      console.error('Error organizing knowledge base:', error);
      throw new Error(`Failed to organize knowledge base: ${error.message}`);
    }
  }

  /**
   * Generates a markdown document from text files
   * @param fileIds Array of file IDs to include in the document
   * @param title Title for the document
   * @returns Generated markdown document
   */
  public static async generateMarkdownDocument(
    fileIds: number[],
    title: string
  ): Promise<{
    markdown: string;
    toc: Array<{ title: string; level: number; anchor: string }>;
    fileId: number;
  }> {
    // Verify that all files exist
    const files: File[] = [];
    for (const fileId of fileIds) {
      const file = await storage.getFile(fileId);
      if (!file) {
        throw new Error(`File not found: ${fileId}`);
      }
      
      // Only include text files
      if (this.isTextFile(file)) {
        files.push(file);
      }
    }

    if (files.length === 0) {
      throw new Error('No valid text files provided');
    }

    try {
      // Extract content from all files
      const fileContents: Array<{ id: number; name: string; content: string }> = [];
      for (const file of files) {
        const content = await this.getFileContent(file);
        if (content) {
          fileContents.push({
            id: file.id,
            name: file.name,
            content: content.substring(0, 3000) // Limit content length
          });
        }
      }

      // Create a summary of all file contents
      const allContentSummary = fileContents.map(f => `File: ${f.name}\n\n${f.content.substring(0, 500)}`).join('\n\n---\n\n');

      // Create markdown document prompt
      const markdownPrompt = `Create a comprehensive markdown document that synthesizes information from these files.
Include a title, table of contents, introductory section, main content sections, and a conclusion.
Use proper markdown formatting with headers, lists, emphasis, and code blocks as appropriate.

Title: ${title}

Source files:
${allContentSummary}

Generate a complete, well-structured markdown document that organizes and presents this information coherently.`;

      const markdownResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: markdownPrompt,
        parameters: { max_length: 4000 }
      });

      const markdown = markdownResponse.generated_text;

      // Extract table of contents
      const toc = [];
      const headerRegex = /^#{1,6} (.+)$/gm;
      let match;
      while ((match = headerRegex.exec(markdown)) !== null) {
        const headerText = match[1].trim();
        const level = match[0].split(' ')[0].length; // Count # characters
        const anchor = headerText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        toc.push({
          title: headerText,
          level,
          anchor
        });
      }

      // Save markdown document to database as a file
      const mdFile = await storage.createFile({
        userId: files[0].userId, // Use the first file's user ID
        name: `${title}.md`,
        fileType: 'text/markdown',
        source: 'generated',
        fileCategory: 'Documentation',
        lastModified: new Date(),
        metadata: {
          sourceFileIds: fileIds,
          generatedAt: new Date().toISOString(),
          toc
        },
        isProcessed: true,
        contentSummary: markdown.substring(0, 200)
      });

      return {
        markdown,
        toc,
        fileId: mdFile.id
      };
    } catch (error) {
      console.error('Error generating markdown document:', error);
      throw new Error(`Failed to generate markdown document: ${error.message}`);
    }
  }

  /**
   * Creates accessibility-enhanced content for deaf community
   * @param fileId ID of the file to enhance for accessibility
   * @returns Enhanced content with accessibility features
   */
  public static async createAccessibleContent(fileId: number): Promise<{
    originalFileId: number;
    enhancedFileId: number;
    simplifiedText: string;
    visualCues: string;
    signLanguageNotes: string;
    readabilityScore: number;
    accessibilityReport: string;
  }> {
    // Get the file from storage
    const file = await storage.getFile(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Only process text files
    if (!this.isTextFile(file)) {
      throw new Error(`File is not a text file: ${file.name}`);
    }

    // Get the file content
    const content = await this.getFileContent(file);
    if (!content) {
      throw new Error(`Failed to read file content: ${file.path}`);
    }

    try {
      // Create simplified text prompt
      const simplifyPrompt = `Rewrite this text to be more accessible for the deaf community. 
Use clear, straightforward language. Avoid idioms, metaphors, and complex sentences. 
Organize information with clear headings and bullet points.

Original text:
${content.substring(0, 5000)}`;

      const simplifiedResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: simplifyPrompt,
        parameters: { max_length: 2000 }
      });

      // Create visual cues prompt
      const visualCuesPrompt = `Suggest visual cues and formatting that would make this content more accessible to deaf readers.
For example, recommend icons, color coding, or visual organization that could help clarify meaning.

Text:
${content.substring(0, 3000)}

Format as markdown with clear sections.`;

      const visualCuesResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: visualCuesPrompt,
        parameters: { max_length: 1000 }
      });

      // Create sign language notes prompt
      const signLanguagePrompt = `Create notes that would help a sign language interpreter accurately convey this content.
Identify any technical terms, unusual concepts, or passages that might require special attention.

Text:
${content.substring(0, 3000)}

Format as a list of notes with timestamps or reference points.`;

      const signLanguageResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: signLanguagePrompt,
        parameters: { max_length: 1000 }
      });

      // Create accessibility assessment prompt
      const assessmentPrompt = `Evaluate this text for deaf accessibility. Rate it on a scale of 1-10 and explain issues.
Consider sentence complexity, idioms, cultural references, visual organization, and other factors.

Text:
${content.substring(0, 3000)}

Format your response with a numeric score and explanation.`;

      const assessmentResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: assessmentPrompt,
        parameters: { max_length: 1000 }
      });

      // Extract readability score
      const scoreMatch = assessmentResponse.generated_text.match(/([0-9]+)(\/10|\s*out of\s*10)/i);
      const readabilityScore = scoreMatch ? Math.min(10, Math.max(1, parseInt(scoreMatch[1]))) : 5;

      // Create the enhanced content
      const enhancedContent = `# Accessibility-Enhanced Version: ${file.name}

## Original Summary
${content.substring(0, 500)}...

## Simplified Content
${simplifiedResponse.generated_text}

## Visual Cues and Organization
${visualCuesResponse.generated_text}

## Sign Language Interpreter Notes
${signLanguageResponse.generated_text}

## Accessibility Assessment
Score: ${readabilityScore}/10

${assessmentResponse.generated_text}

---
Enhanced for deaf accessibility on ${new Date().toLocaleDateString()}
Original file: ${file.name}
`;

      // Save enhanced content as a new file
      const enhancedFile = await storage.createFile({
        userId: file.userId,
        name: `${path.basename(file.name, path.extname(file.name))}-accessible${path.extname(file.name)}`,
        fileType: 'text/markdown',
        source: 'generated',
        fileCategory: 'Accessibility',
        lastModified: new Date(),
        metadata: {
          sourceFileId: fileId,
          generatedAt: new Date().toISOString(),
          accessibility: {
            readabilityScore,
            enhancedFor: 'deaf',
            accessibilityNotes: assessmentResponse.generated_text
          }
        },
        isProcessed: true,
        contentSummary: `Accessibility-enhanced version of ${file.name}`
      });

      return {
        originalFileId: fileId,
        enhancedFileId: enhancedFile.id,
        simplifiedText: simplifiedResponse.generated_text,
        visualCues: visualCuesResponse.generated_text,
        signLanguageNotes: signLanguageResponse.generated_text,
        readabilityScore,
        accessibilityReport: assessmentResponse.generated_text
      };
    } catch (error) {
      console.error('Error creating accessible content:', error);
      throw new Error(`Failed to create accessible content: ${error.message}`);
    }
  }

  // Helper methods

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

  private static extractJsonArray(text: string, arrayName: string): any[] {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const json = JSON.parse(jsonMatch[0]);
        if (json[arrayName] && Array.isArray(json[arrayName])) {
          return json[arrayName];
        }
      }
      
      // Try alternative patterns
      const arrayMatch = new RegExp(`"${arrayName}"\\s*:\\s*\\[(.*?)\\]`, 's').exec(text);
      if (arrayMatch) {
        try {
          return JSON.parse(`[${arrayMatch[1]}]`);
        } catch (e) {
          // Ignore parsing errors
        }
      }
    } catch (e) {
      console.error(`Failed to extract ${arrayName} array:`, e);
    }
    
    // If we get here, try to extract the array manually
    const items = [];
    const itemRegex = new RegExp(`"([^"]+)"`, 'g');
    let match;
    
    while ((match = itemRegex.exec(text)) !== null) {
      items.push(match[1]);
    }
    
    return items.length > 0 ? items : [];
  }
}