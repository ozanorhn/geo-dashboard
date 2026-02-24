import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { VisibilityData, FilterState } from '../models/interfaces';
import { PLACEHOLDER_DATA } from '../data/placeholder.data';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;
type SupabaseResult = { data: AnyRow[] | null; error: unknown };

// brand_visibility_history columns:
// id, report_date, brand_id, brand_name, visibility, visibility_percent,
// visibility_count, visibility_total, position_avg, sentiment_avg, created_at, user_id

@Injectable({ providedIn: 'root' })
export class SupabaseDataService {
  constructor(private readonly auth: AuthService) {}

  /** Primary: brand_visibility_history → VisibilityData[] for charts */
  fetchBrandVisibility(filters: FilterState): Observable<VisibilityData[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = this.auth.getClient()
      .from('brand_visibility_history')
      .select('*')
      .order('report_date', { ascending: true });

    // Server-side date filters using the real column name
    if (filters.dateFrom) query = query.gte('report_date', filters.dateFrom);
    if (filters.dateTo)   query = query.lte('report_date', filters.dateTo);
    if (filters.brands?.length) query = query.in('brand_name', filters.brands);

    return from(query as unknown as Promise<SupabaseResult>).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('[SupabaseDataService] brand_visibility_history error:', error);
          throw error;
        }
        if (!data || data.length === 0) {
          console.warn('[SupabaseDataService] brand_visibility_history: no rows — using placeholder');
          return PLACEHOLDER_DATA;
        }
        return data.map(r => ({
          date:        String(r['report_date'] ?? '').split('T')[0],
          brand:       String(r['brand_name'] ?? ''),
          visibility:  Number(r['visibility_percent'] ?? r['visibility'] ?? 0),
          sentiment:   Number(r['sentiment_avg'] ?? 0),
          position:    Number(r['position_avg'] ?? 0),
          domain:      String(r['brand_name'] ?? ''),   // no domain col → use brand as fallback
          domain_type: String(r['brand_id'] ?? ''),     // no domain_type col → brand_id as fallback
        } as VisibilityData));
      }),
      catchError(err => {
        console.error('[SupabaseDataService] brand_visibility_history fetch failed:', err);
        return of(PLACEHOLDER_DATA);
      }),
    );
  }

  /** Raw rows from brand_visibility_history for table display */
  fetchBrandHistoryRaw(): Observable<AnyRow[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = this.auth.getClient()
      .from('brand_visibility_history')
      .select('*')
      .order('report_date', { ascending: false });

    return from(query as unknown as Promise<SupabaseResult>).pipe(
      map(({ data }) => data ?? []),
      catchError(() => of([])),
    );
  }

  /** Secondary: ai_visibility_urls — raw rows for generic table */
  fetchAiUrls(): Observable<AnyRow[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = this.auth.getClient()
      .from('ai_visibility_urls')
      .select('*')
      .order('usage_count', { ascending: false });

    return from(query as unknown as Promise<SupabaseResult>).pipe(
      map(({ data }) => data ?? []),
      catchError(() => of([])),
    );
  }

  /** Secondary: llm_domain_usage — raw rows for generic table */
  fetchLlmUsage(): Observable<AnyRow[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = this.auth.getClient().from('llm_domain_usage').select('*');

    return from(query as unknown as Promise<SupabaseResult>).pipe(
      map(({ data }) => data ?? []),
      catchError(() => of([])),
    );
  }
}
