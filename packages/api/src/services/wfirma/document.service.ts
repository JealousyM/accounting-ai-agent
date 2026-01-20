/**
 * wFirma Document Service
 * Handles document CRUD operations and file downloads
 */

import { logger } from '../../utils/logger';
import {
  WFirmaDocument,
  DocumentFilters,
  DocumentData,
  DeleteResult,
} from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError, WFirmaValidationError } from './errors';

export class WFirmaDocumentService {
  constructor(private readonly client: WFirmaClient) {}

  /**
   * Get list of documents from wFirma
   */
  async findDocuments(filters?: DocumentFilters): Promise<WFirmaDocument[]> {
    logger.info('Fetching documents from wFirma', { filters });

    return this.client.withRetry(async () => {
      try {
        const conditions: any[] = [];

        if (filters?.objectName) {
          conditions.push({
            field: 'object_name',
            operator: 'eq',
            value: filters.objectName,
          });
        }

        if (filters?.objectId) {
          conditions.push({
            field: 'object_id',
            operator: 'eq',
            value: filters.objectId,
          });
        }

        if (filters?.type) {
          conditions.push({
            field: 'type',
            operator: 'eq',
            value: filters.type,
          });
        }

        if (filters?.set) {
          conditions.push({
            field: 'set',
            operator: 'eq',
            value: filters.set,
          });
        }

        if (filters?.search) {
          conditions.push({
            field: 'name',
            operator: 'like',
            value: `%${filters.search}%`,
          });
        }

        const limit = filters?.limit || 100;
        const page = Math.floor((filters?.offset || 0) / limit) + 1;

        const documentsParams: any = {
          parameters: {
            limit,
            page,
          },
        };

        if (conditions.length > 0) {
          documentsParams.parameters.conditions = {
            condition: conditions,
          };
        }

        const payload = {
          api: {
            documents: documentsParams,
          },
        };

        logger.debug('wFirma findDocuments payload', { payload });

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/documents/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch documents',
            data.status
          );
        }

        let documentsData = data.documents?.document;

        if (!documentsData) {
          const documentsObj = data.documents;
          if (documentsObj) {
            documentsData = [];
            for (const key in documentsObj) {
              if (!isNaN(Number(key)) && documentsObj[key]?.document) {
                documentsData.push(documentsObj[key].document);
              }
            }
          }
        }

        if (!documentsData || documentsData.length === 0) {
          return [];
        }

        if (!Array.isArray(documentsData)) {
          documentsData = [documentsData];
        }

        const documents: WFirmaDocument[] = documentsData.map((d: any) =>
          this.mapDocumentData(d)
        );

        logger.info('Successfully fetched documents from wFirma', {
          count: documents.length,
        });

        return documents;
      } catch (error) {
        logger.error('Failed to fetch documents from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Get a single document by ID from wFirma
   */
  async getDocument(id: string): Promise<WFirmaDocument | null> {
    logger.info('Fetching document by ID from wFirma', { documentId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Document ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/documents/get/${id}`,
          params: this.client.buildQueryParams(),
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          if (
            data.status?.code === 'NOT FOUND' ||
            data.status?.code === 'ACTION NOT FOUND'
          ) {
            return null;
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch document',
            data.status
          );
        }

        let documentData = data.documents?.document;
        if (!documentData) {
          const documentsObj = data.documents;
          if (documentsObj) {
            for (const key in documentsObj) {
              if (!isNaN(Number(key)) && documentsObj[key]?.document) {
                documentData = documentsObj[key].document;
                break;
              }
            }
          }
        }

        if (!documentData) {
          return null;
        }

        const document = this.mapDocumentData(documentData);

        logger.info('Successfully fetched document by ID', {
          documentId: document.id,
          documentName: document.name,
        });

        return document;
      } catch (error) {
        logger.error('Failed to fetch document by ID', { error, documentId: id });
        throw error;
      }
    });
  }

  /**
   * Download document file content from wFirma
   * Returns Buffer for binary files
   */
  async downloadDocument(
    id: string
  ): Promise<{ content: Buffer; filename: string; mime: string }> {
    logger.info('Downloading document file from wFirma', { documentId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Document ID is required');
        }

        // First get document metadata
        const document = await this.getDocument(id);
        if (!document) {
          throw new WFirmaError(
            'WFIRMA_NOT_FOUND',
            `Document with ID ${id} not found`,
            {},
            404
          );
        }

        if (document.type !== 'file') {
          throw new WFirmaValidationError(
            'Document is not a file and cannot be downloaded'
          );
        }

        // Download the file
        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/documents/download/${id}`,
          params: this.client.buildQueryParams(),
          responseType: 'arraybuffer',
        });

        const content = Buffer.from(response.data);
        const filename = document.filename || document.name || `document_${id}`;
        const mime = document.mime || 'application/octet-stream';

        logger.info('Successfully downloaded document file', {
          documentId: id,
          filename,
          size: content.length,
        });

        return { content, filename, mime };
      } catch (error) {
        logger.error('Failed to download document file', { error, documentId: id });
        throw error;
      }
    });
  }

