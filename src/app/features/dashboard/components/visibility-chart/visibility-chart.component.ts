import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { TimeSeriesData, EChartsOption } from '../../../../core/models/interfaces';

@Component({
  selector: 'app-visibility-chart',
  standalone: true,
  imports: [NgxEchartsDirective],
  template: `
    <div echarts
         [options]="options()"
         class="echarts-container">
    </div>
  `,
})
export class VisibilityChartComponent implements OnChanges {
  @Input() timeSeriesData: TimeSeriesData = { dates: [], series: [] };

  options = signal<EChartsOption>({});

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['timeSeriesData']) {
      this.build();
    }
  }

  private build(): void {
    const { dates, series } = this.timeSeriesData;

    this.options.set({
      backgroundColor: 'transparent',
      grid: { top: 20, right: 16, bottom: 52, left: 16, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1', type: 'dashed', width: 1 } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any[]) => {
          const date = params[0]?.axisValue ?? '';
          const lines = params.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: any) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:4px">
              <span style="display:flex;align-items:center;gap:6px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                ${p.seriesName}
              </span>
              <strong>${Number(p.value).toFixed(1)}%</strong>
            </div>`
          ).join('');
          return `<div style="padding:2px 0">
            <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">${date}</div>
            ${lines}
          </div>`;
        },
      },
      legend: {
        bottom: 0,
        left: 'center',
        itemWidth: 14,
        itemHeight: 6,
        icon: 'roundRect',
        textStyle: { color: '#64748b', fontSize: 11 },
        data: series.map(s => s.brand),
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#f1f5f9' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          interval: 'auto',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: (val: any) => {
            const d = new Date(val as string);
            const day = d.getDate();
            const month = d.toLocaleString('de-DE', { month: 'short' });
            return `${day}. ${month}`;
          },
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        axisLabel: { color: '#94a3b8', fontSize: 11, formatter: '{value} %' },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'solid' } },
      },
      series: series.map(s => ({
        name: s.brand,
        type: 'line',
        data: s.visibility,
        smooth: 0.5,
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: false,
        emphasis: { focus: 'series' },
        lineStyle: { color: s.color, width: 2 },
        itemStyle: { color: s.color },
      })),
      animationDuration: 500,
      animationEasing: 'cubicOut',
    });
  }
}
