'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { getAqiBand, type WindowAnalysis } from '@/lib/air-quality';
import type { Translations } from '@/lib/i18n';
import type { HourlyForecastPoint, LanguageCode } from '@/lib/types';

const ForecastChart = dynamic(() => import('../ForecastChart').then((mod) => mod.ForecastChart), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-lg bg-slate-50 dark:bg-slate-900/40" />,
});

interface NowForecastCardProps {
  hourly: HourlyForecastPoint[];
  windows: WindowAnalysis;
  threshold: number;
  bandHex: string;
  locationName: string;
  language: LanguageCode;
  t: Translations;
}

export function NowForecastCard({
  hourly,
  windows,
  threshold,
  bandHex,
  locationName,
  language,
  t,
}: NowForecastCardProps) {
  const [horizon, setHorizon] = useState<'24h' | '48h'>('24h');
  const [chartMetric, setChartMetric] = useState<'aqi' | 'pm25'>('aqi');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const isHi = language === 'hi';

  const chartData = useMemo(() => {
    const slice = horizon === '24h' ? hourly.slice(0, 24) : hourly.slice(0, 48);
    return slice.map((pt, index) => ({
      ...pt,
      axisLabel: horizon === '48h' && index >= 24 ? `+${pt.hourLabel}` : pt.hourLabel,
    }));
  }, [hourly, horizon]);

  const chartAriaLabel = useMemo(() => {
    const metricLabel = chartMetric === 'aqi' ? 'US AQI' : 'PM2.5 µg/m³';
    return `${horizon} ${metricLabel} forecast for ${locationName}. Best outdoor window ${windows.bestWindowText}. Peak smog window ${windows.worstWindowText}.`;
  }, [chartMetric, horizon, locationName, windows]);

  return (
    <section
      aria-labelledby="forecast-heading"
      className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2 dark:border-slate-800 dark:bg-[#131C26]"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
        <div>
          <h2
            id="forecast-heading"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            {t.forecastTitle}
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
            {t.bestWindowLabel}:{' '}
            <span className="font-mono tabular-nums text-slate-800 dark:text-slate-100">
              {windows.bestWindowText}
            </span>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            {t.peakSmogLabel}:{' '}
            <span className="font-mono tabular-nums text-slate-800 dark:text-slate-100">
              {windows.worstWindowText}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80"
            role="group"
            aria-label={isHi ? 'प्रदर्शन मोड' : 'Forecast display mode'}
          >
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              aria-pressed={viewMode === 'chart'}
              className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'chart'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
              }`}
            >
              {isHi ? 'चार्ट' : 'Chart'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
              }`}
            >
              {isHi ? 'तालिका' : 'Text Table'}
            </button>
          </div>

          {viewMode === 'chart' && (
            <div
              className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80"
              role="group"
              aria-label={isHi ? 'चार्ट मीट्रिक' : 'Chart metric'}
            >
              <button
                type="button"
                onClick={() => setChartMetric('aqi')}
                aria-pressed={chartMetric === 'aqi'}
                className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  chartMetric === 'aqi'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                AQI
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('pm25')}
                aria-pressed={chartMetric === 'pm25'}
                className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  chartMetric === 'pm25'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                PM2.5
              </button>
            </div>
          )}

          <div
            className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80"
            role="group"
            aria-label={isHi ? 'पूर्वानुमान अवधि' : 'Forecast horizon'}
          >
            <button
              type="button"
              onClick={() => setHorizon('24h')}
              aria-pressed={horizon === '24h'}
              className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                horizon === '24h'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
              }`}
            >
              {t.forecast24h}
            </button>
            <button
              type="button"
              onClick={() => setHorizon('48h')}
              aria-pressed={horizon === '48h'}
              className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                horizon === '48h'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
              }`}
            >
              {t.forecast48h}
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'chart' ? (
        <div
          className="h-64 w-full"
          data-testid="forecast-chart"
          role="img"
          aria-label={chartAriaLabel}
        >
          <ForecastChart
            data={chartData}
            chartMetric={chartMetric}
            horizon={horizon}
            threshold={threshold}
            bandHex={bandHex}
          />
        </div>
      ) : (
        <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">{chartAriaLabel}</caption>
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
              <tr className="border-b border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                <th scope="col" className="px-3 py-2 font-semibold">
                  {isHi ? 'समय' : 'Hour'}
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  {isHi ? 'श्रेणी' : 'Category'}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  US AQI
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  PM2.5 (µg/m³)
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  {isHi ? 'हवा (km/h)' : 'Wind (km/h)'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {chartData.map((pt) => {
                const ptBand = getAqiBand(pt.aqi);
                return (
                  <tr key={pt.timeIso}>
                    <td className="px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                      {pt.axisLabel}
                    </td>
                    <td className={`px-3 py-2 font-medium ${ptBand.badgeTextClass}`}>
                      {isHi ? ptBand.labelHi : ptBand.labelEn}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                      {pt.aqi}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {pt.pm25}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {pt.windKmh}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
