declare module 'pdf-parse' {
  import type { Buffer } from 'node:buffer';

  function pdfParse(dataBuffer: Buffer, options?: unknown): Promise<{ text: string; numpages?: number }>;
  export default pdfParse;
}
