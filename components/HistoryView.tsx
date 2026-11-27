'use client';

import { useMemo, useState } from 'react';
import { Minus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { useHistoryRange } from '@/hooks/use-history-range';
import {
  analyzeHistoryTrend,
  formatCalendarDateLabels,
  getAqiBand,
  getEffectiveAlertThreshold,
} from '@/lib/air-quality';
import type { Translations } from '@/lib/i18n';
import type { AirQualitySnapshot, HouseholdProfile, LanguageCode } from '@/lib/types';
import type { HistoryChartMode } from './HistoryTrendChart';
import { HistoryChartCard } from './history/HistoryChartCard';
import { HistoryDailyTable } from './history/HistoryDailyTable';
import { HistoryDateRangeBar } from './history/HistoryDateRangeBar';
import { HistoryKpiStrip } from './history/HistoryKpiStrip';

interface HistoryViewProps {
  snapshot: AirQualitySnapshot;
  loading: boolean;
  profile: HouseholdProfile;
  language: LanguageCode;
  t: Translations;
  onRefresh: () => void;
}

export function HistoryView({
  snapshot,
  loading,
  profile,
  language,
  t,
  onRefresh,
}: HistoryViewProps) {
  const isHi = language === 'hi';
  const [chartMode, setChartMode] = useState<HistoryChartMode>('combined');
  const range = useHistoryRange(snapshot, language, onRefresh);

  const threshold = useMemo(() => getEffectiveAlertThreshold(profile), [profile]);
  const spanDays = range.activeHistory.length;
  const activeStartLabel =
    range.activeHistory[0]?.dayLabel ?? formatCalendarDateLabels(range.appliedStartDate).dayLabel;
  const activeEndLabel =
    range.activeHistory[range.activeHistory.length - 1]?.dayLabel ??
    formatCalendarDateLabels(range.appliedEndDate).dayLabel;

  const summary = useMemo(
    () => analyzeHistoryTrend(range.activeHistory, threshold),
    [range.activeHistory, threshold]
  );
  const avgBand = useMemo(() => getAqiBand(summary.avgAqi7d), [summary.avgAqi7d]);
  const whoRatio = useMemo(
    () => Math.round((summary.avgPm257d / 15) * 10) / 10,
    [summary.avgPm257d]
  );

  const trendCopy = useMemo(() => {
    const absAqi = Math.abs(summary.aqiDeltaPct);
    const absPm = Math.abs(summary.pm25DeltaPct);
    if (summary.trendDirection === 'improving') {
      return {
        label: isHi ? 'सुधार हो रहा है' : 'Improving',
        detail: isHi
          ? `चयनित ${spanDays}-दिन की अवधि के शुरुआती भाग की तुलना में हाल के दिनों में औसत AQI ${absAqi}% और PM2.5 ${absPm}% कम हुआ है।`
          : `Average AQI fell ${absAqi}% and PM2.5 dropped ${absPm}% in the second half of this ${spanDays}-day window compared with earlier days.`,
        textClass: 'text-teal-800 dark:text-teal-300',
        Icon: TrendingDown,
      };
    }
    if (summary.trendDirection === 'worsening') {
      return {
        label: isHi ? 'प्रदूषण बढ़ रहा है' : 'Worsening',
        detail: isHi
          ? `चयनित ${spanDays}-दिन की अवधि के शुरुआती भाग की तुलना में हाल के दिनों में औसत AQI ${absAqi}% और PM2.5 ${absPm}% बढ़ा है।`
          : `Average AQI climbed ${absAqi}% and PM2.5 rose ${absPm}% in the second half of this ${spanDays}-day window compared with earlier days.`,
        textClass: 'text-rose-800 dark:text-rose-300',
        Icon: TrendingUp,
      };
    }
    return {
      label: isHi ? 'स्थिर स्तर' : 'Holding steady',
      detail: isHi
        ? `इस ${spanDays}-दिन की अवधि में AQI लगभग एक जैसा (${summary.aqiDeltaPct >= 0 ? '+' : ''}${summary.aqiDeltaPct}%) रहा है।`
        : `Average AQI stayed within ${absAqi}% across this ${spanDays}-day range without a sharp directional shift.`,
      textClass: 'text-slate-700 dark:text-slate-300',
      Icon: Minus,
    };
  }, [summary.aqiDeltaPct, summary.pm25DeltaPct, summary.trendDirection, spanDays, isHi]);

  const TrendIcon = trendCopy.Icon;
  const isBusy = loading || range.loadingRange;

  if (range.activeHistory.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#131C26]">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{t.historyTitle}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {isHi
            ? 'इस शहर के लिए ऐतिहासिक डेटा अभी उपलब्ध नहीं है।'
            : 'Historical readings are not loaded for this city yet.'}
        </p>
        <button
          type="button"
          onClick={range.handleRefreshClick}
          className="mt-5 inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span>{isHi ? 'डेटा रीफ़्रेश करें' : 'Refresh Data'}</span>
        </button>
      </section>
    );
  }

  return (
    <div
      className={`space-y-8 transition-opacity duration-200 ${range.loadingRange ? 'opacity-75' : 'opacity-100'}`}
    >
      <section
        aria-labelledby="history-heading"
        className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#131C26]"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span>
                {snapshot.locationName}
                {snapshot.region ? `, ${snapshot.region}` : ''}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {activeStartLabel} – {activeEndLabel} ({spanDays}{' '}
                {isHi ? 'दिन' : spanDays === 1 ? 'day' : 'days'})
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {range.activeSource === 'open-meteo-live'
                  ? isHi
                    ? 'Open-Meteo ऐतिहासिक आर्काइव'
                    : 'Open-Meteo historical archive'
                  : isHi
                    ? 'डेमो डेटा (सीड)'
                    : 'Demo data (fallback seed)'}
              </span>
            </div>
            <h1
              id="history-heading"
              className="text-2xl font-bold tracking-tight text-slate-950 text-balance dark:text-white"
            >
              {t.historyTitle}
            </h1>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {t.historySubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={range.handleRefreshClick}
            disabled={isBusy}
            className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isHi ? 'डेटा ताज़ा करें' : 'Refresh History'}</span>
          </button>
        </div>

        <HistoryDateRangeBar
          rangePreset={range.rangePreset}
          draftStartDate={range.draftStartDate}
          draftEndDate={range.draftEndDate}
          minSelectableIso={range.minSelectableIso}
          todayIso={range.todayIso}
          loadingRange={range.loadingRange}
          rangeError={range.rangeError}
          language={language}
          t={t}
          onSelectPreset={range.handleSelectPreset}
          onChangeStartDate={range.setDraftStartDate}
          onChangeEndDate={range.setDraftEndDate}
          onApplyCustomRange={range.handleApplyCustomRange}
        />

        <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="flex items-start gap-2.5">
            <TrendIcon
              className={`mt-0.5 h-5 w-5 shrink-0 ${trendCopy.textClass}`}
              aria-hidden="true"
            />
            <div>
              <p className={`text-sm font-semibold ${trendCopy.textClass}`}>
                {trendCopy.label}
                <span className="ml-2 font-mono text-xs tabular-nums">
                  (
                  {summary.aqiDeltaPct > 0 ? `+${summary.aqiDeltaPct}%` : `${summary.aqiDeltaPct}%`}{' '}
                  AQI)
                </span>
              </p>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                {trendCopy.detail}
              </p>
            </div>
          </div>
          {range.loadingRange && (
            <span
              role="status"
              className="font-mono text-xs tabular-nums text-teal-700 dark:text-teal-400"
            >
              {isHi ? 'डेटा लोड हो रहा है...' : 'Loading selected range...'}
            </span>
          )}
        </div>
      </section>

      <HistoryKpiStrip
        spanDays={spanDays}
        summary={summary}
        avgBand={avgBand}
        whoRatio={whoRatio}
        threshold={threshold}
        language={language}
        t={t}
      />

      <HistoryChartCard
        activeHistory={range.activeHistory}
        chartMode={chartMode}
        threshold={threshold}
        spanDays={spanDays}
        locationName={snapshot.locationName}
        language={language}
        t={t}
        onChangeMode={setChartMode}
      />

      <HistoryDailyTable
        activeHistory={range.activeHistory}
        todayIso={range.todayIso}
        summary={summary}
        language={language}
        t={t}
      />
    </div>
  );
}
