import {
  Component, OnInit, OnDestroy, signal, computed, inject,
} from '@angular/core';
import { Subject, forkJoin, takeUntil } from 'rxjs';

import { ApiService }            from '../../core/services/api.service';
import { SupabaseDataService }   from '../../core/services/supabase-data.service';
import { DataTransformService }  from '../../core/services/data-transform.service';
import { AuthService }           from '../../core/services/auth.service';
import { ThemeService }          from '../../core/services/theme.service';

import {
  VisibilityData, FilterState, GenericRow,
  RankedBrand, TimeSeriesData, DomainTypeAggregate,
} from '../../core/models/interfaces';

import { FilterBarComponent }       from './components/filter-bar/filter-bar.component';
import { VisibilityChartComponent } from './components/visibility-chart/visibility-chart.component';
import { BrandsTableComponent }     from './components/brands-table/brands-table.component';
import { DonutChartComponent }      from './components/donut-chart/donut-chart.component';
import { LoadingSpinnerComponent }  from '../../shared/components/loading-spinner/loading-spinner.component';

interface SourceRow {
  domain: string;
  url: string;
  pct: number;
  avgCitations: string;
  type: string;
}

interface LlmRow {
  domain: string;
  date: string;
  model: string;
  type: string;
  usageCount: number;
  avgCitations: string;
}

interface ChatConversation {
  id: string;
  modelRaw: string;
  model: string;
  query: string;
  response: string;
  sourcesCount: number;
  brandsCount: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    FilterBarComponent,
    VisibilityChartComponent,
    BrandsTableComponent,
    DonutChartComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <div class="min-h-screen bg-[#f7f8fa] dark:bg-surface-dark">

      <!-- ══════════════════════════════════════
           NAV BAR
      ══════════════════════════════════════ -->
      <header class="sticky top-0 z-50 bg-white dark:bg-surface-card-dark
                     border-b border-slate-200 dark:border-slate-700">
        <div class="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">

          <!-- Logo + page title -->
          <div class="flex items-center gap-3">
            <img src="assets/logo.png" alt="Logo" class="h-6 object-contain"
                 (error)="hideImg($event)">
            <span class="text-sm font-semibold text-slate-800 dark:text-white">Overview</span>
            @if (api.isUsingPlaceholder()) {
              <span class="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30
                           dark:text-amber-400 text-xs">Demo</span>
            }
          </div>

          <!-- Right controls -->
          <div class="flex items-center gap-3">
            <button (click)="theme.toggle()"
                    class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100
                           dark:hover:bg-slate-700 rounded-lg transition-colors"
                    [title]="theme.isDark() ? 'Light mode' : 'Dark mode'">
              @if (theme.isDark()) {
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707
                       M6.343 17.657l-.707.707M17.657 17.657l-.707-.707
                       M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
              } @else {
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21
                       a9.003 9.003 0 008.354-5.646z"/>
                </svg>
              }
            </button>
            <span class="hidden sm:block text-xs text-slate-400 dark:text-slate-500">
              {{ auth.user()?.email }}
            </span>
            <button (click)="logout()"
                    class="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700
                           dark:hover:text-slate-200 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <!-- ══════════════════════════════════════
           FILTER BAR
      ══════════════════════════════════════ -->
      <div class="bg-white dark:bg-surface-card-dark border-b border-slate-200 dark:border-slate-700">
        <div class="max-w-screen-2xl mx-auto px-6">
          <app-filter-bar
            [availableBrands]="availableBrands()"
            [availableDomainTypes]="[]"
            [currentFilter]="currentFilter()"
            (filterChanged)="onFilterChange($event)" />
        </div>
      </div>

      <!-- ══════════════════════════════════════
           MAIN CONTENT
      ══════════════════════════════════════ -->
      <main class="max-w-screen-2xl mx-auto px-6 py-5 space-y-5">

