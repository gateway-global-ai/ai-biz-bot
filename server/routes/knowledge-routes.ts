/**
 * Knowledge Base API Routes
 * 
 * REST API for accessing and managing the agent knowledge base
 */

import { Router } from 'express';
import { knowledgeBaseService } from '../services/knowledge-base';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/knowledge - Search knowledge base
 * Query params: query, category, subcategory, tags[], status
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { query, category, subcategory, status } = req.query;
    const tags = req.query.tags ? 
      (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) as string[] : 
      undefined;

    const results = await knowledgeBaseService.searchKnowledge({
      query: query as string,
      category: category as string,
      subcategory: subcategory as string,
      tags,
      status: status as string,
    });

    res.json(results);
  } catch (error: any) {
    console.error('Knowledge search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/knowledge/:id - Get specific knowledge entry
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const knowledge = await knowledgeBaseService.getKnowledge(req.params.id);
    
    if (!knowledge) {
      return res.status(404).json({ error: 'Knowledge not found' });
    }

    res.json(knowledge);
  } catch (error: any) {
    console.error('Get knowledge error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/knowledge/category/:category - Get by category
 */
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const results = await knowledgeBaseService.getByCategory(req.params.category);
    res.json(results);
  } catch (error: any) {
    console.error('Get by category error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/knowledge/tags/:tags - Get by tags (comma-separated)
 */
router.get('/tags/:tags', async (req: Request, res: Response) => {
  try {
    const tags = req.params.tags.split(',');
    const results = await knowledgeBaseService.getByTags(tags);
    res.json(results);
  } catch (error: any) {
    console.error('Get by tags error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/knowledge - Create new knowledge entry
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const knowledge = await knowledgeBaseService.storeKnowledge(req.body);
    res.status(201).json(knowledge);
  } catch (error: any) {
    console.error('Create knowledge error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/knowledge/:id - Update knowledge entry
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const knowledge = await knowledgeBaseService.updateKnowledge(req.params.id, req.body);
    
    if (!knowledge) {
      return res.status(404).json({ error: 'Knowledge not found' });
    }

    res.json(knowledge);
  } catch (error: any) {
    console.error('Update knowledge error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/knowledge/:id/version - Create new version
 */
router.post('/:id/version', async (req: Request, res: Response) => {
  try {
    const newVersion = await knowledgeBaseService.createNewVersion(req.params.id, req.body);
    res.status(201).json(newVersion);
  } catch (error: any) {
    console.error('Create version error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/knowledge/popular/:limit - Get most accessed
 */
router.get('/popular/:limit?', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.params.limit || '10');
    const popular = await knowledgeBaseService.getPopularKnowledge(limit);
    res.json(popular);
  } catch (error: any) {
    console.error('Get popular error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/knowledge/recent/:limit - Get recently updated
 */
router.get('/recent/:limit?', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.params.limit || '10');
    const recent = await knowledgeBaseService.getRecentKnowledge(limit);
    res.json(recent);
  } catch (error: any) {
    console.error('Get recent error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/knowledge/:id/outdated - Mark as outdated
 */
router.post('/:id/outdated', async (req: Request, res: Response) => {
  try {
    await knowledgeBaseService.markOutdated(req.params.id);
    res.json({ message: 'Marked as outdated' });
  } catch (error: any) {
    console.error('Mark outdated error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/knowledge/:id/archive - Archive knowledge
 */
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    await knowledgeBaseService.archiveKnowledge(req.params.id);
    res.json({ message: 'Archived' });
  } catch (error: any) {
    console.error('Archive error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/knowledge/api-docs - Get all API documentation
 */
router.get('/api-docs', async (req: Request, res: Response) => {
  try {
    const docs = await knowledgeBaseService.getAllApiDocs();
    res.json(docs);
  } catch (error: any) {
    console.error('Get API docs error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/knowledge/api-docs/:apiName - Get specific API doc
 */
router.get('/api-docs/:apiName', async (req: Request, res: Response) => {
  try {
    const doc = await knowledgeBaseService.getApiDoc(req.params.apiName);
    
    if (!doc) {
      return res.status(404).json({ error: 'API documentation not found' });
    }

    res.json(doc);
  } catch (error: any) {
    console.error('Get API doc error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/knowledge/api-docs - Create API documentation
 */
router.post('/api-docs', async (req: Request, res: Response) => {
  try {
    const doc = await knowledgeBaseService.storeApiDoc(req.body);
    res.status(201).json(doc);
  } catch (error: any) {
    console.error('Create API doc error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/knowledge/api-docs/mirrorable - Get APIs that can be mirrored
 */
router.get('/api-docs/mirrorable', async (req: Request, res: Response) => {
  try {
    const apis = await knowledgeBaseService.getMirrorableApis();
    res.json(apis);
  } catch (error: any) {
    console.error('Get mirrorable APIs error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/knowledge/api-docs/current - Get currently used APIs
 */
router.get('/api-docs/current', async (req: Request, res: Response) => {
  try {
    const apis = await knowledgeBaseService.getCurrentApis();
    res.json(apis);
  } catch (error: any) {
    console.error('Get current APIs error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/knowledge/research-tasks - Get research tasks
 */
router.get('/research-tasks', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    
    const tasks = type 
      ? await knowledgeBaseService.getResearchTasksByType(type as string)
      : await knowledgeBaseService.getActiveResearchTasks();
    
    res.json(tasks);
  } catch (error: any) {
    console.error('Get research tasks error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/knowledge/research-tasks - Create research task
 */
router.post('/research-tasks', async (req: Request, res: Response) => {
  try {
    const task = await knowledgeBaseService.createResearchTask(req.body);
    res.status(201).json(task);
  } catch (error: any) {
    console.error('Create research task error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/knowledge/research-tasks/:id - Update research task
 */
router.put('/research-tasks/:id', async (req: Request, res: Response) => {
  try {
    const task = await knowledgeBaseService.updateResearchTask(req.params.id, req.body);
    
    if (!task) {
      return res.status(404).json({ error: 'Research task not found' });
    }

    res.json(task);
  } catch (error: any) {
    console.error('Update research task error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/knowledge/research-tasks/:id/complete - Complete task
 */
router.post('/research-tasks/:id/complete', async (req: Request, res: Response) => {
  try {
    const { findings, knowledgeEntry } = req.body;
    
    const result = await knowledgeBaseService.completeResearchTask(
      req.params.id,
      findings,
      knowledgeEntry
    );
    
    res.json(result);
  } catch (error: any) {
    console.error('Complete research task error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/knowledge/generate-prompt - Generate agent prompt from knowledge
 */
router.post('/generate-prompt', async (req: Request, res: Response) => {
  try {
    const { topics } = req.body;
    
    if (!topics || !Array.isArray(topics)) {
      return res.status(400).json({ error: 'Topics array required' });
    }

    const prompt = await knowledgeBaseService.generateAgentPrompt(topics);
    res.json({ prompt });
  } catch (error: any) {
    console.error('Generate prompt error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
