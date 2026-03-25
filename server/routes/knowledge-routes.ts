/**
 * Knowledge Base API Routes
 * 
 * REST API for accessing and managing the agent knowledge base
 */

import { Router } from 'express';
import { firstRouteParam } from '../utils/expressParams';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { requireAuth } from '../auth';
import { gatewayChat } from '../ai-gateway';
import { storage } from '../storage';
import type { Request, Response } from 'express';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getPlatformLibraryPath(): string[] {
  return [
    path.join(process.cwd(), 'docs/knowledge-base/index.json'),
    path.join(__dirname, '../../docs/knowledge-base/index.json'),
  ];
}

function getProjectRoot(): string {
  const cwd = process.cwd();
  const fromDir = path.join(__dirname, '../..');
  if (existsSync(path.join(cwd, 'docs'))) return cwd;
  if (existsSync(path.join(fromDir, 'docs'))) return fromDir;
  return cwd;
}

/** Collect in-repo platform & Clear Voice docs (docs/ outside knowledge-base, .cursor/rules) for the library. */
async function getInRepoLibraryItems(projectRoot: string): Promise<unknown[]> {
  const items: unknown[] = [];
  const seen = new Set<string>();

  async function addFile(relativePath: string, category: string, fileType: string): Promise<void> {
    const norm = relativePath.replace(/\\/g, '/');
    if (seen.has(norm)) return;
    seen.add(norm);
    const name = path.basename(relativePath, path.extname(relativePath));
    const title = name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    items.push({
      id: `inrepo_${norm.replace(/\//g, '_').replace(/\.[^.]+$/, '')}`,
      title,
      category,
      library_path: norm,
      file_type: fileType,
      tags: category === 'clear_voice' ? ['voice', 'rules', 'lockdown'] : ['platform', 'docs'],
      topic: category === 'clear_voice' ? ['voice_workflow', 'best_practices'] : ['best_practices'],
    });
  }

  try {
    const docsDir = path.join(projectRoot, 'docs');
    const rulesDir = path.join(projectRoot, '.cursor', 'rules');
    const kbPrefix = 'knowledge-base';

    const walk = async (dir: string, base: string, category: string, ext: string): Promise<void> => {
      try {
        const entries = await readdir(dir, { withFileTypes: true, recursive: true });
        for (const e of entries) {
          if (!e.isFile()) continue;
          const extLower = path.extname(e.name).toLowerCase();
          if (extLower !== ext) continue;
          const subDir = (e as typeof e & { path?: string }).path ?? '';
          const full = subDir ? path.join(dir, subDir, e.name) : path.join(dir, e.name);
          const rel = path.relative(projectRoot, full).replace(/\\/g, '/');
          if (base === 'docs' && rel.startsWith('docs/knowledge-base')) continue;
          await addFile(rel, category, extLower.slice(1));
        }
      } catch {
        // ignore missing dirs
      }
    };

    await walk(docsDir, 'docs', 'platform', '.md');
    await walk(rulesDir, 'rules', 'clear_voice', '.mdc');
  } catch (e) {
    console.warn('[platform-library] In-repo scan failed:', (e as Error).message);
  }

  return items;
}

/** Resolve file path for a library item (index or in-repo). Returns null if not on disk. */
function resolveItemPath(projectRoot: string, item: { library_path?: string; source_path?: string }): string | null {
  const raw = item.library_path ?? item.source_path;
  if (!raw || typeof raw !== 'string') return null;
  const normalized = raw.replace(/\\/g, '/');
  if (normalized.startsWith('/')) return null;
  let full: string;
  if (normalized.startsWith('docs/') || normalized.startsWith('.cursor/')) {
    full = path.join(projectRoot, normalized);
  } else {
    full = path.join(projectRoot, 'docs', 'knowledge-base', normalized);
  }
  const safe = path.normalize(full);
  const rootNorm = path.normalize(projectRoot + path.sep);
  if (!safe.startsWith(rootNorm) || !existsSync(full)) return null;
  return full;
}

