"use client";

// ============================================================
// Profile store: React Context + localStorage persistence.
// Local state first; backend-ready (swap persist() for an API call).
// ============================================================

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { defaultProfile, UserProfile } from "./types";

const STORAGE_KEY = "etihad_speaking_room_profile_v1";

interface ProfileContextValue {
  profile: UserProfile;
  hydrated: boolean;
  update: (patch: Partial<UserProfile>) => void;
  setProfile: (p: UserProfile) => void;
  reset: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function load(): UserProfile {
  if (typeof window === "undefined") return { ...defaultProfile };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultProfile };
    const parsed = JSON.parse(raw);
    return { ...defaultProfile, ...parsed };
  } catch {
    return { ...defaultProfile };
  }
}

// Backend-ready seam: replace this with a POST to your API.
function persist(p: UserProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage full / unavailable — ignore in prototype */
  }
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile>(defaultProfile);
  const [hydrated, setHydrated] = useState(false);
  const firstRun = useRef(true);

  useEffect(() => {
    setProfileState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (hydrated) persist(profile);
  }, [profile, hydrated]);

  const update = useCallback((patch: Partial<UserProfile>) => {
    setProfileState((prev) => ({ ...prev, ...patch, lastUpdated: Date.now() }));
  }, []);

  const setProfile = useCallback((p: UserProfile) => {
    setProfileState({ ...p, lastUpdated: Date.now() });
  }, []);

  const reset = useCallback(() => {
    setProfileState({ ...defaultProfile, lastUpdated: Date.now() });
  }, []);

  const value: ProfileContextValue = { profile, hydrated, update, setProfile, reset };
  return React.createElement(ProfileContext.Provider, { value }, children);
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
