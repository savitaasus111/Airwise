'use client';

import { useMemo } from 'react';
import {
  evaluateAlerts,
  findBestOutdoorWindows,
  getAqiBand,
  getEffectiveAlertThreshold,
} from '@/lib/air-quality';
import type { Translations } from '@/lib/i18n';
import type {
  AirQualitySnapshot,
  DailyPlanResponse,
  HouseholdProfile,
  LanguageCode,
} from '@/lib/types';
import { NowAlertsSection } from './now/NowAlertsSection';
import { NowForecastCard } from './now/NowForecastCard';
import { NowHeroCard } from './now/NowHeroCard';
import { NowPollutantsPanel } from './now/NowPollutantsPanel';

interface NowDashboardProps {
  snapshot: AirQualitySnapshot;
  loading: boolean;
  profile: HouseholdProfile;
  plan: DailyPlanResponse | null;
  language: LanguageCode;
  t: Translations;
  onOpenPlan: () => void;
  onOpenAssistant: () => void;
  onOpenProfile: () => void;
}

export function NowDashboard({
  snapshot,
  loading,
  profile,
  plan,
  language,
  t,
  onOpenPlan,
  onOpenAssistant,
  onOpenProfile,
}: NowDashboardProps) {
  const band = useMemo(() => getAqiBand(snapshot.aqi), [snapshot.aqi]);
  const windows = useMemo(() => findBestOutdoorWindows(snapshot.hourly), [snapshot.hourly]);
  const alerts = useMemo(() => evaluateAlerts(snapshot, profile), [snapshot, profile]);
  const threshold = useMemo(() => getEffectiveAlertThreshold(profile), [profile]);

  const isHi = language === 'hi';
  const bandLabel = isHi ? band.labelHi : band.labelEn;
  const bandMeaning = isHi ? band.meaningHi : band.meaningEn;

  const headline =
    plan?.rightNowHeadline ||
    (isHi
      ? `${snapshot.locationName} में AQI ${snapshot.aqi} (${bandLabel}) — ${bandMeaning}`
      : `AQI ${snapshot.aqi} (${bandLabel}) in ${snapshot.locationName}`);

  const summary =
    plan?.rightNowSummary ||
    (isHi
      ? `PM2.5 ${snapshot.pm25} µg/m³ है। सबसे कम स्मॉग वाली विंडो ${windows.bestWindowText} है।`
      : `Live PM2.5 is ${snapshot.pm25} µg/m³. Your best lower-smog outdoor window is ${windows.bestWindowText}.`);

  const inversionLabel =
    snapshot.inversionRisk === 'high'
      ? t.inversionHigh
      : snapshot.inversionRisk === 'moderate'
        ? t.inversionModerate
        : t.inversionLow;

  const quickRightNowActions = useMemo(() => {
    const severe = snapshot.aqi >= 201;
    const unhealthy = snapshot.aqi >= 151;
    return [
      {
        label: isHi ? 'बाहर जाना और खेल' : 'Outdoor Activity',
        detail: severe
          ? isHi
            ? 'व्यायाम और बच्चों का खेल घर के अंदर रखें।'
            : 'Keep workouts and children’s play indoors today.'
          : unhealthy
            ? isHi
              ? `केवल ${windows.bestStartLabel}–${windows.bestEndLabel} में ज़रूरी काम करें।`
              : `Limit outdoor time to essential trips during ${windows.bestStartLabel}–${windows.bestEndLabel}.`
            : isHi
              ? 'मुख्य ट्रैफ़िक से दूर हल्की बाहरी गतिविधि सुरक्षित।'
              : 'Outdoor activity is manageable away from busy arterial roads.',
      },
      {
        label: isHi ? 'मास्क और सुरक्षा' : 'Mask Protection',
        detail: unhealthy
          ? isHi
            ? 'बाहर निकलते समय सही फिट वाला N95/KN95 मास्क पहनें।'
            : 'Wear a snugly sealed N95/KN95 respirator when outdoors.'
          : isHi
            ? 'संवेदनशील सदस्यों के लिए N95 मास्क साथ रखें।'
            : 'Keep an N95 mask handy for sensitive family members near traffic.',
      },
      {
        label: isHi ? 'घर की हवा और खिड़कियाँ' : 'Windows & Indoor Air',
        detail: unhealthy
          ? profile.hasAirPurifier
            ? isHi
              ? `खिड़कियाँ बंद रखें; बेडरूम में HEPA चलाएँ (${windows.bestStartLabel} बजे 10 मिनट हवा बदलें)।`
              : `Keep windows closed; run bedroom HEPA purifier (brief 10-min airing at ${windows.bestStartLabel}).`
            : isHi
              ? 'खिड़कियाँ बंद रखें, गीला पोछा लगाएँ और घर के अंदर धुआँ/अगरबत्ती न करें।'
              : 'Keep windows closed, wet-mop dust, and skip indoor incense or frying smoke.'
          : isHi
            ? 'ताज़ी हवा के लिए 15–20 मिनट क्रॉस-वेंटिलेशन सुरक्षित है।'
            : 'Safe to cross-ventilate indoors for 15–20 minutes.',
      },
    ];
  }, [snapshot.aqi, windows, profile.hasAirPurifier, isHi]);

  const observedTime = useMemo(() => {
    try {
      return new Date(snapshot.observedAtIso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }, [snapshot.observedAtIso]);

  return (
    <div
      className={`space-y-8 transition-opacity duration-150 ${loading ? 'opacity-80' : 'opacity-100'}`}
      aria-busy={loading}
    >
      <NowHeroCard
        snapshot={snapshot}
        band={band}
        headline={headline}
        summary={summary}
        observedTime={observedTime}
        windows={windows}
        quickActions={quickRightNowActions}
        language={language}
        t={t}
        onOpenPlan={onOpenPlan}
        onOpenAssistant={onOpenAssistant}
        onOpenProfile={onOpenProfile}
      />

      <NowAlertsSection alerts={alerts} threshold={threshold} language={language} t={t} />

      <div className="grid gap-6 lg:grid-cols-3">
        <NowForecastCard
          hourly={snapshot.hourly}
          windows={windows}
          threshold={threshold}
          bandHex={band.hex}
          locationName={snapshot.locationName}
          language={language}
          t={t}
        />

        <NowPollutantsPanel
          snapshot={snapshot}
          inversionLabel={inversionLabel}
          language={language}
          t={t}
        />
      </div>
    </div>
  );
}
