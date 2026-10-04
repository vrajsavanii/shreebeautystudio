import { NextResponse } from 'next/server';
import { ALL_BLOG_POSTS } from '@/lib/blog-data';
import { ALL_LOCATION_SLUGS } from '@/lib/locations-data';
import { ALL_SERVICE_SEO_SLUGS } from '@/lib/services-seo-data';

const BASE_URL = 'https://shreebeauty.studio';
const INDEXNOW_KEY = 'd862c90e0c0341c385c7f8a7e5bf3a17';

export async function POST() {
  return triggerIndexNow();
}

export async function GET() {
  return triggerIndexNow();
}

async function triggerIndexNow() {
  const staticPages = [
    BASE_URL,
    `${BASE_URL}/bridal`,
    `${BASE_URL}/services`,
    `${BASE_URL}/contact`,
    `${BASE_URL}/about`,
    `${BASE_URL}/book`,
    `${BASE_URL}/blog`,
    `${BASE_URL}/faq`,
    `${BASE_URL}/locations`,
  ];

  const servicePages = ALL_SERVICE_SEO_SLUGS.map((slug) => `${BASE_URL}/services/${slug}`);
  const locationPages = ALL_LOCATION_SLUGS.map((slug) => `${BASE_URL}/locations/${slug}`);
  const blogPages = ALL_BLOG_POSTS.map((post) => `${BASE_URL}/blog/${post.slug}`);

  const allUrls = [...staticPages, ...servicePages, ...locationPages, ...blogPages];

  const payload = {
    host: 'shreebeauty.studio',
    key: INDEXNOW_KEY,
    keyLocation: `https://shreebeauty.studio/${INDEXNOW_KEY}.txt`,
    urlList: allUrls,
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return NextResponse.json({
      success: res.ok,
      status: res.status,
      submittedUrlsCount: allUrls.length,
      message: res.ok
        ? 'Successfully submitted all URLs to IndexNow (Bing, Copilot, ChatGPT Search)'
        : 'IndexNow responded with status ' + res.status,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to submit to IndexNow',
      },
      { status: 500 }
    );
  }
}
