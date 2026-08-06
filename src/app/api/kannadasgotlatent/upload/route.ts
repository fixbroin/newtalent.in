import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads/kannada-got-latent
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'kannada-got-latent');
    
    // Ensure folder exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Sanitize and generate unique filename
    const originalName = (file as any).name || 'upload.mp4';
    const extension = path.extname(originalName) || '.mp4';
    const uniqueName = `${nanoid()}${extension}`;
    const filePath = path.join(uploadDir, uniqueName);

    // Write file to local disk
    await fs.writeFile(filePath, buffer);

    const relativeUrl = `/uploads/kannada-got-latent/${uniqueName}`;

    return NextResponse.json({
      success: true,
      url: relativeUrl,
      fileName: uniqueName,
    });
  } catch (error: any) {
    console.error('Local upload error:', error);
    return NextResponse.json({ success: false, error: error.message || 'File upload failed' }, { status: 500 });
  }
}
