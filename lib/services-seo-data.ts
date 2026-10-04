export interface ServiceSeoData {
  slug: string;
  serviceName: string;
  targetKeyword: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  heroBadge: string;
  headline: string;
  subheadline: string;
  quickAnswer: string;
  priceStarting: string;
  priceCurrency: string;
  duration: string;
  rating: string;
  heroImage: string;
  category: string;
  bookServiceName: string;
  idealFor: string;
  brandsUsed: string[];
  climateAdvice: {
    title: string;
    description: string;
  };
  benefits: {
    title: string;
    description: string;
  }[];
  processSteps: {
    step: number;
    title: string;
    description: string;
  }[];
  pricingOptions: {
    name: string;
    price: string;
    description: string;
    highlights: string[];
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
}

export const SERVICES_SEO_DATA: Record<string, ServiceSeoData> = {
  'bridal-makeup-surat': {
    slug: 'bridal-makeup-surat',
    serviceName: 'Bridal Makeup in Surat',
    targetKeyword: 'best bridal makeup surat',
    metaTitle: 'Best Bridal Makeup in Surat — HD & Airbrush Bridal Studio | Shree Beauty Studio',
    metaDescription:
      'Looking for the best bridal makeup in Surat? Shree Beauty Studio offers couture HD, 4K & Airbrush bridal makeovers in Katargam. 5,000+ brides served, 25+ years experience, 100% genuine MAC, Huda & Dior.',
    keywords: [
      'best bridal makeup surat',
      'bridal makeup artist surat',
      'bridal studio surat',
      'bridal makeup katargam',
      'bridal parlour surat',
      'hd bridal makeup surat',
      'airbrush bridal makeup surat',
      'gujarati bridal makeup surat',
      'wedding makeup artist surat',
      'bridal package price surat',
    ],
    heroBadge: 'Katargam, Surat · 5,000+ Brides Styled',
    headline: 'Best Bridal Makeup & Luxury Bridal Studio in Surat',
    subheadline:
      'Surat’s premier 100% ladies-only bridal sanctuary. Specializing in sweat-resistant HD, 4K & Airbrush bridal makeovers, authentic Gujarati Panetar & Gharchola draping, and customized pre-bridal preparation.',
    quickAnswer:
      'The best bridal makeup in Surat is offered by Shree Beauty Studio at Katargam, boasting 25+ years of bridal heritage and over 5,000 satisfied brides. We use 100% genuine luxury cosmetics (MAC, Huda Beauty, Dior, NARS) with sweat-proof HD and Airbrush formulas engineered specifically for Gujarat’s warm wedding climate.',
    priceStarting: '₹15,000',
    priceCurrency: 'INR',
    duration: '3.5 - 5 Hours',
    rating: '4.9★ (210+ Google Reviews)',
    heroImage: '/studio-photos/0U3A2566.webp',
    category: 'Bridal Makeover',
    bookServiceName: 'MAC & Forever52 Bridal Package (3 Sessions)',
    idealFor: 'Gujarati brides, NRI weddings, engagement ceremonies, sangeet, and royal wedding receptions',
    brandsUsed: ['MAC Cosmetics', 'Huda Beauty', 'Dior Backstage', 'NARS', 'Charlotte Tilbury', 'Bobbi Brown', 'PAC Professional'],
    climateAdvice: {
      title: 'Surat Coastal Humidity & Lighting Defense',
      description:
        'Surat wedding venues often face high ambient humidity and intense banquet photography flash. Our senior bridal artists apply medical-grade sebum primers and micro-fine fixing mist to ensure your foundation stays luminous, 100% sweat-proof, and crease-free for over 16 continuous hours.',
    },
    benefits: [
      {
        title: '16+ Hour Sweat & Tear Resistance',
        description: 'Advanced waterproof micro-setting lock ensures tears during Vidaai and pheras will not smudge your flawless base.',
      },
      {
        title: '100% Authentic Luxury Formulations',
        description: 'Every primer, pigment, and lipstick is unsealed in front of you from authorized luxury brand distributors.',
      },
      {
        title: 'Traditional Panetar & Dupatta Draping',
        description: 'Master Gujarati styling including authentic pleating, heavy head-dupatta safety pinning, and heritage jewellery setting.',
      },
      {
        title: 'Private VIP Bridal Suite',
        description: 'Enjoy complete privacy in our dedicated bridal suite with vanity lighting, trial mirrors, and air-conditioned tranquility.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'In-Depth Consultation & Skin Diagnosis',
        description: 'We assess your lehenga shades, wedding jewellery weight, skin undertone, and venue lighting conditions.',
      },
      {
        step: 2,
        title: 'Pre-Makeover Skin Prep & Hydration',
        description: 'Deep ultrasonic pore cleansing, thermal spring water hydration, and pore-smoothing primer application.',
      },
      {
        step: 3,
        title: 'HD / Airbrush Base Application',
        description: 'Custom pigment blending to match your natural neckline and collarbone with zero flashback or heavy cake effect.',
      },
      {
        step: 4,
        title: 'Couture Eye Artistry & Lash Enhancement',
        description: 'Smudge-proof cut crease or soft glam look with waterproof eyeliner and hand-tied luxury 3D mink eyelashes.',
      },
      {
        step: 5,
        title: 'Hairstyling, Jewellery Setting & Draping',
        description: 'Intricate bridal braids, floral bun arrangements, maang tikka anchoring, and heavy dupatta pinning.',
      },
    ],
    pricingOptions: [
      {
        name: 'Royal HD Bridal Makeover (Single Event)',
        price: '₹15,000',
        description: 'Full HD bridal makeup for wedding ceremony or grand reception with premium hair styling and draping.',
        highlights: ['HD Base with MAC & Forever52', 'Luxury 3D Eyelashes & Lenses', 'Couture Bridal Hairstyle', 'Dupatta & Jewellery Pinning'],
      },
      {
        name: 'Signature Huda Beauty & Bobbi Brown (3 Sessions)',
        price: '₹40,200',
        description: 'Complete 3-event bridal suite covering Mandap Muhurat, Sangeet/Engagement, and the Wedding day.',
        highlights: ['3 Full Bridal Transformations', 'Huda Beauty & Bobbi Brown kit', 'Fresh Flower Hair Setting', 'Free Pre-Bridal Consultation'],
      },
      {
        name: 'Ultra-Luxury Dior & Charlotte Tilbury Couture (3 Sessions)',
        price: '₹80,200',
        description: 'The pinnacle of luxury bridal styling with imported Dior, NARS, and Charlotte Tilbury cosmetics.',
        highlights: ['Airbrush & 4K Flawless Base', 'Senior Master Artist 1-on-1', 'Full Body Shimmer & Radiance Glow', 'VIP Dressing Suite Access'],
      },
    ],
    faqs: [
      {
        question: 'What is the cost of bridal makeup in Surat at Shree Beauty Studio?',
        answer:
          'Bridal makeup packages at Shree Beauty Studio Katargam start from ₹15,000 for a single-event Royal HD makeover. Comprehensive 3-session packages (Mandap Muhurat, Sangeet, Wedding) start from ₹25,300 up to ₹80,200 depending on cosmetic brands chosen (MAC, Huda Beauty, or Dior).',
      },
      {
        question: 'How far in advance should I book my bridal makeup in Surat?',
        answer:
          'We recommend reserving your dates 3 to 6 months in advance, especially during the peak Gujarat wedding season (November to February and May). This guarantees your preferred senior artist and VIP dressing slot.',
      },
      {
        question: 'Do you offer bridal makeup trials before the wedding?',
        answer:
          'Yes, we provide paid trial sessions where we test foundation shades under camera lighting, evaluate eye makeup styles, and discuss hair accessories to ensure 100% peace of mind on your wedding day.',
      },
      {
        question: 'Do you provide on-venue bridal makeup services outside Katargam?',
        answer:
          'Yes. While many brides prefer our quiet, fully air-conditioned VIP suite at Radhika Society, Katargam, our bridal artist team travels to wedding venues, five-star banquet halls, and destination resorts across Surat, Navsari, Bardoli, and Vadodara.',
      },
      {
        question: 'Will my bridal makeup melt in Surat’s humid weather?',
        answer:
          'Not at all. We specifically use humidity-resistant setting polymers and waterproof sealants engineered to withstand Surat’s coastal climate, intense wedding lights, and tears without cracking or fading.',
      },
    ],
  },

  'keratin-treatment-surat': {
    slug: 'keratin-treatment-surat',
    serviceName: 'Keratin Treatment in Surat',
    targetKeyword: 'keratin treatment surat',
    metaTitle: 'Keratin Treatment in Surat — Frizz-Free Smoothing | Shree Beauty Studio Katargam',
    metaDescription:
      'Best keratin treatment in Surat for smooth, shiny, manageable hair. Formaldehyde-safe formulas tailored for Tapi water damage. Starting from ₹3,000. Book ladies-only salon appointment.',
    keywords: [
      'keratin treatment surat',
      'best keratin treatment in surat',
      'keratin treatment price surat',
      'keratin hair smoothing katargam',
      'hair smoothening surat',
      'frizz free hair treatment surat',
      'keratin treatment near me surat',
      'ladies salon keratin surat',
    ],
    heroBadge: 'Hair Science · Katargam, Surat',
    headline: 'Advanced Keratin Hair Smoothing Treatment in Surat',
    subheadline:
      'Eliminate frizz, restore damaged cuticles, and achieve silky, mirror-shine hair. Specifically formulated to reverse humidity frizz and Tapi river hard-water mineral buildup.',
    quickAnswer:
      'Keratin treatment in Surat at Shree Beauty Studio infuses active hydrolysed keratin proteins deep into the hair cortex, sealing split cuticles and eliminating up to 95% of frizz. Results last 3 to 5 months with proper sulfate-free aftercare, starting from ₹3,000 depending on hair length and volume.',
    priceStarting: '₹3,000',
    priceCurrency: 'INR',
    duration: '2.5 - 4 Hours',
    rating: '4.9★ (180+ Hair Clients)',
    heroImage: '/services/keratin_smooth.webp',
    category: 'Hair Treatments',
    bookServiceName: 'Keratin Smooth Treatment',
    idealFor: 'Frizzy, wavy, chemical-treated, and unmanageable hair suffering from Gujarat heat and humidity',
    brandsUsed: ['L’Oréal Professionnel X-Tenso', 'Cadiveu Brasil Cacau', 'GK Hair Global Keratin', 'Amazon Keratin'],
    climateAdvice: {
      title: 'Tapi River Hard Water Protection',
      description:
        'Municipal and borewell tap water in Surat contains elevated calcium and magnesium TDS that strips natural sebum and makes cuticles flare open. Our keratin treatment creates an impermeable protein barrier that protects your hair shafts from hard-water minerals every time you shower.',
    },
    benefits: [
      {
        title: 'Up to 95% Frizz Reduction',
        description: 'Tames stubborn flyaways and transforms wild curls into manageable, naturally smooth strands.',
      },
      {
        title: 'Deep Cuticle Restoration',
        description: 'Fills structural protein voids caused by bleach, sun exposure, and repetitive heat styling.',
      },
      {
        title: 'Cuts Daily Styling Time by Half',
        description: 'Hair dries faster and falls naturally straight with gentle blow drying without requiring daily flat irons.',
      },
      {
        title: 'Lasts 3 to 5 Months',
        description: 'Long-lasting salon results with our prescribed post-treatment sulfate-free shampoo protocols.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Clarifying Deep Detox Cleansing',
        description: 'Double wash with alkaline clarifying shampoo to strip product residues and open hair cuticles.',
      },
      {
        step: 2,
        title: 'Keratin Formula Infusion',
        description: 'Section-by-section application of premium hydrolysed keratin lotion from root to tip.',
      },
      {
        step: 3,
        title: 'Thermal Activation & Blowout',
        description: 'Gentle warm blowout ensuring even distribution of the protein complex throughout the hair.',
      },
      {
        step: 4,
        title: 'Precision Nano-Titanium Sealing',
        description: 'Micro-ironing at temperature calibrated to your specific hair thickness to lock proteins into the cortex.',
      },
    ],
    pricingOptions: [
      {
        name: 'Keratin Smoothing — Short / Shoulder Length',
        price: '₹3,000',
        description: 'Targeted smoothing for bob to shoulder-length hair.',
        highlights: ['Full Clarifying Wash', 'Pure Keratin Infusion', 'Precision Thermal Lock', 'Post-Care Advisory'],
      },
      {
        name: 'Keratin Smoothing — Mid-Back Length',
        price: '₹4,500',
        description: 'Our most popular service for medium to long hair.',
        highlights: ['Deep Cuticle Repair', 'Complete Frizz Defense', 'Silky Gloss Finish', 'Includes Free Hair Diagnosis'],
      },
      {
        name: 'Keratin Smoothing — Extra Long / Thick Volume',
        price: '₹6,000',
        description: 'Comprehensive treatment for thick, coarse, waist-length locks.',
        highlights: ['Extra Protein Serum', 'Dual-Artist Thermal Pass', 'Mirror-Shine Gloss', 'Complimentary Scalp Consultation'],
      },
    ],
    faqs: [
      {
        question: 'How much does keratin treatment cost in Surat?',
        answer:
          'At Shree Beauty Studio Katargam, keratin treatment starts from ₹3,000 for shoulder-length hair, ₹4,500 for mid-back hair, and ₹6,000 for waist-length or extra-thick hair. All rates are transparent with no surprise charges.',
      },
      {
        question: 'What is the difference between Keratin and Rebonding?',
        answer:
          'Rebonding permanently breaks hair disulfide bonds with harsh chemicals to make it pin-straight, which can lead to brittle breakage. Keratin is a restorative protein treatment that smooths frizz, softens curls, and retains natural bounce without structural damage.',
      },
      {
        question: 'How long does a keratin treatment last?',
        answer:
          'Keratin treatments last between 3 to 5 months depending on how frequently you wash your hair and whether you use sulfate-free, paraben-free shampoo and conditioner.',
      },
      {
        question: 'Can I color my hair after a keratin treatment?',
        answer:
          'We recommend waiting 2 to 3 weeks after keratin before applying global color or highlights, or coloring your hair immediately before the keratin treatment session for optimal pigment lock.',
      },
    ],
  },

  'nanoplastia-surat': {
    slug: 'nanoplastia-surat',
    serviceName: 'Nanoplastia Treatment in Surat',
    targetKeyword: 'nanoplastia treatment surat',
    metaTitle: 'Nanoplastia Treatment in Surat — Formaldehyde-Free Organic Straightening | Shree Beauty Studio',
    metaDescription:
      'Experience organic Nanoplastia in Surat at Shree Beauty Studio Katargam. 100% formaldehyde-free, zero harsh fumes, mirror-gloss straight hair lasting 6-8 months. Book online.',
    keywords: [
      'nanoplastia treatment surat',
      'best nanoplastia salon surat',
      'nanoplastia price surat',
      'organic hair straightening surat',
      'formaldehyde free hair smoothing surat',
      'nanoplastia katargam surat',
      'nanoplastia vs keratin surat',
      'hair straightening ladies parlour surat',
    ],
    heroBadge: 'Organic Hair Revolution · 100% Formaldehyde-Free',
    headline: 'Nanoplastia Hair Straightening & Restoration in Surat',
    subheadline:
      'The safest, most advanced organic hair straightening therapy in South Gujarat. Zero toxic formaldehyde fumes, safe for sensitive scalps, delivering glass-like sleek hair for 6 to 8 months.',
    quickAnswer:
      'Nanoplastia is an innovative organic hair treatment utilizing nano-molecular amino acids, collagen, and plant oils that penetrate deep into the hair fibre without formaldehyde or harsh chemicals. In Surat at Shree Beauty Studio, Nanoplastia provides 80–90% natural straightening and mirror-gloss shine lasting up to 8 months, starting from ₹4,500.',
    priceStarting: '₹4,500',
    priceCurrency: 'INR',
    duration: '3.5 - 5 Hours',
    rating: '4.9★ (140+ Happy Clients)',
    heroImage: '/services/keratin_smooth.webp',
    category: 'Hair Treatments',
    bookServiceName: 'Nanoplastia Hair Smoothing',
    idealFor: 'Women seeking long-lasting straight hair without chemical damage, formaldehyde tears, or brittle regrowth',
    brandsUsed: ['Floractive Nanoplastia (Original)', 'Wone Nanoplastia', 'Nature Eva Organic', 'W-Two Plex Organic'],
    climateAdvice: {
      title: 'Permanent Humidity Shield for Gujarat Weather',
      description:
        'Unlike traditional surface coats, Nanoplastia rebuilds hair from within at the cellular level. When high humidity hits Surat during monsoons and coastal summers, your hair stays pin-straight, silky, and reflective without swelling into a frizzy cloud.',
    },
    benefits: [
      {
        title: 'Zero Formaldehyde & Zero Fumes',
        description: 'No burning eyes, no coughing, and no toxic chemical odors during the entire styling process.',
      },
      {
        title: 'Natural Straightening with High Gloss',
        description: 'Achieves 80% to 90% straightness while retaining touchable silkiness and natural fluid movement.',
      },
      {
        title: 'Extended Longevity: 6 to 8 Months',
        description: 'Lasts significantly longer than standard keratin treatments, requiring fewer salon touch-ups per year.',
      },
      {
        title: 'Safe for Colored & Bleached Hair',
        description: 'Plant-based amino acids nourish colored strands rather than stripping or discoloring hair pigments.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Hair Integrity Assessment',
        description: 'Microscopic hair porosity check to calibrate processing time and thermal iron settings.',
      },
      {
        step: 2,
        title: 'Organic Nano-Amino Acid Application',
        description: 'Saturating hair strands with organic acids, collagen, keratin, and argan oil complexes.',
      },
      {
        step: 3,
        title: 'Molecular Penetration Dwell (60-90 Mins)',
        description: 'Allowing nano-sized molecules to penetrate the inner cortex under climate-controlled heat.',
      },
      {
        step: 4,
        title: 'Partial Rinse & Nano-Iron Sealing',
        description: 'Rinsing excess surface product and sealing strands with multi-pass titanium plates at 210°C-230°C.',
      },
      {
        step: 5,
        title: 'Immediate Neutralizing Mask & Wash',
        description: 'You see the final, wet-to-dry result immediately in the salon with zero 3-day waiting rule!',
      },
    ],
    pricingOptions: [
      {
        name: 'Nanoplastia Organic — Shoulder Length',
        price: '₹4,500',
        description: 'Gentle organic straightening for short to shoulder hair.',
        highlights: ['100% Formaldehyde-Free', 'Zero Downtime Wash Same Day', 'Includes Deep Mask Therapy', 'Safe for Sensitive Scalps'],
      },
      {
        name: 'Nanoplastia Organic — Mid-Back Length',
        price: '₹6,000',
        description: 'Ideal for medium hair with stubborn curl and high frizz.',
        highlights: ['8-Month Straightness Longevity', 'Mirror-Reflective Shine', 'Sulfate-Free Care Regimen Guide', 'Premium Floractive Kit'],
      },
      {
        name: 'Nanoplastia Organic — Waist Length / Thick Density',
        price: '₹7,500',
        description: 'Intensive restorative straightening for very thick or long locks.',
        highlights: ['Complete Transformation', 'Dual Specialist Precision Work', 'Ultra-Deep Cellular Repair', 'Free 30-Day Follow-Up Check'],
      },
    ],
    faqs: [
      {
        question: 'What is the cost of Nanoplastia in Surat?',
        answer:
          'Nanoplastia treatment at Shree Beauty Studio in Katargam, Surat starts at ₹4,500 for shoulder-length hair, ₹6,000 for mid-back hair, and ₹7,500 for waist-length hair. All products used are 100% genuine imported organic formulations.',
      },
      {
        question: 'How is Nanoplastia different from Keratin treatment?',
        answer:
          'Keratin acts primarily as a surface conditioning coat lasting 3–4 months and some formulas contain aldehyde derivatives. Nanoplastia is 100% organic, works deep inside the cortex, straightens hair more effectively, and lasts 6 to 8 months without any harsh fumes.',
      },
      {
        question: 'Can I wash my hair on the same day after Nanoplastia?',
        answer:
          'Yes! Unlike traditional rebonding or older keratin treatments where you cannot wash hair for 72 hours, Nanoplastia is washed and mask-treated on the same day in our salon before you leave.',
      },
      {
        question: 'Is Nanoplastia safe for pregnant or breastfeeding women?',
        answer:
          'Because our Nanoplastia formulas are completely organic and free of formaldehyde, carbocysteine, and parabens, it is substantially safer than chemical straighteners. However, we always recommend consulting your personal physician first.',
      },
    ],
  },

  'hair-botox-surat': {
    slug: 'hair-botox-surat',
    serviceName: 'Hair Botox in Surat',
    targetKeyword: 'hair botox surat',
    metaTitle: 'Hair Botox Treatment in Surat — Deep Repair & Anti-Aging | Shree Beauty Studio',
    metaDescription:
      'Restore dull, damaged, thinning hair with Hair Botox in Surat at Shree Beauty Studio Katargam. Deep caviar, collagen & keratin hydration from ₹3,500. Book ladies-only salon appointment.',
    keywords: [
      'hair botox surat',
      'hair botox treatment surat',
      'hair botox price surat',
      'best hair botox salon in surat',
      'hair botox katargam',
      'anti aging hair treatment surat',
      'damaged hair repair surat',
      'hair botox cost in gujarat',
    ],
    heroBadge: 'Restorative Hair Therapy · Katargam, Surat',
    headline: 'Deep Restorative Hair Botox Treatment in Surat',
    subheadline:
      'The ultimate anti-aging facial for your hair. Fills hollow fibers with collagen, hyaluronic acid, caviar oil, and keratin to revitalize thinning, over-processed, and heat-damaged locks.',
    quickAnswer:
      'Hair Botox in Surat at Shree Beauty Studio is a deep conditioning treatment that does not use botulinum toxin, but acts like Botox by plumping individual hair shafts. It fills cortical gaps with collagen, vitamins B5 and E, and amino acids, reversing years of heat and chemical damage for 2 to 4 months, starting from ₹3,500.',
    priceStarting: '₹3,500',
    priceCurrency: 'INR',
    duration: '2 - 3.5 Hours',
    rating: '4.9★ (195+ Verified Reviews)',
    heroImage: '/services/hair_rebonding.webp',
    category: 'Hair Treatments',
    bookServiceName: 'Hair Botox Treatment',
    idealFor: 'Chemically bleached, brittle, split-ended, dry, postpartum, and mature thinning hair',
    brandsUsed: ['Majestic Hair Botox', 'Prismax Nutritive Botox', 'L’Oréal Professionnel Absolut Molecular', 'Inoar BotoHair'],
    climateAdvice: {
      title: 'Counteracting Surat’s Sun & High TDS Water',
      description:
        'Frequent exposure to Surat’s harsh UV rays combined with hard tap water depletes natural lipids, leaving hair dry like straw. Hair Botox re-injects microscopic lipid cushions that seal moisture inside the hair shaft, restoring natural bounce and silkiness.',
    },
    benefits: [
      {
        title: 'Restores Elasticity & Tensile Strength',
        description: 'Rebuilds broken protein bonds, drastically reducing breakage while brushing and styling.',
      },
      {
        title: 'Preserves Natural Curls & Waves',
        description: 'Unlike chemical straighteners, Hair Botox does not change your hair pattern—it just makes curls bouncy, soft, and frizz-free.',
      },
      {
        title: 'Intense Mirror Gloss Shine',
        description: 'Smooths the cuticle scales so light reflects evenly across your entire hair length.',
      },
      {
        title: 'Hydrates Dry Scalp & Split Ends',
        description: 'Infuses deep moisture, visibly eliminating frayed split ends and coarse straw-like texture.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Detoxifying Scalp & Hair Bath',
        description: 'Purifying wash to remove silicones, pollution particles, and hard-water deposits.',
      },
      {
        step: 2,
        title: 'Botox Nutrient Cocktail Application',
        description: 'Hand-massaging collagen, caviar oil, and hyaluronic acid cocktail into every single strand.',
      },
      {
        step: 3,
        title: 'Infrared & Warm Mist Activation',
        description: 'Gentle warmth opens micro-pores, ensuring 100% absorption into the innermost hair fibers.',
      },
      {
        step: 4,
        title: 'Gentle Thermal Seal & Blowout',
        description: 'Moderate flat ironing seals the nourishing complex into the cuticle without damaging moisture.',
      },
    ],
    pricingOptions: [
      {
        name: 'Hair Botox — Shoulder Length',
        price: '₹3,500',
        description: 'Deep hydration for bob and shoulder-length damaged hair.',
        highlights: ['Collagen & Keratin Infusion', 'Deep Moisture Lock', 'Frizz Tamed without Flatness', 'Retains Natural Curls'],
      },
      {
        name: 'Hair Botox — Mid-Back Length',
        price: '₹4,800',
        description: 'Our standard restoration package for medium hair length.',
        highlights: ['Caviar Extract & Vitamin B5', 'Split End Repair', 'High Gloss Mirror Finish', 'Includes Scalp Massage'],
      },
      {
        name: 'Hair Botox — Waist Length / Chemically Damaged',
        price: '₹6,200',
        description: 'Intensive rehabilitation for heavily bleached or long hair.',
        highlights: ['Full Molecular Reconstruction', 'Dual Moisture Ampoule', 'Eliminates Straw-Like Texture', 'Personalized Homecare Plan'],
      },
    ],
    faqs: [
      {
        question: 'Does Hair Botox in Surat contain actual Botox injections?',
        answer:
          'No! Hair Botox contains no needles or botulinum toxin. The name comes from how it "plumps" and smooths damaged hair fibers from within, similar to how cosmetic Botox smooths facial wrinkles.',
      },
      {
        question: 'Will Hair Botox make my hair completely straight?',
        answer:
          'Hair Botox is primarily a deep healing and anti-frizz treatment, not a chemical straightener. If you have natural curls or waves, it keeps them soft, defined, and frizz-free. If you want bone-straight hair, we recommend Nanoplastia or Keratin.',
      },
      {
        question: 'How much does Hair Botox cost in Katargam, Surat?',
        answer:
          'Hair Botox at Shree Beauty Studio starts at ₹3,500 for shoulder-length hair, ₹4,800 for mid-back hair, and ₹6,200 for waist-length hair.',
      },
      {
        question: 'How long do the results of Hair Botox last?',
        answer:
          'Results typically last between 2 to 4 months, depending on hair washing frequency and usage of sulfate-free shampoos.',
      },
    ],
  },

  'hydra-facial-surat': {
    slug: 'hydra-facial-surat',
    serviceName: 'Hydra Facial in Surat',
    targetKeyword: 'hydra facial surat',
    metaTitle: 'Hydra Facial in Surat — 7-Step Medical Glow Facial | Shree Beauty Studio Katargam',
    metaDescription:
      'Get instant celebrity glass skin with Hydra Facial in Surat at Shree Beauty Studio Katargam. 7-step vortex extraction, diamond dermabrasion & collagen infusion from ₹2,500. Book now.',
    keywords: [
      'hydra facial surat',
      'best hydra facial in surat',
      'hydra facial price surat',
      'hydra facial katargam surat',
      'medical facial surat',
      'glass skin facial surat',
      'hydrafacial cost in gujarat',
      'ladies parlour hydra facial surat',
    ],
    heroBadge: 'Aesthetic Skincare · 7-Step Vortex Glow',
    headline: 'Advanced 7-Step Hydra Facial Therapy in Surat',
    subheadline:
      'Experience clinical-grade exfoliation, painless blackhead vortex extraction, and concentrated antioxidant hydration. Instantly unclogs pores and delivers glowing, red-carpet glass skin with zero downtime.',
    quickAnswer:
      'Hydra Facial in Surat at Shree Beauty Studio is a 7-step medical-grade aesthetic treatment that combines vortex suction extraction, diamond microdermabrasion, salicylic peel, hyaluronic acid infusion, and cold hammer cryotherapy. It removes blackheads, clears pollution congestion, and hydrates skin, starting from ₹2,500.',
    priceStarting: '₹2,500',
    priceCurrency: 'INR',
    duration: '60 - 90 Minutes',
    rating: '4.9★ (230+ Facial Clients)',
    heroImage: '/services/diamond_facial.webp',
    category: 'Skincare & Facials',
    bookServiceName: 'Hydra Glow Facial',
    idealFor: 'Clogged pores, blackheads, dull sun-tanned skin, bridal radiance, and oily T-zone congestion',
    brandsUsed: ['Hydra Beauty MD Machine', 'O3+ Professional Derma', 'Casmara Spain Serums', 'Hyaluronic Acid 2% + B5 Ampoules'],
    climateAdvice: {
      title: 'Tackling Surat’s Dust & Humidity Pore Congestion',
      description:
        'Surat’s rapid urban expansion and coastal humidity cause sweat and airborne particulate matter (PM2.5) to mix with sebum, creating stubborn blackheads and enlarged pores. Hydra Facial’s patented vortex vacuum physically extracts deep-seated grime without abrasive squeezing or skin redness.',
    },
    benefits: [
      {
        title: 'Painless Blackhead & Whitehad Extraction',
        description: 'Vortex suction extracts trapped oil and sebum without painful manual squeezing or scarring.',
      },
      {
        title: 'Deep Multi-Layer Hydration',
        description: 'Pumps low-molecular hyaluronic acid, peptides, and antioxidants directly into dermal layers.',
      },
      {
        title: 'Zero Redness & Zero Downtime',
        description: 'Walk out with radiant, glowing glass skin ready for a wedding or party on the exact same evening.',
      },
      {
        title: 'Pore Tightening & Cryo-Soothing',
        description: 'Cryotherapy cold hammer shrinks enlarged pores and locks active nutrients deep inside.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Vortex Cleansing & Lymphatic Drainage',
        description: 'Gentle suction clears surface grime and stimulates facial blood circulation.',
      },
      {
        step: 2,
        title: 'Diamond Microdermabrasion Exfoliation',
        description: 'Removes dead keratinized skin cells, revealing fresh and even-textured epidermis.',
      },
      {
        step: 3,
        title: 'Mild Glycolic & Salicylic Acid Softener',
        description: 'Loosens stubborn sebum plugs inside pores without irritating or drying out skin.',
      },
      {
        step: 4,
        title: 'Vortex Deep Extraction',
        description: 'High-power clinical vacuum vacuums out blackheads, whiteheads, and microscopic impurities.',
      },
      {
        step: 5,
        title: 'Oxygen Spray & Hyaluronic Infusion',
        description: 'Pressurized atomized oxygen delivers vitamin serums and moisture deep into skin tissues.',
      },
      {
        step: 6,
        title: 'Radio Frequency & Cryo Cold Hammer',
        description: 'RF stimulates natural collagen production while the cold hammer calms and closes pores.',
      },
      {
        step: 7,
        title: 'LED Phototherapy Mask Treatment',
        description: 'Red light stimulates cellular regeneration; blue light destroys acne-causing bacteria.',
      },
    ],
    pricingOptions: [
      {
        name: 'Express Hydra Glow (5 Steps)',
        price: '₹2,500',
        description: 'Fast pore detox and instant glow for working women and students.',
        highlights: ['Vortex Extraction', 'Dead Skin Exfoliation', 'Hyaluronic Moisture', 'Cryo Pore Tightening'],
      },
      {
        name: 'Clinical 7-Step Hydra Radiance',
        price: '₹3,500',
        description: 'Our signature complete medical facial for deep pore cleansing and brightness.',
        highlights: ['Diamond Dermabrasion', 'Oxygen Infusion', 'RF Collagen Stimulation', 'LED Phototherapy Mask'],
      },
      {
        name: 'Bridal Platinum Hydra Glass Skin with 24K Gold',
        price: '₹5,000',
        description: 'Ultimate red-carpet glow facial paired with 24K gold serum and neck & decollete care.',
        highlights: ['Full Face & Neck Care', '24K Colloidal Gold Serum', 'Intensive Eye Contour Therapy', 'Maximum Bridal Radiance'],
      },
    ],
    faqs: [
      {
        question: 'How much does a Hydra Facial cost in Surat?',
        answer:
          'At Shree Beauty Studio Katargam, our Express Hydra Facial is ₹2,500, the complete 7-step Clinical Hydra Radiance is ₹3,500, and the luxury Bridal Platinum Hydra with 24K Gold is ₹5,000.',
      },
      {
        question: 'Is Hydra Facial painful?',
        answer:
          'Not at all! Unlike traditional facials where blackheads are extracted using metal loops that pinch and scar the skin, Hydra Facial uses gentle vortex liquid suction that feels like a cool, relaxing paintbrush on your face.',
      },
      {
        question: 'Can I do a Hydra Facial before my wedding in Surat?',
        answer:
          'Yes, it is one of the best pre-bridal facials because there is zero downtime or peeling. We recommend doing it 3 to 4 days prior to your wedding ceremony for peak glass-skin radiance.',
      },
      {
        question: 'How often should I get a Hydra Facial?',
        answer:
          'For ongoing pore health and anti-pollution defense in Surat, getting a session once every 4 to 6 weeks maintains luminous, clear, and youthful skin.',
      },
    ],
  },

  'rica-wax-surat': {
    slug: 'rica-wax-surat',
    serviceName: 'Rica Waxing in Surat',
    targetKeyword: 'painless waxing surat rica wax',
    metaTitle: 'Rica Waxing in Surat — Painless Italian Wax & Tan Removal | Shree Beauty Studio',
    metaDescription:
      '100% colophony-free Italian Rica Wax in Surat at Shree Beauty Studio Katargam. Gentle on sensitive skin, removes stubborn tan with 80% less pain. Full arms, legs & body packages.',
    keywords: [
      'painless waxing surat rica wax',
      'rica wax surat',
      'best waxing salon in surat',
      'rica waxing price surat',
      'ladies parlour waxing katargam',
      'painless body wax surat',
      'full body rica wax surat',
      'bikini wax ladies salon surat',
    ],
    heroBadge: 'Gentle Hair Removal · Italian Liposoluble Formula',
    headline: 'Gentle & Painless Italian Rica Waxing in Surat',
    subheadline:
      'Surat’s most hygienic and gentle hair removal experience in a 100% ladies-only sanctuary. 100% Colophony-free Italian liposoluble Rica wax that removes tan, prevents ingrown hairs, and causes zero skin peeling.',
    quickAnswer:
      'Rica Waxing in Surat at Shree Beauty Studio utilizes authentic Italian liposoluble wax made from vegetable oils and glyceryl rosinate. It is 100% free of colophony (the chemical in regular honey wax that causes redness and allergies), gripping only the hair and never pulling the skin, reducing pain by up to 80% with built-in tan removal.',
    priceStarting: '₹350',
    priceCurrency: 'INR',
    duration: '30 - 75 Minutes',
    rating: '4.9★ (260+ Happy Women)',
    heroImage: '/services/waxing_arms.webp',
    category: 'Waxing & Body Care',
    bookServiceName: 'Full Arms + Underarms Rica Wax',
    idealFor: 'Sensitive skin, brides, dark underarms, ingrown hair concerns, and women prone to waxing bumps',
    brandsUsed: ['Rica Italy White Chocolate', 'Rica Brazilian Avocado Wax', 'Rica Chlorophyll Wax', 'Rica Argan Oil Pre & Post Lotions'],
    climateAdvice: {
      title: 'Post-Waxing Comfort in Surat’s Warm Climate',
      description:
        'Normal sugar or honey wax melts quickly in Gujarat’s humid heat, causing sticky skin irritation and folliculitis. Italian Rica wax uses a liposoluble oil base that remains stable, conditions the skin barrier, and is cleaned with soothing post-wax avocado oils rather than harsh water rubbing.',
    },
    benefits: [
      {
        title: '80% Less Pain than Honey Wax',
        description: 'Adheres specifically to hair follicles rather than the epidermis, preventing skin burns and surface tears.',
      },
      {
        title: 'Built-In Tan Removal & Brightening',
        description: 'Gently exfoliates dead skin cells, visibly brightening sun-exposed arms, legs, and underarms.',
      },
      {
        title: 'Zero Redness & Bumps',
        description: 'Enriched with zinc oxide and natural fruit oils that calm inflammation immediately upon application.',
      },
      {
        title: 'Longer Hair-Free Weeks',
        description: 'Removes hair from the root bulb, delaying regrowth for 4 to 6 weeks with finer, softer hair texture.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Pre-Wax Cleansing & Cotton Gel Prep',
        description: 'Sanitizing the skin with Rica pre-wax gel to remove excess sweat, oils, and bacteria.',
      },
      {
        step: 2,
        title: 'Temperature-Controlled Application',
        description: 'Gentle warm application with single-use wooden spatulas to ensure absolute hygiene.',
      },
      {
        step: 3,
        title: 'Rapid Strip Lift Technique',
        description: 'Our experienced therapists use quick, specialized counter-pressure pull movements for minimal sensation.',
      },
      {
        step: 4,
        title: 'Soothing Avocado Post-Wax Emulsion',
        description: 'Nourishing oil massage that dissolves wax traces, calms pores, and leaves skin baby-soft.',
      },
    ],
    pricingOptions: [
      {
        name: 'Full Arms + Underarms Rica Wax',
        price: '₹550',
        description: 'Complete arm waxing with gentle underarm tan-clearing care.',
        highlights: ['Rica White Chocolate Wax', 'Painless Underarm Pull', 'D-Tan Effect', 'Soothing Post-Oil'],
      },
      {
        name: 'Full Legs Rica Wax',
        price: '₹750',
        description: 'Silky smooth legs from toes to thighs with zero strawberry skin.',
        highlights: ['Exfoliating Tan Removal', 'Prevents Ingrown Hairs', 'Gentle on Sensitive Knees', 'Soft Silk Finish'],
      },
      {
        name: 'Full Body Luxury Rica Wax Package',
        price: '₹2,200',
        description: 'Full arms, underarms, full legs, stomach, back, and neck in private suites.',
        highlights: ['Complete Head-to-Toe Silkiness', 'Private Air-Conditioned Suite', 'Single-Use Disposables', 'Includes Full Tan Detox'],
      },
    ],
    faqs: [
      {
        question: 'Why is Rica wax better than normal honey wax in Surat?',
        answer:
          'Honey wax contains colophony and sugar which stick aggressively to skin cells, often ripping the top skin layer and causing burns in warm weather. Rica is 100% liposoluble and colophony-free, sticking only to hair for significantly less pain, zero burns, and automatic tan removal.',
      },
      {
        question: 'Does Rica wax reduce hair growth over time?',
        answer:
          'Yes. Because Rica pulls the hair root cleanly from the dermal papilla without snapping mid-shaft, regular sessions weaken the follicle over time, resulting in noticeably thinner and slower hair regrowth.',
      },
      {
        question: 'Is waxing done in private rooms at Shree Beauty Studio?',
        answer:
          'Yes, 100%. We are an exclusive ladies-only salon with private, sanitized rooms, disposable sheets, single-use wooden spatulas, and female staff, guaranteeing total privacy and hygiene.',
      },
      {
        question: 'Can I get Rica wax done before my wedding or vacation?',
        answer:
          'We recommend getting your waxing done 2 to 3 days before any major wedding function or vacation to allow pores to close completely and skin to achieve optimal smoothness.',
      },
    ],
  },

  'hair-spa-surat': {
    slug: 'hair-spa-surat',
    serviceName: 'Hair Spa in Surat',
    targetKeyword: 'hair spa surat',
    metaTitle: 'Hair Spa in Surat — Deep Scalp Detox & Conditioning | Shree Beauty Studio Katargam',
    metaDescription:
      'Rejuvenate dull hair with luxury Hair Spa in Surat at Shree Beauty Studio Katargam. L’Oréal & Schwarzkopf deep conditioning, pressure-point scalp massage from ₹800. Book online.',
    keywords: [
      'hair spa surat',
      'best hair spa in surat',
      'hair spa price surat',
      'hair spa katargam',
      'dandruff hair spa surat',
      'loreal hair spa surat',
      'ladies hair spa parlour surat',
      'hair fall treatment salon surat',
    ],
    heroBadge: 'Scalp & Hair Wellness · Katargam, Surat',
    headline: 'Luxury Restorative Hair Spa & Scalp Detox in Surat',
    subheadline:
      'Escape into tranquility. Combining therapeutic Indian acupressure head massage, deep-penetrating micro-mist steam, and authentic L’Oréal hair spa formulations to treat dandruff, hair thinning, and stress.',
    quickAnswer:
      'Hair Spa in Surat at Shree Beauty Studio is a 5-stage therapeutic treatment featuring scalp detox, customized hair nourishment cream infusion, 20-minute rhythmic acupressure massage, ionic ozone steam, and cold-rinse cuticle sealing. Prices start from ₹800 for shoulder-length hair.',
    priceStarting: '₹800',
    priceCurrency: 'INR',
    duration: '60 - 90 Minutes',
    rating: '4.9★ (210+ Spa Clients)',
    heroImage: '/services/hair_spa_wash.webp',
    category: 'Hair Treatments',
    bookServiceName: 'Hair Spa Treatment',
    idealFor: 'Dry brittle hair, stress-induced hair fall, itchy dandruff scalp, and chemical-treated maintenance',
    brandsUsed: ['L’Oréal Professionnel Hair Spa', 'Schwarzkopf BC Bonacure', 'Matrix Biolage Deep Smoothing', 'Moroccanoil Restorative'],
    climateAdvice: {
      title: 'Countering Hard Water Dandruff & Hair Fall',
      description:
        'Hard water deposits mineral salts on the scalp in Surat, blocking hair follicles and suffocating roots. Our spa incorporates chelating detox agents and warm ozone mist that dissolve mineral crusted scalp pores, letting new hair breathe and flourish.',
    },
    benefits: [
      {
        title: 'Deep Stress & Migraine Relief',
        description: '20 minutes of authentic pressure-point champi massage relieves mental tension and insomnia.',
      },
      {
        title: 'Strengthens Roots & Controls Hair Fall',
        description: 'Stimulates micro-circulation in the scalp capillaries, sending oxygen directly to dormant follicles.',
      },
      {
        title: 'Eliminates Dry Scalp & Flakes',
        description: 'Anti-dandruff tea tree and zinc pyrithione ampoules clear flaky buildup and restore normal pH.',
      },
      {
        title: 'Restores Softness & Natural Bounce',
        description: 'Nourishes the hair shaft with natural lipids, eliminating static, roughness, and split ends.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Scalp Analysis & Tailored Wash',
        description: 'Diagnosing whether your scalp requires purifying, smoothing, or color-radiance care.',
      },
      {
        step: 2,
        title: 'Nourishing Spa Cream Application',
        description: 'Applying concentrated nutrient cream section by section, ensuring deep root-to-tip saturation.',
      },
      {
        step: 3,
        title: 'Therapeutic Champi Head Massage',
        description: '20 minutes of relaxing acupressure targeting neck, temples, and crown to stimulate hair follicles.',
      },
      {
        step: 4,
        title: 'Ionic Warm Micro-Mist Steaming',
        description: 'Gentle steam opens hair cuticles, allowing proteins to penetrate deep inside the cortex.',
      },
      {
        step: 5,
        title: 'Purified Water Rinse & Blowdry Finish',
        description: 'Cold-water rinse seals cuticles for maximum gloss, finished with a smooth blowout.',
      },
    ],
    pricingOptions: [
      {
        name: 'L’Oréal Deep Nourishing Spa',
        price: '₹800',
        description: 'Classic hydration for dry and unruly hair.',
        highlights: ['L’Oréal Water Lily Formula', 'Head & Neck Massage', 'Warm Micro-Steam', 'Silky Gloss Finish'],
      },
      {
        name: 'Anti-Dandruff & Scalp Detox Spa',
        price: '₹1,200',
        description: 'Targeted medical treatment for stubborn flakes and oily itchiness.',
        highlights: ['Tea Tree Oil & Zinc Infusion', 'Scalp Exfoliation Scrub', 'Balances Sebum Production', 'Soothes Inflammation'],
      },
      {
        name: 'Intensive Moroccan Argan Oil Luxury Spa',
        price: '₹1,800',
        description: 'Ultra-rich repair for heavily bleached, color-treated, or rebonded hair.',
        highlights: ['Pure Argan Oil Serum Ampoule', 'Extended 30-Min Champi', 'Deep Molecular Elasticity', 'Includes Smoothing Blowdry'],
      },
    ],
    faqs: [
      {
        question: 'How much does a hair spa cost in Surat?',
        answer:
          'Hair Spa at Shree Beauty Studio Katargam starts from ₹800 for shoulder-length hair with L’Oréal Deep Nourishing, ₹1,200 for Anti-Dandruff Scalp Detox, and ₹1,800 for Moroccan Argan Oil Luxury Spa.',
      },
      {
        question: 'Does hair spa reduce hair fall?',
        answer:
          'Yes. Hair fall caused by stress, dryness, poor blood circulation, or product buildup is effectively reduced through regular hair spa sessions by detoxifying follicles and increasing nutrient blood flow.',
      },
      {
        question: 'How often should I get a hair spa done in Surat?',
        answer:
          'We recommend getting a hair spa once every 3 to 4 weeks to maintain optimal scalp health and counteract the drying effects of Surat’s tap water and sun.',
      },
      {
        question: 'Can I get a hair spa if I have rebonded or colored hair?',
        answer:
          'Yes! In fact, chemically treated hair needs regular moisture infusion more than virgin hair to prevent dryness, split ends, and brittle snapping.',
      },
    ],
  },

  'hair-color-surat': {
    slug: 'hair-color-surat',
    serviceName: 'Hair Color & Balayage in Surat',
    targetKeyword: 'hair colour salon surat',
    metaTitle: 'Best Hair Colour & Balayage Salon in Surat | Shree Beauty Studio Katargam',
    metaDescription:
      'Looking for the best hair colour salon in Surat? Shree Beauty Studio specializes in Balayage, Ombre, Highlights, and Ammonia-free grey coverage with L’Oréal Professionnel from ₹1,200.',
    keywords: [
      'hair colour salon surat',
      'best hair color in surat',
      'balayage hair color surat',
      'hair highlights price surat',
      'global hair color surat',
      'ammonia free hair color surat',
      'hair coloring katargam',
      'loreal hair color parlour surat',
    ],
    heroBadge: 'Master Colorists · 100% Authentic L’Oréal',
    headline: 'Artisan Hair Color, Balayage & Highlights in Surat',
    subheadline:
      'Transform your look with South Gujarat’s leading color experts. From French Balayage, sun-kissed caramel highlights, to 100% ammonia-free grey coverage using genuine L’Oréal Professionnel formulations.',
    quickAnswer:
      'Shree Beauty Studio in Katargam, Surat is a certified hair color salon offering French Balayage, babylights, global rich chocolates, and gentle ammonia-free grey coverage. Our master colorists customize tones to flatter warm Indian skin tones without hair damage, with root touchups from ₹1,200 and Balayage from ₹4,000.',
    priceStarting: '₹1,200',
    priceCurrency: 'INR',
    duration: '1.5 - 4 Hours',
    rating: '4.9★ (170+ Color Clients)',
    heroImage: '/services/global_hair_color.webp',
    category: 'Hair Treatments',
    bookServiceName: 'Global Hair Coloring',
    idealFor: 'Grey coverage, subtle caramel highlights, honey blonde balayage, and trendy fashion transformations',
    brandsUsed: ['L’Oréal Professionnel Majirel', 'L’Oréal INOA (Ammonia-Free)', 'Schwarzkopf Igora Royal', 'Wella Koleston Perfect', 'Olaplex Bond Multiplier'],
    climateAdvice: {
      title: 'UV Shield & Color Fade Defense in Gujarat',
      description:
        'Surat’s strong sunshine and chlorinated municipal water can quickly oxidize brassy orange tones in colored hair. We formulate all blonde and caramel highlights with anti-brass violet toners and bond-protecting Olaplex to keep your hue rich, shiny, and vibrant for months.',
    },
    benefits: [
      {
        title: 'Tailored for Indian Warm Skin Tones',
        description: 'Custom chocolate, mocha, toffee, hazelnut, and caramel tones formulated to complement Gujarati skin undertones.',
      },
      {
        title: 'Zero Ammonia & Scalp-Safe Options',
        description: 'INOA oil-delivery system colors hair with zero burning sensation, zero pungent fumes, and 100% scalp comfort.',
      },
      {
        title: 'Bond-Multiplying Hair Protection',
        description: 'Incorporates active plex protectors to maintain hair softness and tensile strength throughout bleaching.',
      },
      {
        title: 'Seamless Seamless Regrowth Blending',
        description: 'Freehand French Balayage techniques ensure subtle root transitions without sharp, harsh demarcation lines.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Color Consultation & Shade Matching',
        description: 'Assessing your skin undertone, natural hair level, eye color, and lifestyle to select your perfect hue.',
      },
      {
        step: 2,
        title: 'Bond-Protector Integration',
        description: 'Adding protective plex bonding agents to prevent cuticle degradation during lifting or depositing.',
      },
      {
        step: 3,
        title: 'Artisan Foil or Freehand Painting',
        description: 'Master hand-painting for seamless Balayage or precision foils for multi-dimensional highlights.',
      },
      {
        step: 4,
        title: 'Custom Gloss Toning & Acidic Rinse',
        description: 'Neutralizing brassiness and sealing the cuticle at an acidic pH 4.5 for intense light reflection.',
      },
      {
        step: 5,
        title: 'Color-Lock Mask & Style Blowdry',
        description: 'Anti-fade conditioning treatment followed by a glam bouncy blowout to reveal your new color dimension.',
      },
    ],
    pricingOptions: [
      {
        name: 'Ammonia-Free Root Touchup (INOA)',
        price: '₹1,200',
        description: '100% grey coverage with zero scalp irritation or chemical odor.',
        highlights: ['L’Oréal INOA Formula', 'Scalp Barrier Protectant', 'Full Grey Coverage', 'Gentle Wash & Dry'],
      },
      {
        name: 'Global Hair Color (Shoulder to Mid-Back)',
        price: '₹2,500',
        description: 'Rich, uniform color change from root to tips in gorgeous brown or copper tones.',
        highlights: ['Rich L’Oréal Majirel Pigments', 'High-Shine Gloss Finish', 'Even Color Distribution', 'Color-Protecting Mask'],
      },
      {
        name: 'French Balayage & Ombre Highlights',
        price: '₹4,000',
        description: 'Hand-painted sun-kissed dimension with subtle, low-maintenance root blending.',
        highlights: ['Custom Caramel or Honey Tones', 'Includes Bond-Protection Plex', 'No Harsh Root Regrowth', 'Glamorous Bouncy Blowdry'],
      },
    ],
    faqs: [
      {
        question: 'Which hair colors look best on Indian skin tones?',
        answer:
          'Warm caramel, toffee brown, mocha, rich hazelnut, honey blonde, and deep mahogany complement Indian and Gujarati skin undertones exquisitely, enhancing facial warmth without washing out the complexion.',
      },
      {
        question: 'Will hair coloring damage my hair?',
        answer:
          'Not at Shree Beauty Studio. We use premium ammonia-free L’Oréal INOA formulas and add bond multipliers (Plex) directly into lighteners, preserving your hair’s structural bonds and keeping strands soft, shiny, and hydrated.',
      },
      {
        question: 'How much does hair coloring or Balayage cost in Surat?',
        answer:
          'Root touchup starts at ₹1,200. Global hair coloring starts from ₹2,500. French Balayage and dimensional highlights start from ₹4,000 depending on hair length and density.',
      },
      {
        question: 'How do I care for my colored hair in Surat’s water?',
        answer:
          'We recommend using sulfate-free color-protecting shampoos, washing with lukewarm or cool water, and scheduling a gloss toner refresh every 8 to 10 weeks to prevent municipal water brassiness.',
      },
    ],
  },
};

export const ALL_SERVICE_SEO_SLUGS = Object.keys(SERVICES_SEO_DATA);

export function getServiceSeoData(slug: string): ServiceSeoData | undefined {
  return SERVICES_SEO_DATA[slug];
}
