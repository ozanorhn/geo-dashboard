import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

type SpinnerSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [NgClass],
  template: `
    <div
      role="status"
      aria-label="Loading"
      [ngClass]="sizeClass"
      class="inline-block rounded-full border-2 border-slate-200 border-t-primary-500 animate-spin-slow">
    </div>
  `,
})
export class LoadingSpinnerComponent {
  @Input() size: SpinnerSize = 'md';

  get sizeClass(): string {
    const map: Record<SpinnerSize, string> = {
      sm: 'w-4 h-4',
      md: 'w-8 h-8',
      lg: 'w-12 h-12 border-4',
    };
    return map[this.size];
  }
}