  /**
   * Create a new document in wFirma
   */
  async createDocument(data: DocumentData): Promise<WFirmaDocument> {
    logger.info('Creating document in wFirma', { name: data.name });

    return this.client.withRetry(async () => {
      try {
        // Validate required fields
        if (!data.name) {
          throw new WFirmaValidationError('Document name is required');
        }
        if (!data.type) {
          throw new WFirmaValidationError('Document type is required');
        }
        if (!data.set) {
          throw new WFirmaValidationError('Document set is required');
        }

        const documentPayload = this.buildDocumentPayload(data);

        const payload = {
          api: {
            documents: {
              document: documentPayload,
            },
          },
        };

        const queryParams = this.client.buildQueryParams();
        logger.debug('wFirma create document REQUEST', {
          url: '/documents/add',
          method: 'POST',
          params: queryParams,
          payload: JSON.stringify(payload, null, 2),
        });

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: '/documents/add',
          params: queryParams,
          data: payload,
        });

        const responseData = response.data;

        logger.debug('wFirma create document RESPONSE', {
          responseData: JSON.stringify(responseData, null, 2),
        });

        if (responseData.status?.code !== 'OK') {
          const errorMessage =
            responseData.status?.message ||
            responseData.status?.code ||
            'Unknown error';
          const errorDetails = responseData.status?.fields
            ? `Fields with errors: ${Object.keys(responseData.status.fields).join(', ')}`
            : '';

          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            `wFirma error: ${errorMessage}. ${errorDetails}`.trim(),
            responseData.status
          );
        }

        let createdDocument = responseData.documents?.['0']?.document;

        if (!createdDocument) {
          createdDocument = responseData.document;
        }

        if (!createdDocument && responseData.documents?.document) {
          createdDocument = responseData.documents.document;
        }

        if (!createdDocument) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No document data in response',
            responseData
          );
        }

        const document = this.mapDocumentData(createdDocument);

        logger.info('Successfully created document in wFirma', {
          documentId: document.id,
          documentName: document.name,
        });

        return document;
      } catch (error) {
        logger.error('Failed to create document in wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Delete a document from wFirma
   */
  async deleteDocument(id: string): Promise<DeleteResult> {
    logger.info('Deleting document from wFirma', { documentId: id });

    return this.client.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Document ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/documents/delete/${id}`,
          params: this.client.buildQueryParams(),
        });

        const responseData = response.data;

        if (responseData.status?.code !== 'OK') {
          if (
            responseData.status?.code === 'NOT FOUND' ||
            responseData.status?.code === 'ACTION NOT FOUND'
          ) {
            throw new WFirmaError(
              'WFIRMA_NOT_FOUND',
              `Document with ID ${id} not found`,
              responseData.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to delete document',
            responseData.status
          );
        }

        logger.info('Successfully deleted document from wFirma', {
          documentId: id,
        });

        return {
          success: true,
          id,
          message: `Document ${id} deleted successfully`,
        };
      } catch (error) {
        logger.error('Failed to delete document from wFirma', {
          error,
          documentId: id,
        });
        throw error;
      }
    });
  }

  /**
   * Map wFirma API document data to WFirmaDocument type
   */
  private mapDocumentData(d: any): WFirmaDocument {
    return {
      id: d.id || '',
      objectName: d.object_name,
      objectId: d.object_id,
      name: d.name || '',
      text: d.text,
      url: d.url,
      filename: d.filename,
      mime: d.mime,
      size: d.size ? parseInt(d.size, 10) : undefined,
      icon: d.icon,
      type: (d.type || 'file') as any,
      set: (d.set || 'book') as any,
      tags: d.tags ? this.parseTags(d.tags) : undefined,
      created: d.created ? new Date(d.created) : new Date(),
      modified: d.modified ? new Date(d.modified) : new Date(),
    };
  }

  /**
   * Parse wFirma tags format "(ID1),(ID2)" to string array
   */
  private parseTags(tags: string | string[]): string[] {
    if (Array.isArray(tags)) {
      return tags;
    }
    if (typeof tags === 'string' && tags.trim()) {
      // Format: "(ID1),(ID2),(ID3)"
      return tags
        .split(',')
        .map((t) => t.replace(/[()]/g, '').trim())
        .filter((t) => t.length > 0);
    }
    return [];
  }

  /**
   * Build wFirma API payload from document data
   */
  private buildDocumentPayload(data: DocumentData): Record<string, any> {
    const payload: Record<string, any> = {};

    if (data.name !== undefined) payload.name = data.name;
    if (data.objectName !== undefined) payload.object_name = data.objectName;
    if (data.objectId !== undefined) payload.object_id = data.objectId;
    if (data.text !== undefined) payload.text = data.text;
    if (data.url !== undefined) payload.url = data.url;
    if (data.type !== undefined) payload.type = data.type;
    if (data.set !== undefined) payload.set = data.set;

    if (data.tags !== undefined && data.tags.length > 0) {
      // Convert tags array to wFirma format "(ID1),(ID2)"
      payload.tags = data.tags.map((t) => `(${t})`).join(',');
    }

    return payload;
  }
}
