import { Component, Input, OnChanges, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DomainTableRow, SortState } from '../../../../core/models/interfaces';

@Component({
  selector: 'app-source-table',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="overflow-x-auto">
      <table class="table-base">
        <thead class="bg-slate-50 dark:bg-slate-800/50">
          <tr>
            @for (col of columns; track col.key) {
              <th class="px-4 py-3 th-sortable text-slate-500 dark:text-slate-400"
                  (click)="sort(col.key)">
                <span class="flex items-center gap-1">
                  {{ col.label }}
                  <span class="text-slate-300 dark:text-slate-600 text-xs">{{ sortIcon(col.key) }}</span>
                </span>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of sorted(); track row.domain) {
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <td class="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                {{ row.domain }}
              </td>
              <td class="px-4 py-3">
                <span class="badge bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {{ row.domainType }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-sm">
                {{ row.avgVisibility | number:'1.1-1' }}%
              </td>
              <td class="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-sm">
                {{ row.avgSentiment | number:'1.1-1' }}
              </td>
              <td class="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">
                {{ row.mentions }}
              </td>
            </tr>
          }
          @if (sorted().length === 0) {
            <tr>
              <td colspan="5" class="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                No source data available
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class SourceTableComponent implements OnChanges {
  @Input() rows: DomainTableRow[] = [];

  columns = [
    { key: 'domain',         label: 'Domain'        },
    { key: 'domainType',     label: 'Type'          },
    { key: 'avgVisibility',  label: 'Avg Visibility'},
    { key: 'avgSentiment',   label: 'Avg Sentiment' },
    { key: 'mentions',       label: 'Mentions'      },
  ];

  private _rows  = signal<DomainTableRow[]>([]);
  sortState      = signal<SortState>({ column: 'avgVisibility', direction: 'desc' });

  sorted = computed(() => {
    const { column, direction } = this.sortState();
    const copy = [...this._rows()];
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
    this._rows.set(this.rows);
  }

  sort(column: string): void {
    this.sortState.update(s =>
      s.column === column
        ? { column, direction: s.direction === 'asc' ? 'desc' : s.direction === 'desc' ? null : 'asc' }
        : { column, direction: 'asc' }
    );
  }

  sortIcon(column: string): string {
    const s = this.sortState();
    if (s.column !== column) return '↕';
    return s.direction === 'asc' ? '↑' : s.direction === 'desc' ? '↓' : '↕';
  }
}
