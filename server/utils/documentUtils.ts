import { DocumentCategory, DocumentStatus } from '@shared/schema';
import { storage } from '../storage';
import { generateHfEmbedding } from './huggingfaceUtils';
import { cosineSimilarity } from './vectorUtils';
import path from 'path';
import fs from 'fs';

/**
 * Utility functions for document management
 */

/**
 * Calculate document expiration status
 * @param expirationDate Expiration date of the document
 * @returns Status object with expiration info
 */
export const getDocumentExpirationStatus = (expirationDate: Date | null): {
  status: 'valid' | 'expiring' | 'expired';
  daysRemaining: number | null;
} => {
  if (!expirationDate) {
    return { status: 'valid', daysRemaining: null };
  }

  const now = new Date();
  const diffTime = expirationDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { status: 'expired', daysRemaining: 0 };
  } else if (diffDays <= 30) {
    return { status: 'expiring', daysRemaining: diffDays };
  } else {
    return { status: 'valid', daysRemaining: diffDays };
  }
};

/**
 * Generate version control metrics for documents
 * @param userId User ID
 * @returns Statistics about document versions
 */
export const generateDocumentVersionMetrics = async (userId: number) => {
  try {
    // Get documents for user
    const documents = await storage.getDocuments(userId);
    
    // Get all document versions
    const versionPromises = documents.map(doc => storage.getDocumentVersions(doc.id));
    const versionsArrays = await Promise.all(versionPromises);
    
    // Calculate metrics
    const flatVersions = versionsArrays.flat();
    const docsWithMultipleVersions = documents.filter(doc => 
      versionsArrays.find(versions => 
        versions.some(v => v.documentId === doc.id)
      )?.length > 0
    ).length;
    
    const totalVersions = flatVersions.length;
    const avgVersionsPerDoc = documents.length ? totalVersions / documents.length : 0;
    
    // Document counts by category
    const categoryCounts = documents.reduce((acc, doc) => {
      const category = doc.category || 'other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalDocuments: documents.length,
      totalVersions,
      docsWithMultipleVersions,
      avgVersionsPerDoc,
      categoryCounts
    };
  } catch (error) {
    console.error('Error generating document version metrics:', error);
    throw error;
  }
};

/**
 * Convert a file to a document record
 * @param fileId File ID to convert
 * @param category Document category
 * @param userId User ID
 * @returns Created document ID
 */
export const convertFileToDocument = async (
  fileId: number, 
  category: string,
  userId: number,
  metadata: Record<string, any> = {}
): Promise<number | null> => {
  try {
    const file = await storage.getFile(fileId);
    if (!file) {
      throw new Error(`File with ID ${fileId} not found`);
    }
    
    // Create document from file
    const document = await storage.createDocument({
      userId,
      title: file.name,
      description: file.contentSummary || `File: ${file.path || file.name}`,
      category,
      fileId,
      status: DocumentStatus.ACTIVE,
      metadata: {
        ...metadata,
        sourceFile: {
          id: file.id,
          name: file.name,
          path: file.path,
          source: file.source,
          size: file.size,
          fileType: file.fileType
        }
      }
    });
    
    // Process document for vector search
    await processDocumentWithVectors(document.id);
    
    return document.id;
  } catch (error) {
    console.error('Error converting file to document:', error);
    return null;
  }
};

/**
 * Process document content to add vector embeddings
 * @param documentId Document ID to process
 * @returns Updated document
 */
export const processDocumentWithVectors = async (documentId: number) => {
  try {
    const document = await storage.getDocument(documentId);
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }
    
    // Get file content if available
    let contentText = '';
    
    if (document.fileId) {
      const file = await storage.getFile(document.fileId);
      if (file && file.path) {
        try {
          if (fs.existsSync(file.path)) {
            // Read file content based on file type
            const fileType = file.fileType?.toLowerCase() || '';
            if (['text', 'document', 'pdf', 'doc', 'docx'].includes(fileType)) {
              contentText = fs.readFileSync(file.path, 'utf-8');
            }
          }
        } catch (fileError) {
          console.warn(`Could not read file for document ${documentId}:`, fileError);
        }
      }
    }
    
    // If no file content, use document title and description
    if (!contentText) {
      contentText = `${document.title}. ${document.description || ''}`;
      
      // Add metadata as text if available
      if (document.metadata && typeof document.metadata === 'object') {
        try {
          const metadataStr = JSON.stringify(document.metadata);
          contentText += ` ${metadataStr}`;
        } catch (e) {
          // Ignore metadata parsing errors
        }
      }
    }
    
    // Generate vector embedding
    const contentVector = await generateHfEmbedding(contentText);
    
    if (!contentVector) {
      console.warn(`Failed to generate vector embedding for document ID ${documentId}`);
      return document;
    }
    
    // Update document with vector
    const updatedDocument = await storage.updateDocument(documentId, {
      contentVector,
      isProcessed: true
    });
    
    return updatedDocument;
  } catch (error) {
    console.error(`Error processing document ${documentId} for vector search:`, error);
    throw error;
  }
};

