'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  User,
  ArrowLeft,
  Share2,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  MapPin,
  Phone,
  ShieldCheck,
  Navigation,
  Award,
} from 'lucide-react';
import { BlogPost } from '@/types/blog';

interface Props {
  post: BlogPost;
  relatedPosts: BlogPost[];
}

export default function BlogPostClient({ post, relatedPosts }: Props) {
  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Article link copied to clipboard!');
    }
  };

  // Simple, robust markdown converter for paragraphs, h2s, h3s, bullet points, tables, images, and callouts
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let tableLines: string[] = [];
    let inTable = false;

    const formatInline = (str: string): React.ReactNode => {
      // Split by bold **text**
      const parts = str.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} style={{ color: '#0f172a', fontWeight: 700 }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });
    };

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul
            key={`list-${elements.length}`}
            style={{
              paddingLeft: 24,
              marginBottom: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              color: '#334155',
              fontSize: 15.5,
              lineHeight: 1.75,
            }}
          >
            {listItems.map((item, i) => (
              <li key={i}>{formatInline(item)}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    const flushTable = () => {
      if (tableLines.length > 0) {
        const rows = tableLines.map((row) =>
          row
            .split('|')
            .map((c) => c.trim())
            .filter((c) => c.length > 0)
        );
        const headers = rows[0] || [];
        const bodyRows = rows.slice(2); // Skip separator row

        elements.push(
          <div
            key={`table-${elements.length}`}
            style={{
              overflowX: 'auto',
              margin: '28px 0',
              borderRadius: 14,
              border: '1px solid rgba(234, 186, 56, 0.3)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 14,
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #05424A 0%, #032b30 100%)', color: '#ffffff' }}>
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: '13px 18px',
                        fontWeight: 700,
                        color: '#fef08a',
                        borderBottom: '1px solid rgba(234, 186, 56, 0.3)',
                        fontSize: 13.5,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: rIdx % 2 === 0 ? '#ffffff' : '#fafaf9',
                    }}
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        style={{
                          padding: '12px 18px',
                          color: '#475569',
                          lineHeight: 1.6,
                        }}
                      >
                        {formatInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableLines = [];
        inTable = false;
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('|')) {
        inTable = true;
        tableLines.push(trimmed);
        return;
      } else if (inTable) {
        flushTable();
      }

      if (
        trimmed.startsWith('- ') ||
        trimmed.startsWith('1. ') ||
        trimmed.startsWith('2. ') ||
        trimmed.startsWith('3. ') ||
        trimmed.startsWith('4. ') ||
        trimmed.startsWith('5. ')
      ) {
        listItems.push(trimmed.replace(/^[-*]|\d+\.\s*/, ''));
        return;
      } else {
        flushList();
      }

      if (trimmed.startsWith('![') && trimmed.includes('](')) {
        const match = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
        if (match) {
          const [, alt, src] = match;
          elements.push(
            <figure
              key={idx}
              style={{
                margin: '32px 0',
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: '0 12px 32px rgba(5,66,74,0.12)',
                border: '1.5px solid rgba(234, 186, 56, 0.25)',
              }}
            >
              <img
                src={src}
                alt={alt || post.title}
                style={{
                  width: '100%',
                  maxHeight: 460,
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              {alt && (
                <figcaption
                  style={{
                    fontSize: 13,
                    color: '#64748b',
                    textAlign: 'center',
                    padding: '10px 16px',
                    background: '#fafaf9',
                    fontStyle: 'italic',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  📸 {alt}
                </figcaption>
              )}
            </figure>
          );
          return;
        }
      }

      if (trimmed.startsWith('> ')) {
        elements.push(
          <div
            key={idx}
            style={{
              margin: '24px 0',
              padding: '18px 22px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(5, 66, 74, 0.05) 0%, rgba(234, 186, 56, 0.1) 100%)',
              borderLeft: '4px solid #eaba38',
              color: '#0f172a',
              fontSize: 15,
              lineHeight: 1.7,
              fontStyle: 'italic',
            }}
          >
            {formatInline(trimmed.replace(/^>\s*/, ''))}
          </div>
        );
        return;
      }

      if (trimmed.startsWith('## ')) {
        elements.push(
          <h2
            key={idx}
            className="display-font"
            style={{
              fontSize: 'clamp(1.5rem, 2.8vw, 1.95rem)',
              fontWeight: 700,
              color: '#05424A',
              marginTop: 40,
              marginBottom: 16,
              lineHeight: 1.3,
            }}
          >
            {trimmed.replace('## ', '')}
          </h2>
        );
      } else if (trimmed.startsWith('### ')) {
        elements.push(
          <h3
            key={idx}
            style={{
              fontSize: 'clamp(1.2rem, 2.2vw, 1.45rem)',
              fontWeight: 700,
              color: '#0f172a',
              marginTop: 26,
              marginBottom: 12,
              lineHeight: 1.35,
            }}
          >
            {trimmed.replace('### ', '')}
          </h3>
        );
      } else if (trimmed === '---') {
        elements.push(
          <hr
            key={idx}
            style={{
              border: 'none',
              borderTop: '1px solid rgba(234, 186, 56, 0.25)',
              margin: '36px 0',
            }}
          />
        );
      } else if (trimmed.length > 0) {
        elements.push(
          <p
            key={idx}
            style={{
              fontSize: 16,
              lineHeight: 1.85,
              color: '#334155',
              marginBottom: 20,
            }}
          >
            {formatInline(trimmed)}
          </p>
        );
      }
    });

    flushList();
    flushTable();

    return elements;
  };

  return (
    <div style={{ background: '#fcfbf9', minHeight: '100vh', paddingBottom: 80 }}>
      {/* ─── BREADCRUMB & BACK NAV ──────────────────────────────── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
        <div
          style={{
            maxWidth: 1040,
            margin: '0 auto',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: '#64748b',
              flexWrap: 'wrap',
            }}
          >
            <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>
              Home
            </Link>
            <ChevronRight size={14} />
            <Link href="/blog" style={{ color: '#64748b', textDecoration: 'none' }}>
              Blog
            </Link>
            <ChevronRight size={14} />
            <span style={{ color: '#05424A', fontWeight: 600 }}>{post.category}</span>
          </div>

          <Link
            href="/blog"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#05424A',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} />
            <span>All Articles</span>
          </Link>
        </div>
      </div>

      {/* ─── ARTICLE HEADER ─────────────────────────────────────── */}
      <header
        style={{
          maxWidth: 920,
          margin: '0 auto',
          padding: '40px 20px 24px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(5, 66, 74, 0.08)',
            color: '#05424A',
            padding: '5px 14px',
            borderRadius: 99,
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 18,
          }}
        >
          <span>{post.category}</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(1.9rem, 4vw, 2.75rem)',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.25,
            marginBottom: 18,
            letterSpacing: '-0.02em',
          }}
        >
          {post.title}
        </h1>

        <p
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            color: '#475569',
            lineHeight: 1.7,
            marginBottom: 24,
          }}
        >
          {post.excerpt}
        </p>

        {/* Author & Meta Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            paddingBottom: 24,
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#05424A',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              {post.author.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: '#0f172a' }}>
                {post.author}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {post.authorRole} · Shree Beauty Studio
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 13,
              color: '#64748b',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={14} /> {post.readTime}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={14} /> {post.publishedAt}
            </span>
            <button
              onClick={handleShare}
              aria-label="Share article"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#f1f5f9',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 8,
                color: '#334155',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── FEATURED IMAGE ─────────────────────────────────────── */}
      <div style={{ maxWidth: 920, margin: '0 auto 40px', padding: '0 20px' }}>
        <div
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
          }}
        >
          <img
            src={post.image}
            alt={post.title}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80&auto=format&fit=crop';
            }}
            style={{ width: '100%', height: 'auto', maxHeight: 460, objectFit: 'cover', display: 'block' }}
          />
        </div>
      </div>

      {/* ─── ARTICLE BODY ───────────────────────────────────────── */}
      <main
        style={{
          maxWidth: 780,
          margin: '0 auto',
          padding: '0 20px',
        }}
      >
        <div className="blog-article-content">{renderMarkdown(post.content)}</div>

        {/* Tags */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 40,
            paddingTop: 24,
            borderTop: '1px solid #e2e8f0',
          }}
        >
          {post.tags.map((tag) => (
            <span
              key={tag}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 99,
              }}
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* ─── SURAT & SOUTH GUJARAT LOCAL STUDIO EXPERIENCE ─────────── */}
        <div
          style={{
            marginTop: 48,
            background: 'linear-gradient(145deg, #f8fbfb 0%, #eef6f6 100%)',
            borderRadius: 22,
            border: '1.5px solid rgba(5, 66, 74, 0.15)',
            padding: '36px 30px',
            boxShadow: '0 8px 28px rgba(5, 66, 74, 0.05)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(5, 66, 74, 0.08)',
              color: '#05424A',
              padding: '6px 14px',
              borderRadius: 99,
              fontSize: 12.5,
              fontWeight: 700,
              marginBottom: 16,
              letterSpacing: '0.02em',
            }}
          >
            <MapPin size={15} style={{ color: '#05424A' }} />
            <span>VISIT OUR SURAT STUDIO • 100% LADIES-ONLY SANCTUARY</span>
          </div>

          <h3
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#05424A',
              marginBottom: 10,
              lineHeight: 1.35,
            }}
          >
            Experience Professional Aesthetic Care in Katargam, Surat
          </h3>

          <p
            style={{
              color: '#475569',
              fontSize: 14.5,
              lineHeight: 1.65,
              marginBottom: 24,
              maxWidth: 720,
            }}
          >
            Interested in treatments discussed in this guide? Shree Beauty Studio provides dedicated private consultation cabins, medical-grade sanitization, and specialized formulas formulated specifically for Surat’s humid climate and water characteristics.
          </p>

          {/* 4 Trust Highlights Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                background: '#ffffff',
                padding: '16px 18px',
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <ShieldCheck size={20} style={{ color: '#05424A', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ fontSize: 13.5, color: '#0f172a', display: 'block', marginBottom: 2 }}>
                  100% Ladies Only
                </strong>
                <span style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.4 }}>
                  Zero male presence. Complete comfort, privacy & dignity for every Gujarati woman.
                </span>
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                padding: '16px 18px',
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <Award size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ fontSize: 13.5, color: '#0f172a', display: 'block', marginBottom: 2 }}>
                  10+ Years & 2,500+ Brides
                </strong>
                <span style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.4 }}>
                  Trusted legacy across Surat, Navsari, Bardoli, Ankleshwar, and Ahmedabad.
                </span>
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                padding: '16px 18px',
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <Sparkles size={20} style={{ color: '#05424A', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ fontSize: 13.5, color: '#0f172a', display: 'block', marginBottom: 2 }}>
                  Authentic International Brands
                </strong>
                <span style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.4 }}>
                  100% sealed genuine tubes: L’Oréal, O3+, Rica, Kryolan, and Lotus Professional.
                </span>
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                padding: '16px 18px',
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <CheckCircle2 size={20} style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ fontSize: 13.5, color: '#0f172a', display: 'block', marginBottom: 2 }}>
                  Climate-Tuned Protocols
                </strong>
                <span style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.4 }}>
                  Hard water chelating shampoos & 16-hour sweat-proof bridal makeup sealers.
                </span>
              </div>
            </div>
          </div>

          {/* Neighborhoods Served */}
          <div
            style={{
              padding: '16px 20px',
              background: '#ffffff',
              borderRadius: 14,
              border: '1px dashed #cbd5e1',
              marginBottom: 28,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
              Neighborhoods & Regions Welcomed Daily at Our Katargam Studio:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                'Katargam (Host Studio)',
                'Varachha',
                'Mota Varachha',
                'Adajan',
                'Pal & Gaurav Path',
                'Vesu',
                'City Light',
                'Piplod',
                'Ghod Dod Road',
                'Amroli',
                'Rander',
                'Jahangirpura',
                'Navsari',
                'Bardoli',
                'Ankleshwar',
              ].map((locality) => (
                <span
                  key={locality}
                  style={{
                    background: '#f1f5f9',
                    color: '#334155',
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 6,
                  }}
                >
                  {locality}
                </span>
              ))}
            </div>
          </div>

          {/* Studio Address & CTAs */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 18,
              paddingTop: 16,
              borderTop: '1px solid rgba(5, 66, 74, 0.12)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#0f172a', fontWeight: 700 }}>
                <MapPin size={16} style={{ color: '#05424A' }} />
                <span>22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat 395004</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
                <Clock size={14} />
                <span>Monday – Sunday: 10:00 AM – 7:00 PM • Prior appointment recommended</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a
                href="https://maps.google.com/?q=Radhika+Society+Katargam+Surat"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#ffffff',
                  color: '#05424A',
                  border: '1.5px solid #05424A',
                  padding: '10px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <Navigation size={14} />
                <span>Get Directions</span>
              </a>

              <Link
                href="/book"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#05424A',
                  color: '#ffffff',
                  padding: '10px 18px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <Calendar size={14} />
                <span>Book Appointment</span>
              </Link>

              <a
                href={`https://wa.me/919773240010?text=Hi%20Shree%20Beauty%20Studio!%20I%20am%20reading%20"${encodeURIComponent(
                  post.title
                )}"%20and%20want%20to%20consult%20about%20availability%20in%20Katargam,%20Surat.`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#25D366',
                  color: '#053320',
                  padding: '10px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <MessageCircle size={14} />
                <span>WhatsApp Inquiry</span>
              </a>
            </div>
          </div>
        </div>

        {/* ─── EMBEDDED FAQ SECTION ───────────────────────────────── */}
        {post.faq && post.faq.length > 0 && (
          <div
            style={{
              marginTop: 48,
              background: '#ffffff',
              borderRadius: 20,
              border: '1px solid #e2e8f0',
              padding: '32px 28px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#05424A',
                fontWeight: 700,
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              <HelpCircle size={18} />
              <span>Frequently Asked Questions</span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>
              Questions About This Guide
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {post.faq.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#f8fafc',
                    borderRadius: 12,
                    padding: '16px 18px',
                    border: '1px solid #edf2f7',
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: 6,
                    }}
                  >
                    Q: {item.question}
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── CTA BANNER ─────────────────────────────────────────── */}
        <div
          style={{
            marginTop: 48,
            background: 'linear-gradient(135deg, #05424A 0%, #032b30 100%)',
            borderRadius: 20,
            padding: '36px 28px',
            color: '#ffffff',
            textAlign: 'center',
            boxShadow: '0 12px 32px rgba(5,66,74,0.2)',
          }}
        >
          <Sparkles size={28} style={{ color: '#fef08a', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
            Ready for Your Transformation?
          </h3>
          <p
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 14,
              maxWidth: 480,
              margin: '0 auto 24px',
              lineHeight: 1.6,
            }}
          >
            Visit Shree Beauty Studio in Katargam, Surat or book an appointment online for customized consultations with our certified team.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href="/book"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#fef08a',
                color: '#053320',
                padding: '12px 24px',
                borderRadius: 12,
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              <Calendar size={16} />
              <span>Book Appointment Online</span>
            </Link>
            <a
              href="https://wa.me/919773240010?text=Hi%20Shree%20Beauty%20Studio!%20I%20read%20your%20blog%20post%20and%20would%20like%20to%20consult."
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#25D366',
                color: '#053320',
                padding: '12px 20px',
                borderRadius: 12,
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              <MessageCircle size={16} />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>

        {/* ─── RELATED POSTS ──────────────────────────────────────── */}
        {relatedPosts && relatedPosts.length > 0 && (
          <div style={{ marginTop: 64 }}>
            <h3
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#0f172a',
                marginBottom: 24,
              }}
            >
              More Related Beauty Guides
            </h3>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 20,
              }}
            >
              {relatedPosts.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  style={{
                    background: '#ffffff',
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    flex: '0 1 280px',
                    maxWidth: 320,
                    minWidth: 240,
                    width: '100%',
                  }}
                >
                  <img
                    src={r.image}
                    alt={r.title}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80&auto=format&fit=crop';
                    }}
                    style={{ width: '100%', height: 130, objectFit: 'cover' }}
                  />
                  <div style={{ padding: '16px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#05424A', marginBottom: 6 }}>
                      {r.category}
                    </span>
                    <h4
                      style={{
                        fontSize: 14.5,
                        fontWeight: 700,
                        color: '#0f172a',
                        lineHeight: 1.4,
                        margin: 0,
                        flex: 1,
                      }}
                    >
                      {r.title}
                    </h4>
                    <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>
                      {r.readTime}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
