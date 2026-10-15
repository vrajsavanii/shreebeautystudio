import CookiesPolicyPage, { metadata as originalMetadata } from '../cookies-policy/page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  ...originalMetadata,
  alternates: {
    canonical: '/cookies-policy',
  },
};

export default CookiesPolicyPage;
