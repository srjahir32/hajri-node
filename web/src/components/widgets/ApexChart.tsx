'use client';

import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export function ApexChart({ options, series, type = 'bar', height = 300 }: { options: ApexOptions; series: ApexOptions['series']; type?: 'bar' | 'line' | 'area' | 'donut' | 'pie' | 'radialBar'; height?: number | string }) {
  return <Chart options={options} series={series} type={type} height={height} />;
}
