import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DomainTypeAggregate, EChartsOption } from '../../../../core/models/interfaces';

const CLASSIFICATION_COLORS: Record<string, string> = {
  // Actual values from ai_visibility_urls.classification
  'HOW_TO_GUIDE': '#2563eb',  // blue
  'ARTICLE':      '#16a34a',  // green
  'HOMEPAGE':     '#7c3aed',  // violet
  'PRODUCT_PAGE': '#d97706',  // amber
  'BLOG_POST':    '#0891b2',  // sky
  'NEWS':         '#ea580c',  // orange
  'TOOL':         '#0d9488',  // teal
  'VIDEO':        '#dc2626',  // red
  'FORUM':        '#db2777',  // pink
  // Legacy / fallback names
  'REFERENCE':    '#16a34a',
  'COMPETITOR':   '#dc2626',
  'CORPORATE':    '#2563eb',
  'UGC':          '#7c3aed',
};

const FALLBACK_COLORS = [
  '#0ea5e9', '#8b5cf6', '#f59e0b', '#22c55e',
  '#ef4444', '#ec4899', '#14b8a6', '#f97316',
];

function colorFor(name: string, index: number): string {
  return CLASSIFICATION_COLORS[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [NgxEchartsDirective],
  template: `
    <div echarts
         [options]="options()"
         class="echarts-container"
         style="height: 280px;">
    </div>
  `,
})
export class DonutChartComponent implements OnChanges {
  @Input() aggregates: DomainTypeAggregate[] = [];

  options = signal<EChartsOption>({});

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['aggregates']) {
      this.build();
    }
  }

  private build(): void {
    const total = this.aggregates.reduce((s, a) => s + a.value, 0);
    const aggs  = this.aggregates;

    this.options.set({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (p: any) =>
          `<strong>${p.name}</strong><br/>
           ${p.percent}%  (${Number(p.value).toLocaleString()})`,
      },
      legend: {
        orient: 'vertical',
        right: '4%',
        top: 'center',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 10,
        textStyle: { color: '#64748b', fontSize: 11 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (name: any) => {
          const agg = aggs.find(a => a.name === name);
          const pct = total > 0 && agg ? ((agg.value / total) * 100).toFixed(1) : '0';
          return `${name as string}  ${pct}%`;
        },
      },
      series: [{
        name: 'Citations',
        type: 'pie',
        radius: ['44%', '68%'],
        center: ['36%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: {
          show: true,
          position: 'center',
          formatter: () => `{val|${total.toLocaleString()}}\n{sub|Citations}`,
          rich: {
            val:  { fontSize: 22, fontWeight: 'bold', color: '#1e293b', lineHeight: 28 },
            sub:  { fontSize: 11, color: '#94a3b8', lineHeight: 18 },
          },
        },
        emphasis: {
          label: { show: true },
          itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.12)' },
        },
        labelLine: { show: false },
        data: this.aggregates.map((a, i) => ({
          value: a.value,
          name: a.name,
          itemStyle: { color: colorFor(a.name, i) },
        })),
        animationType: 'expansion',
        animationDuration: 600,
      }],
    });
  }
}
