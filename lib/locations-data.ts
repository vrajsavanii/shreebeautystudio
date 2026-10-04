export interface LocationData {
  slug: string;
  cityName: string;
  stateName: string;
  tagline: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  heroBadge: string;
  headline: string;
  subheadline: string;
  localities: string[];
  serviceHighlights: {
    title: string;
    description: string;
    badge: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
  destinationHighlights: string[];
}

export const LOCATIONS_DATA: Record<string, LocationData> = {
  surat: {
    slug: 'surat',
    cityName: 'Surat',
    stateName: 'Gujarat',
    tagline: 'Flagship 100% Ladies Sanctuary & Bridal Studio',
    metaTitle: 'Shree Beauty Parlour & Studio Surat — Best Ladies Salon & Bridal Studio',
    metaDescription: 'Surat’s premier 100% ladies-only beauty parlour & luxury salon in Katargam. 25+ years expertise in HD bridal makeovers, Hair Botox, Nanoplastia & Hydra Facials.',
    keywords: [
      'shree beauty parlour surat',
      'shree beauty studio surat',
      'best beauty parlour in surat',
      'best beauty salon in surat',
      'ladies beauty parlour katargam surat',
      'bridal makeup artist surat',
      'hair botox surat',
      'nanoplastia surat',
      'hydra facial surat',
    ],
    heroBadge: 'Flagship Sanctuary · Katargam, Surat',
    headline: 'Surat’s Most Trusted Ladies-Only Beauty Sanctuary',
    subheadline: 'Located in Radhika Society, Katargam, Shree Beauty Studio has served over 20,000+ women and brides across Surat for over 25 years with unmatched privacy, genuine luxury products, and transparent pricing.',
    localities: ['Katargam', 'Varachha', 'Mota Varachha', 'Amroli', 'Adajan', 'Pal', 'Vesu', 'Ghod Dod Road', 'City Light', 'Dumas Road'],
    serviceHighlights: [
      {
        title: 'Couture Bridal Artistry',
        description: '3-session luxury bridal packages with HD & Airbrush techniques using MAC, Huda Beauty, Dior & Charlotte Tilbury.',
        badge: 'Bridal Heritage',
      },
      {
        title: 'Advanced Hair Botox & Nanoplastia',
        description: 'Formaldehyde-free hair restoration and glass-hair smoothing specially calibrated for Tapi river TDS and Surat humidity.',
        badge: 'Hair Science',
      },
      {
        title: 'Hydra & O3+ Medical Facials',
        description: 'Multi-step vortex deep pore cleaning, diamond dermabrasion, and collagen infusion for unmatched radiance.',
        badge: 'Skin Aesthetics',
      },
    ],
    faqs: [
      {
        question: 'Where is Shree Beauty Studio located in Surat?',
        answer: 'Our flagship studio is located at 22, Radhika Society, Opposite Cancer Hospital, Katargam, Surat, Gujarat 395004. We are open 7 days a week from 10:00 AM to 7:00 PM.',
      },
      {
        question: 'Is Shree Beauty Studio exclusively for ladies in Surat?',
        answer: 'Yes, 100%. We maintain a strict ladies-only sanctuary policy with private treatment suites, discreet waiting lounges, and an all-female certified styling team.',
      },
      {
        question: 'How do I book an appointment at the Surat studio?',
        answer: 'You can book directly through our online appointment system on shreebeauty.studio/book or via WhatsApp / Call at +91 98241 83769.',
      },
    ],
    destinationHighlights: [
      'Private bridal suites with personalized vanity lighting',
      'Strict hygiene protocol with single-use disposable kits',
      'Sealed international luxury cosmetic products opened before clients',
      '25+ years of verified heritage and 4.9★ rating from 210+ Google reviews',
    ],
  },

  ahmedabad: {
    slug: 'ahmedabad',
    cityName: 'Ahmedabad',
    stateName: 'Gujarat',
    tagline: 'Luxury Bridal Makeovers & Destination Artistry for Ahmedabad Brides',
    metaTitle: 'Shree Beauty Parlour & Studio Ahmedabad — Best Bridal Makeup & Salon',
    metaDescription: 'Searching for Shree Beauty Parlour or Studio in Ahmedabad? Surat’s premier luxury bridal and salon sanctuary serves Ahmedabad brides with on-location destination bridal makeovers, HD artistry, and VIP packages.',
    keywords: [
      'shree beauty parlour ahmedabad',
      'shree beauty salon ahmedabad',
      'shree beauty studio ahmedabad',
      'best beauty parlour in ahmedabad',
      'bridal makeup artist ahmedabad',
      'destination bridal makeup ahmedabad',
      'luxury bridal studio ahmedabad',
      'gujarati bridal makeup ahmedabad',
    ],
    heroBadge: 'Pan-Gujarat Artistry · Ahmedabad On-Location Team',
    headline: 'Premier Bridal Makeover Artistry for Ahmedabad Weddings',
    subheadline: 'Discerning brides in Ahmedabad choose Shree Beauty Studio for iconic Gujarati bridal makeovers, royal heritage draping, and waterproof HD makeup that radiates through long ceremonies.',
    localities: ['SG Highway', 'Satellite', 'Prahlad Nagar', 'Bopal', 'South Bopal', 'Bodakdev', 'Navrangpura', 'Maninagar', 'Chandkheda', 'Vastrapur'],
    serviceHighlights: [
      {
        title: 'On-Location Bridal Travel Team',
        description: 'Our senior bridal artists travel directly to your wedding venue, resort, or luxury hotel in Ahmedabad with professional kit and vanity setups.',
        badge: 'Venue Travel',
      },
      {
        title: 'Signature Gujarati Bridal Looks',
        description: 'Authentic Panetar and Gharchola saree draping, antique jewelry pinning, and bespoke hairstyling perfected over 25 years.',
        badge: 'Cultural Heritage',
      },
      {
        title: 'Pre-Wedding Video Consultation',
        description: 'Personalized virtual consultations before your big day to analyze your skin tone, wedding attire, and formulate customized makeup looks.',
        badge: 'Virtual Prep',
      },
    ],
    faqs: [
      {
        question: 'Does Shree Beauty Studio provide bridal makeup services in Ahmedabad?',
        answer: 'Yes! While our flagship salon and academy is located in Surat, our senior bridal team frequently travels on-location across Ahmedabad (SG Highway, Satellite, Bopal, Prahlad Nagar) for destination weddings, Sangeet, and reception makeovers.',
      },
      {
        question: 'What bridal cosmetic brands are used for Ahmedabad bookings?',
        answer: 'We exclusively carry sealed international luxury cosmetics including Charlotte Tilbury, Dior, NARS, Huda Beauty, Bobbi Brown, and MAC, engineered for 16+ hours of sweat-proof longevity.',
      },
      {
        question: 'How do Ahmedabad brides book a wedding date with Shree Beauty Studio?',
        answer: 'Due to high demand during the Gujarati wedding season, we recommend reserving your dates 2–6 months in advance via WhatsApp at +91 98241 83769 or online at shreebeauty.studio/bridal.',
      },
    ],
    destinationHighlights: [
      'Travels across all luxury hotels and resorts along SG Highway & Bopal',
      'Full trousseau coordination, jewelry setting & flower styling',
      'Bridesmaids, mothers, and siders makeup packages available',
      'Trial and bespoke skin preparation roadmaps provided in advance',
    ],
  },

  vadodara: {
    slug: 'vadodara',
    cityName: 'Vadodara',
    stateName: 'Gujarat',
    tagline: 'Royal Heritage Bridal & Luxury Beauty Services for Baroda',
    metaTitle: 'Shree Beauty Parlour & Studio Vadodara — Bridal Makeup & Salon',
    metaDescription: 'Looking for Shree Beauty Parlour or Studio in Vadodara? Surat’s premier ladies sanctuary provides Baroda brides with royal bridal makeovers, HD artistry, and destination wedding beauty.',
    keywords: [
      'shree beauty parlour vadodara',
      'shree beauty salon vadodara',
      'shree beauty studio vadodara',
      'best beauty parlour in vadodara',
      'bridal makeup artist vadodara',
      'baroda bridal makeover',
      'royal bridal makeup vadodara',
    ],
    heroBadge: 'Central Gujarat · Vadodara On-Location Services',
    headline: 'Royal Bridal Artistry for Vadodara’s Cultural Weddings',
    subheadline: 'Vadodara brides trust Shree Beauty Studio for regal bridal glamour that honors Gujarat’s royal heritage with contemporary HD and airbrush precision.',
    localities: ['Alkapuri', 'Gotri', 'Vasna Road', 'Old Padra Road', 'Manjalpur', 'Sayajigunj', 'Karelibaug', 'Fatehgunj', 'Akota'],
    serviceHighlights: [
      {
        title: 'Destination Wedding Makeup',
        description: 'Complete on-site makeup, hairstyling, and traditional draping at Baroda wedding palaces, farmhouses, and hotels.',
        badge: 'Palace Weddings',
      },
      {
        title: 'Sweat-Proof HD & Airbrush Artistry',
        description: 'Advanced waterproof formulations engineered to stay flawless through tearful Vidai moments and humid outdoor Mandap rituals.',
        badge: 'Waterproof Tech',
      },
      {
        title: 'Bridal Party & Siders Packages',
        description: 'Coordinated styling packages for sisters, mothers, and bridesmaids ensuring a cohesive, breathtaking aesthetic.',
        badge: 'Entourage Glam',
      },
    ],
    faqs: [
      {
        question: 'Does Shree Beauty Studio cater to weddings in Vadodara?',
        answer: 'Yes! Located just 2 hours from Vadodara via the Vande Bharat / Express Highway, our bridal team frequently travels to Baroda for premium wedding assignments, Mandap Muhurat, and Sangeet celebrations.',
      },
      {
        question: 'Can Vadodara clients visit the flagship studio for hair treatments?',
        answer: 'Absolutely. Many clients from Vadodara visit our Katargam, Surat studio for our famous Hair Botox, Nanoplastia, and Hydra Facial therapies over the weekend.',
      },
    ],
    destinationHighlights: [
      'Convenient travel distance between Surat and Vadodara',
      'Comprehensive pre-bridal skin and hair guidelines',
      'Specialized Gujarati and Rajput royal bridal draping',
    ],
  },

  rajkot: {
    slug: 'rajkot',
    cityName: 'Rajkot',
    stateName: 'Gujarat',
    tagline: 'Kathiyawadi & Royal Bridal Makeover Artistry for Saurashtra',
    metaTitle: 'Shree Beauty Parlour & Studio Rajkot — Bridal Makeup & Salon',
    metaDescription: 'Seeking Shree Beauty Parlour or Studio in Rajkot? Discover Surat’s top-rated luxury bridal studio providing royal Kathiyawadi bridal makeovers and destination wedding packages across Rajkot.',
    keywords: [
      'shree beauty parlour rajkot',
      'shree beauty salon rajkot',
      'shree beauty studio rajkot',
      'best beauty parlour in rajkot',
      'bridal makeup artist rajkot',
      'kathiyawadi bridal makeup rajkot',
      'saurashtra bridal studio',
    ],
    heroBadge: 'Saurashtra Hub · Rajkot Destination Weddings',
    headline: 'Iconic Kathiyawadi & Royal Bridal Makeovers for Rajkot',
    subheadline: 'Bringing Surat’s celebrated 25-year bridal mastery to Saurashtra. We craft unforgettable bridal looks for grand Rajkot weddings with authentic traditional grandeur.',
    localities: ['Kalawad Road', 'Yagnik Road', 'University Road', 'Nana Mava', 'Amin Marg', '150 Feet Ring Road', 'Kotecha Chowk', 'Raiya Road'],
    serviceHighlights: [
      {
        title: 'Traditional Kathiyawadi Draping',
        description: 'Master draping for Bandhani, Gharchola, and heavily embellished lehengas with flawless symmetry and comfort.',
        badge: 'Cultural Mastery',
      },
      {
        title: 'Celebrity-Grade Contour & Glow',
        description: 'Signature glowing glass-skin finishes that look breathtaking under 4K wedding cinematography and strobe flash photography.',
        badge: 'Cinematic Prep',
      },
      {
        title: 'NRI & Destination Weddings',
        description: 'Full-service multi-day packages designed for grand Saurashtra destination weddings with personalized styling itineraries.',
        badge: 'Multi-Day VIP',
      },
    ],
    faqs: [
      {
        question: 'Can Shree Beauty Studio travel to Rajkot for my wedding?',
        answer: 'Yes! We regularly accept bridal bookings across Rajkot and Saurashtra. Our team travels with complete professional gear, lighting, and makeup stations.',
      },
      {
        question: 'How do I book for a wedding in Rajkot?',
        answer: 'Connect with our bridal director on WhatsApp at +91 98241 83769 to check dates, receive a detailed portfolio, and lock your wedding booking.',
      },
    ],
    destinationHighlights: [
      'Specialized in grand Saurashtra wedding traditions',
      'High-longevity makeup suited for outdoor desert & dry climates',
      'Exclusive early-morning Mandap Muhurat service capability',
    ],
  },

  gandhinagar: {
    slug: 'gandhinagar',
    cityName: 'Gandhinagar',
    stateName: 'Gujarat',
    tagline: 'Couture Bridal Artistry & VIP Styling for Capital Region Weddings',
    metaTitle: 'Shree Beauty Parlour & Studio Gandhinagar — Bridal Studio & Salon',
    metaDescription: 'Looking for Shree Beauty Parlour or Studio in Gandhinagar? Discover Surat’s premier ladies sanctuary offering luxury bridal makeovers and on-location destination beauty across Gandhinagar.',
    keywords: [
      'shree beauty parlour gandhinagar',
      'shree beauty salon gandhinagar',
      'shree beauty studio gandhinagar',
      'best beauty parlour in gandhinagar',
      'bridal makeup artist gandhinagar',
      'infocity bridal makeup',
    ],
    heroBadge: 'Capital Region · Gandhinagar Weddings',
    headline: 'High-Profile Bridal Makeovers for Gandhinagar Weddings',
    subheadline: 'Crafting graceful, sophisticated bridal beauty for weddings, receptions, and state events across Gandhinagar and surrounding heritage resorts.',
    localities: ['Infocity', 'Kudasan', 'Raysan', 'Sector 1-30', 'Sargasan', 'Randheja', 'Koba', 'Gift City'],
    serviceHighlights: [
      {
        title: 'Subtle Royalty & Minimal Glam',
        description: 'Clean, radiant, and contemporary bridal looks favored by modern professionals and sophisticated brides.',
        badge: 'Modern Elegance',
      },
      {
        title: 'High-Definition HD Formulations',
        description: 'Micro-pigment formulations that provide seamless full coverage without cakey texture or flashback.',
        badge: 'Flashback-Free',
      },
      {
        title: 'On-Location Bridal Luxury',
        description: 'Comprehensive beauty styling delivered directly to Gandhinagar clubs, resorts, and private residences.',
        badge: 'Doorstep VIP',
      },
    ],
    faqs: [
      {
        question: 'Does Shree Beauty Studio cover Gandhinagar and Gift City?',
        answer: 'Yes, our bridal travel team provides on-location bridal makeover services across all sectors of Gandhinagar, Kudasan, Raysan, and Gift City.',
      },
    ],
    destinationHighlights: [
      'Trusted by high-profile and NRI families',
      'Complete hairstyling with fresh floral integration',
      'Tailored pre-bridal skincare timelines',
    ],
  },

  mumbai: {
    slug: 'mumbai',
    cityName: 'Mumbai',
    stateName: 'Maharashtra',
    tagline: 'Destination Bridal Glamour & NRI Wedding Tours for Mumbai Brides',
    metaTitle: 'Shree Beauty Parlour & Studio Mumbai — Destination Bridal Makeup',
    metaDescription: 'Searching for Shree Beauty Parlour or Studio in Mumbai? Surat’s iconic luxury bridal studio travels to Mumbai for luxury Gujarati weddings, NRI ceremonies, and couture bridal styling.',
    keywords: [
      'shree beauty parlour mumbai',
      'shree beauty salon mumbai',
      'shree beauty studio mumbai',
      'destination bridal makeup mumbai',
      'gujarati bridal makeup artist mumbai',
      'luxury bridal makeup mumbai',
    ],
    heroBadge: 'Inter-State Luxury · Mumbai Destination Team',
    headline: 'Authentic Gujarati Bridal Mastery for Mumbai Weddings',
    subheadline: 'Bridging Surat’s legendary bridal artistry with Mumbai’s high-fashion grandeur. We deliver signature Gujarati Panetar draping, celebrity contouring, and flawless HD glam for Mumbai’s most discerning brides.',
    localities: ['Bandra', 'Juhu', 'Borivali', 'Ghatkopar', 'Kandivali', 'Vile Parle', 'Andheri', 'South Mumbai', 'Powai', 'Thane'],
    serviceHighlights: [
      {
        title: 'Couture Sabyasachi & Manish Malhotra Looks',
        description: 'Mastered techniques to complement heavy designer lehengas with radiant, weightless, high-fashion makeup.',
        badge: 'Designer Match',
      },
      {
        title: 'Interstate Travel Team',
        description: 'Seamless logistics: our bridal artists arrive in Mumbai with all professional equipment ahead of your ceremony schedule.',
        badge: 'Pan-India Logistics',
      },
      {
        title: 'Gujarati Diaspora Heritage Draping',
        description: 'The preferred choice for Mumbai’s Gujarati community seeking authentic regional bridal perfection.',
        badge: 'Heritage Trust',
      },
    ],
    faqs: [
      {
        question: 'Does Shree Beauty Studio travel from Surat to Mumbai for weddings?',
        answer: 'Yes! Surat to Mumbai is exceptionally well-connected (2.5 hours via Vande Bharat). Our team travels regularly for high-end Mumbai weddings across Borivali, Ghatkopar, Juhu, Bandra, and South Mumbai.',
      },
    ],
    destinationHighlights: [
      'Preferred by Mumbai Gujarati & Marwari families',
      'Full coordination with wedding photography and videography teams',
      'Premium international kit including Dior, Charlotte Tilbury, and NARS',
    ],
  },

  katargam: {
    slug: 'katargam',
    cityName: 'Katargam, Surat',
    stateName: 'Gujarat',
    tagline: 'Hyperlocal 100% Ladies Sanctuary & Bridal Parlour in Katargam',
    metaTitle: 'Best Beauty Parlour in Katargam Surat — Shree Beauty Studio | 4.9★',
    metaDescription: 'Looking for the best ladies beauty parlour in Katargam, Surat? Located at 22, Radhika Society, Opp. Cancer Hospital. 25+ years expertise in bridal makeup, Hair Botox, Nanoplastia & Hydra facials.',
    keywords: [
      'beauty parlour katargam',
      'ladies parlour katargam surat',
      'best salon in katargam',
      'bridal studio katargam',
      'hair treatment katargam surat',
      'shree beauty parlour katargam',
      'shree beauty studio katargam',
      'hydra facial katargam',
      'hair botox katargam',
      'painless waxing katargam',
    ],
    heroBadge: 'Hyperlocal Flagship · Radhika Society, Katargam',
    headline: 'Katargam’s #1 Ladies Beauty Parlour & Bridal Studio',
    subheadline: 'Situated opposite Cancer Hospital in Radhika Society, Katargam, Shree Beauty Studio is Katargam’s most recommended ladies sanctuary. 5,000+ local brides, 100% genuine luxury products, and completely private suites.',
    localities: ['Radhika Society', 'Opp. Cancer Hospital', 'Gotalawadi', 'Gajera Circle', 'Akhand Anand College', 'Fulpada Road', 'Dabholi Char Rasta', 'Ved Road', 'Amroli Cross Road', 'Katargam Darwaja'],
    serviceHighlights: [
      {
        title: 'Katargam Flagship Bridal Suites',
        description: 'Private dressing rooms with 360-degree daylight vanity lighting, full trousseau mirrors, and separate entourage seating.',
        badge: 'Bridal Heritage',
      },
      {
        title: 'Hair Botox & Nanoplastia Lab',
        description: 'Specialized water-purified wash basins and organic formulas calibrated specifically for Katargam and Surat tap water.',
        badge: 'Hair Science',
      },
      {
        title: 'Clinical Hydra Facials & Rica Waxing',
        description: '7-step vortex pore extractions and colophony-free Italian waxing for total comfort and tan removal.',
        badge: 'Skin Aesthetics',
      },
    ],
    faqs: [
      {
        question: 'Where is Shree Beauty Studio situated in Katargam, Surat?',
        answer: 'Our salon is located at 22, Radhika Society, Opposite Cancer Hospital, Katargam, Surat, Gujarat 395004. Landmark: Right opposite the Cancer Hospital main gate.',
      },
      {
        question: 'Are walk-ins accepted or is an appointment mandatory in Katargam?',
        answer: 'While we welcome walk-ins when slots are available, we strongly recommend booking online at shreebeauty.studio/book or calling +91 98241 83769 to ensure zero waiting time in our private suites.',
      },
      {
        question: 'Why is Shree Beauty Studio the top choice for women in Katargam?',
        answer: 'With 25+ years of continuous service, a strict 100% ladies-only policy (no male visitors or staff), transparent prices, and sealed genuine brands (L’Oréal, MAC, Huda Beauty), we offer unmatched peace of mind.',
      },
    ],
    destinationHighlights: [
      'Prime Katargam location with convenient parking and accessibility',
      'Strict 100% ladies-only policy with all-female certified styling crew',
      'Sealed original cosmetic bottles opened directly in front of you',
      '4.9★ Google rating from over 210+ verified Katargam and Surat clients',
    ],
  },

  navsari: {
    slug: 'navsari',
    cityName: 'Navsari',
    stateName: 'Gujarat',
    tagline: 'Premier Bridal Studio & Luxury Hair Therapies for Navsari Brides',
    metaTitle: 'Best Bridal Studio & Beauty Parlour for Navsari — Shree Beauty Studio',
    metaDescription: 'South Gujarat’s premier bridal studio & ladies beauty salon serving Navsari and Valsad brides. 25+ years expertise in HD bridal makeovers, Hair Botox, Nanoplastia & luxury facials.',
    keywords: [
      'bridal studio navsari',
      'bridal makeup navsari',
      'best beauty parlour navsari',
      'ladies salon navsari',
      'hair botox navsari',
      'nanoplastia navsari',
      'wedding makeup artist navsari',
      'shree beauty studio navsari',
    ],
    heroBadge: 'South Gujarat Authority · Serving Navsari & Valsad',
    headline: 'South Gujarat’s Celebrated Bridal Studio for Navsari Brides',
    subheadline: 'Just 40 minutes from Navsari, Shree Beauty Studio is the trusted beauty destination for hundreds of Navsari and Bilimora brides every wedding season, offering couture HD bridal artistry and advanced hair restoration.',
    localities: ['Lunsikui', 'Jalalpore', 'Tower Road', 'Chhapra Road', 'Grid Char Rasta', 'Gandevi Road', 'Bilimora', 'Maroli', 'Vijalpor', 'Kabilpore'],
    serviceHighlights: [
      {
        title: 'Couture Gujarati Bridal Makeovers',
        description: 'Complete 3-session bridal packages with traditional Panetar draping, jewellery setting, and sweat-resistant HD artistry.',
        badge: 'Bridal Heritage',
      },
      {
        title: 'Weekend Hair Botox & Nanoplastia Excursions',
        description: 'Many Navsari women visit our Katargam studio for one-day glass hair smoothing and intensive hair repair.',
        badge: 'Hair Science',
      },
      {
        title: 'On-Location Navsari Wedding Team',
        description: 'Dispatched senior bridal artists and hairstylists for on-venue assignments at Navsari banquet halls and resorts.',
        badge: 'Bridal Travel',
      },
    ],
    faqs: [
      {
        question: 'Does Shree Beauty Studio travel to Navsari for wedding makeup?',
        answer: 'Yes! Our senior bridal makeup team travels to Navsari, Jalalpore, Gandevi, and Bilimora for on-location wedding makeovers and bridal entourage styling.',
      },
      {
        question: 'How far is Shree Beauty Studio from Navsari?',
        answer: 'Our Katargam studio is just a 40–50 minute drive from Navsari via the Surat-Navsari highway, making it an easy day visit for pre-bridal packages and hair treatments.',
      },
      {
        question: 'How can Navsari brides book an appointment?',
        answer: 'You can book directly through our website shreebeauty.studio/book or connect with our bridal concierge on WhatsApp at +91 98241 83769.',
      },
    ],
    destinationHighlights: [
      'Frequent travel to premier Navsari party plots and wedding venues',
      '100% genuine luxury products (MAC, Huda Beauty, Dior, NARS)',
      'Pre-wedding consultation and customized skin preparation roadmaps',
    ],
  },

  bharuch: {
    slug: 'bharuch',
    cityName: 'Bharuch',
    stateName: 'Gujarat',
    tagline: 'Bridal Makeovers & Destination Artistry for Bharuch & Ankleshwar',
    metaTitle: 'Best Bridal Makeup & Beauty Parlour for Bharuch — Shree Beauty Studio',
    metaDescription: 'Serving Bharuch & Ankleshwar brides with couture HD bridal makeovers, destination wedding artistry, and advanced hair smoothing. 4.9★ rated ladies sanctuary.',
    keywords: [
      'beauty parlour bharuch',
      'bridal makeup bharuch',
      'best salon in bharuch',
      'bridal studio bharuch',
      'ladies parlour ankleshwar',
      'hair treatment bharuch',
      'nanoplastia bharuch',
      'hair botox bharuch',
    ],
    heroBadge: 'Central-South Corridor · Serving Bharuch & Ankleshwar',
    headline: 'Premier Bridal & Salon Artistry for Bharuch & Ankleshwar',
    subheadline: 'Connecting Bharuch and Ankleshwar brides with Surat’s legendary 25-year beauty heritage. Experience couture HD bridal makeovers and organic hair smoothing therapies with zero compromise.',
    localities: ['Zadeshwar Road', 'Bholav', 'Link Road', 'Station Road', 'Shaktinagar', 'Ankleshwar GIDC', 'Valia Road', 'Dahej Bypass', 'Panchbatti', 'Kasak'],
    serviceHighlights: [
      {
        title: 'Destination Wedding Makeup in Bharuch',
        description: 'Complete on-location wedding day glam for Bharuch brides with airbrush base, 3D lashes, and heavy dupatta draping.',
        badge: 'Destination Ready',
      },
      {
        title: 'Nanoplastia & Keratin Smoothing',
        description: 'Long-lasting frizz defense and glass hair shine for women dealing with industrial and coastal humidity.',
        badge: 'Hair Science',
      },
      {
        title: 'Pre-Bridal Skincare Retreats',
        description: 'Multi-session clinical facials and body polishing packages before your wedding date.',
        badge: 'Skin Aesthetics',
      },
    ],
    faqs: [
      {
        question: 'Does Shree Beauty Studio take bridal bookings in Bharuch and Ankleshwar?',
        answer: 'Yes! Bharuch is located just 1 hour from Surat via NH 48. Our master artists travel regularly for wedding ceremonies across Bharuch and Ankleshwar.',
      },
      {
        question: 'Why travel from Bharuch to Shree Beauty Studio in Surat?',
        answer: 'With over 25 years of specialized ladies-only experience, 5,000+ happy brides, and original luxury cosmetics, many Bharuch families choose us for their life’s most important milestone makeover.',
      },
      {
        question: 'What is included in the on-location Bharuch bridal package?',
        answer: 'Our on-venue bridal package includes HD/Airbrush makeup, couture hairstyling, false eyelashes, coloured lenses, jewellery anchoring, dupatta draping, and styling for immediate family members upon request.',
      },
    ],
    destinationHighlights: [
      'Smooth 1-hour connectivity between Bharuch and Surat via NH 48',
      'Comprehensive on-venue wedding support with portable LED vanity lighting',
      '25+ years of verified heritage and 4.9★ client trust',
    ],
  },

  anand: {
    slug: 'anand',
    cityName: 'Anand',
    stateName: 'Gujarat',
    tagline: 'Luxury Destination Bridal Artistry for Charotar & Anand Brides',
    metaTitle: 'Ladies Salon & Bridal Studio for Anand Gujarat — Shree Beauty Studio',
    metaDescription: 'Searching for luxury bridal makeup and salon artistry in Anand, Gujarat? Shree Beauty Studio brings 25+ years of verified makeover excellence to Charotar and Vidyanagar brides.',
    keywords: [
      'ladies salon anand gujarat',
      'bridal makeup anand',
      'beauty parlour anand gujarat',
      'best bridal studio anand',
      'destination bridal makeup vidyanagar',
      'hair treatments anand',
      'shree beauty studio anand',
    ],
    heroBadge: 'Charotar Region · Serving Anand & Vidyanagar',
    headline: 'Luxury Bridal Makeovers & Styling for Anand & Charotar Brides',
    subheadline: 'Known for grand NRI weddings and rich cultural traditions, the Charotar region trusts Shree Beauty Studio for high-definition bridal artistry, heirloom Panetar draping, and VIP bridal team travel.',
    localities: ['Vallabh Vidyanagar', 'Nana Bazar', 'Ganesh Meridian', 'Bakrol Road', 'Karamsad', 'Borsad Road', '100 Feet Road', 'Amul Dairy Road', 'Petlad', 'Chikhodra'],
    serviceHighlights: [
      {
        title: 'NRI & Grand Charotar Wedding Squad',
        description: 'Specialized bridal glam for NRI and traditional Patidar weddings across Anand, Vidyanagar, and Karamsad resorts.',
        badge: 'NRI Weddings',
      },
      {
        title: 'High-Definition 4K Base Perfection',
        description: 'Camera-ready makeup that photographs impeccably in daylight Vidyanagar lawns and evening palace receptions.',
        badge: 'Bridal Heritage',
      },
      {
        title: 'Virtual Bridal Skin & Hair Concierge',
        description: 'Digital styling consultations and skincare prep routines for brides planning weddings from the USA, UK, or Canada.',
        badge: 'Digital Concierge',
      },
    ],
    faqs: [
      {
        question: 'Does Shree Beauty Studio cater to NRI weddings in Anand and Vidyanagar?',
        answer: 'Yes! We specialize in NRI destination weddings throughout Anand, Vallabh Vidyanagar, and Karamsad, coordinating styling timelines to fit multi-day wedding festivities.',
      },
      {
        question: 'How do Anand brides book Shree Beauty Studio for their wedding?',
        answer: 'You can connect with our team on WhatsApp at +91 98241 83769. We coordinate dates, travel arrangements, and trial session requirements smoothly.',
      },
      {
        question: 'What cosmetics do you use for destination brides in Anand?',
        answer: 'We carry our complete luxury master kit including Dior Backstage, Charlotte Tilbury, NARS, MAC, and Huda Beauty, ensuring long-lasting, waterproof perfection.',
      },
    ],
    destinationHighlights: [
      'Specialized expertise in grand Charotar and NRI Gujarati wedding aesthetics',
      'Comprehensive entourage styling for mothers, sisters, and bridesmaids',
      '100% authentic international cosmetics and sterilized brushes',
    ],
  },

  india: {
    slug: 'india',
    cityName: 'Pan-India',
    stateName: 'India',
    tagline: 'India’s Premier Destination Bridal Makeover & Luxury Beauty Studio',
    metaTitle: 'Shree Beauty Parlour & Studio India — Pan-India Destination Bridal Studio',
    metaDescription: 'Shree Beauty Parlour & Studio is one of India’s top bridal makeover and ladies beauty authorities. 25+ years experience, 4.9★ rating, traveling across India for destination weddings in Udaipur, Jaipur, Goa & beyond.',
    keywords: [
      'shree beauty parlour india',
      'shree beauty studio india',
      'best beauty parlour in india',
      'best beauty salon in india',
      'pan india destination bridal makeup',
      'top bridal makeup artist in india',
      'destination wedding makeup artist india',
    ],
    heroBadge: 'National Authority · Serving Brides Across India',
    headline: 'India’s Celebrated Destination Bridal Makeover Authority',
    subheadline: 'From royal palace weddings in Rajasthan to beach nuptials in Goa and cosmopolitan celebrations across India, Shree Beauty Studio brings 25+ years of verified makeover artistry right to your wedding destination.',
    localities: ['Udaipur', 'Jaipur', 'Goa', 'Delhi NCR', 'Surat', 'Ahmedabad', 'Mumbai', 'Bengaluru', 'Pune', 'Hyderabad'],
    serviceHighlights: [
      {
        title: 'Pan-India Destination Wedding Squad',
        description: 'Dedicated senior makeup artists and master hairstylists dispatched to palace resorts, heritage hotels, and beach destinations.',
        badge: 'Destination Ready',
      },
      {
        title: '25+ Years of National Excellence',
        description: 'Over 20,000 satisfied clients and 210+ verified 4.9★ reviews testify to our unwavering commitment to female beauty and comfort.',
        badge: 'National Heritage',
      },
      {
        title: 'Virtual Consultation & Beauty Concierge',
        description: 'Comprehensive digital skin preparation roadmaps and video styling sessions for NRI brides and clients across India.',
        badge: 'Digital Concierge',
      },
    ],
    faqs: [
      {
        question: 'Does Shree Beauty Studio take destination wedding bookings across India?',
        answer: 'Yes! We travel across India including Udaipur, Jaipur, Jodhpur, Goa, Mumbai, Delhi, and Bangalore for royal and destination wedding celebrations.',
      },
      {
        question: 'Why choose Shree Beauty Studio over local parlours across India?',
        answer: 'With 25+ years of heritage, a 4.9★ verified track record, 100% ladies-only expertise, and mastery over traditional Indian and contemporary HD makeup, we ensure zero compromise on your most memorable day.',
      },
      {
        question: 'How do destination bridal bookings work?',
        answer: 'Simply share your wedding dates, venue location, and event timeline with us on WhatsApp at +91 98241 83769. Our team will furnish a custom package including travel, stay, and complete entourage styling.',
      },
    ],
    destinationHighlights: [
      'Custom travel packages for Rajasthan, Goa, and pan-India venues',
      '100% authentic international cosmetics and sterile brushes',
      'Specialized care for brides of all Indian traditions',
    ],
  },
};

export const ALL_LOCATION_SLUGS = Object.keys(LOCATIONS_DATA);
