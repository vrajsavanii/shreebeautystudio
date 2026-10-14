// app/api/whatsapp/upload/route.ts
// Handles file and media uploads (images, PDFs, voice recordings) for WhatsApp

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'whatsapp');

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureUploadsDir();

    const contentType = req.headers.get('content-type') || '';

    // 1. JSON payload with base64 data
    if (contentType.includes('application/json')) {
      const { base64Data, fileName, mimetype } = await req.json();

      if (!base64Data) {
        return NextResponse.json({ success: false, error: 'base64Data is required' }, { status: 400 });
      }

      const matches = String(base64Data).match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      if (matches && matches.length === 3) {
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(base64Data, 'base64');
      }

      const ext =
        path.extname(fileName || 'file') ||
        (mimetype?.includes('image')
          ? '.jpg'
          : mimetype?.includes('pdf')
          ? '.pdf'
          : mimetype?.includes('audio')
          ? '.mp3'
          : '.bin');

      const safeName = `wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
      const filePath = path.join(uploadsDir, safeName);
      fs.writeFileSync(filePath, buffer);

      return NextResponse.json({
        success: true,
        url: `/uploads/whatsapp/${safeName}`,
        fileName: fileName || safeName,
        mimetype,
        size: buffer.length,
      });
    }

    // 2. FormData multipart upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = path.extname(file.name) || '.bin';
      const safeName = `wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
      const filePath = path.join(uploadsDir, safeName);
      fs.writeFileSync(filePath, buffer);

      return NextResponse.json({
        success: true,
        url: `/uploads/whatsapp/${safeName}`,
        fileName: file.name,
        mimetype: file.type,
        size: buffer.length,
      });
    }

    return NextResponse.json({ success: false, error: 'Unsupported Content-Type' }, { status: 400 });
  } catch (err: any) {
    console.error('[WhatsApp Upload] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Error processing upload' },
      { status: 500 }
    );
  }
}
