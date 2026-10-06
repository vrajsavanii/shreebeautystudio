// app/api/tv-frame/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const tvUrlRaw = formData.get('tvUrl') as string;
    const tvUrl = (tvUrlRaw || 'http://192.168.1.81:9095').replace(/\/+$/, '');

    const files = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File | null;
    const allFiles: File[] = [];

    if (singleFile) allFiles.push(singleFile);
    if (files && files.length > 0) allFiles.push(...files);

    if (allFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No photo files provided for 4kFrame upload' },
        { status: 400 }
      );
    }

    // Prepare forward FormData for the 4kFrame TV server
    const forwardFormData = new FormData();
    for (const file of allFiles) {
      const filename = file.name || `shree_photo_4k_${Date.now()}.webp`;
      forwardFormData.append('photos', file, filename);
      forwardFormData.append('files', file, filename);
      forwardFormData.append('file', file, filename);
      forwardFormData.append('image', file, filename);
      forwardFormData.append('images', file, filename);
      forwardFormData.append('photo', file, filename);
    }

    const candidateEndpoints = [
      `${tvUrl}/admin/upload`,
      `${tvUrl}/upload`,
      `${tvUrl}/admin/`,
      `${tvUrl}/api/upload`,
      `${tvUrl}/api/photos`,
      `${tvUrl}/photos/upload`,
      `${tvUrl}/api/v1/photos`,
    ];

    let success = false;
    let endpointUsed = '';
    let responseText = '';

    for (const endpoint of candidateEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(endpoint, {
          method: 'POST',
          body: forwardFormData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok || res.status === 200 || res.status === 201 || res.status === 302) {
          success = true;
          endpointUsed = endpoint;
          try {
            responseText = await res.text();
          } catch {}
          break;
        }
      } catch (err: any) {
        // Try next endpoint
      }
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message: `🎉 Successfully uploaded ${allFiles.length} photo(s) to 4kFrame TV (${tvUrl})!`,
        tvUrl,
        endpointUsed,
        filesUploaded: allFiles.length,
      });
    } else {
      return NextResponse.json({
        success: false,
        offline: true,
        tvUrl,
        message: `⚠️ Could not reach 4kFrame TV server at ${tvUrl}. Make sure TV is powered on and connected to the same local Wi-Fi. Photos are safely cached in local storage.`,
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal error uploading to 4kFrame',
      },
      { status: 500 }
    );
  }
}
