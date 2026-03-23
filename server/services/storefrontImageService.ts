/**
 * Storefront hero images: optional Flux-based generation via third-party image API.
 * Token: STOREFRONT_IMAGE_GEN_TOKEN (set in Doppler; not an alternate LLM key).
 */
import { db } from '../db.js';
import { storefrontCategories, storefrontCategoryImages } from '@shared/schema';
import { eq } from 'drizzle-orm';

const FLUX_MODEL = 'black-forest-labs/flux-schnell';
const IMAGES_PER_CATEGORY = 5;

function getImageGenToken(): string | undefined {
  return process.env.STOREFRONT_IMAGE_GEN_TOKEN?.trim() || undefined;
}

const PROMPTS_BY_INDEX = [
  'Professional storefront exterior, modern and inviting, natural daylight, clean signage, high quality photo',
  'Interior of a welcoming local business, warm lighting, customers, authentic atmosphere, photo',
  'Storefront window display and entrance, urban street, evening glow, professional photography',
  'Clean modern business storefront, minimalist design, daytime, sharp focus, commercial photo',
  'Cozy local business interior, detail shot, warm tones, professional, inviting, photo',
];

/**
 * Build a category-specific prompt for Flux (e.g. nail salon in Las Vegas).
 */
function buildPrompt(displayName: string, location: string, index: number): string {
  const base = PROMPTS_BY_INDEX[index] ?? PROMPTS_BY_INDEX[0];
  return `${displayName} in ${location}, ${base}`;
}

/**
 * Generate 5 images for a storefront category. Persists URLs to storefront_category_images.
 * Requires STOREFRONT_IMAGE_GEN_TOKEN. Returns array of image URLs (or throws if token missing).
 */
export async function generateCategoryImages(categorySlug: string): Promise<string[]> {
  const token = getImageGenToken();
  if (!token) {
    throw new Error('Image generation not configured (set STOREFRONT_IMAGE_GEN_TOKEN)');
  }

  const [cat] = await db.select().from(storefrontCategories).where(eq(storefrontCategories.slug, categorySlug)).limit(1);
  if (!cat) throw new Error(`Category not found: ${categorySlug}`);

  const { default: ClientCtor } = await import('replicate');
  const client = new ClientCtor({ auth: token });
  const runModel = client.run.bind(client);

  const urls: string[] = [];

  for (let i = 0; i < IMAGES_PER_CATEGORY; i++) {
    const prompt = buildPrompt(cat.displayName, cat.location, i);
    const output = await runModel(FLUX_MODEL as `${string}/${string}`, {
      input: { prompt },
    });
    const url = Array.isArray(output) ? output[0] : typeof output === 'string' ? output : (output as { url?: string })?.url;
    if (typeof url !== 'string') continue;
    urls.push(url);
    await db
      .insert(storefrontCategoryImages)
      .values({
        categorySlug,
        imageIndex: i,
        imageUrl: url,
      })
      .onConflictDoUpdate({
        target: [storefrontCategoryImages.categorySlug, storefrontCategoryImages.imageIndex],
        set: { imageUrl: url },
      });
  }

  return urls;
}

/**
 * Get stored image URLs for a category (order by image_index).
 */
export async function getCategoryImageUrls(categorySlug: string): Promise<string[]> {
  const rows = await db
    .select({ imageUrl: storefrontCategoryImages.imageUrl, imageIndex: storefrontCategoryImages.imageIndex })
    .from(storefrontCategoryImages)
    .where(eq(storefrontCategoryImages.categorySlug, categorySlug))
    .orderBy(storefrontCategoryImages.imageIndex);
  return rows.map((r) => r.imageUrl);
}
