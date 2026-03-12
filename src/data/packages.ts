export type PackageSlug = 'minimum' | 'standard' | 'best';

export interface PackageData {
  slug: PackageSlug;
  name: string;
  price: string;
  priceSub?: string;
  commitment: string;
  guarantee: string;
  visibility: string;
  features: string[];
  highlight: boolean;
}

export const PACKAGES: PackageData[] = [
  {
    slug: 'minimum',
    name: 'Minimum',
    price: '€300 / Month',
    commitment: '3 month commitment. Cancellable monthly thereafter.',
    guarantee: 'First page on Google within 90 days. No money-back-guarantee.',
    visibility: 'Visible on 30% of search results.',
    features: [
      "Full Competitor's Analysis",
      'Updates Every Two Weeks',
      'No Money-Back-Guarantee',
      'Ranking For Main Search-Term',
      'Limited Website Optimization',
      'High Quality Backlinks',
    ],
    highlight: false,
  },
  {
    slug: 'standard',
    name: 'Standard',
    price: '€397 / Month',
    commitment: '3 month commitment. Cancellable monthly thereafter.',
    guarantee: 'Top 3 on Google within 90 days. Guaranteed or you don\'t pay.',
    visibility: 'Visible on 75%+ of search results.',
    features: [
      "Full Competitor's Analysis",
      'Updates Every Two Weeks',
      'Money-Back-Guarantee',
      'Ranking For Main Search-Term',
      'Full Website Optimization',
      'High Quality Backlinks',
    ],
    highlight: true,
  },
  {
    slug: 'best',
    name: 'Save €194',
    price: '€997 / Quarter',
    priceSub: '(3 Months)',
    commitment: 'Cancellable every 3 months.',
    guarantee: 'Top 3 on Google within 90 days. Guaranteed or you don\'t pay.',
    visibility: 'Visible on 75%+ of search results.',
    features: [
      "Full Competitor's Analysis",
      'Updates Every Two Weeks',
      'Money-Back-Guarantee',
      'Ranking For Main Search-Term',
      'Full Website Optimization',
      'High Quality Backlinks',
    ],
    highlight: false,
  },
];

export function getPackageBySlug(slug: string): PackageData | undefined {
  return PACKAGES.find((p) => p.slug === slug);
}
