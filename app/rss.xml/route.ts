import { NextResponse } from 'next/server';
import { ALL_BLOG_POSTS } from '@/lib/blog-data';

const BASE_URL = 'https://shreebeauty.studio';

export async function GET() {
  const sortedPosts = [...ALL_BLOG_POSTS].sort((a, b) => {
    return new Date(b.publishedAt || '2026-01-01').getTime() - new Date(a.publishedAt || '2026-01-01').getTime();
  });

  const rssItemsXml = sortedPosts
    .map((post) => {
      const pubDate = post.publishedAt
        ? new Date(post.publishedAt).toUTCString()
        : new Date().toUTCString();
      const escapedTitle = escapeXml(post.title);
      const escapedExcerpt = escapeXml(post.excerpt);
      const postUrl = `${BASE_URL}/blog/${post.slug}`;

      return `    <item>
      <title>${escapedTitle}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description>${escapedExcerpt}</description>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(post.category)}</category>
      <author>info@shreebeauty.studio (${escapeXml(post.author)})</author>
    </item>`;
    })
    .join('\n');

  const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Shree Beauty Studio &amp; Bridal Journal</title>
    <link>${BASE_URL}/blog</link>
    <description>Authoritative beauty, bridal makeup, hair aesthetics, and salon guides for women in Katargam, Surat, Gujarat.</description>
    <language>en-IN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${rssItemsXml}
  </channel>
</rss>`;

  return new NextResponse(rssXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
