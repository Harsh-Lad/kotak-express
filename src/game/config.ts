// Central tuning for the Kotak Multi-Asset Express prototype.
// Gameplay numbers live here so designers can rebalance without touching logic.

export type Asset = 'e' | 'd' | 'g';
export const ASSETS: Asset[] = ['e', 'd', 'g'];

export const ASSET_META: Record<Asset, { name: string; color: string; glow: string }> = {
  e: { name: 'Equity', color: '#2f80ff', glow: '#7fb4ff' },
  d: { name: 'Debt', color: '#c7d0db', glow: '#ffffff' },
  g: { name: 'Gold', color: '#f6b928', glow: '#ffe08a' },
};

export const BRAND = {
  red: '#d71920',
  navy: '#1b2557',
  white: '#f7f7f9',
};

export const LANE_WIDTH = 2.2;
export const LANES = [-1, 0, 1];

// Speeds in world units per second
export const BASE_SPEED = 13;
export const SPEED_PER_CHECKPOINT = 1.3;
export const MAX_SPEED = 23;
export const BOOST_MULTIPLIER = 1.75;
export const BOOST_SECONDS = 3;
export const SLOW_MULTIPLIER = 0.5;

// Jump
export const JUMP_VELOCITY = 9.5;
export const GRAVITY = 27;

// Timer
export const START_TIME = 40;
export const TIME_BONUS_BASE = 24; // seconds added after a completed mission, reduced per checkpoint
export const TIME_BONUS_MIN = 12;
export const TIME_TRAP_PENALTY = 10;
export const STUMBLE_PENALTY = 2;
export const EXTRA_TIME = 5;
export const MAGNET_SECONDS = 5;

// Spawning
export const SPAWN_AHEAD = 115;
export const DESPAWN_BEHIND = 10;

// Market zones (distance based)
export const NEUTRAL_ZONE_LENGTH = 140;
export const ASSET_ZONE_LENGTH = 230;

// Allocation missions. Each value is a percentage target; the three always total 100.
export const MISSION_POOL: Record<Asset, number>[] = [
  { e: 50, d: 30, g: 20 },
  { e: 40, d: 30, g: 30 },
  { e: 30, d: 50, g: 20 },
  { e: 60, d: 20, g: 20 },
  { e: 20, d: 40, g: 40 },
  { e: 40, d: 40, g: 20 },
  { e: 30, d: 30, g: 40 },
];
