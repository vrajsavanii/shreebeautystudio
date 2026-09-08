import { BlogPost } from '@/types/blog';
import { BRIDAL_BLOGS } from './blogs/bridal';
import { HAIR_BLOGS } from './blogs/hair';
import { SKIN_BLOGS } from './blogs/skin';
import { BODY_NAILS_BLOGS } from './blogs/body-nails';
import { SURAT_GUIDES_BLOGS } from './blogs/surat-guides';

export const ALL_BLOG_POSTS: BlogPost[] = [
  ...BRIDAL_BLOGS,
  ...HAIR_BLOGS,
  ...SKIN_BLOGS,
  ...BODY_NAILS_BLOGS,
  ...SURAT_GUIDES_BLOGS,
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return ALL_BLOG_POSTS.find((p) => p.slug === slug);
}

export function getRelatedPosts(currentSlug: string, category: string, limit = 3): BlogPost[] {
  return ALL_BLOG_POSTS.filter((p) => p.slug !== currentSlug && p.category === category)
    .slice(0, limit)
    .concat(
      ALL_BLOG_POSTS.filter((p) => p.slug !== currentSlug && p.category !== category).slice(
        0,
        Math.max(0, limit - ALL_BLOG_POSTS.filter((p) => p.slug !== currentSlug && p.category === category).length)
      )
    );
}

export function getAllBlogCategories(): string[] {
  return Array.from(new Set(ALL_BLOG_POSTS.map((p) => p.category)));
}

export function getFeaturedBlogPosts(limit = 4): BlogPost[] {
  return ALL_BLOG_POSTS.slice(0, limit);
}
