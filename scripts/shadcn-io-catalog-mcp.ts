#!/usr/bin/env npx tsx
/**
 * Local stdio MCP: shadcn.io component index from repo JSON (no remote SSE).
 * Design-time only — see docs-governance/canonical/SHADCN_MCP_PLANE_BOUNDARY_V1.md
 *
 * Cursor .cursor/mcp.json:
 *   "shadcn-io": { "command": "npx", "args": ["tsx", "scripts/shadcn-io-catalog-mcp.ts"] }
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const mergedPath = join(root, "registry-yaml/shadcn-io-catalog/merged_catalog.v1.json");
const fallbackPath = join(root, "registry-yaml/shadcn-io-catalog/component_index.v1.json");

type Entry = {
  id: string;
  category: string;
  slug: string;
  title: string;
  docUrl: string;
  recipeUrl?: string;
  installCommand?: string;
  subcategory?: string;
};

type IndexFile = {
  spec: string;
  version?: string;
  sourceReadme?: string;
  disclaimer: string;
  entries: Entry[];
};

function loadIndex(): IndexFile {
  if (existsSync(mergedPath)) {
    const raw = readFileSync(mergedPath, "utf-8");
    return JSON.parse(raw) as IndexFile;
  }
  const raw = readFileSync(fallbackPath, "utf-8");
  return JSON.parse(raw) as IndexFile;
}

function formatEntry(e: Entry): string {
  const lines = [
    `**${e.title}** (\`${e.id}\`)`,
    `- Doc: ${e.docUrl}`,
  ];
  if (e.installCommand) {
    lines.push(`- Install (verify slug on doc): \`${e.installCommand}\``);
  }
  return lines.join("\n");
}

async function main() {
  const index = loadIndex();
  const { entries } = index;

  const server = new McpServer({
    name: "shadcn-io-catalog",
    version: index.version,
  });

  server.registerTool(
    "shadcn_io_about",
    {
      description:
        "Metadata for this catalog: source README, disclaimer, entry count (shadcn.io ecosystem, not ui.shadcn.com).",
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: "text",
          text: [
            `**${index.spec}** v${index.version}`,
            `- Source: ${index.sourceReadme}`,
            `- Entries: ${entries.length}`,
            `- ${index.disclaimer}`,
          ].join("\n"),
        },
      ],
    }),
  );

  server.registerTool(
    "shadcn_io_list",
    {
      description:
        "List shadcn.io components from the repo index. Optional filter by category: ai | button | hooks | text.",
      inputSchema: {
        category: z
          .enum(["ai", "button", "hooks", "text", "blocks"])
          .optional()
          .describe("Filter by category segment in doc URLs"),
      },
    },
    async ({ category }) => {
      const list = category
        ? entries.filter((e) => e.category === category)
        : entries;
      const body =
        list.length === 0
          ? "No entries match."
          : list.map((e) => `- \`${e.id}\` — ${e.title} — ${e.docUrl}`).join("\n");
      return { content: [{ type: "text", text: body }] };
    },
  );

  server.registerTool(
    "shadcn_io_search",
    {
      description:
        "Search the shadcn.io index by substring (title, slug, id, doc URL).",
      inputSchema: {
        query: z.string().describe("Case-insensitive substring"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max results (default 25)"),
      },
    },
    async ({ query, limit = 25 }) => {
      const q = query.trim().toLowerCase();
      if (!q) {
        return { content: [{ type: "text", text: "Provide a non-empty query." }] };
      }
      const hits = entries.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.slug.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          e.docUrl.toLowerCase().includes(q),
      );
      const slice = hits.slice(0, limit);
      const body =
        slice.length === 0
          ? "No matches."
          : slice.map((e) => formatEntry(e)).join("\n\n---\n\n");
      return { content: [{ type: "text", text: body }] };
    },
  );

  server.registerTool(
    "shadcn_io_get",
    {
      description:
        "Get one catalog entry by id (e.g. ai:panel, button:copy, hooks:use-boolean).",
      inputSchema: {
        id: z.string().describe("Entry id category:slug"),
      },
    },
    async ({ id }) => {
      const e = entries.find((x) => x.id === id);
      if (!e) {
        return {
          content: [
            {
              type: "text",
              text: `Unknown id \`${id}\`. Use shadcn_io_search or shadcn_io_list.`,
            },
          ],
        };
      }
      return { content: [{ type: "text", text: formatEntry(e) }] };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
