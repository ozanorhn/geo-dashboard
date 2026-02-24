import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  HostListener,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FilterState } from '../../../../core/models/interfaces';

interface DatePreset { label: string; days: number; }

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="py-3 space-y-2.5">

      <!-- ─── ROW 1: Date presets + date range label/inputs + reset ─── -->
      <div class="flex flex-wrap items-center gap-2">

        <!-- Preset pill group -->
        <div class="flex items-center gap-0.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          @for (p of datePresets; track p.days) {
            <button type="button" (click)="applyPreset(p.days)"
              [class]="activePreset() === p.days
                ? 'px-3 h-8 rounded-md text-sm font-semibold bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600 transition-all'
                : 'px-3 h-8 rounded-md text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors'">
              {{ p.label }}
            </button>
          }
          <div class="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
          <button type="button" (click)="toggleCustomDate()"
            [class]="showCustomDate()
              ? 'px-3 h-8 rounded-md text-sm font-semibold bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600 transition-all'
              : 'px-3 h-8 rounded-md text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors'">
            Custom
          </button>
        </div>

        <!-- Read-only date range label (shown when a preset is active) -->
        @if (!showCustomDate()) {
          <span class="flex items-center gap-2 px-3 h-9 rounded-lg
                       border border-slate-200 dark:border-slate-700
                       bg-white dark:bg-slate-800
                       text-sm text-slate-600 dark:text-slate-300 select-none">
            <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" stroke-width="1.75">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path stroke-linecap="round" d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            {{ formatDate(local.dateFrom) }}&nbsp;–&nbsp;{{ formatDate(local.dateTo) }}
          </span>
        }

        <!-- Custom date range inputs (shown when "Custom" is active) -->
        @if (showCustomDate()) {
          <div class="flex items-center gap-2 px-3 h-9 rounded-lg
                      border border-primary-400 dark:border-primary-500
                      bg-white dark:bg-slate-800
                      ring-2 ring-primary-100 dark:ring-primary-900/40 transition-all">
            <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" stroke-width="1.75">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path stroke-linecap="round" d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            <input type="date"
              [(ngModel)]="local.dateFrom"
              (ngModelChange)="onCustomDateChange()"
              class="bg-transparent border-none outline-none text-sm text-slate-700
                     dark:text-slate-200 cursor-pointer"
              style="min-width: 128px;">
            <span class="text-slate-300 dark:text-slate-600 text-lg font-light select-none">–</span>
            <input type="date"
              [(ngModel)]="local.dateTo"
              (ngModelChange)="onCustomDateChange()"
              class="bg-transparent border-none outline-none text-sm text-slate-700
                     dark:text-slate-200 cursor-pointer"
              style="min-width: 128px;">
          </div>
        }

        <div class="flex-1 min-w-0"></div>

        <!-- Reset button -->
        <button type="button" (click)="reset()"
          class="flex items-center gap-1.5 h-9 px-3.5 rounded-lg
                 border border-transparent text-sm text-slate-500 dark:text-slate-400
                 hover:border-slate-200 dark:hover:border-slate-700
                 hover:bg-slate-100 dark:hover:bg-slate-800
                 hover:text-slate-700 dark:hover:text-slate-200 transition-all">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"/>
          </svg>
          Reset
        </button>

      </div>

      <!-- ─── ROW 2: Brand filter dropdown + selected brand chips ─── -->
      @if (availableBrands.length > 0) {
        <div class="flex flex-wrap items-center gap-2">

          <!-- Dropdown host (data attr used for click-outside detection) -->
          <div class="relative" data-filter-brand-host>

            <!-- Trigger button -->
            <button type="button" (click)="toggleBrandDropdown($event)"
              class="flex items-center gap-2 h-9 px-3.5 rounded-lg border text-sm font-medium
                     bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                     hover:border-slate-300 dark:hover:border-slate-600
                     focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-600
                     transition-all"
              [class.border-primary-400]="brandDropdownOpen()"
              [class.dark:border-primary-500]="brandDropdownOpen()"
              [class.ring-2]="brandDropdownOpen()"
              [class.ring-primary-100]="brandDropdownOpen()"
              [class.border-slate-200]="!brandDropdownOpen()"
              [class.dark:border-slate-700]="!brandDropdownOpen()">
              <!-- Brand icon -->
              <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" stroke-width="1.75">
                <circle cx="12" cy="8" r="4"/>
                <path stroke-linecap="round" d="M4 21v-1a8 8 0 0 1 16 0v1"/>
              </svg>
              <span>Brands</span>
              @if (local.brands.length > 0) {
                <span class="flex items-center justify-center w-5 h-5 rounded-full
                             bg-primary-500 text-white text-xs font-bold leading-none flex-shrink-0">
                  {{ local.brands.length }}
                </span>
              }
              <!-- Chevron -->
              <svg class="w-3.5 h-3.5 text-slate-400 ml-0.5 transition-transform duration-150"
                   [class.rotate-180]="brandDropdownOpen()"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            <!-- Dropdown panel -->
            @if (brandDropdownOpen()) {
              <div class="absolute left-0 top-full mt-1.5 z-40 w-60
                          bg-white dark:bg-slate-800
                          rounded-xl border border-slate-200 dark:border-slate-700
                          shadow-lg overflow-hidden animate-fade-in">

                <!-- Search (only when > 6 brands) -->
                @if (availableBrands.length > 6) {
                  <div class="px-2 pt-2 pb-1">
                    <input type="text"
                      [ngModel]="brandSearch()"
                      (ngModelChange)="brandSearch.set($event)"
                      placeholder="Search brands…"
                      class="w-full px-3 py-2 text-sm rounded-lg border border-slate-200
                             dark:border-slate-600 bg-slate-50 dark:bg-slate-700
                             text-slate-700 dark:text-slate-200
                             placeholder-slate-400 dark:placeholder-slate-500
                             outline-none focus:ring-1 focus:ring-primary-500 transition">
                  </div>
                }

                <!-- Select all / Clear header -->
                <div class="flex items-center justify-between px-3 py-2
                            border-b border-slate-100 dark:border-slate-700">
                  <button type="button" (click)="selectAllBrands()"
                    class="text-xs font-semibold text-primary-600 dark:text-primary-400
                           hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
                    Select all
                  </button>
                  <button type="button" (click)="clearBrands()"
                    class="text-xs text-slate-400 dark:text-slate-500
                           hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    Clear
                  </button>
                </div>

                <!-- Brand list -->
                <ul class="max-h-52 overflow-y-auto py-1">
                  @for (brand of filteredBrands(); track brand) {
                    <li>
                      <label class="flex items-center gap-3 px-3 py-2.5 cursor-pointer
                                    hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors">
                        <input type="checkbox"
                          [checked]="isBrandSelected(brand)"
                          (change)="toggleBrand(brand)"
                          class="w-4 h-4 rounded border-slate-300 dark:border-slate-500
                                 text-primary-600 focus:ring-primary-500
                                 dark:bg-slate-700 cursor-pointer flex-shrink-0">
                        <span class="text-sm text-slate-700 dark:text-slate-200 truncate">
                          {{ brand }}
                        </span>
                      </label>
                    </li>
                  }
                  @if (filteredBrands().length === 0) {
                    <li class="px-3 py-5 text-center text-xs text-slate-400 dark:text-slate-500">
                      No results for "{{ brandSearch() }}"
                    </li>
                  }
                </ul>

              </div>
            }

          </div>

          <!-- Selected brand chips (removable tags) -->
          @for (brand of local.brands; track brand) {
            <span class="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5
                         rounded-full text-xs font-medium
                         bg-primary-50 dark:bg-primary-900/30
                         border border-primary-200 dark:border-primary-700
                         text-primary-700 dark:text-primary-300">
              {{ brand }}
              <button type="button"
                (click)="removeBrand(brand)"
                class="flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0
                       hover:bg-primary-200 dark:hover:bg-primary-700
                       text-primary-400 dark:text-primary-400 transition-colors"
                [attr.aria-label]="'Remove ' + brand">
                <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/>
                </svg>
              </button>
            </span>
          }

          @if (local.brands.length > 1) {
            <button type="button" (click)="clearBrands()"
              class="text-xs text-slate-400 dark:text-slate-500
                     hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              Clear all
            </button>
          }

        </div>
      }

    </div>
  `,
})
export class FilterBarComponent implements OnChanges {
  @Input() availableBrands: string[]      = [];
  @Input() availableDomainTypes: string[] = [];
  @Input() currentFilter!: FilterState;
  @Output() filterChanged = new EventEmitter<FilterState>();

  local: FilterState = { dateFrom: '', dateTo: '', brands: [], domainTypes: [] };

  brandDropdownOpen = signal(false);
  showCustomDate    = signal(false);
  activePreset      = signal<number>(30);  // 0 = custom
  brandSearch       = signal('');

  readonly datePresets: DatePreset[] = [
    { label: '7 days',  days: 7  },
    { label: '30 days', days: 30 },
    { label: '90 days', days: 90 },
  ];

  filteredBrands = computed(() => {
    const q = this.brandSearch().trim().toLowerCase();
    return q
      ? this.availableBrands.filter(b => b.toLowerCase().includes(q))
      : this.availableBrands;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentFilter'] && this.currentFilter) {
      this.local = {
        ...this.currentFilter,
        brands:      [...this.currentFilter.brands],
        domainTypes: [...this.currentFilter.domainTypes],
      };
      this.syncActivePreset();
    }
  }

  // ── Click-outside: close dropdown when clicking anywhere else ──
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.brandDropdownOpen()) return;
    const target = event.target as HTMLElement;
    if (!target.closest('[data-filter-brand-host]')) {
      this.brandDropdownOpen.set(false);
      this.brandSearch.set('');
    }
  }

  // ── Dropdown ──
  toggleBrandDropdown(event: MouseEvent): void {
    event.stopPropagation();
    const next = !this.brandDropdownOpen();
    this.brandDropdownOpen.set(next);
    if (!next) this.brandSearch.set('');
  }

  isBrandSelected(brand: string): boolean {
    return this.local.brands.includes(brand);
  }

  toggleBrand(brand: string): void {
    this.local = {
      ...this.local,
      brands: this.local.brands.includes(brand)
        ? this.local.brands.filter(b => b !== brand)
        : [...this.local.brands, brand],
    };
    this.emit();
  }

  removeBrand(brand: string): void {
    this.local = { ...this.local, brands: this.local.brands.filter(b => b !== brand) };
    this.emit();
  }

  selectAllBrands(): void {
    this.local = { ...this.local, brands: [...this.availableBrands] };
    this.emit();
  }

  clearBrands(): void {
    this.local = { ...this.local, brands: [] };
    this.emit();
  }

  // ── Presets ──
  applyPreset(days: number): void {
    this.local = {
      ...this.local,
      dateFrom: this.toIsoDate(new Date(Date.now() - days * 86_400_000)),
      dateTo:   this.toIsoDate(new Date()),
    };
    this.activePreset.set(days);
    this.showCustomDate.set(false);
    this.emit();
  }

  toggleCustomDate(): void {
    const next = !this.showCustomDate();
    this.showCustomDate.set(next);
    if (next) this.activePreset.set(0);
  }

  onCustomDateChange(): void {
    this.activePreset.set(0);
    this.emit();
  }

  // ── Reset ──
  reset(): void {
    this.local = {
      dateFrom:    this.toIsoDate(new Date(Date.now() - 30 * 86_400_000)),
      dateTo:      this.toIsoDate(new Date()),
      brands:      [],
      domainTypes: [],
    };
    this.activePreset.set(30);
    this.showCustomDate.set(false);
    this.brandDropdownOpen.set(false);
    this.brandSearch.set('');
    this.emit();
  }

  emit(): void {
    this.filterChanged.emit({
      ...this.local,
      brands:      [...this.local.brands],
      domainTypes: [...this.local.domainTypes],
    });
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}. ${this.monthName(Number(m))} ${y}`;
  }

  private monthName(m: number): string {
    return ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][m - 1] ?? '';
  }

  private toIsoDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  private syncActivePreset(): void {
    const today = this.toIsoDate(new Date());
    if (this.local.dateTo !== today) {
      this.activePreset.set(0);
      this.showCustomDate.set(true);
      return;
    }
    const diff = Math.round(
      (new Date(this.local.dateTo).getTime() - new Date(this.local.dateFrom).getTime())
      / 86_400_000
    );
    const match = this.datePresets.find(p => p.days === diff);
    this.activePreset.set(match ? match.days : 0);
    this.showCustomDate.set(!match);
  }
}
