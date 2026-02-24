import { Injectable } from '@angular/core';
import {
  VisibilityData,
  BrandGroup,
  BrandTimeSeries,
  TimeSeriesData,
  BrandSentiment,
  RankedBrand,
  DomainTypeAggregate,
  DomainTableRow,
} from '../models/interfaces';

const COLOR_PALETTE = [
  '#0ea5e9', // blue
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#22c55e', // green
  '#ef4444', // red
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

const BRAND_COLOR_MAP = new Map<string, string>();
let colorIdx = 0;

function getBrandColor(brand: string): string {
  if (!BRAND_COLOR_MAP.has(brand)) {
    BRAND_COLOR_MAP.set(brand, COLOR_PALETTE[colorIdx % COLOR_PALETTE.length]);
    colorIdx++;
  }
  return BRAND_COLOR_MAP.get(brand)!;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2));
}

@Injectable({ providedIn: 'root' })
export class DataTransformService {

  groupByBrand(data: VisibilityData[]): BrandGroup[] {
    const map = new Map<string, VisibilityData[]>();
    for (const row of data) {
      const list = map.get(row.brand) ?? [];
      list.push(row);
      map.set(row.brand, list);
    }
    return Array.from(map.entries()).map(([brand, rows]) => ({ brand, data: rows }));
  }

  generateTimeSeries(data: VisibilityData[]): TimeSeriesData {
    const dateSet = new Set(data.map(d => d.date));
    const dates = Array.from(dateSet).sort();
    const groups = this.groupByBrand(data);

    const series: BrandTimeSeries[] = groups.map(g => {
      const byDate = new Map<string, number[]>();
      for (const row of g.data) {
        const vals = byDate.get(row.date) ?? [];
        vals.push(row.visibility);
        byDate.set(row.date, vals);
      }
      const visibility = dates.map(d => avg(byDate.get(d) ?? [0]));
      return { brand: g.brand, visibility, color: getBrandColor(g.brand) };
    });

    return { dates, series };
  }

  avgSentiment(data: VisibilityData[]): BrandSentiment[] {
    return this.groupByBrand(data).map(g => ({
      brand: g.brand,
      avgSentiment:  avg(g.data.map(d => d.sentiment)),
      avgVisibility: avg(g.data.map(d => d.visibility)),
      avgPosition:   avg(g.data.map(d => d.position)),
    }));
  }

  rankBrands(data: VisibilityData[]): RankedBrand[] {
    const groups    = this.groupByBrand(data);
    const sentMap   = new Map(this.avgSentiment(data).map(s => [s.brand, s]));

    const ranked = groups.map(g => {
      const sorted    = [...g.data].sort((a, b) => a.date.localeCompare(b.date));
      const mid       = Math.floor(sorted.length / 2);
      const firstHalf = avg(sorted.slice(0, mid).map(d => d.visibility));
      const lastHalf  = avg(sorted.slice(mid).map(d => d.visibility));
      const trend: 'up' | 'down' | 'stable' =
        lastHalf > firstHalf + 1 ? 'up' :
        lastHalf < firstHalf - 1 ? 'down' : 'stable';

      const s = sentMap.get(g.brand)!;
      return { rank: 0, brand: g.brand, avgVisibility: s.avgVisibility,
               avgSentiment: s.avgSentiment, avgPosition: s.avgPosition, trend };
    });

    ranked.sort((a, b) => b.avgVisibility - a.avgVisibility);
    ranked.forEach((r, i) => (r.rank = i + 1));
    return ranked;
  }

  aggregateDomainTypes(data: VisibilityData[]): DomainTypeAggregate[] {
    const map = new Map<string, number>();
    for (const row of data) {
      map.set(row.domain_type, (map.get(row.domain_type) ?? 0) + row.visibility);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  buildDomainTable(data: VisibilityData[]): DomainTableRow[] {
    const map = new Map<string, VisibilityData[]>();
    for (const row of data) {
      const list = map.get(row.domain) ?? [];
      list.push(row);
      map.set(row.domain, list);
    }
    return Array.from(map.entries())
      .map(([domain, rows]) => ({
        domain,
        domainType:    rows[0].domain_type,
        avgVisibility: avg(rows.map(r => r.visibility)),
        avgSentiment:  avg(rows.map(r => r.sentiment)),
        mentions:      rows.length,
      }))
      .sort((a, b) => b.avgVisibility - a.avgVisibility);
  }

  extractBrands(data: VisibilityData[]): string[] {
    return Array.from(new Set(data.map(d => d.brand))).sort();
  }

  extractDomainTypes(data: VisibilityData[]): string[] {
    return Array.from(new Set(data.map(d => d.domain_type))).sort();
  }
}
