'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search,
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  Tag,
  User,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { BlogPost } from '@/types/blog';

interface Props {
  initialPosts: BlogPost[];
  categories: string[];
}

export default function BlogListClient({ initialPosts, categories }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    initialPosts.forEach((post) => {
      post.tags.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).slice(0, 15);
  }, [initialPosts]);

  const filteredPosts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return initialPosts.filter((post) => {
      const matchCat = selectedCategory === 'all' || post.category === selectedCategory;
      const matchTag = selectedTag === 'all' || post.tags.includes(selectedTag);
      const matchSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.tags.some((t) => t.toLowerCase().includes(q));
      return matchCat && matchTag && matchSearch;
    });
  }, [initialPosts, search, selectedCategory, selectedTag]);

  const featuredPost = initialPosts[0];

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: 80 }}>
      {/* ─── HERO HEADER ────────────────────────────────────────── */}
      <section
        style={{
          background: 'linear-gradient(135deg, #05424A 0%, #032b30 100%)',
          color: '#ffffff',
          padding: '64px 20px 48px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(234, 186, 56, 0.15)',
              border: '1px solid rgba(234, 186, 56, 0.35)',
              padding: '6px 18px',
              borderRadius: 99,
              color: '#fef08a',
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            <BookOpen size={14} />
            <span>The Shree Beauty &amp; Bridal Journal</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 4.5vw, 2.9rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: 14,
              lineHeight: 1.2,
            }}
          >
            Expert Beauty Insights, Bridal Guides &amp; Salon Secrets
          </h1>

          <p
            style={{
              fontSize: 'clamp(0.95rem, 1.8vw, 1.1rem)',
              color: 'rgba(255, 255, 255, 0.88)',
              maxWidth: 640,
              margin: '0 auto 28px',
              lineHeight: 1.6,
            }}
          >
            Over 50 comprehensive guides on bridal makeup, hair Botox, keratin smoothing, skincare facials, and grooming tailored for women in Katargam, Surat.
          </p>

          {/* Search Bar */}
          <div style={{ maxWidth: 540, margin: '0 auto', position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
              }}
            />
            <input
              type="text"
              placeholder="Search 50+ beauty topics (e.g. Bridal HD, Botox, Hydra Facial)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 18px 14px 44px',
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: 15,
                outline: 'none',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              }}
            />
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ────────────────────────────────────────── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 20px 0' }}>
        {/* Category Filter Pills (Wrapped cleanly for mobile with no horizontal scrolling) */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSelectedTag('all');
              }}
              style={{
                padding: '8px 18px',
                borderRadius: 99,
                fontSize: 13.5,
                fontWeight: selectedCategory === 'all' && selectedTag === 'all' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: selectedCategory === 'all' && selectedTag === 'all' ? '1px solid #05424A' : '1px solid #e2e8f0',
                background: selectedCategory === 'all' && selectedTag === 'all' ? '#05424A' : '#ffffff',
                color: selectedCategory === 'all' && selectedTag === 'all' ? '#ffffff' : '#475569',
                boxShadow: selectedCategory === 'all' && selectedTag === 'all' ? '0 4px 12px rgba(5,66,74,0.18)' : '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              All Articles ({initialPosts.length})
            </button>
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              const count = initialPosts.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedTag('all');
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 99,
                    fontSize: 13.5,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: active ? '1px solid #05424A' : '1px solid #e2e8f0',
                    background: active ? '#05424A' : '#ffffff',
                    color: active ? '#ffffff' : '#475569',
                    boxShadow: active ? '0 4px 12px rgba(5,66,74,0.18)' : '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Popular Tags Strip */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 32,
            padding: '8px 12px',
          }}
        >
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Tag size={12} /> Popular:
          </span>
          {allTags.slice(0, 8).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(selectedTag === tag ? 'all' : tag)}
              style={{
                background: selectedTag === tag ? '#dbeafe' : 'transparent',
                border: selectedTag === tag ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                color: selectedTag === tag ? '#1d4ed8' : '#64748b',
                padding: '3px 10px',
                borderRadius: 99,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Counter */}
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20, fontWeight: 500 }}>
          Showing {filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'}
          {selectedCategory !== 'all' && ` in "${selectedCategory}"`}
          {selectedTag !== 'all' && ` tagged "#${selectedTag}"`}
          {search && ` matching "${search}"`}
        </div>

        {/* Articles Grid */}
        {filteredPosts.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#ffffff',
              borderRadius: 20,
              border: '1px solid #e2e8f0',
            }}
          >
            <BookOpen size={42} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
              No articles found
            </h3>
            <p style={{ color: '#64748b', fontSize: 14, maxWidth: 360, margin: '0 auto 18px' }}>
              We couldn’t find any articles matching &ldquo;{search}&rdquo;. Try browsing our categories above.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
                setSelectedTag('all');
              }}
              style={{
                background: '#05424A',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 10,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 24,
            }}
          >
            {filteredPosts.map((post) => (
              <article
                key={post.slug}
                style={{
                  background: '#ffffff',
                  borderRadius: 20,
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                }}
              >
                {/* Image */}
                <Link
                  href={`/blog/${post.slug}`}
                  style={{ position: 'relative', display: 'block', height: 200, overflow: 'hidden' }}
                >
                  <img
                    src={post.image}
                    alt={post.title}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.3s ease',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 14,
                      left: 14,
                      background: 'rgba(3, 43, 48, 0.88)',
                      backdropFilter: 'blur(8px)',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: 99,
                      border: '1px solid rgba(234, 186, 56, 0.4)',
                    }}
                  >
                    {post.category}
                  </span>
                </Link>

                {/* Body */}
                <div
                  style={{
                    padding: '22px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      fontSize: 12,
                      color: '#94a3b8',
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} /> {post.readTime}
                    </span>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={13} /> {post.publishedAt}
                    </span>
                  </div>

                  <h2
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: 10,
                      lineHeight: 1.35,
                    }}
                  >
                    <Link
                      href={`/blog/${post.slug}`}
                      style={{ color: '#0f172a', textDecoration: 'none' }}
                    >
                      {post.title}
                    </Link>
                  </h2>

                  <p
                    style={{
                      fontSize: 13.5,
                      color: '#64748b',
                      lineHeight: 1.6,
                      marginBottom: 18,
                      flex: 1,
                    }}
                  >
                    {post.excerpt}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 14,
                      borderTop: '1px solid #f1f5f9',
                    }}
                  >
                    <span style={{ fontSize: 12.5, color: '#475569', fontWeight: 600 }}>
                      By {post.author}
                    </span>
                    <Link
                      href={`/blog/${post.slug}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        color: '#05424A',
                        fontWeight: 700,
                        fontSize: 13,
                        textDecoration: 'none',
                      }}
                    >
                      <span>Read Guide</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
