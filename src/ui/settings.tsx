import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setSfxSettings } from './audio/sfx';
import { readJson, writeJson } from './storage';

/** 0 = instant (no animation). */
export type AnimSpeed = 0 | 0.5 | 1 | 2;

export interface Settings {
  animSpeed: AnimSpeed;
  sound: boolean;
  volume: number; // 0..1
}

const KEY = 'salvage-crew.settings.v1';
const DEFAULTS: Settings = { animSpeed: 1, sound: true, volume: 0.6 };

function load(): Settings {
  const saved = readJson<Partial<Settings>>(KEY);
  return { ...DEFAULTS, ...(saved ?? {}) };
}

interface SettingsApi {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsApi>({ settings: DEFAULTS, update: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);
  useEffect(() => {
    writeJson(KEY, settings);
    setSfxSettings(settings.sound, settings.volume);
    document.documentElement.style.setProperty('--anim-speed', String(settings.animSpeed === 0 ? 100 : settings.animSpeed));
  }, [settings]);
  const api = useMemo<SettingsApi>(() => ({ settings, update: (patch) => setSettings((s) => ({ ...s, ...patch })) }), [settings]);
  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsApi {
  return useContext(SettingsContext);
}

export const ANIM_SPEED_LABELS: Record<AnimSpeed, string> = { 0.5: 'Slow', 1: 'Normal', 2: 'Fast', 0: 'Instant' };
