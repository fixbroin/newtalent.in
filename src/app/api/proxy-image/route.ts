import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Only allow proxying http/https images
  if (!imageUrl.startsWith('http')) {
    return NextResponse.json({ error: 'Invalid URL scheme' }, { status: 400 });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'Accept': 'image/*'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image from Storage: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Return the full Data URL as text
    return new NextResponse(`data:${contentType};base64,${base64}`, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    console.error('Error in proxy-image API:', error);
    return NextResponse.json({ error: error.message || 'Error fetching image' }, { status: 500 });
  }
}