const KB_EXCERPT_LEN = 2400;
const KB_SEARCH_LIMIT = 6;

/**
 * Search private library: match query against title/category/tags and file content; return top excerpts for KB agent.
 */
async function searchPrivateLibrary(projectRoot: string, query: string, limit: number = KB_SEARCH_LIMIT): Promise<Array<{ title: string; library_path: string; excerpt: string }>> {
  const candidates = getPlatformLibraryPath();
  let indexItems: Array<{ id?: string; title?: string; category?: string; tags?: string[]; library_path?: string; source_path?: string }> = [];
  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, 'utf-8');
      const data = JSON.parse(raw) as { items?: unknown[] };
      indexItems = (data.items ?? []) as typeof indexItems;
      break;
    } catch {
      break;
    }
  }
  const inRepoItems = await getInRepoLibraryItems(projectRoot) as Array<{ id?: string; title?: string; category?: string; tags?: string[]; library_path?: string; source_path?: string }>;
  const allItems: Array<{ fromIndex: boolean; library_path?: string; source_path?: string; title?: string; category?: string; tags?: string[] }> = [
    ...indexItems.map((i) => ({ ...i, fromIndex: true })),
    ...inRepoItems.map((i) => ({ ...i, fromIndex: false })),
  ];
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored: Array<{ title: string; library_path: string; excerpt: string; score: number }> = [];

  for (const item of allItems) {
    const fullPath = resolveItemPath(projectRoot, item);
    if (!fullPath) continue;
    let content = '';
    try {
      content = await readFile(fullPath, 'utf-8');
    } catch {
      continue;
    }
    const title = (item.title ?? path.basename(fullPath, path.extname(fullPath))).toString();
    const category = (item.category ?? '').toString();
    const tags = Array.isArray(item.tags) ? item.tags.join(' ') : '';
    const searchable = `${title} ${category} ${tags} ${content}`.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (w.length < 2) continue;
      const count = (searchable.match(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) ?? []).length;
      score += count;
    }
    if (score === 0) continue;
    const excerpt = content.slice(0, KB_EXCERPT_LEN) + (content.length > KB_EXCERPT_LEN ? '\n\n[...]' : '');
    const libPath = (item.library_path ?? item.source_path ?? fullPath).toString().replace(/\\/g, '/');
    scored.push({ title, library_path: libPath, excerpt, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ title, library_path, excerpt }) => ({ title, library_path, excerpt }));
}

/**
 * GET /api/knowledge/platform-library
 * Private. Returns the full Platform Knowledge Library: index.json (Cloudbeds/hospitality/hotel) plus
 * in-repo platform docs (docs/*.md outside knowledge-base) and Clear Voice rules (.cursor/rules/*.mdc).
 * Requires admin auth. Do not expose to agents or customers.
 */
router.get('/platform-library', requireAuth, async (_req: Request, res: Response) => {
  const candidates = getPlatformLibraryPath();
  let indexItems: unknown[] = [];
  let taxonomy: string[] = [];

  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, 'utf-8');
      const data = JSON.parse(raw) as { version?: string; taxonomy?: string[]; items?: unknown[] };
      indexItems = data.items ?? [];
      taxonomy = data.taxonomy ?? [];
      break;
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      if (e?.code !== 'ENOENT') {
        console.error('Platform knowledge library read error:', e);
        return res.status(500).json({ error: e?.message ?? 'Failed to load library index' });
      }
    }
  }

  const projectRoot = getProjectRoot();
  const inRepoItems = await getInRepoLibraryItems(projectRoot);
  const combinedTaxonomy = [...new Set([...taxonomy, 'platform', 'clear_voice'])];
  const combinedItems = [...indexItems, ...inRepoItems];

  res.json({ taxonomy: combinedTaxonomy, items: combinedItems });
});

function getPublicCatalogPath(): string[] {
  return [
    path.join(process.cwd(), 'docs/knowledge-base/public-catalog.json'),
    path.join(__dirname, '../../docs/knowledge-base/public-catalog.json'),
  ];
}

