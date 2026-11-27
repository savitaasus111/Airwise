'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { computePresetDateRange, shiftDateIso, validateDateRange } from '@/lib/air-quality';
import { buildSeedHistory7d, buildSeedHistoryRange } from '@/lib/seed-data';
import type { AirQualitySnapshot, DailyHistoryPoint, LanguageCode } from '@/lib/types';
import type { RangePreset } from '@/components/history/HistoryDateRangeBar';

interface HistoryRangePayload {
  startDate: string;
  endDate: string;
  source: 'open-meteo-live' | 'demo-seed';
  days: DailyHistoryPoint[];
}

export function useHistoryRange(
  snapshot: AirQualitySnapshot,
  language: LanguageCode,
  onRefresh: () => void
) {
  const isHi = language === 'hi';

  const todayIso = useMemo(() => {
    const lastLive = snapshot.history7d?.[snapshot.history7d.length - 1]?.dateIso;
    if (lastLive && /^\d{4}-\d{2}-\d{2}$/.test(lastLive)) return lastLive;
    return snapshot.observedAtIso.slice(0, 10);
  }, [snapshot.history7d, snapshot.observedAtIso]);

  const minSelectableIso = useMemo(() => shiftDateIso(todayIso, -89), [todayIso]);
  const default7dRange = useMemo(() => computePresetDateRange(7, todayIso), [todayIso]);

  const [rangePreset, setRangePreset] = useState<RangePreset>('7d');
  const [draftStartDate, setDraftStartDate] = useState(default7dRange.startDate);
  const [draftEndDate, setDraftEndDate] = useState(default7dRange.endDate);
  const [appliedStartDate, setAppliedStartDate] = useState(default7dRange.startDate);
  const [appliedEndDate, setAppliedEndDate] = useState(default7dRange.endDate);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [loadingRange, setLoadingRange] = useState(false);
  const [fetchedRange, setFetchedRange] = useState<{
    cityKey: string;
    startDate: string;
    endDate: string;
    source: 'open-meteo-live' | 'demo-seed';
    days: DailyHistoryPoint[];
  } | null>(null);

  const requestSeqRef = useRef(0);
  const lastFetchedKeyRef = useRef('');
  const cityKey = `${snapshot.latitude.toFixed(2)},${snapshot.longitude.toFixed(2)}`;

  const fetchCustomRange = useCallback(
    async (startDate: string, endDate: string, targetCityKey: string) => {
      lastFetchedKeyRef.current = `${targetCityKey}:${startDate}:${endDate}`;
      const reqId = ++requestSeqRef.current;
      setLoadingRange(true);
      setRangeError(null);

      try {
        const qs = new URLSearchParams({
          lat: String(snapshot.latitude),
          lon: String(snapshot.longitude),
          startDate,
          endDate,
          city: snapshot.locationName,
          baseAqi: String(snapshot.aqi),
          basePm25: String(snapshot.pm25),
        });
        const res = await fetch(`/api/aqi/history?${qs.toString()}`);
        if (!res.ok) throw new Error('Unable to load historical range');
        const data: HistoryRangePayload = await res.json();
        if (requestSeqRef.current !== reqId) return;

        setFetchedRange({
          cityKey: targetCityKey,
          startDate: data.startDate,
          endDate: data.endDate,
          source: data.source,
          days: data.days,
        });
      } catch {
        if (requestSeqRef.current !== reqId) return;
        setFetchedRange({
          cityKey: targetCityKey,
          startDate,
          endDate,
          source: 'demo-seed',
          days: buildSeedHistoryRange(snapshot.aqi, snapshot.pm25, startDate, endDate),
        });
      } finally {
        if (requestSeqRef.current === reqId) setLoadingRange(false);
      }
    },
    [snapshot.latitude, snapshot.longitude, snapshot.locationName, snapshot.aqi, snapshot.pm25]
  );

  useEffect(() => {
    if (rangePreset === '7d') return;
    const expectedKey = `${cityKey}:${appliedStartDate}:${appliedEndDate}`;
    if (lastFetchedKeyRef.current === expectedKey) return;
    void fetchCustomRange(appliedStartDate, appliedEndDate, cityKey);
  }, [rangePreset, cityKey, appliedStartDate, appliedEndDate, fetchCustomRange]);

  const handleSelectPreset = useCallback(
    (preset: '7d' | '14d' | '30d') => {
      const days = preset === '7d' ? 7 : preset === '14d' ? 14 : 30;
      const next = computePresetDateRange(days, todayIso);
      setRangePreset(preset);
      setDraftStartDate(next.startDate);
      setDraftEndDate(next.endDate);
      setAppliedStartDate(next.startDate);
      setAppliedEndDate(next.endDate);
      setRangeError(null);

      if (preset === '7d') {
        lastFetchedKeyRef.current = '';
        setFetchedRange(null);
        setLoadingRange(false);
      } else {
        void fetchCustomRange(next.startDate, next.endDate, cityKey);
      }
    },
    [todayIso, cityKey, fetchCustomRange]
  );

  const handleApplyCustomRange = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const check = validateDateRange(draftStartDate, draftEndDate, 90, todayIso);
      if (!check.valid) {
        setRangeError(
          isHi ? check.errorHi || 'अमान्य तिथि अवधि।' : check.errorEn || 'Invalid date range.'
        );
        return;
      }
      setRangeError(null);
      setRangePreset('custom');
      setAppliedStartDate(draftStartDate);
      setAppliedEndDate(draftEndDate);
      void fetchCustomRange(draftStartDate, draftEndDate, cityKey);
    },
    [draftStartDate, draftEndDate, todayIso, isHi, cityKey, fetchCustomRange]
  );

  const handleRefreshClick = useCallback(() => {
    if (rangePreset === '7d') {
      onRefresh();
    } else {
      void fetchCustomRange(appliedStartDate, appliedEndDate, cityKey);
    }
  }, [rangePreset, onRefresh, appliedStartDate, appliedEndDate, cityKey, fetchCustomRange]);

  const base7dHistory = useMemo(
    () =>
      Array.isArray(snapshot.history7d) && snapshot.history7d.length > 0
        ? snapshot.history7d
        : buildSeedHistory7d(snapshot.aqi, snapshot.pm25),
    [snapshot.history7d, snapshot.aqi, snapshot.pm25]
  );

  const activeHistory = useMemo(
    () =>
      rangePreset === '7d'
        ? base7dHistory
        : fetchedRange?.days?.length
          ? fetchedRange.days
          : base7dHistory,
    [rangePreset, fetchedRange, base7dHistory]
  );

  const activeSource =
    rangePreset === '7d' ? snapshot.source : (fetchedRange?.source ?? snapshot.source);

  return {
    todayIso,
    minSelectableIso,
    rangePreset,
    draftStartDate,
    draftEndDate,
    appliedStartDate,
    appliedEndDate,
    rangeError,
    loadingRange,
    activeHistory,
    activeSource,
    setDraftStartDate: (val: string) => {
      setDraftStartDate(val);
      setRangeError(null);
    },
    setDraftEndDate: (val: string) => {
      setDraftEndDate(val);
      setRangeError(null);
    },
    handleSelectPreset,
    handleApplyCustomRange,
    handleRefreshClick,
  };
}