/**
 * Scan for document expiration and update metrics
 * @param userId User ID to process
 * @returns Updated metrics
 */
export const scanDocumentExpiration = async (userId: number) => {
  try {
    const documents = await storage.getDocuments(userId);
    
    let activeCount = 0;
    let expiredCount = 0;
    let expiringCount = 0;
    
    // Categorize documents by expiration status
    for (const doc of documents) {
      if (!doc.expirationDate) {
        activeCount++;
        continue;
      }
      
      const expDate = new Date(doc.expirationDate);
      const status = getDocumentExpirationStatus(expDate);
      
      if (status.status === 'expired') {
        expiredCount++;
        // Auto-update document status if expired
        await storage.updateDocument(doc.id, { status: DocumentStatus.EXPIRED });
      } else if (status.status === 'expiring') {
        expiringCount++;
      } else {
        activeCount++;
      }
    }
    
    // Get metrics by category
    const categories = Object.values(DocumentCategory);
    const metricsUpdates = [];
    
    for (const category of categories) {
      const categoryDocs = documents.filter(d => d.category === category);
      
      if (categoryDocs.length > 0) {
        const catActiveCount = categoryDocs.filter(d => {
          if (!d.expirationDate) return true;
          const status = getDocumentExpirationStatus(new Date(d.expirationDate));
          return status.status === 'valid';
        }).length;
        
        const catExpiredCount = categoryDocs.filter(d => {
          if (!d.expirationDate) return false;
          const status = getDocumentExpirationStatus(new Date(d.expirationDate));
          return status.status === 'expired';
        }).length;
        
        const catExpiringCount = categoryDocs.filter(d => {
          if (!d.expirationDate) return false;
          const status = getDocumentExpirationStatus(new Date(d.expirationDate));
          return status.status === 'expiring';
        }).length;
        
        // Update metrics for this category
        const existingMetric = await storage.getDocumentMetricsByCategory(userId, category);
        
        if (existingMetric) {
          metricsUpdates.push(
            storage.updateDocumentMetrics(existingMetric.id, {
              totalCount: categoryDocs.length,
              activeCount: catActiveCount,
              expiredCount: catExpiredCount,
              expiringCount: catExpiringCount,
              lastUpdated: new Date()
            })
          );
        } else {
          metricsUpdates.push(
            storage.createDocumentMetrics({
              userId,
              categoryName: category,
              totalCount: categoryDocs.length,
              activeCount: catActiveCount,
              expiredCount: catExpiredCount,
              expiringCount: catExpiringCount,
              avgVersions: 1,
              lastUpdated: new Date()
            })
          );
        }
      }
    }
    
    // Wait for all metrics updates to complete
    await Promise.all(metricsUpdates);
    
    return {
      totalCount: documents.length,
      activeCount,
      expiredCount,
      expiringCount
    };
  } catch (error) {
    console.error('Error scanning document expiration:', error);
    throw error;
  }
};

/**
 * Search for similar documents using vector similarity
 * @param documentId Source document ID
 * @param threshold Similarity threshold (0-1)
 * @param limit Maximum results to return
 * @returns Array of similar documents
 */
export const findSimilarDocuments = async (
  documentId: number,
  threshold: number = 0.7,
  limit: number = 10
) => {
  try {
    // Get source document
    const document = await storage.getDocument(documentId);
    if (!document || !document.contentVector) {
      throw new Error(`Document with ID ${documentId} not found or has no vector`);
    }
    
    // Get user documents with vectors
    const userId = document.userId;
    const allDocs = await storage.getDocuments(userId);
    const docsWithVectors = allDocs.filter(
      doc => doc.id !== documentId && doc.contentVector
    );
    
    // Calculate similarity scores
    const scoredDocs = docsWithVectors.map(doc => {
      const similarity = cosineSimilarity(
        document.contentVector as number[],
        doc.contentVector as number[]
      );
      return { document: doc, similarity };
    });
    
    // Filter by threshold and sort by similarity (highest first)
    return scoredDocs
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => ({
        ...item.document,
        similarityScore: item.similarity
      }));
  } catch (error) {
    console.error(`Error finding similar documents for ${documentId}:`, error);
    throw error;
  }
};