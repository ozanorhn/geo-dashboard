import { Component, Input, OnChanges, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RankedBrand, SortState } from '../../../../core/models/interfaces';

@Component({
  selector: 'app-brands-table',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100">
            <th class="text-left text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-8">#</th>
            <th class="text-left text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 pr-4 th-sortable"
                (click)="sort('brand')">Brand</th>
            <th class="text-right text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 px-3 th-sortable"
                (click)="sort('avgVisibility')">Visibility</th>
            <th class="text-right text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 px-3 th-sortable"
                (click)="sort('avgSentiment')">Sentiment</th>
            <th class="text-right text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 pl-3 th-sortable"
                (click)="sort('avgPosition')">Position</th>
          </tr>
        </thead>
        <tbody>
          @for (b of sorted(); track b.brand) {
            <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <td class="py-3 text-xs text-slate-400 font-medium">{{ b.rank }}</td>
              <td class="py-3 pr-4">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        [style.background]="b.color ?? '#94a3b8'"></span>
                  <span class="font-medium text-slate-800">{{ b.brand }}</span>
                </div>
              </td>
              <td class="py-3 px-3 text-right">
                <span class="text-slate-700 font-medium">
                  <span [class]="trendClass(b.trend)" class="mr-1 text-xs">{{ trendIcon(b.trend) }}</span>{{ b.avgVisibility | number:'1.0-1' }} %
                </span>
              </td>
              <td class="py-3 px-3 text-right">
                <span [class]="sentimentClass(b.avgSentiment)">{{ b.avgSentiment | number:'1.0-1' }}</span>
              </td>
              <td class="py-3 pl-3 text-right">
                <span class="text-slate-600 font-mono text-xs"># {{ b.avgPosition | number:'1.1-1' }}</span>
              </td>
            </tr>
          }
          @if (sorted().length === 0) {
            <tr>
              <td colspan="5" class="py-10 text-center text-slate-400 text-sm">
                No brand data available
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class BrandsTableComponent implements OnChanges {
  @Input() brands: RankedBrand[] = [];

  private _brands = signal<RankedBrand[]>([]);
  sortState       = signal<SortState>({ column: 'avgVisibility', direction: 'desc' });

  sorted = computed(() => {
    const { column, direction } = this.sortState();
    const copy = [...this._brands()];
    if (!direction) return copy;
    return copy.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[column];
      const bv = (b as unknown as Record<string, unknown>)[column];
      const cmp = typeof av === 'string' && typeof bv === 'string'
        ? av.localeCompare(bv)
        : (av as number) - (bv as number);
      return direction === 'asc' ? cmp : -cmp;
    });
  });

  ngOnChanges(): void {
    this._brands.set(this.brands);
  }

  sort(column: string): void {
    this.sortState.update(s =>
      s.column === column
        ? { column, direction: s.direction === 'asc' ? 'desc' : s.direction === 'desc' ? null : 'asc' }
        : { column, direction: 'asc' }
    );
  }

  trendIcon(trend: string): string {
    return trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—';
  }

  trendClass(trend: string): string {
    if (trend === 'up')   return 'text-green-500';
    if (trend === 'down') return 'text-red-400';
    return 'text-slate-400';
  }

  sentimentClass(val: number): string {
    if (val >= 70) return 'text-green-600 font-medium';
    if (val >= 40) return 'text-amber-600 font-medium';
    return 'text-red-500 font-medium';
  }
}
