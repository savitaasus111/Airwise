'use client';

import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import { buildRuleBasedDailyPlan } from '@/lib/air-quality';
import { DEFAULT_HOUSEHOLD_PROFILE } from '@/lib/seed-data';
import type {
  ActionLogEntry,
  AirQualitySnapshot,
  CommunityLeaderboardEntry,
  DailyPlanResponse,
  HouseholdProfile,
} from '@/lib/types';

export const LS_PROFILE_KEY = 'airwise_profile_v1';
export const LS_LOGS_KEY = 'airwise_logs_v1';
export const LS_SNAPSHOT_KEY = 'airwise_last_snapshot_v1';
export const LS_THEME_KEY = 'airwise_theme_v1';

export const loadFirebase = () => import('@/lib/firebase');

interface UseAirWiseSyncParams {
  darkMode: boolean;
  setDarkMode: Dispatch<SetStateAction<boolean>>;
  profile: HouseholdProfile;
  setProfile: Dispatch<SetStateAction<HouseholdProfile>>;
  profileRef: MutableRefObject<HouseholdProfile>;
  setSnapshot: Dispatch<SetStateAction<AirQualitySnapshot>>;
  setPlan: Dispatch<SetStateAction<DailyPlanResponse | null>>;
  setActionLogs: Dispatch<SetStateAction<ActionLogEntry[]>>;
  setCloudContributions: Dispatch<SetStateAction<CommunityLeaderboardEntry[]>>;
  authUser: User | null;
  setAuthUser: Dispatch<SetStateAction<User | null>>;
}

export function useAirWiseSync({
  darkMode,
  setDarkMode,
  profile,
  setProfile,
  profileRef,
  setSnapshot,
  setPlan,
  setActionLogs,
  setCloudContributions,
  authUser,
  setAuthUser,
}: UseAirWiseSyncParams) {
  // Hydrate persisted state from localStorage asynchronously
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const savedTheme = localStorage.getItem(LS_THEME_KEY);
        if (savedTheme === 'dark') {
          setDarkMode(true);
          document.documentElement.classList.add('dark');
        }
        const savedProfile = localStorage.getItem(LS_PROFILE_KEY);
        if (savedProfile) {
          setProfile({ ...DEFAULT_HOUSEHOLD_PROFILE, ...JSON.parse(savedProfile) });
        }
        const savedLogs = localStorage.getItem(LS_LOGS_KEY);
        if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs);
          if (Array.isArray(parsedLogs)) setActionLogs(parsedLogs);
        }
        const savedSnap = localStorage.getItem(LS_SNAPSHOT_KEY);
        if (savedSnap && !navigator.onLine) {
          setSnapshot(JSON.parse(savedSnap));
        }
      } catch {
        // Ignore storage parse errors
      }
    });
    return () => {
      active = false;
    };
  }, [setActionLogs, setDarkMode, setProfile, setSnapshot]);

  // Sync dark mode class on <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(LS_THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(LS_THEME_KEY, 'light');
    }
  }, [darkMode]);

  // Keep <html lang="..."> synchronized with selected EN/HI language
  useEffect(() => {
    document.documentElement.lang = profile.language;
  }, [profile.language]);

  // Startup Firestore check & Auth listener
  useEffect(() => {
    let active = true;
    let unsub: (() => void) | undefined;

    loadFirebase()
      .then((fb) => {
        if (!active) return;
        void fb.testFirestoreConnection();

        unsub = fb.subscribeToAuthState(async (user) => {
          if (!active) return;
          setAuthUser(user);
          if (user) {
            try {
              const cloudProfile = await fb.loadHouseholdFromCloud(user.uid);
              if (cloudProfile && active) {
                setProfile(cloudProfile);
                localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(cloudProfile));
              }
              const cloudLogs = await fb.loadActionLogsFromCloud(user.uid);
              if (cloudLogs.length > 0 && active) {
                setActionLogs(cloudLogs);
                localStorage.setItem(LS_LOGS_KEY, JSON.stringify(cloudLogs));
              }
            } catch (err) {
              console.warn('Cloud profile sync notice:', err);
            }
          } else {
            setCloudContributions([]);
          }
        });
      })
      .catch((err) => {
        console.warn('Firebase client initialization notice:', err);
      });

    return () => {
      active = false;
      unsub?.();
    };
  }, [setActionLogs, setAuthUser, setCloudContributions, setProfile]);

  // Fetch live AQI on initial mount
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/aqi?city=${encodeURIComponent(DEFAULT_HOUSEHOLD_PROFILE.city)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AirQualitySnapshot | null) => {
        if (cancelled || !data) return;
        setSnapshot(data);
        setPlan(buildRuleBasedDailyPlan(data, profileRef.current, profileRef.current.language));
        try {
          localStorage.setItem(LS_SNAPSHOT_KEY, JSON.stringify(data));
        } catch {
          // Ignore quota errors
        }
      })
      .catch(() => {
        // Seed snapshot already rendered
      });
    return () => {
      cancelled = true;
    };
  }, [profileRef, setPlan, setSnapshot]);

  // Sync community contributions when signed in and group changes
  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    loadFirebase()
      .then((fb) => fb.loadCommunityContributionsFromCloud(profile.communityGroupId, authUser.uid))
      .then((rows) => {
        if (!cancelled) setCloudContributions(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authUser, profile.communityGroupId, setCloudContributions]);
}
