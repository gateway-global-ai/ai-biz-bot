/**
 * Agent Knowledge Base Service
 * 
 * Provides agents with access to research, documentation, and business intelligence
 * Enables agents to store, retrieve, and utilize information about Google Business APIs
 * and other business-related topics.
 */

import { db } from '../db';
import { 
  agentKnowledgeBase, 
  apiDocumentation,
  researchTasks,
  type InsertAgentKnowledgeBase,
  type InsertApiDocumentation,
  type InsertResearchTask,
  type AgentKnowledgeBase,
  type ApiDocumentation,
  type ResearchTask
} from '../../shared/schema';
import { eq, and, or, desc, sql, ilike } from 'drizzle-orm';

export interface SearchQuery {
  query?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  status?: string;
}

export interface ResearchInsight {
  title: string;
  content: string;
  category: string;
  sources: Array<{
    url: string;
    title: string;
    date: string;
  }>;
  tags: string[];
}

export class KnowledgeBaseService {
  /**
   * Store new research or documentation in the knowledge base
   */
  async storeKnowledge(data: InsertAgentKnowledgeBase): Promise<AgentKnowledgeBase> {
    const [entry] = await db.insert(agentKnowledgeBase)
      .values({
        ...data,
        version: 1,
        status: data.status || 'active',
        accessCount: 0,
      })
      .returning();

    console.log(`[KnowledgeBase] Stored new entry: ${entry.title}`);
    return entry;
  }

  /**
   * Retrieve knowledge by ID and track access
   */
  async getKnowledge(id: string): Promise<AgentKnowledgeBase | null> {
    const [entry] = await db.select()
      .from(agentKnowledgeBase)
      .where(eq(agentKnowledgeBase.id, id));

    if (entry) {
      // Update access tracking
      await db.update(agentKnowledgeBase)
        .set({
          accessCount: sql`${agentKnowledgeBase.accessCount} + 1`,
          lastAccessed: new Date(),
        })
        .where(eq(agentKnowledgeBase.id, id));

      console.log(`[KnowledgeBase] Retrieved: ${entry.title}`);
    }

    return entry || null;
  }

  /**
   * Search knowledge base with flexible criteria
   */
  async searchKnowledge(query: SearchQuery): Promise<AgentKnowledgeBase[]> {
    let conditions = [];

    if (query.category) {
      conditions.push(eq(agentKnowledgeBase.category, query.category));
    }

    if (query.subcategory) {
      conditions.push(eq(agentKnowledgeBase.subcategory, query.subcategory));
    }

    if (query.status) {
      conditions.push(eq(agentKnowledgeBase.status, query.status));
    }

    if (query.query) {
      // Search in title, summary, and content
      conditions.push(
        or(
          ilike(agentKnowledgeBase.title, `%${query.query}%`),
          ilike(agentKnowledgeBase.summary, `%${query.query}%`),
          ilike(agentKnowledgeBase.content, `%${query.query}%`)
        )!
      );
    }

    const results = await db.select()
      .from(agentKnowledgeBase)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(agentKnowledgeBase.updatedAt));

