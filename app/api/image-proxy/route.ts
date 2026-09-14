import { NextRequest } from 'next/server';

const allowedHosts = new Set(['drive.google.com', 'www.google.com', 'googleusercontent.com']);

function isAllowedHost(hostname: string) {
  return allowedHosts.has(hostname) || hostname.endsWith('.googleusercontent.com');
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get('url');
  if (!source) return new Response('Missing image URL', { status: 400 });

  let imageUrl: URL;
  try {
    imageUrl = new URL(source);
  } catch {
    return new Response('Invalid image URL', { status: 400 });
  }

  if (imageUrl.protocol !== 'https:' || !isAllowedHost(imageUrl.hostname)) {
    return new Response('Image host is not allowed', { status: 403 });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: { Accept: 'image/*' },
      redirect: 'follow',
      next: { revalidate: 3600 },
    });

    if (!response.ok) return new Response('Unable to fetch image', { status: response.status });

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return new Response('Drive URL did not return an image', { status: 415 });
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch {
    return new Response('Unable to fetch image', { status: 502 });
  }
}