        @if (isLoading()) {
          <div class="flex items-center justify-center py-28">
            <app-loading-spinner size="lg" />
            <span class="ml-4 text-slate-400 dark:text-slate-500 text-sm">Loading data…</span>
          </div>
        } @else {

          <!-- ── ROW 1: Visibility chart (3/5) + Brands table (2/5) ── -->
          <div class="grid grid-cols-1 xl:grid-cols-5 gap-5">

            <!-- Visibility Chart -->
            <div class="xl:col-span-3 bg-white dark:bg-surface-card-dark rounded-xl
                        border border-slate-200 dark:border-slate-700 p-5">
              <div class="flex items-center justify-between mb-1">
                <p class="text-xs text-slate-400 dark:text-slate-500">
                  <span class="font-medium text-slate-600 dark:text-slate-300">Visibility</span>
                  <span class="mx-1.5">·</span>Percentage of chats mentioning each brand
                </p>
                <!-- D / W / M granularity -->
                <div class="flex items-center gap-0.5">
                  @for (g of ['D','W','M']; track g) {
                    <button
                      (click)="setGranularity(g)"
                      [class]="granularity() === g
                        ? 'w-7 h-7 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                        : 'w-7 h-7 rounded text-xs font-medium text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'">
                      {{ g }}
                    </button>
                  }
                </div>
              </div>
              <app-visibility-chart [timeSeriesData]="chartTimeSeriesData()" />
            </div>

            <!-- Brands Table -->
            <div class="xl:col-span-2 bg-white dark:bg-surface-card-dark rounded-xl
                        border border-slate-200 dark:border-slate-700 p-5">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-baseline gap-2">
                  <span class="text-sm font-semibold text-slate-800 dark:text-white">Brands</span>
                  <span class="text-xs text-slate-400 dark:text-slate-500">
                    · Top brands across LLMs
                  </span>
                </div>
                <span class="text-xs text-slate-400 dark:text-slate-500">
                  {{ rankedBrandsWithColor().length }} tracked
                </span>
              </div>
              <app-brands-table [brands]="rankedBrandsWithColor()" />
            </div>
          </div>

          <!-- ── ROW 2: Sources donut (2/5) + Sources table (3/5) ── -->
          <div class="grid grid-cols-1 xl:grid-cols-5 gap-5">

            <!-- Donut – AI Source Classifications -->
            <div class="xl:col-span-2 bg-white dark:bg-surface-card-dark rounded-xl
                        border border-slate-200 dark:border-slate-700 p-5">
              <div class="flex items-baseline gap-2 mb-1">
                <span class="text-sm font-semibold text-slate-800 dark:text-white">Top Sources</span>
                <span class="text-xs text-slate-400 dark:text-slate-500">
                  · Sources across active models
                </span>
              </div>
              <app-donut-chart [aggregates]="aiClassificationAggs()" />
            </div>

            <!-- Sources / Domain table -->
            <div class="xl:col-span-3 bg-white dark:bg-surface-card-dark rounded-xl
                        border border-slate-200 dark:border-slate-700 p-5">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-baseline gap-2">
                  <span class="text-sm font-semibold text-slate-800 dark:text-white">AI-Cited Domains</span>
                  <span class="text-xs text-slate-400 dark:text-slate-500">
                    · {{ sourcesData().length }} domains
                  </span>
                </div>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-slate-100 dark:border-slate-700">
                      <th class="text-left text-xs font-medium text-slate-400 dark:text-slate-500
                                 uppercase tracking-wider pb-3 pr-4">Domain</th>
                      <th class="text-right text-xs font-medium text-slate-400 dark:text-slate-500
                                 uppercase tracking-wider pb-3 px-4">Used</th>
                      <th class="text-right text-xs font-medium text-slate-400 dark:text-slate-500
                                 uppercase tracking-wider pb-3 px-4">Avg. Citations</th>
                      <th class="text-left text-xs font-medium text-slate-400 dark:text-slate-500
                                 uppercase tracking-wider pb-3 pl-4">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of sourcesData(); track row.domain) {
                      <tr class="border-b border-slate-50 dark:border-slate-800
                                 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td class="py-2.5 pr-4">
                          <div class="flex items-center gap-2">
                            <img [src]="'https://www.google.com/s2/favicons?domain=' + row.domain + '&sz=16'"
                                 class="w-4 h-4 rounded flex-shrink-0"
                                 (error)="hideFavicon($event)">
                            <a [href]="row.url" target="_blank" rel="noopener noreferrer"
                               class="font-medium text-slate-700 dark:text-slate-300
                                      hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                              {{ row.domain }}
                            </a>
                          </div>
                        </td>
                        <td class="py-2.5 px-4 text-right font-medium text-slate-600 dark:text-slate-400">
                          {{ row.pct }} %
                        </td>
                        <td class="py-2.5 px-4 text-right text-slate-500 dark:text-slate-400">
                          {{ row.avgCitations }}
                        </td>
                        <td class="py-2.5 pl-4">
                          <span [class]="'badge text-xs ' + typeClass(row.type)">
                            {{ row.type }}
                          </span>
                        </td>
                      </tr>
                    }
                    @if (sourcesData().length === 0) {
                      <tr>
                        <td colspan="4" class="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
                          No source data available
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ── LLM Domain Usage ── -->
          @if (llmUsageDisplay().length > 0) {
            <div class="bg-white dark:bg-surface-card-dark rounded-xl
                        border border-slate-200 dark:border-slate-700 p-5">

              <!-- Card header -->
              <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div class="flex items-baseline gap-2">
                  <span class="text-sm font-semibold text-slate-800 dark:text-white">LLM Domain Usage</span>
                  <span class="text-xs text-slate-400 dark:text-slate-500">
                    · {{ llmFiltered().length }} of {{ llmUsageDisplay().length }} entries
                  </span>
                </div>
                <!-- Search -->
                <input
                  type="text"
                  [value]="llmSearch()"
                  (input)="onLlmSearch($any($event.target).value)"
                  placeholder="Search domain or model…"
                  class="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700
                         bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200
                         placeholder-slate-400 dark:placeholder-slate-500
                         outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-600
                         transition w-56">
              </div>

              <!-- Type filter buttons -->
              <div class="flex flex-wrap gap-1.5 mb-4">
                @for (type of llmAvailableTypes(); track type) {
                  <button type="button"
                    (click)="setLlmTypeFilter(type)"
                    [class]="llmTypeFilter() === type
                      ? 'badge text-xs font-semibold ring-1 ring-inset ' + (type === 'ALL' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-800' : typeClass(type))
                      : 'badge text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors'">
                    {{ type === 'ALL' ? 'All types' : type }}
                  </button>
                }
              </div>

              <!-- Table -->
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-slate-100 dark:border-slate-700">
                      <th class="text-left text-xs font-medium text-slate-400 dark:text-slate-500
                                 uppercase tracking-wider pb-3 pr-4">Domain</th>
                      <th class="text-left text-xs font-medium text-slate-400 dark:text-slate-500
                                 uppercase tracking-wider pb-3 px-3">Model</th>
                      <th class="text-left text-xs font-medium text-slate-400 dark:text-slate-500
                                 uppercase tracking-wider pb-3 px-3">Type</th>
                      <th class="text-right text-xs font-medium text-slate-400 dark:text-slate-500
                                 uppercase tracking-wider pb-3 px-3">Usage Count</th>
                      <th class="text-right text-xs font-medium text-slate-400 dark:text-slate-500
                                 uppercase tracking-wider pb-3 pl-3">Avg. Citations</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of llmPaged(); track $index) {
                      <tr class="border-b border-slate-50 dark:border-slate-800/60
                                 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <!-- Domain -->
                        <td class="py-2.5 pr-4">
                          <div class="flex items-center gap-2">
                            <img [src]="'https://www.google.com/s2/favicons?domain=' + row.domain + '&sz=16'"
                                 class="w-4 h-4 rounded flex-shrink-0"
                                 (error)="hideFavicon($event)">
                            <span class="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                              {{ row.domain }}
                            </span>
                          </div>
                        </td>
                        <!-- Model -->
                        <td class="py-2.5 px-3">
                          <span [class]="'badge text-xs font-medium ' + modelClass(row.model)">
                            {{ row.model }}
                          </span>
                        </td>
                        <!-- Type -->
                        <td class="py-2.5 px-3">
                          <span [class]="'badge text-xs ' + typeClass(row.type)">
                            {{ row.type }}
                          </span>
                        </td>
                        <!-- Usage Count -->
                        <td class="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                          {{ row.usageCount.toLocaleString() }}
                        </td>
                        <!-- Avg. Citations -->
                        <td class="py-2.5 pl-3 text-right text-slate-500 dark:text-slate-400">
                          {{ row.avgCitations }}
                        </td>
                      </tr>
                    }
                    @if (llmPaged().length === 0) {
                      <tr>
                        <td colspan="5" class="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
                          No entries match your filter
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Pagination -->
              @if (llmTotalPages() > 1) {
                <div class="flex items-center justify-between mt-4 pt-4
                            border-t border-slate-100 dark:border-slate-700">
                  <span class="text-xs text-slate-400 dark:text-slate-500">
                    {{ (llmPage() - 1) * LLM_PAGE_SIZE + 1 }}–{{ llmMin(llmPage() * LLM_PAGE_SIZE, llmFiltered().length) }}
                    of {{ llmFiltered().length }}
                  </span>
                  <div class="flex items-center gap-1">
                    <button type="button"
                      (click)="prevLlmPage()"
                      [disabled]="llmPage() <= 1"
                      class="h-8 px-3 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700
                             text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800
                             disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      ← Prev
                    </button>
                    <span class="px-3 text-sm text-slate-500 dark:text-slate-400 min-w-[4rem] text-center">
                      {{ llmPage() }} / {{ llmTotalPages() }}
                    </span>
                    <button type="button"
                      (click)="nextLlmPage()"
                      [disabled]="llmPage() >= llmTotalPages()"
                      class="h-8 px-3 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700
                             text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800
                             disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      Next →
                    </button>
                  </div>
                </div>
              }

            </div>
          }

          <!-- ── AI Prompt Responses ── -->
          @if (convUsageDisplay().length > 0) {
            <div class="bg-white dark:bg-surface-card-dark rounded-xl
                        border border-slate-200 dark:border-slate-700 p-5">

              <!-- Card header -->
              <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div class="flex items-baseline gap-2">
                  <span class="text-sm font-semibold text-slate-800 dark:text-white">AI Prompt Responses</span>
                  <span class="text-xs text-slate-400 dark:text-slate-500">
                    · {{ convFiltered().length }} of {{ convUsageDisplay().length }} conversations
                  </span>
                </div>
                <input
                  type="text"
                  [value]="convSearch()"
                  (input)="onConvSearch($any($event.target).value)"
                  placeholder="Search query or response…"
                  class="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700
                         bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200
                         placeholder-slate-400 dark:placeholder-slate-500
                         outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-600
                         transition w-60">
              </div>

              <!-- Model filter -->
              <div class="flex flex-wrap gap-1.5 mb-4">
                @for (m of availableConvModels(); track m) {
                  <button type="button"
                    (click)="setConvModelFilter(m)"
                    [class]="convModelFilter() === m
                      ? 'badge text-xs font-semibold ring-1 ring-inset ' + (m === 'ALL' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-800' : modelClass(m))
                      : 'badge text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors'">
                    {{ m === 'ALL' ? 'All models' : m }}
                  </button>
                }
              </div>

              <!-- Conversation rows -->
              <div class="space-y-1.5">
                @for (conv of convFiltered(); track $index) {
                  <div class="border border-slate-100 dark:border-slate-700/60 rounded-xl overflow-hidden">

                    <!-- Row header — always visible, click to expand -->
                    <button type="button"
                      (click)="toggleConv(conv.id)"
                      class="w-full flex items-start gap-3 p-3.5 text-left
                             hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <!-- Model badge -->
                      <span [class]="'badge text-xs font-medium shrink-0 mt-0.5 ' + modelClass(conv.model)">
                        {{ conv.model || '—' }}
                      </span>
                      <!-- Query -->
                      <span class="flex-1 text-sm text-slate-700 dark:text-slate-200 line-clamp-1">
                        {{ conv.query || '(no query)' }}
                      </span>
                      <!-- Stats + chevron -->
                      <div class="flex items-center gap-2.5 shrink-0 text-xs">
                        @if (conv.sourcesCount > 0) {
                          <span class="text-slate-400 dark:text-slate-500">
                            {{ conv.sourcesCount }} src
                          </span>
                        }
                        @if (conv.brandsCount > 0) {
                          <span class="text-emerald-600 dark:text-emerald-400 font-medium">
                            {{ conv.brandsCount }} brands
                          </span>
                        }
                        <svg class="w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200"
                             [class.rotate-180]="expandedConvId() === conv.id"
                             fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </div>
                    </button>

                    <!-- Expanded body -->
                    @if (expandedConvId() === conv.id) {
                      <div class="border-t border-slate-100 dark:border-slate-700/60 p-4 space-y-4
                                  bg-slate-50/50 dark:bg-slate-800/20">

                        <!-- AI Response -->
                        <div>
                          <p class="text-[10px] font-semibold text-slate-400 dark:text-slate-500
                                    uppercase tracking-widest mb-2">Response</p>
                          <div class="max-h-56 overflow-y-auto rounded-lg
                                      bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700
                                      p-3.5 text-sm text-slate-600 dark:text-slate-300
                                      leading-relaxed whitespace-pre-wrap">
                            {{ conv.response || '—' }}
                          </div>
                        </div>

                        <!-- Stats row -->
                        @if (conv.sourcesCount > 0 || conv.brandsCount > 0) {
                          <div class="flex flex-wrap gap-2">
                            @if (conv.sourcesCount > 0) {
                              <span class="badge text-xs bg-slate-100 dark:bg-slate-700
                                           text-slate-600 dark:text-slate-300">
                                {{ conv.sourcesCount }} cited sources
                              </span>
                            }
                            @if (conv.brandsCount > 0) {
                              <span class="badge text-xs bg-emerald-50 dark:bg-emerald-900/20
                                           text-emerald-700 dark:text-emerald-400">
                                {{ conv.brandsCount }} brands mentioned
                              </span>
                            }
                          </div>
                        }

                      </div>
                    }

                  </div>
                }

                @if (convFiltered().length === 0) {
                  <div class="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
                    No conversations match your filter
                  </div>
                }
              </div>

            </div>
          }

        }
      </main>
    </div>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly auth    = inject(AuthService);
  readonly theme   = inject(ThemeService);
  readonly api     = inject(ApiService);
  private readonly supabaseData = inject(SupabaseDataService);
  private readonly transform    = inject(DataTransformService);
  private readonly destroy$     = new Subject<void>();

  // ── Raw state ──────────────────────────────────
  isLoading     = signal(true);
  rawData       = signal<VisibilityData[]>([]);
  aiUrls        = signal<GenericRow[]>([]);
  llmUsage      = signal<GenericRow[]>([]);
  conversations = signal<GenericRow[]>([]);
  granularity   = signal<'D' | 'W' | 'M'>('D');
  currentFilter = signal<FilterState>({
    dateFrom:    new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0],
    dateTo:      new Date().toISOString().split('T')[0],
    brands:      [],
    domainTypes: [],
  });

  // ── Derived: brand visibility ──────────────────
  availableBrands = computed(() => this.transform.extractBrands(this.rawData()));

  filteredData = computed(() => {
    const f = this.currentFilter();
    return this.rawData().filter(d =>
      d.date >= f.dateFrom &&
      d.date <= f.dateTo &&
      (f.brands.length === 0 || f.brands.includes(d.brand))
    );
  });

  timeSeriesData = computed<TimeSeriesData>(() =>
    this.transform.generateTimeSeries(this.filteredData())
  );

  rankedBrands = computed<RankedBrand[]>(() =>
    this.transform.rankBrands(this.filteredData())
  );

  // Merge brand colors from timeSeriesData into rankedBrands
  rankedBrandsWithColor = computed<RankedBrand[]>(() => {
    const colorMap = new Map(this.timeSeriesData().series.map(s => [s.brand, s.color]));
    return this.rankedBrands().map(b => ({
      ...b,
      color: colorMap.get(b.brand) ?? '#94a3b8',
    }));
  });

  // Chart with D/W/M aggregation
  chartTimeSeriesData = computed<TimeSeriesData>(() => {
    const ts = this.timeSeriesData();
    const g  = this.granularity();
    if (g === 'D' || ts.dates.length === 0) return ts;

    const bucketKey = (date: string): string => {
      const d = new Date(date);
      if (g === 'W') {
        const jan1 = new Date(d.getFullYear(), 0, 1);
        const week = Math.ceil(
          ((d.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7
        );
        return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const buckets = new Map<string, number[]>();
    ts.dates.forEach((date, i) => {
      const key = bucketKey(date);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(i);
    });

    const aggDates  = Array.from(buckets.keys());
    const aggSeries = ts.series.map(s => {
      const visibility = aggDates.map(bucket => {
        const indices = buckets.get(bucket)!;
        const vals    = indices.map(i => s.visibility[i]).filter(v => v > 0);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      });
      return { ...s, visibility };
    });
    return { dates: aggDates, series: aggSeries };
  });

  // ── Derived: AI URLs / sources ─────────────────
  aiClassificationAggs = computed<DomainTypeAggregate[]>(() => {
    const map = new Map<string, number>();
    this.aiUrls().forEach(r => {
      const key = String(r['classification'] ?? 'Unknown');
      map.set(key, (map.get(key) ?? 0) + Number(r['usage_count'] ?? 1));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  });

  sourcesData = computed<SourceRow[]>(() => {
    const rows       = this.aiUrls();
    const totalUsage = rows.reduce((sum, r) => sum + Number(r['usage_count'] ?? 0), 0);
    return rows.slice(0, 10).map(r => {
      // ai_visibility_urls has a direct 'domain' column — use it first
      let domain = String(r['domain'] ?? '').replace(/^www\./, '').trim();
      if (!domain) {
        // Fallback: try url_normalized, then parse full URL
        const rawNorm = r['url_normalized'] ?? r['urlNormalized'];
        if (typeof rawNorm === 'string' && rawNorm && !rawNorm.startsWith('http')) {
          domain = rawNorm.split('/')[0];
        } else {
          const urlStr2 = String(r['url'] ?? '');
          try { domain = new URL(urlStr2).hostname.replace(/^www\./, ''); }
          catch { domain = urlStr2; }
        }
      }
      const urlStr     = String(r['url'] ?? '');
      const usageCount = Number(r['usage_count'] ?? 0);
      const pct        = totalUsage > 0 ? Math.round((usageCount / totalUsage) * 100) : 0;
      const citAvg     = r['citation_avg'];
      return {
        domain,
        url:         urlStr,
        pct,
        avgCitations: typeof citAvg === 'number'
          ? (citAvg as number).toFixed(2)
          : String(citAvg ?? '—'),
        type: String(r['classification'] ?? 'Other'),
      };
    });
  });

  // ── Derived: LLM domain usage (clean, no internal columns) ───
  llmUsageClean = computed<GenericRow[]>(() => {
    const EXCLUDE  = new Set(['id', 'user_id', 'created_at']);
    const RENAME: Record<string, string> = {
      report_date:  'Date',
      source:       'Model',
      scraper:      'Model',
      llm_source:   'Model',
      model:        'Model',
      classification: 'Type',
      type:         'Type',
      usage_count:  'Usage Count',
      citation_avg: 'Avg. Citations',
      domain:       'Domain',
    };
    const SOURCE_KEYS = new Set(['source', 'scraper', 'llm_source', 'model']);

    return this.llmUsage().map(row => {
      const clean: GenericRow = {};
      for (const [key, val] of Object.entries(row)) {
        if (EXCLUDE.has(key)) continue;
        const label = RENAME[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        let displayVal: unknown = val;
        if (SOURCE_KEYS.has(key) && typeof val === 'string') {
          displayVal = val
            .replace(/-scraper$/i, '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase())
            .trim();
        }
        clean[label] = displayVal;
      }
      return clean;
    });
  });

  // ── LLM Domain Usage — display + filter + pagination ──────
  readonly LLM_PAGE_SIZE = 25;
  llmSearch     = signal('');
  llmTypeFilter = signal('ALL');
  llmPage       = signal(1);

  llmUsageDisplay = computed<LlmRow[]>(() =>
    this.llmUsage().map(r => {
      // 'project' column holds the domain name (e.g. "youtube.com")
      const domain    = String(r['project'] ?? r['domain'] ?? '').replace(/^www\./, '').trim();
      const date      = String(r['report_date'] ?? r['date'] ?? '');
      const sourceRaw = String(r['model'] ?? r['source'] ?? r['scraper'] ?? r['llm_source'] ?? '');
      const model     = this.prettifyModel(sourceRaw);
      const type      = String(r['classification'] ?? r['type'] ?? 'Other');
      const usage     = Number(r['usage_rate'] ?? r['usage_count'] ?? r['usage'] ?? 0);
      const cit       = r['citation_avg'] ?? r['avg_citations'];
      return {
        domain, date, model, type,
        usageCount: usage,
        avgCitations: typeof cit === 'number' ? (cit as number).toFixed(2) : String(cit ?? '—'),
      };
    })
  );

  llmAvailableTypes = computed<string[]>(() => {
    const types = new Set(this.llmUsageDisplay().map(r => r.type));
    return ['ALL', ...Array.from(types).sort()];
  });

  llmFiltered = computed<LlmRow[]>(() => {
    const q    = this.llmSearch().trim().toLowerCase();
    const type = this.llmTypeFilter();
    return this.llmUsageDisplay().filter(r =>
      (type === 'ALL' || r.type === type) &&
      (!q || r.domain.toLowerCase().includes(q) || r.model.toLowerCase().includes(q))
    );
  });

  llmTotalPages = computed<number>(() =>
    Math.max(1, Math.ceil(this.llmFiltered().length / this.LLM_PAGE_SIZE))
  );

  llmPaged = computed<LlmRow[]>(() => {
    const page  = Math.min(this.llmPage(), this.llmTotalPages());
    const start = (page - 1) * this.LLM_PAGE_SIZE;
    return this.llmFiltered().slice(start, start + this.LLM_PAGE_SIZE);
  });

  // ── Derived: AI Conversations ──────────────────
  convSearch      = signal('');
  convModelFilter = signal('ALL');
  expandedConvId  = signal<string | null>(null);

  convUsageDisplay = computed<ChatConversation[]>(() =>
    this.conversations().map(r => {
      // Flat columns: chat_id, model_id, user_message, assistant_message, sources_count, brands_count
      const modelId = String(r['model_id'] ?? r['model'] ?? '');
      return {
        id:           String(r['chat_id'] ?? r['idx'] ?? ''),
        modelRaw:     modelId,
        model:        this.prettifyModel(modelId),
        query:        String(r['user_message'] ?? r['query'] ?? '').trim(),
        response:     String(r['assistant_message'] ?? r['response'] ?? '').trim(),
        sourcesCount: Number(r['sources_count'] ?? 0),
        brandsCount:  Number(r['brands_count'] ?? 0),
      };
    })
  );

  availableConvModels = computed<string[]>(() => {
    const models = new Set(this.convUsageDisplay().map(c => c.model).filter(Boolean));
    return ['ALL', ...Array.from(models).sort()];
  });

  convFiltered = computed<ChatConversation[]>(() => {
    const q = this.convSearch().trim().toLowerCase();
    const m = this.convModelFilter();
    return this.convUsageDisplay().filter(c =>
      (m === 'ALL' || c.model === m) &&
      (!q || c.query.toLowerCase().includes(q) || c.response.toLowerCase().includes(q))
    );
  });

  // ── Lifecycle ──────────────────────────────────
  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private load(): void {
    this.isLoading.set(true);
    forkJoin({
      main:          this.api.fetchData(this.currentFilter()),
      aiUrls:        this.supabaseData.fetchAiUrls(),
      llmUsage:      this.supabaseData.fetchLlmUsage(),
      conversations: this.supabaseData.fetchConversations(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ main, aiUrls, llmUsage, conversations }) => {
        this.rawData.set(main);
        this.aiUrls.set(aiUrls);
        this.llmUsage.set(llmUsage);
        this.conversations.set(conversations);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  onFilterChange(f: FilterState): void {
    this.currentFilter.set(f);
    this.isLoading.set(true);
    this.api.fetchData(f).pipe(takeUntil(this.destroy$)).subscribe({
      next:  data => { this.rawData.set(data); this.isLoading.set(false); },
      error: ()   => this.isLoading.set(false),
    });
  }

  setGranularity(g: string): void {
    this.granularity.set(g as 'D' | 'W' | 'M');
  }

  // Classification badge colors — matches actual ai_visibility_urls.classification values
  typeClass(type: string): string {
    const t = (type ?? '').toUpperCase();
    if (t === 'HOW_TO_GUIDE')   return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (t === 'ARTICLE')        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (t === 'HOMEPAGE')       return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400';
    if (t === 'PRODUCT_PAGE')   return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    if (t === 'BLOG_POST')      return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400';
    if (t === 'NEWS')           return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    if (t === 'TOOL')           return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400';
    if (t === 'VIDEO')          return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (t === 'FORUM')          return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400';
    if (t === 'REFERENCE')      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (t === 'COMPETITOR')     return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
    if (t === 'CORPORATE')      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (t === 'UGC')            return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }

  hideImg(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  hideFavicon(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  // ── LLM filter/pagination helpers ──
  onLlmSearch(q: string): void    { this.llmSearch.set(q);    this.llmPage.set(1); }
  setLlmTypeFilter(t: string): void { this.llmTypeFilter.set(t); this.llmPage.set(1); }
  prevLlmPage(): void             { this.llmPage.update(p => Math.max(1, p - 1)); }
  nextLlmPage(): void             { this.llmPage.update(p => Math.min(this.llmTotalPages(), p + 1)); }
  llmMin(a: number, b: number): number { return Math.min(a, b); }

  // ── Conversation helpers ────────────────────────
  toggleConv(id: string): void {
    this.expandedConvId.update(curr => curr === id ? null : id);
  }
  onConvSearch(q: string): void        { this.convSearch.set(q); }
  setConvModelFilter(m: string): void  { this.convModelFilter.set(m); }

  private prettifyModel(raw: string): string {
    const MAP: Record<string, string> = {
      'google-ai-overview-scraper': 'Google AI Overview',
      'perplexity-scraper':         'Perplexity',
      'chatgpt-scraper':            'ChatGPT',
      'claude-scraper':             'Claude',
      'gemini-scraper':             'Gemini',
      'bing-scraper':               'Bing AI',
      'copilot-scraper':            'Copilot',
    };
    return MAP[raw] ?? raw
      .replace(/-scraper$/i, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  }

  modelClass(model: string): string {
    if (model.includes('Google'))     return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    if (model.includes('Perplexity')) return 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400';
    if (model.includes('ChatGPT'))    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
    if (model.includes('Claude'))     return 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
    if (model.includes('Gemini'))     return 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400';
    if (model.includes('Bing') || model.includes('Copilot'))
      return 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
  }
}
