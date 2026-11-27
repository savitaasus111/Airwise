'use client';

import dynamic from 'next/dynamic';

const TabLoadingFallback = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600 dark:border-slate-800 dark:bg-[#131C26] dark:text-slate-300">
    Loading view...
  </div>
);

export const HistoryView = dynamic(() => import('./HistoryView').then((mod) => mod.HistoryView), {
  loading: TabLoadingFallback,
});

export const DailyPlanView = dynamic(
  () => import('./DailyPlanView').then((mod) => mod.DailyPlanView),
  { loading: TabLoadingFallback }
);

export const AssistantView = dynamic(
  () => import('./AssistantView').then((mod) => mod.AssistantView),
  { loading: TabLoadingFallback }
);

export const ImpactTrackerView = dynamic(
  () => import('./ImpactTrackerView').then((mod) => mod.ImpactTrackerView),
  { loading: TabLoadingFallback }
);

export const CommunityView = dynamic(
  () => import('./CommunityView').then((mod) => mod.CommunityView),
  { loading: TabLoadingFallback }
);

export const HouseholdProfileModal = dynamic(
  () => import('./HouseholdProfileModal').then((mod) => mod.HouseholdProfileModal),
  { ssr: false }
);
