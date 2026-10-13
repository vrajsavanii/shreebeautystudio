import { BlogPost } from '@/types/blog';
import { BRIDAL_BLOGS } from './blogs/bridal';
import { HAIR_BLOGS } from './blogs/hair';
import { SKIN_BLOGS } from './blogs/skin';
import { BODY_NAILS_BLOGS } from './blogs/body-nails';
import { SURAT_GUIDES_BLOGS } from './blogs/surat-guides';
import { SURAT_GUJARAT_SALON_GUIDE_1 } from './blogs/surat-gujarat-salon-guide-1';
import { SURAT_GUJARAT_SALON_GUIDE_2 } from './blogs/surat-gujarat-salon-guide-2';
import { SURAT_GUJARAT_SALON_GUIDE_3 } from './blogs/surat-gujarat-salon-guide-3';
import { SURAT_GUJARAT_SALON_GUIDE_4 } from './blogs/surat-gujarat-salon-guide-4';
import { MAKEUP_TRENDS_BLOGS } from './blogs/makeup-trends';
import { OCCASION_BEAUTY_BLOGS } from './blogs/occasion-beauty';
import { SKINCARE_WELLNESS_BLOGS } from './blogs/skincare-wellness';
import { SEO_DRIVEN_GUIDES } from './blogs/seo-driven-guides';
import { MASTER_GEO_NEIGHBORHOODS_BLOGS } from './blogs/master-geo-neighborhoods';
import { MASTER_NEAR_ME_BLOGS } from './blogs/master-near-me';
import { MASTER_BRIDAL_CEREMONIES_BLOGS } from './blogs/master-bridal-ceremonies';
import { MASTER_FESTIVE_BRAND_BLOGS } from './blogs/master-festive-brand';
import { MASTER_HAIR_SKIN_BLOGS } from './blogs/master-hair-skin';
import { MASTER_VOICE_SEARCH_FAQ_BLOGS } from './blogs/master-voice-search-faq';

export const ALL_BLOG_POSTS: BlogPost[] = [
  ...BRIDAL_BLOGS,
  ...HAIR_BLOGS,
  ...SKIN_BLOGS,
  ...BODY_NAILS_BLOGS,
  ...SURAT_GUIDES_BLOGS,
  ...SURAT_GUJARAT_SALON_GUIDE_1,
  ...SURAT_GUJARAT_SALON_GUIDE_2,
  ...SURAT_GUJARAT_SALON_GUIDE_3,
  ...SURAT_GUJARAT_SALON_GUIDE_4,
  ...MAKEUP_TRENDS_BLOGS,
  ...OCCASION_BEAUTY_BLOGS,
  ...SKINCARE_WELLNESS_BLOGS,
  ...SEO_DRIVEN_GUIDES,
  ...MASTER_GEO_NEIGHBORHOODS_BLOGS,
  ...MASTER_NEAR_ME_BLOGS,
  ...MASTER_BRIDAL_CEREMONIES_BLOGS,
  ...MASTER_FESTIVE_BRAND_BLOGS,
  ...MASTER_HAIR_SKIN_BLOGS,
  ...MASTER_VOICE_SEARCH_FAQ_BLOGS,
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