/**
 * GET /api/knowledge/public-library
 * Public. Returns only curated docs safe to share with agents and customers, by category.
 * No secrets; list is defined in docs/knowledge-base/public-catalog.json.
 */
router.get('/public-library', async (_req: Request, res: Response) => {
  const candidates = getPublicCatalogPath();
  let taxonomy: string[] = [];
  let items: unknown[] = [];
  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, 'utf-8');
      const data = JSON.parse(raw) as { taxonomy?: string[]; items?: unknown[] };
      taxonomy = data.taxonomy ?? [];
      items = data.items ?? [];
      break;
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      if (e?.code !== 'ENOENT') {
        console.error('Public library catalog read error:', e);
        return res.status(500).json({ error: e?.message ?? 'Failed to load public catalog' });
      }
    }
  }
  res.json({ taxonomy, items });
});

/**
 * GET /api/knowledge/public-library/:id/content
 * Returns document content only for ids listed in the public catalog. Safe for agents/customers.
 */
router.get('/public-library/:id/content', async (req: Request, res: Response) => {
  const candidates = getPublicCatalogPath();
  let catalogItems: Array<{ id: string; title?: string; source_path?: string; library_path?: string }> = [];
  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, 'utf-8');
      const data = JSON.parse(raw) as { items?: Array<{ id: string; title?: string; source_path?: string; library_path?: string }> };
      catalogItems = data.items ?? [];
      break;
    } catch {
      break;
    }
  }
  const docId = firstRouteParam(req.params.id);
  if (!docId) {
    return res.status(400).json({ error: 'Document id required' });
  }
  const item = catalogItems.find((i) => i.id === docId);
  if (!item) {
    return res.status(404).json({ error: 'Not found or not in public catalog' });
  }
  const relPath = item.source_path ?? item.library_path;
  if (!relPath) {
    return res.status(404).json({ error: 'No content path for this document' });
  }
  const projectRoot = getProjectRoot();
  const fullPath = path.join(projectRoot, relPath.startsWith('docs/') ? relPath : path.join('docs', 'knowledge-base', relPath));
  const normalizedFull = path.normalize(fullPath);
  const normalizedRoot = path.normalize(projectRoot + path.sep);
  if (!normalizedFull.startsWith(normalizedRoot) || !existsSync(fullPath)) {
    return res.status(404).json({ error: 'Document file not found' });
  }
  try {
    const content = await readFile(fullPath, 'utf-8');
    res.type('text/markdown').send(content);
  } catch (e) {
    console.error('Public doc read error:', e);
    res.status(500).json({ error: 'Failed to read document' });
  }
});

// ── Knowledge Artifacts (RBAC + session activation for in-chat KB overlay) ─

const listArtifactsSchema = z.object({
  siteConfigId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
});

/**
 * GET /api/knowledge/artifacts
 * List artifacts visible to context. Query: siteConfigId, sessionId.
 * Without auth: only public artifacts for siteConfigId. With auth (owner): public + private for owned sites.
 * Response includes activeKeys when sessionId is provided.
 */
router.get('/artifacts', async (req: Request, res: Response) => {
  try {
    const parsed = listArtifactsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const { siteConfigId, sessionId } = parsed.data;
    if (!siteConfigId) {
      return res.status(400).json({ error: 'siteConfigId is required' });
    }
    const site = await storage.getSiteConfig(siteConfigId);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }
    const isOwner = (req as any).customerAccountId && (site as any).ownerId === (req as any).customerAccountId;
    const visibility: 'public' | 'private' | undefined = isOwner ? undefined : 'public';
    const list = await storage.listKnowledgeArtifactsForContext({ siteConfigId, visibility });
    const activeKeys = sessionId ? await storage.getActiveArtifactKeysForSession(sessionId) : [];
    res.json({ items: list, activeKeys });
  } catch (e) {
    console.error('List knowledge artifacts error:', e);
    res.status(500).json({ error: (e as Error).message ?? 'Failed to list artifacts' });
  }
});

