/**
 * QR code generation for businesses: encodes public biz URL and overlays G AI logo in center.
 * Uses high error correction (H) so the logo doesn't break scan reliability.
 */
import QRCode from "qrcode";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const QR_SIZE = 512;
const LOGO_SIZE = 96;
const UPLOAD_DIR = path.resolve(__dirname, "..", "uploads", "qr");
const LOGO_PATH = path.resolve(__dirname, "..", "assets", "gateway-ai-logo.png");

function ensureUploadDir(): string {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  return UPLOAD_DIR;
}

/**
 * Generate QR code PNG with logo in center. Saves to uploads/qr/{slug}.png.
 * @param publicUrl - Full URL the QR encodes (e.g. https://example.com/biz/boardwalk-suites)
 * @param slug - URL-safe slug for filename and cache key
 * @returns Path to the saved PNG file (relative to server root for URL building)
 */
export async function generateBusinessQR(publicUrl: string, slug: string): Promise<string> {
  ensureUploadDir();

  // 1. Generate QR as PNG buffer with high error correction (H) so center can be covered
  const qrBuffer = await QRCode.toBuffer(publicUrl, {
    type: "png",
    width: QR_SIZE,
    margin: 2,
    errorCorrectionLevel: "H",
  });

  const outPath = path.join(UPLOAD_DIR, `${slug}.png`);

  // 2. If logo exists, overlay it in the center; otherwise just write QR
  if (fs.existsSync(LOGO_PATH)) {
    const logoResized = await sharp(LOGO_PATH)
      .resize(LOGO_SIZE, LOGO_SIZE)
      .png()
      .toBuffer();

    const left = Math.floor((QR_SIZE - LOGO_SIZE) / 2);
    const top = Math.floor((QR_SIZE - LOGO_SIZE) / 2);

    await sharp(qrBuffer)
      .composite([{ input: logoResized, left, top }])
      .png()
      .toFile(outPath);
  } else {
    await sharp(qrBuffer).png().toFile(outPath);
  }

  return outPath;
}

/**
 * Get filesystem path for a slug's QR image (may not exist yet).
 */
export function getQRFilePath(slug: string): string {
  return path.join(ensureUploadDir(), `${slug}.png`);
}

/**
 * Check if QR file exists for slug.
 */
export function qrFileExists(slug: string): boolean {
  return fs.existsSync(getQRFilePath(slug));
}
