'use client';

import dynamic from 'next/dynamic';
import type { Translations } from '@/lib/i18n';
import type { DailyHistoryPoint, LanguageCode } from '@/lib/types';
import type { HistoryChartMode } from '../HistoryTrendChart';

const HistoryTrendChart = dynamic(
  () => import('../HistoryTrendChart').then((mod) => mod.HistoryTrendChart),
  {
    ssr: false,
    loading: () => <div className="h-full w-full rounded-lg bg-slate-50 dark:bg-slate-900/40" />,
  }
);

interface HistoryChartCardProps {
  activeHistory: DailyHistoryPoint[];
  chartMode: HistoryChartMode;
  threshold: number;
  spanDays: number;
  locationName: string;
  language: LanguageCode;
  t: Translations;
  onChangeMode: (mode: HistoryChartMode) => void;
}

export function HistoryChartCard({
  activeHistory,
  chartMode,
  threshold,
  spanDays,
  locationName,
  language,
  t,
  onChangeMode,
}: HistoryChartCardProps) {
  const isHi = language === 'hi';
  const ariaSummary = `${spanDays}-day ${chartMode} air quality trend for ${locationName}. See the daily breakdown table below for exact values per day.`;

  return (
    <section
      aria-labelledby="history-chart-heading"
      className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C26]"
    >
      <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="history-chart-heading"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            {isHi ? `${spanDays}-दिन PM2.5 और US AQI रुझान` : `${spanDays}-Day PM2.5 & US AQI Trend`}
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
            {chartMode === 'combined'
              ? isHi
                ? 'लाल रेखा दैनिक औसत AQI (बायाँ अक्ष) और टील बार औसत PM2.5 µg/m³ (दायाँ अक्ष) दिखाती है।'
                : 'Line shows daily average US AQI (left axis); bars show daily average PM2.5 in µg/m³ (right axis).'
              : chartMode === 'aqi'
                ? isHi
                  ? 'दैनिक औसत AQI बनाम दैनिक अधिकतम AQI और आपकी व्यक्तिगत चेतावनी सीमा।'
                  : 'Daily average US AQI compared against daily peak AQI and your household alert limit.'
                : isHi
                  ? 'दैनिक औसत PM2.5 (µg/m³), WHO 24-घंटे की सुरक्षित सीमा (15 µg/m³) के सापेक्ष।'
                  : 'Daily average fine particulate matter (PM2.5) compared against the WHO 24-hour guideline (15 µg/m³).'}
          </p>
        </div>

        <div
          className="inline-flex self-start rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80"
          role="group"
          aria-label={isHi ? 'चार्ट मोड' : 'History chart view'}
        >
          {(
            [
              { key: 'combined', label: t.historyViewCombined },
              { key: 'aqi', label: t.historyViewAqi },
              { key: 'pm25', label: t.historyViewPm25 },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChangeMode(opt.key)}
              aria-pressed={chartMode === opt.key}
              className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                chartMode === opt.key
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full" data-testid="history-chart" role="img" aria-label={ariaSummary}>
        <HistoryTrendChart
          data={activeHistory}
          mode={chartMode}
          threshold={threshold}
          language={language}
        />
      </div>
    </section>
  );
}