/**
 * POST /api/knowledge/artifacts
 * Create a new knowledge artifact scoped to a siteConfigId.
 * Body: { siteConfigId, title, content, visibility, scope? }
 */
const createArtifactSchema = z.object({
  siteConfigId: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  visibility: z.enum(['public', 'private']).default('public'),
  scope: z.enum(['business', 'franchise', 'platform']).default('business'),
});

router.post('/artifacts', async (req: Request, res: Response) => {
  try {
    const parsed = createArtifactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const { siteConfigId, title, content, visibility, scope } = parsed.data;
    const site = await storage.getSiteConfig(siteConfigId);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }
    // Generate a URL-safe access key
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
    const shortId = Math.random().toString(36).substring(2, 8);
    const agentAccessKey = `${slug}-${shortId}`;

    const artifact = await storage.createKnowledgeArtifact({
      siteConfigId,
      title,
      content,
      visibility,
      scope,
      agentAccessKey,
      ownerId: (req as any).customerAccountId ?? null,
    });
    res.status(201).json(artifact);
  } catch (e) {
    console.error('Create knowledge artifact error:', e);
    res.status(500).json({ error: (e as Error).message ?? 'Failed to create artifact' });
  }
});

/**
 * DELETE /api/knowledge/artifacts/:id
 * Delete a knowledge artifact. Owner of the site may delete any artifact on their site.
 */
router.delete('/artifacts/:id', async (req: Request, res: Response) => {
  try {
    const id = firstRouteParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Artifact id required' });

    const artifact = await storage.getKnowledgeArtifactById(id);
    if (!artifact) return res.status(404).json({ error: 'Artifact not found' });

    // Allow delete if: artifact has no ownerId, or caller is the owner
    const callerId = (req as any).customerAccountId;
    if (artifact.ownerId && callerId && artifact.ownerId !== callerId) {
      const site = artifact.siteConfigId ? await storage.getSiteConfig(artifact.siteConfigId) : null;
      const isSiteOwner = site && (site as any).ownerId === callerId;
      if (!isSiteOwner) {
        return res.status(403).json({ error: 'Not authorized to delete this artifact' });
      }
    }

    await storage.deleteKnowledgeArtifact(id);
    res.json({ deleted: true, id });
  } catch (e) {
    console.error('Delete knowledge artifact error:', e);
    res.status(500).json({ error: (e as Error).message ?? 'Failed to delete artifact' });
  }
});

const activateSchema = z.object({
  sessionId: z.string().min(1),
  agentAccessKey: z.string().min(1),
  siteConfigId: z.string().optional(),
});

/**
 * POST /api/knowledge/artifacts/activate
 * Activate a document key for the given session (in-chat overlay). Validates artifact exists and is visible.
 */
router.post('/artifacts/activate', async (req: Request, res: Response) => {
  try {
    const parsed = activateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const { sessionId, agentAccessKey, siteConfigId } = parsed.data;
    const artifact = await storage.getKnowledgeArtifactByKey(agentAccessKey);
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }
    if (artifact.visibility === 'private' && siteConfigId) {
      const site = await storage.getSiteConfig(siteConfigId);
      const isOwner = (req as any).customerAccountId && site && (site as any).ownerId === (req as any).customerAccountId;
      if (!isOwner) {
        return res.status(403).json({ error: 'Not authorized to activate this private document' });
      }
    }
    await storage.activateArtifactForSession(sessionId, agentAccessKey, siteConfigId);
    res.json({ ok: true, activeKeys: await storage.getActiveArtifactKeysForSession(sessionId) });
  } catch (e) {
    console.error('Activate artifact error:', e);
    res.status(500).json({ error: (e as Error).message ?? 'Failed to activate' });
  }
});

const deactivateSchema = z.object({
  sessionId: z.string().min(1),
  agentAccessKey: z.string().min(1),
});

/**
 * POST /api/knowledge/artifacts/deactivate
 * Deactivate a document key for the given session.
 */
