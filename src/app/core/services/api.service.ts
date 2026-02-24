import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { VisibilityData, FilterState } from '../models/interfaces';
import { SupabaseDataService } from './supabase-data.service';
import { PLACEHOLDER_DATA } from '../data/placeholder.data';

@Injectable({ providedIn: 'root' })
export class ApiService {
  /** True when placeholder data is being shown instead of live data */
  readonly isUsingPlaceholder = signal(false);

  constructor(private readonly supabaseData: SupabaseDataService) {}

  fetchData(filters: FilterState): Observable<VisibilityData[]> {
    return this.supabaseData.fetchBrandVisibility(filters).pipe(
      tap(data => this.isUsingPlaceholder.set(data === PLACEHOLDER_DATA)),
    );
  }
}