    console.log(`[KnowledgeBase] Search found ${results.length} results`);
    return results;
  }

  /**
   * Get all knowledge entries by category
   */
  async getByCategory(category: string): Promise<AgentKnowledgeBase[]> {
    return await db.select()
      .from(agentKnowledgeBase)
      .where(
        and(
          eq(agentKnowledgeBase.category, category),
          eq(agentKnowledgeBase.status, 'active')
        )
      )
      .orderBy(desc(agentKnowledgeBase.updatedAt));
  }

  /**
   * Get knowledge entries by tags
   */
  async getByTags(tags: string[]): Promise<AgentKnowledgeBase[]> {
    // Note: PostgreSQL array overlap operator @>
    return await db.select()
      .from(agentKnowledgeBase)
      .where(
        and(
          sql`${agentKnowledgeBase.tags} && ARRAY[${tags.join(',')}]::text[]`,
          eq(agentKnowledgeBase.status, 'active')
        )
      )
      .orderBy(desc(agentKnowledgeBase.accessCount));
  }

  /**
   * Update existing knowledge entry
   */
  async updateKnowledge(id: string, updates: Partial<InsertAgentKnowledgeBase>): Promise<AgentKnowledgeBase | null> {
    const [updated] = await db.update(agentKnowledgeBase)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(agentKnowledgeBase.id, id))
      .returning();

    console.log(`[KnowledgeBase] Updated: ${updated?.title}`);
    return updated || null;
  }

  /**
   * Create new version of knowledge entry
   */
  async createNewVersion(parentId: string, updates: Partial<InsertAgentKnowledgeBase>): Promise<AgentKnowledgeBase> {
    const parent = await this.getKnowledge(parentId);
    if (!parent) {
      throw new Error('Parent knowledge entry not found');
    }

    const [newVersion] = await db.insert(agentKnowledgeBase)
      .values({
        ...parent,
        ...updates,
        id: undefined as any, // Let DB generate new ID
        parentId: parentId,
        version: parent.version + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log(`[KnowledgeBase] Created version ${newVersion.version}: ${newVersion.title}`);
    return newVersion;
  }

  /**
   * Store API documentation
   */
  async storeApiDoc(data: InsertApiDocumentation): Promise<ApiDocumentation> {
    const [doc] = await db.insert(apiDocumentation)
      .values(data)
      .returning();

    console.log(`[KnowledgeBase] Stored API doc: ${doc.apiName}`);
    return doc;
  }

  /**
   * Get API documentation by name
   */
  async getApiDoc(apiName: string): Promise<ApiDocumentation | null> {
    const [doc] = await db.select()
      .from(apiDocumentation)
      .where(eq(apiDocumentation.apiName, apiName))
      .orderBy(desc(apiDocumentation.updatedAt))
      .limit(1);

    return doc || null;
  }

  /**
   * Get all API documentation
   */
  async getAllApiDocs(): Promise<ApiDocumentation[]> {
    return await db.select()
      .from(apiDocumentation)
      .orderBy(desc(apiDocumentation.updatedAt));
  }

  /**
   * Get APIs that can be mirrored
   */
  async getMirrorableApis(): Promise<ApiDocumentation[]> {
    return await db.select()
      .from(apiDocumentation)
      .where(eq(apiDocumentation.canBeMirrored, true));
  }

  /**
   * Get APIs currently in use
   */
  async getCurrentApis(): Promise<ApiDocumentation[]> {
    return await db.select()
      .from(apiDocumentation)
      .where(eq(apiDocumentation.currentlyUsed, true));
  }

  /**
   * Create research task
   */
  async createResearchTask(data: InsertResearchTask): Promise<ResearchTask> {
    const [task] = await db.insert(researchTasks)
      .values({
        ...data,
        status: data.status || 'pending',
        progress: 0,
      })
      .returning();

    console.log(`[KnowledgeBase] Created research task: ${task.title}`);
    return task;
  }

  /**
   * Update research task
   */
  async updateResearchTask(id: string, updates: Partial<InsertResearchTask>): Promise<ResearchTask | null> {
    const [task] = await db.update(researchTasks)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(researchTasks.id, id))
      .returning();

    return task || null;
  }

  /**
   * Complete research task and store findings
   */
  async completeResearchTask(
    taskId: string, 
    findings: any,
    knowledgeEntry?: InsertAgentKnowledgeBase
  ): Promise<{ task: ResearchTask; knowledge?: AgentKnowledgeBase }> {
    // Update task status
    const [task] = await db.update(researchTasks)
      .set({
        status: 'completed',
        progress: 100,
        findings: findings,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(researchTasks.id, taskId))
      .returning();

    let knowledge = undefined;

    // Optionally create knowledge base entry from findings
    if (knowledgeEntry) {
      knowledge = await this.storeKnowledge(knowledgeEntry);

      // Link knowledge to task
      await db.update(researchTasks)
        .set({
          relatedKnowledgeIds: sql`array_append(${researchTasks.relatedKnowledgeIds}, ${knowledge.id})`,
        })
        .where(eq(researchTasks.id, taskId));
    }

    console.log(`[KnowledgeBase] Completed research task: ${task.title}`);
    return { task, knowledge };
  }

  /**
   * Get active research tasks
   */
  async getActiveResearchTasks(): Promise<ResearchTask[]> {
    return await db.select()
      .from(researchTasks)
      .where(
        or(
          eq(researchTasks.status, 'pending'),
          eq(researchTasks.status, 'in_progress')
        )!
      )
      .orderBy(desc(researchTasks.priority));
  }

  /**
   * Get research tasks by type
   */
  async getResearchTasksByType(researchType: string): Promise<ResearchTask[]> {
    return await db.select()
      .from(researchTasks)
      .where(eq(researchTasks.researchType, researchType))
      .orderBy(desc(researchTasks.updatedAt));
  }

  /**
   * Generate agent system prompt from knowledge base
   * Useful for training agents with business API information
   */
  async generateAgentPrompt(topics: string[]): Promise<string> {
    const knowledge = await this.getByTags(topics);
    
    let prompt = '# Business API Knowledge\n\n';
    
    for (const entry of knowledge) {
      prompt += `## ${entry.title}\n\n`;
      if (entry.summary) {
        prompt += `${entry.summary}\n\n`;
      }
      if (entry.metadata) {
        prompt += `**Key Information:**\n`;
        const metadata = entry.metadata as any;
        for (const [key, value] of Object.entries(metadata)) {
          prompt += `- ${key}: ${value}\n`;
        }
        prompt += '\n';
      }
    }

    return prompt;
  }

  /**
   * Get most accessed knowledge (popular topics)
   */
  async getPopularKnowledge(limit: number = 10): Promise<AgentKnowledgeBase[]> {
    return await db.select()
      .from(agentKnowledgeBase)
      .where(eq(agentKnowledgeBase.status, 'active'))
      .orderBy(desc(agentKnowledgeBase.accessCount))
      .limit(limit);
  }

  /**
   * Get recently updated knowledge
   */
  async getRecentKnowledge(limit: number = 10): Promise<AgentKnowledgeBase[]> {
    return await db.select()
      .from(agentKnowledgeBase)
      .where(eq(agentKnowledgeBase.status, 'active'))
      .orderBy(desc(agentKnowledgeBase.updatedAt))
      .limit(limit);
  }

  /**
   * Mark knowledge as outdated
   */
  async markOutdated(id: string): Promise<void> {
    await db.update(agentKnowledgeBase)
      .set({
        status: 'outdated',
        updatedAt: new Date(),
      })
      .where(eq(agentKnowledgeBase.id, id));

    console.log(`[KnowledgeBase] Marked as outdated: ${id}`);
  }

  /**
   * Archive knowledge
   */
  async archiveKnowledge(id: string): Promise<void> {
    await db.update(agentKnowledgeBase)
      .set({
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(eq(agentKnowledgeBase.id, id));

    console.log(`[KnowledgeBase] Archived: ${id}`);
  }
}

// Export singleton instance
export const knowledgeBaseService = new KnowledgeBaseService();