router.post('/artifacts/deactivate', async (req: Request, res: Response) => {
  try {
    const parsed = deactivateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const { sessionId, agentAccessKey } = parsed.data;
    await storage.deactivateArtifactForSession(sessionId, agentAccessKey);
    res.json({ ok: true, activeKeys: await storage.getActiveArtifactKeysForSession(sessionId) });
  } catch (e) {
    console.error('Deactivate artifact error:', e);
    res.status(500).json({ error: (e as Error).message ?? 'Failed to deactivate' });
  }
});

/**
 * GET /api/knowledge/artifacts/content/:agentAccessKey
 * Fetch content/preview by key. RBAC: public always; private only if owner or session has activated it.
 */
router.get('/artifacts/content/:agentAccessKey', async (req: Request, res: Response) => {
  try {
    const agentAccessKey = firstRouteParam(req.params.agentAccessKey);
    if (!agentAccessKey) {
      return res.status(400).json({ error: 'agentAccessKey required' });
    }
    const sessionId = (req.query.sessionId as string) || '';
    const siteConfigId = (req.query.siteConfigId as string) || '';
    const artifact = await storage.getKnowledgeArtifactByKey(agentAccessKey);
    if (!artifact) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (artifact.visibility === 'private') {
      const site = siteConfigId ? await storage.getSiteConfig(siteConfigId) : null;
      const isOwner = (req as any).customerAccountId && site && (site as any).ownerId === (req as any).customerAccountId;
      if (!isOwner) {
        return res.status(403).json({ error: 'Not authorized to view this document' });
      }
    }
    if (artifact.content) {
      return res.type('text/markdown').send(artifact.content);
    }
    if (artifact.sourcePath) {
      const projectRoot = getProjectRoot();
      const fullPath = path.join(projectRoot, artifact.sourcePath);
      const normalizedFull = path.normalize(fullPath);
      const normalizedRoot = path.normalize(projectRoot + path.sep);
      if (!normalizedFull.startsWith(normalizedRoot) || !existsSync(fullPath)) {
        return res.status(404).json({ error: 'Document file not found' });
      }
      const content = await readFile(fullPath, 'utf-8');
      return res.type('text/markdown').send(content);
    }
    res.status(404).json({ error: 'No content for this artifact' });
  } catch (e) {
    console.error('Get artifact content error:', e);
    res.status(500).json({ error: (e as Error).message ?? 'Failed to get content' });
  }
});

const kbChatSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20).optional().default([]),
});

/**
 * POST /api/knowledge/chat
 * Knowledge Base agent: answers questions by searching the private platform library.
 * Requires admin auth. Uses current message to search docs and injects excerpts into context.
 */
router.post('/chat', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = kbChatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const { message, history } = parsed.data;
    const projectRoot = getProjectRoot();
    const excerpts = await searchPrivateLibrary(projectRoot, message, KB_SEARCH_LIMIT);
    const excerptBlock = excerpts.length > 0
      ? excerpts.map((e) => `## ${e.title}\n(${e.library_path})\n\n${e.excerpt}`).join('\n\n---\n\n')
      : '(No matching documents found. Say you could not find relevant docs and suggest rephrasing or a different topic.)';
    const systemPrompt = `You are the Platform Knowledge Base agent. You answer questions using ONLY the following documentation excerpts from the internal knowledge base. If the answer is not in the excerpts, say so clearly and suggest rephrasing or checking another topic. Do not invent or assume. Keep answers concise and cite the doc title when relevant.

--- DOCUMENTATION EXCERPTS ---
${excerptBlock}
--- END EXCERPTS ---`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.slice(-10).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ];
    const { response } = await gatewayChat({
      messages,
      temperature: 0.3,
      max_tokens: 1500,
    });
    res.json({ response });
  } catch (e) {
    console.error('Knowledge chat error:', e);
    res.status(500).json({ error: (e as Error).message ?? 'Knowledge chat failed' });
  }
});

export default router;
