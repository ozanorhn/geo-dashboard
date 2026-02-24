import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal<boolean>(false);

  constructor() {
    const stored = localStorage.getItem('geo-dark-mode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = stored !== null ? stored === 'true' : prefersDark;
    this.isDark.set(initial);

    effect(() => {
      if (this.isDark()) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('geo-dark-mode', String(this.isDark()));
    });
  }

  toggle(): void {
    this.isDark.update(v => !v);
  }
}
