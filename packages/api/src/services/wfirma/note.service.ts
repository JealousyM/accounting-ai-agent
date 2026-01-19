/**
 * wFirma Note Service
 * Handles note CRUD operations
 */

import { logger } from '../../utils/logger';
import { WFirmaNote, DeleteResult } from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError, WFirmaValidationError } from './errors';

export class WFirmaNoteService {
  constructor(private readonly client: WFirmaClient) {}

  /**
   * Add a note to an object (invoice, contractor, etc.)
   */
  async addNote(objectName: string, objectId: string, text: string): Promise<WFirmaNote> {
    logger.info('Adding note', { objectName, objectId });

    return this.client.withRetry(async () => {
      try {
        if (!objectName || !objectId || !text) {
          throw new WFirmaValidationError('Object name, object ID, and text are required');
        }

        const payload = {
          api: {
            notes: {
              note: {
                object_name: objectName,
                object_id: objectId,
                text,
              },
            },
          },
        };

        logger.info('wFirma addNote REQUEST', {
          url: '/notes/add',
          payload: JSON.stringify(payload, null, 2),
        });

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: '/notes/add',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        logger.info('wFirma addNote RESPONSE', {
          responseData: JSON.stringify(data, null, 2),
        });

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            data.status?.message || 'Failed to add note',
            data.status
          );
        }

        let noteData = data.notes?.note;
        if (!noteData) {
          const notesObj = data.notes;
          if (notesObj) {
            for (const key in notesObj) {
              if (!isNaN(Number(key)) && notesObj[key]?.note) {
                noteData = notesObj[key].note;
                break;
              }
            }
          }
        }

        if (!noteData) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No note data in response',
            data
          );
        }

        const note: WFirmaNote = {
          id: noteData.id,
          objectName: noteData.object_name || objectName,
          objectId: noteData.object_id || objectId,
          text: noteData.text || text,
          created: new Date(noteData.created || Date.now()),
          modified: new Date(noteData.modified || Date.now()),
        };

        logger.info('Successfully added note', { noteId: note.id });

        return note;
      } catch (error) {
        logger.error('Failed to add note', { error, objectName, objectId });
        throw error;
      }
    });
  }

  /**
   * Get a note by ID
   */
  async getNote(noteId: string): Promise<WFirmaNote | null> {
    logger.info('Fetching note by ID', { noteId });

    return this.client.withRetry(async () => {
      try {
        if (!noteId) {
          throw new WFirmaValidationError('Note ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/notes/get/${noteId}`,
          params: this.client.buildQueryParams(),
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          if (data.status?.code === 'NOT FOUND' || data.status?.code === 'ACTION NOT FOUND') {
            return null;
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch note',
            data.status
          );
        }

        let noteData = data.notes?.note;
        if (!noteData) {
          const notesObj = data.notes;
          if (notesObj) {
            for (const key in notesObj) {
              if (!isNaN(Number(key)) && notesObj[key]?.note) {
                noteData = notesObj[key].note;
                break;
              }
            }
          }
        }

        if (!noteData) {
          return null;
        }

        return {
          id: noteData.id,
          objectName: noteData.object_name,
          objectId: noteData.object_id,
          text: noteData.text,
          created: new Date(noteData.created),
          modified: new Date(noteData.modified),
        };
      } catch (error) {
        logger.error('Failed to fetch note', { error, noteId });
        throw error;
      }
    });
  }

  /**
   * Find notes for an object
   */
  async findNotes(objectName: string, objectId: string): Promise<WFirmaNote[]> {
    logger.info('Fetching notes', { objectName, objectId });

    return this.client.withRetry(async () => {
      try {
        const payload = {
          api: {
            notes: {
              parameters: {
                conditions: {
                  condition: [
                    { field: 'object_name', operator: 'eq', value: objectName },
                    { field: 'object_id', operator: 'eq', value: objectId },
                  ],
                },
                limit: 100,
                page: 1,
              },
            },
          },
        };

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/notes/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch notes',
            data.status
          );
        }

        let notesData = data.notes?.note;
        if (!notesData) {
          const notesObj = data.notes;
          if (notesObj) {
            notesData = [];
            for (const key in notesObj) {
              if (!isNaN(Number(key)) && notesObj[key]?.note) {
                notesData.push(notesObj[key].note);
              }
            }
          }
        }

        if (!notesData || notesData.length === 0) {
          return [];
        }

        if (!Array.isArray(notesData)) {
          notesData = [notesData];
        }

        const notes: WFirmaNote[] = notesData.map((n: any) => ({
          id: n.id,
          objectName: n.object_name,
          objectId: n.object_id,
          text: n.text,
          created: new Date(n.created),
          modified: new Date(n.modified),
        }));

        logger.info('Successfully fetched notes', { count: notes.length });

        return notes;
      } catch (error) {
        logger.error('Failed to fetch notes', { error, objectName, objectId });
        throw error;
      }
    });
  }

  /**
   * Edit a note
   */
  async editNote(noteId: string, text: string): Promise<WFirmaNote> {
    logger.info('Editing note', { noteId });

    return this.client.withRetry(async () => {
      try {
        if (!noteId || !text) {
          throw new WFirmaValidationError('Note ID and text are required');
        }

        const payload = {
          api: {
            notes: {
              note: {
                id: noteId,
                text,
              },
            },
          },
        };

        const response = await this.client.apiClient.request({
          method: 'POST',
          url: `/notes/edit/${noteId}`,
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          if (data.status?.code === 'NOT FOUND' || data.status?.code === 'ACTION NOT FOUND') {
            throw new WFirmaError(
              'WFIRMA_NOT_FOUND',
              `Note with ID ${noteId} not found`,
              data.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            data.status?.message || 'Failed to edit note',
            data.status
          );
        }

        let noteData = data.notes?.note;
        if (!noteData) {
          const notesObj = data.notes;
          if (notesObj) {
            for (const key in notesObj) {
              if (!isNaN(Number(key)) && notesObj[key]?.note) {
                noteData = notesObj[key].note;
                break;
              }
            }
          }
        }

        if (!noteData) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No note data in response',
            data
          );
        }

        logger.info('Successfully edited note', { noteId });

        return {
          id: noteData.id,
          objectName: noteData.object_name,
          objectId: noteData.object_id,
          text: noteData.text,
          created: new Date(noteData.created),
          modified: new Date(noteData.modified),
        };
      } catch (error) {
        logger.error('Failed to edit note', { error, noteId });
        throw error;
      }
    });
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<DeleteResult> {
    logger.info('Deleting note', { noteId });

    return this.client.withRetry(async () => {
      try {
        if (!noteId) {
          throw new WFirmaValidationError('Note ID is required');
        }

        const response = await this.client.apiClient.request({
          method: 'DELETE',
          url: `/notes/delete/${noteId}`,
          params: this.client.buildQueryParams(),
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          if (data.status?.code === 'NOT FOUND' || data.status?.code === 'ACTION NOT FOUND') {
            throw new WFirmaError(
              'WFIRMA_NOT_FOUND',
              `Note with ID ${noteId} not found`,
              data.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            data.status?.message || 'Failed to delete note',
            data.status
          );
        }

        logger.info('Successfully deleted note', { noteId });

        return {
          success: true,
          id: noteId,
          message: `Note ${noteId} deleted successfully`,
        };
      } catch (error) {
        logger.error('Failed to delete note', { error, noteId });
        throw error;
      }
    });
  }
}
