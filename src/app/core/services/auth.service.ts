import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { AuthState, LoginCredentials, SupabaseUser } from '../models/interfaces';

// On localhost: talk directly to the self-hosted Supabase server.
// On Netlify (or any HTTPS host): use the /api/supabase proxy defined in netlify.toml
// so the browser never makes an HTTP request from an HTTPS page (mixed content).
const isLocalhost = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const SUPABASE_URL = isLocalhost
  ? 'http://91.99.96.232:8000'
  : (typeof window !== 'undefined' ? window.location.origin : '') + '/api/supabase';

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';
const TOKEN_KEY        = 'geo-auth-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase: SupabaseClient;

  private readonly _state = signal<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true,
    error: null,
  });

  readonly isAuthenticated = computed(() => this._state().isAuthenticated);
  readonly user            = computed(() => this._state().user);
  readonly loading         = computed(() => this._state().loading);
  readonly error           = computed(() => this._state().error);
  readonly token           = computed(() => this._state().token);

  constructor(private readonly router: Router) {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        storageKey: TOKEN_KEY,
        storage: localStorage,
      },
    });

    // Restore existing session on app start
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.applySession(session);
    });

    // Keep state in sync across tabs
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.applySession(session);
    });
  }

  private applySession(session: Session | null): void {
    if (session?.user) {
      const user: SupabaseUser = {
        id: session.user.id,
        email: session.user.email ?? '',
        created_at: session.user.created_at,
      };
      this._state.set({ isAuthenticated: true, user, token: session.access_token, loading: false, error: null });
    } else {
      this._state.set({ isAuthenticated: false, user: null, token: null, loading: false, error: null });
    }
  }

  async login(credentials: LoginCredentials): Promise<void> {
    this._state.update(s => ({ ...s, loading: true, error: null }));
    const { error } = await this.supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    if (error) {
      this._state.update(s => ({ ...s, loading: false, error: error.message }));
      throw error;
    }
    await this.router.navigate(['/dashboard']);
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this._state.set({ isAuthenticated: false, user: null, token: null, loading: false, error: null });
    await this.router.navigate(['/login']);
  }

  clearError(): void {
    this._state.update(s => ({ ...s, error: null }));
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }
}
