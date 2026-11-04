import { create } from 'zustand';
import type { Asset } from './config';
import type { Phase, ZoneType } from './engine';

export interface FloatText { id: number; text: string; color: string; }
export interface Banner { id: number; text: string; sub?: string; color?: string; kind: 'zone' | 'boost' | 'mission'; }

interface HudState {
  phase: Phase;
  screen: 'title' | 'mission' | 'none';
  time: number;
  score: number;
  checkpoint: number;
  alloc: Record<Asset, number>;
  target: Record<Asset, number>;
  zone: ZoneType;
  magnet: number;
  boost: number;
  floats: FloatText[];
  banner: Banner | null;
  best: number;
  result: { score: number; checkpoints: number; best: number; newBest: boolean; reason: string } | null;
  shake: number;
  set: (p: Partial<HudState>) => void;
  addFloat: (text: string, color: string) => void;
  showBanner: (b: Omit<Banner, 'id'>) => void;
}

let fid = 0;

export const useHud = create<HudState>((set, get) => ({
  phase: 'menu',
  screen: 'title',
  time: 0,
  score: 0,
  checkpoint: 1,
  alloc: { e: 0, d: 0, g: 0 },
  target: { e: 50, d: 30, g: 20 },
  zone: 'neutral',
  magnet: 0,
  boost: 0,
  floats: [],
  banner: null,
  best: 0,
  result: null,
  shake: 0,
  set: (p) => set(p),
  addFloat: (text, color) => {
    const id = ++fid;
    set({ floats: [...get().floats.slice(-3), { id, text, color }] });
    setTimeout(() => set({ floats: get().floats.filter(f => f.id !== id) }), 1100);
  },
  showBanner: (b) => {
    const id = ++fid;
    set({ banner: { ...b, id } });
    setTimeout(() => { if (get().banner?.id === id) set({ banner: null }); }, 2300);
  },
}));
