import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LoginCredentials } from '../../core/models/interfaces';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, LoadingSpinnerComponent],
  template: `
    <div class="min-h-screen bg-surface dark:bg-surface-dark flex items-center justify-center p-4">
      <div class="w-full max-w-md animate-fade-in">

        <!-- Branding -->
        <div class="text-center mb-8">
          <img
            src="assets/logo.png"
            alt="Geo AI Logo"
            class="h-14 mx-auto mb-4 object-contain"
            (error)="onLogoError($event)">
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Geo AI Dashboard
          </h1>
          <p class="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            AI-powered Visibility Intelligence
          </p>
        </div>

        <!-- Card -->
        <div class="card dark:bg-surface-card-dark dark:border dark:border-slate-700">
          <h2 class="text-xl font-semibold text-slate-800 dark:text-white mb-6">
            Sign in to your account
          </h2>

          <!-- Error Banner -->
          @if (errorMessage()) {
            <div class="mb-5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200
                        dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm flex gap-2">
              <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd" />
              </svg>
              {{ errorMessage() }}
            </div>
          }

          <!-- Form -->
          <form (ngSubmit)="onSubmit()" #loginForm="ngForm" novalidate>

            <!-- Email -->
            <div class="mb-4">
              <label for="email"
                class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                [(ngModel)]="credentials.email"
                required
                email
                autocomplete="email"
                placeholder="you@example.com"
                class="input-base dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200
                       dark:placeholder-slate-500"
                [disabled]="isLoading()">
            </div>

            <!-- Password -->
            <div class="mb-6">
              <label for="password"
                class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                [(ngModel)]="credentials.password"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                class="input-base dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200
                       dark:placeholder-slate-500"
                [disabled]="isLoading()">
            </div>

            <!-- Submit -->
            <button
              type="submit"
              class="btn-primary w-full"
              [disabled]="isLoading() || !loginForm.valid">
              @if (isLoading()) {
                <app-loading-spinner size="sm" />
                <span class="ml-2">Signing in…</span>
              } @else {
                Sign in
              }
            </button>
          </form>
        </div>

        <p class="text-center text-xs text-slate-400 dark:text-slate-600 mt-6">
          Secured by Supabase Auth
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);

  credentials: LoginCredentials = { email: '', password: '' };
  isLoading   = this.authService.loading;
  errorMessage = signal<string | null>(null);

  async onSubmit(): Promise<void> {
    this.errorMessage.set(null);
    try {
      await this.authService.login(this.credentials);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      this.errorMessage.set(msg);
    }
  }

  onLogoError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
