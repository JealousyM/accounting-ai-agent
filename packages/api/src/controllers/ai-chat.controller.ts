/**
 * AI Chat Controller
 * HTTP handlers for AI chat endpoints
 */

import { Request, Response } from 'express';
import { aiChatService } from '../services/ai-chat.instance';
import { logger } from '../utils/logger';
import { LLMProvider } from '../types/ai-chat.types';
import { incrementAIUsage } from '../middleware/subscription.middleware';

export class AIChatController {
  /**
   * POST /api/ai/conversations
   * Create a new conversation
   */
  async createConversation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const { title } = req.body;

      const conversation = await aiChatService.createConversation(userId, title);

      logger.info('Conversation created', {
        conversationId: conversation.id,
        userId,
      });

      res.status(201).json({
        success: true,
        message: 'Conversation created successfully',
        data: {
          id: conversation.id,
          title: conversation.title,
          createdAt: conversation.createdAt,
        },
      });
    } catch (error) {
      logger.error('Failed to create conversation', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create conversation',
      });
    }
  }

  /**
   * GET /api/ai/conversations
   * Get user's conversations list
   */
  async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const conversations = await aiChatService.getConversations(userId, limit);

      res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      logger.error('Failed to get conversations', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch conversations',
      });
    }
  }

  /**
   * GET /api/ai/conversations/:id
   * Get single conversation with messages
   */
  async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const conversation = await aiChatService.getConversation(id, userId);

      if (!conversation) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Conversation not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      logger.error('Failed to get conversation', {
        error,
        conversationId: req.params.id,
        userId: req.user?.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch conversation',
      });
    }
  }

  /**
   * DELETE /api/ai/conversations/:id
   * Delete conversation
   */
  async deleteConversation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      await aiChatService.deleteConversation(id, userId);

      res.status(200).json({
        success: true,
        message: 'Conversation deleted successfully',
      });
    } catch (error) {
      if ((error as Error).message === 'Conversation not found') {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Conversation not found',
        });
        return;
      }

      logger.error('Failed to delete conversation', {
        error,
        conversationId: req.params.id,
        userId: req.user?.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to delete conversation',
      });
    }
  }

  /**
   * POST /api/ai/conversations/:id/messages
   * Send message and get AI response
   */
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;
      const { content, provider } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const result = await aiChatService.sendMessage(
        id,
        userId,
        content,
        provider as LLMProvider | undefined
      );

      // Increment AI usage for subscription tracking (after successful response)
      await incrementAIUsage(userId);

      res.status(200).json({
        success: true,
        data: {
          userMessage: result.userMessage,
          assistantMessage: result.assistantMessage,
          toolsUsed: result.toolsUsed,
          tts: result.tts,
        },
      });
    } catch (error) {
      if ((error as Error).message === 'Conversation not found') {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Conversation not found',
        });
        return;
      }

      if ((error as Error).message === 'No LLM provider available') {
        res.status(503).json({
          success: false,
          error: 'Service Unavailable',
          message: 'AI service is not configured. Please contact administrator.',
        });
        return;
      }

      const errorMessage = (error as Error).message || 'Failed to process message';

      logger.error('Failed to send message', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        conversationId: req.params.id,
        userId: req.user?.userId,
      });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: errorMessage,
      });
    }
  }
}

export const aiChatController = new AIChatController();
