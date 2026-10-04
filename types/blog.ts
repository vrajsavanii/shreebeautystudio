export interface BlogFAQ {
  question: string;
  answer: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  category: 'Bridal & Makeup' | 'Hair Aesthetics' | 'Skin & Facials' | 'Nails & Body' | 'Surat Salon Guides' | 'Makeup & Beauty Trends' | 'Wedding & Occasion Beauty' | 'Skincare & Wellness';
  readTime: string;
  publishedAt: string;
  author: string;
  authorRole: string;
  image: string;
  tags: string[];
  content: string; // Markdown / semantic HTML formatted
  faq?: BlogFAQ[];
}
