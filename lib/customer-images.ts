// lib/customer-images.ts
// Curated, high-resolution imagery for Shree Beauty Studio customer showcase

export const customerImages = {
  hero: {
    main: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=85&auto=format&fit=crop',
    mobile: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=85&auto=format&fit=crop',
    overlay: 'linear-gradient(135deg, rgba(3,43,48,0.92) 0%, rgba(5,66,74,0.82) 50%, rgba(10,14,17,0.88) 100%)',
  },
  categories: {
    'Hair': 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&q=80&auto=format&fit=crop',
    'Hair Care & Styling': 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&q=80&auto=format&fit=crop',
    'Skin': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80&auto=format&fit=crop',
    'Skin Care & Facials': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80&auto=format&fit=crop',
    'Waxing': 'https://images.unsplash.com/photo-1512290900672-1f02a76f2f9c?w=800&q=80&auto=format&fit=crop',
    'Waxing & Threading': 'https://images.unsplash.com/photo-1512290900672-1f02a76f2f9c?w=800&q=80&auto=format&fit=crop',
    'Nail': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80&auto=format&fit=crop',
    'Hands, Feet & Nails': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80&auto=format&fit=crop',
    'Bridal': 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80&auto=format&fit=crop',
    'Makeup & Bridal': 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80&auto=format&fit=crop',
    'Wellness': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80&auto=format&fit=crop',
    'Body Spa & Bleach': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80&auto=format&fit=crop',
  } as Record<string, string>,
  fallback: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80&auto=format&fit=crop',
  bridal: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=85&auto=format&fit=crop',
  bridalHero: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=85&auto=format&fit=crop',
  bridalBanner: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1400&q=85&auto=format&fit=crop',
  about: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&q=85&auto=format&fit=crop',
  aboutStudio: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&q=85&auto=format&fit=crop',
  salonInterior: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=85&auto=format&fit=crop',

  // Curated staff portraits
  staffPortraits: [
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80&auto=format&fit=crop',
  ],

  // Verified client review avatars
  clientAvatars: [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80&auto=format&fit=crop',
  ],
};

export function getCategoryImage(category: string): string {
  if (!category) return customerImages.fallback;
  const match = Object.keys(customerImages.categories).find(
    (k) => category.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(category.toLowerCase())
  );
  return match ? customerImages.categories[match] : customerImages.fallback;
}

export const categoryIcons: Record<string, string> = {
  'Hair Care & Styling': '💇‍♀️',
  'Hair': '💇‍♀️',
  'Skin Care & Facials': '✨',
  'Skin': '✨',
  'Waxing & Threading': '🌿',
  'Waxing': '🌿',
  'Hands, Feet & Nails': '💅',
  'Nails': '💅',
  'Nail': '💅',
  'Makeup & Bridal': '👰',
  'Bridal': '👰',
  'Body Spa & Bleach': '🧖‍♀️',
  'Wellness': '🧖‍♀️',
  'Other Treatments': '💆‍♀️',
};

export function getCategoryIcon(category: string): string {
  if (!category) return '💫';
  const match = Object.keys(categoryIcons).find(
    (k) => category.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(category.toLowerCase())
  );
  return match ? categoryIcons[match] : '💫';
}

export function getServiceImage(serviceName: string, category?: string): string {
  const name = (serviceName || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  if (name.includes('hair') || name.includes('cut') || name.includes('spa') || name.includes('keratin') || name.includes('color') || cat.includes('hair')) {
    return 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&q=80&auto=format&fit=crop';
  }
  if (name.includes('facial') || name.includes('skin') || name.includes('glow') || name.includes('clean') || name.includes('d-tan') || cat.includes('skin')) {
    return 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80&auto=format&fit=crop';
  }
  if (name.includes('nail') || name.includes('manicure') || name.includes('pedicure') || name.includes('gel') || cat.includes('nail') || cat.includes('feet')) {
    return 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80&auto=format&fit=crop';
  }
  if (name.includes('bridal') || name.includes('siders') || name.includes('makeup') || name.includes('reception') || cat.includes('bridal') || cat.includes('makeup')) {
    return 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80&auto=format&fit=crop';
  }
  if (name.includes('wax') || name.includes('thread') || cat.includes('waxing')) {
    return 'https://images.unsplash.com/photo-1512290900672-1f02a76f2f9c?w=600&q=80&auto=format&fit=crop';
  }
  if (name.includes('massage') || name.includes('bleach') || name.includes('body') || cat.includes('spa')) {
    return 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80&auto=format&fit=crop';
  }

  return customerImages.fallback;
}
