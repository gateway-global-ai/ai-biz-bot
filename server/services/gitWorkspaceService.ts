import { promisify } from "node:util";
import { execFile as execFileCb } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const execFile = promisify(execFileCb);
const REPO_ROOT = process.cwd();
const DEFAULT_WORKTREE_ROOT = path.join(REPO_ROOT, ".worktrees");

function sanitizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "coding-intent";
}

async function runGit(args: string[], cwd = REPO_ROOT): Promise<string> {
  const { stdout } = await execFile("git", args, { cwd });
  return stdout.trim();
}

async function branchExists(branchName: string): Promise<boolean> {
  try {
    await runGit(["rev-parse", "--verify", `refs/heads/${branchName}`]);
    return true;
  } catch {
    return false;
  }
}

async function worktreeExists(worktreePath: string): Promise<boolean> {
  try {
    await fs.stat(worktreePath);
    return true;
  } catch {
    return false;
  }
}

export interface DiffSummary {
  statusShort: string;
  diffStat: string;
}

export async function createFeatureBranch(baseBranch: string, branchName: string): Promise<string> {
  const sanitized = sanitizeSegment(branchName);
  const exists = await branchExists(sanitized);
  if (!exists) {
    await runGit(["branch", sanitized, baseBranch]);
  }
  return sanitized;
}

export async function createWorktree(branchName: string, requestedPath?: string): Promise<string> {
  const sanitizedBranch = sanitizeSegment(branchName);
  const worktreePath = requestedPath
    ? path.resolve(requestedPath)
    : path.join(DEFAULT_WORKTREE_ROOT, sanitizedBranch.replace(/\//g, "__"));

  if (await worktreeExists(worktreePath)) {
    return worktreePath;
  }

  await fs.mkdir(path.dirname(worktreePath), { recursive: true });
  await runGit(["worktree", "add", worktreePath, sanitizedBranch]);
  return worktreePath;
}

export async function collectDiffSummary(worktreePath: string): Promise<DiffSummary> {
  const statusShort = await runGit(["status", "--short"], worktreePath);
  const diffStat = await runGit(["diff", "--stat"], worktreePath);
  return { statusShort, diffStat };
}

export async function getRepoRoot(): Promise<string> {
  return REPO_ROOT;
}
