import { VisibilityData } from '../models/interfaces';

const BRANDS = ['EOM', 'Brand B', 'Brand C'];
const DOMAINS: { domain: string; domain_type: string }[] = [
  { domain: 'youtube.com',       domain_type: 'UGC'      },
  { domain: 'reddit.com',        domain_type: 'UGC'      },
  { domain: 'nytimes.com',       domain_type: 'News'     },
  { domain: 'yelp.com',          domain_type: 'Review'   },
  { domain: 'brand-official.com',domain_type: 'Official' },
];

function genDates(from: string, count: number): string[] {
  const dates: string[] = [];
  const d = new Date(from);
  for (let i = 0; i < count; i++) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function rnd(min: number, max: number): number {
  return Math.round(Math.random() * (max - min) + min);
}

const DATES = genDates('2026-01-26', 28);

export const PLACEHOLDER_DATA: VisibilityData[] = DATES.flatMap(date =>
  BRANDS.flatMap(brand =>
    DOMAINS.map(d => ({
      date,
      brand,
      visibility: rnd(5, 95),
      sentiment: rnd(20, 90),
      position: parseFloat((Math.random() * 9 + 1).toFixed(1)),
      domain: d.domain,
      domain_type: d.domain_type,
    }))
  )
);
