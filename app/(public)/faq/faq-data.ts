export type FAQCategory = 'general' | 'booking' | 'bridal' | 'hair' | 'skin';

export interface FAQEntry {
  question: string;
  answer: string;
  category: FAQCategory;
}

export const FAQ_DATA: FAQEntry[] = [
  {
    category: 'general',
    question: 'Where is Shree Beauty Studio located in Surat?',
    answer:
      'Shree Beauty Studio is conveniently located at 22, Radhika Society, Opposite Cancer Hospital, Katargam, Surat, Gujarat 395004. You can find us easily on Google Maps with ample local parking.',
  },
  {
    category: 'general',
    question: 'What are the operating hours of Shree Beauty Studio?',
    answer:
      'We are open 7 days a week from Monday to Sunday, from 10:00 AM to 7:00 PM. Early morning bridal appointments are available upon prior reservation.',
  },
  {
    category: 'general',
    question: 'Is Shree Beauty Studio an exclusive ladies salon?',
    answer:
      'Yes, Shree Beauty Studio is a dedicated, secure, and comfortable ladies-only beauty parlour and bridal makeup studio managed by certified female beauty professionals.',
  },
  {
    category: 'booking',
    question: 'How can I book an appointment?',
    answer:
      'You can easily book online through our website booking portal by selecting your services, preferred date, and available time slot. You can also message or call us on WhatsApp at +91 98241 83769 for instant booking assistance.',
  },
  {
    category: 'booking',
    question: 'Do you accept walk-in clients?',
    answer:
      'Walk-ins are warmly welcomed based on stylist availability. However, to guarantee prompt service and avoid waiting times, we strongly recommend booking an appointment in advance.',
  },
  {
    category: 'booking',
    question: 'What payment methods do you accept at the salon?',
    answer:
      'We accept all major payment methods including UPI (Google Pay, PhonePe, Paytm), Cash, and Debit/Credit cards.',
  },
  {
    category: 'bridal',
    question: 'What is included in the Shree Bridal Makeup Package?',
    answer:
      'Our complete bridal package features high-definition (HD) or airbrush makeup using 100% authentic international cosmetics, designer bridal hairstyle with hair accessories, traditional or modern saree/lehenga draping, false eyelash application, lens fitting, and jewelry setting.',
  },
  {
    category: 'bridal',
    question: 'Which cosmetic brands do you use for bridal makeovers?',
    answer:
      'We strictly use authentic, hypoallergenic international luxury cosmetics including MAC, Huda Beauty, NARS, PAC, Forever52, Smashbox, and Estée Lauder to guarantee long-lasting, camera-ready bridal radiance.',
  },
  {
    category: 'bridal',
    question: 'Do you offer bridal makeup packages for sisters and family (siders)?',
    answer:
      'Yes! We offer customized Sider Makeup Packages for engagement, reception, and sangeet functions, ensuring your entire bridal party looks cohesive and radiant.',
  },
  {
    category: 'bridal',
    question: 'How far in advance should I book my wedding bridal makeup?',
    answer:
      'Because wedding dates in Surat fill up rapidly, we recommend reserving your bridal date 1 to 3 months in advance with a booking deposit.',
  },
  {
    category: 'hair',
    question: 'What is the difference between Hair Botox and Keratin Treatment?',
    answer:
      'Keratin is primarily a hair smoothing and straightening treatment that reduces curl and frizz using protein realignment. Hair Botox is a deep conditioning, restorative anti-aging filler that hydrates, repairs damaged hair fibers, and adds mirror shine without breaking the natural hair curl pattern.',
  },
  {
    category: 'hair',
    question: 'How long do Hair Botox and Keratin smoothing last?',
    answer:
      'With sulfate-free post-care shampoo and conditioner, Hair Botox typically lasts 2 to 4 months, while Keratin smoothing lasts between 3 to 6 months depending on hair type and maintenance wash frequency.',
  },
  {
    category: 'skin',
    question: 'Which facial treatment is best for pre-bridal glowing skin?',
    answer:
      'We recommend our signature Hydra Glow Facial, Herbal Gold Glow Facial, or Diamond Micro-Polishing facial spaced 1 to 2 weeks before the wedding festivities to ensure deep hydration, tan removal, and flawless canvas preparation.',
  },
  {
    category: 'skin',
    question: 'Do you offer skin consultation before recommending treatments?',
    answer:
      'Yes! Our senior beauticians perform an initial skin analysis to determine your skin type (sensitive, dry, oily, or combination) and customize products to prevent breakouts or irritation.',
  },
  {
    category: 'general',
    question: 'What hygiene and sanitation protocols are followed at the studio?',
    answer:
      'Client health and hygiene are our highest priorities. All tools, scissors, and makeup brushes are sanitized before each use. Disposable capes, wax strips, and bed sheets are utilized for every client.',
  },
];
