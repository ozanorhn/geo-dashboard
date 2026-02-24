// =============================================
// RAW API RESPONSE
// =============================================

export interface VisibilityData {
  date: string;
  brand: string;
  visibility: number;
  sentiment: number;
  position: number;
  domain: string;
  domain_type: string;
}

// =============================================
// FILTER STATE
// =============================================

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  brands: string[];
  domainTypes: string[];
}

// =============================================
// TRANSFORM OUTPUTS
// =============================================

export interface TimeSeriesData {
  dates: string[];
  series: BrandTimeSeries[];
}

export interface BrandTimeSeries {
  brand: string;
  visibility: number[];
  color: string;
}

export interface BrandGroup {
  brand: string;
  data: VisibilityData[];
}

export interface BrandSentiment {
  brand: string;
  avgSentiment: number;
  avgVisibility: number;
  avgPosition: number;
}

export interface RankedBrand {
  rank: number;
  brand: string;
  avgVisibility: number;
  avgSentiment: number;
  avgPosition: number;
  trend: 'up' | 'down' | 'stable';
  color?: string;
}

export interface DomainTypeAggregate {
  name: string;
  value: number;
}

export interface DomainTableRow {
  domain: string;
  domainType: string;
  avgVisibility: number;
  avgSentiment: number;
  mentions: number;
}

export interface KpiCard {
  label: string;
  value: string;
  sub: string;
}

// =============================================
// AUTH
// =============================================

export interface AuthState {
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export interface SupabaseUser {
  id: string;
  email: string;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// =============================================
// API
// =============================================

export interface WebhookRequest {
  action: 'fetch_geo_data';
  filters: FilterState;
}

// =============================================
// SORT STATE
// =============================================

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  column: string;
  direction: SortDirection;
}

// =============================================
// GENERIC TABLE
// =============================================

export type GenericRow = Record<string, unknown>;

// =============================================
// ECHARTS
// =============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EChartsOption = Record<string, any>;
