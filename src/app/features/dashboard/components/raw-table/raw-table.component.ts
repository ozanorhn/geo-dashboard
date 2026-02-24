import { Component, Input, OnChanges, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GenericRow } from '../../../../core/models/interfaces';

type SortDir = 'asc' | 'desc' | null;

const PAGE_SIZE = 20;

function isUrl(val: unknown): boolean {
  return typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? val.toLocaleString() : val.toFixed(4);
  }
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
}

function prettyCol(col: string): string {
  return col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

@Component({
  selector: 'app-raw-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (data.length === 0) {
      <div class="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
        No data found for your account.
      </div>
    } @else {
      <div class="space-y-3">
        <!-- Search -->
        <input
          type="search"
          placeholder="Search all columns…"
          [(ngModel)]="query"
          (ngModelChange)="onSearch()"
          class="input-base max-w-xs text-sm"
        />

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
          <table class="table-base w-full text-sm text-left">
            <thead>
              <tr>
                @for (col of columns; track col) {
                  <th
                    class="th-sortable whitespace-nowrap"
                    (click)="sort(col)"
                  >
                    {{ prettyCol(col) }}
                    <span class="ml-1 text-xs">
                      @if (sortCol() === col) {
                        {{ sortDir() === 'asc' ? '↑' : '↓' }}
                      } @else {
                        <span class="text-slate-300 dark:text-slate-600">↕</span>
                      }
                    </span>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of pageData(); track $index) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  @for (col of columns; track col) {
                    <td class="px-4 py-3 whitespace-nowrap max-w-xs truncate">
                      @if (isUrl(row[col])) {
                        <a
                          [href]="asString(row[col])"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-primary-600 hover:underline"
                          [title]="asString(row[col])"
                        >
                          {{ truncateUrl(asString(row[col])) }}
                        </a>
                      } @else {
                        <span [title]="formatValue(row[col])">{{ formatValue(row[col]) }}</span>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="flex items-center justify-between pt-2">
            <p class="text-xs text-slate-400 dark:text-slate-500">
              {{ sorted().length.toLocaleString() }} rows — page {{ page() }} of {{ totalPages() }}
            </p>
            <div class="flex gap-2">
              <button
                [disabled]="page() === 1"
                (click)="prevPage()"
                class="btn-secondary text-xs py-1 px-3 disabled:opacity-40"
              >Previous</button>
              <button
                [disabled]="page() === totalPages()"
                (click)="nextPage()"
                class="btn-secondary text-xs py-1 px-3 disabled:opacity-40"
              >Next</button>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class RawTableComponent implements OnChanges {
  @Input() data: GenericRow[] = [];

  columns: string[] = [];
  query = '';

  sortCol = signal<string | null>(null);
  sortDir = signal<SortDir>(null);
  page    = signal(1);

  // Helpers exposed to template
  readonly prettyCol   = prettyCol;
  readonly isUrl       = isUrl;
  readonly formatValue = formatValue;

  asString(val: unknown): string { return String(val); }
  truncateUrl(url: string): string {
    const stripped = url.replace(/^https?:\/\//, '').substring(0, 50);
    return url.length > 50 ? stripped + '…' : stripped;
  }

  filtered = signal<GenericRow[]>([]);

  sorted = computed(() => {
    const col = this.sortCol();
    const dir = this.sortDir();
    const src = this.filtered();
    if (!col || !dir) return src;
    return [...src].sort((a, b) => {
      const av = a[col], bv = b[col];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return dir === 'asc' ? cmp : -cmp;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.sorted().length / PAGE_SIZE)));

  pageData = computed(() =>
    this.sorted().slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE)
  );

  ngOnChanges(): void {
    this.columns = this.data.length > 0 ? Object.keys(this.data[0]) : [];
    this.applyFilter();
  }

  onSearch(): void {
    this.page.set(1);
    this.applyFilter();
  }

  private applyFilter(): void {
    const q = this.query.trim().toLowerCase();
    if (!q) { this.filtered.set(this.data); return; }
    this.filtered.set(
      this.data.filter(row => this.columns.some(col => String(row[col] ?? '').toLowerCase().includes(q)))
    );
  }

  sort(col: string): void {
    if (this.sortCol() !== col) { this.sortCol.set(col); this.sortDir.set('asc'); this.page.set(1); return; }
    if (this.sortDir() === 'asc') { this.sortDir.set('desc'); return; }
    this.sortCol.set(null); this.sortDir.set(null);
  }

  prevPage(): void { this.page.update(p => p - 1); }
  nextPage(): void { this.page.update(p => p + 1); }
}
