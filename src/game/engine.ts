import {
  Asset, ASSETS, ASSET_META, LANE_WIDTH, BASE_SPEED, SPEED_PER_CHECKPOINT, MAX_SPEED, BOOST_MULTIPLIER,
  BOOST_SECONDS, SLOW_MULTIPLIER, JUMP_VELOCITY, GRAVITY, START_TIME, TIME_BONUS_BASE, TIME_BONUS_MIN,
  TIME_TRAP_PENALTY, STUMBLE_PENALTY, EXTRA_TIME, MAGNET_SECONDS, SPAWN_AHEAD, DESPAWN_BEHIND,
  NEUTRAL_ZONE_LENGTH, ASSET_ZONE_LENGTH, MISSION_POOL,
} from './config';

export type EntityType = 'token' | 'barricade' | 'crate' | 'trap' | 'delay' | 'clock' | 'magnet' | 'gate';
export type ZoneType = 'neutral' | Asset;

export interface Entity {
  id: number;
  active: boolean;
  type: EntityType;
  lane: number;      // -1, 0, 1
  x: number;         // world x (tokens drift toward the player when magnetised)
  s: number;         // track distance at which the entity sits
  len: number;       // length along the track (delay zones)
  asset: Asset;
  hit: boolean;
  spin: number;
}

export interface GameEvent {
  kind: 'float' | 'toast' | 'zone' | 'boost' | 'mission' | 'over' | 'jump' | 'stumble' | 'collect';
  x?: number;
  text?: string;
  color?: string;
  sub?: string;
}

export type Phase = 'menu' | 'playing' | 'paused' | 'over';

const POOL_SIZE = 160;

function rand(a: number, b: number) { return a + Math.random() * (b - a); }
function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }

export class GameEngine {
  phase: Phase = 'menu';
  entities: Entity[] = [];
  events: GameEvent[] = [];

  distance = 0;
  speed = 0;
  time = START_TIME;
  score = 0;
  checkpoint = 1;
  tokensCollected = 0;

  lane = 0;
  x = 0;
  y = 0;
  vy = 0;
  grounded = true;
  lean = 0;

  boostT = 0;
  magnetT = 0;
  stumbleT = 0;
  slowed = false;
  shake = 0; // camera shake intensity, set by the render loop

  target: Record<Asset, number> = { e: 50, d: 30, g: 20 };
  alloc: Record<Asset, number> = { e: 0, d: 0, g: 0 };
  step = 5;
  missionIndex = 0;

  zone: ZoneType = 'neutral';
  zoneEnd = NEUTRAL_ZONE_LENGTH;
  nextRowS = 30;
  elapsed = 0;

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.entities.push({ id: i, active: false, type: 'token', lane: 0, x: 0, s: 0, len: 1, asset: 'e', hit: false, spin: 0 });
    }
  }

  // ---------- lifecycle ----------
  reset() {
    this.entities.forEach(e => { e.active = false; });
    this.events = [];
    this.endReason = '';
    this.distance = 0; this.speed = 0; this.time = START_TIME; this.score = 0; this.checkpoint = 1; this.tokensCollected = 0;
    this.lane = 0; this.x = 0; this.y = 0; this.vy = 0; this.grounded = true; this.lean = 0;
    this.boostT = 0; this.magnetT = 0; this.stumbleT = 0; this.slowed = false;
    this.missionIndex = 0;
    this.target = { ...MISSION_POOL[0] };
    this.alloc = { e: 0, d: 0, g: 0 };
    this.step = 5;
    this.zone = 'neutral';
    this.zoneEnd = NEUTRAL_ZONE_LENGTH;
    this.nextRowS = 30;
    this.elapsed = 0;
  }

  start() { this.reset(); this.phase = 'playing'; }
  pause() { if (this.phase === 'playing') this.phase = 'paused'; }
  resume() { if (this.phase === 'paused') this.phase = 'playing'; }

  // ---------- input ----------
  moveLeft() { if (this.phase === 'playing') this.lane = Math.max(-1, this.lane - 1); }
  moveRight() { if (this.phase === 'playing') this.lane = Math.min(1, this.lane + 1); }
  jump() {
    if (this.phase !== 'playing' || !this.grounded) return;
    this.vy = JUMP_VELOCITY; this.grounded = false;
    this.events.push({ kind: 'jump' });
  }

  // ---------- helpers ----------
  get allComplete() { return ASSETS.every(a => this.alloc[a] >= this.target[a]); }
  get baseSpeed() { return Math.min(MAX_SPEED, BASE_SPEED + (this.checkpoint - 1) * SPEED_PER_CHECKPOINT); }

  private spawn(type: EntityType, lane: number, s: number, asset: Asset = 'e', len = 1) {
    const e = this.entities.find(en => !en.active);
    if (!e) return;
    e.active = true; e.type = type; e.lane = lane; e.x = lane * LANE_WIDTH; e.s = s; e.len = len;
    e.asset = asset; e.hit = false; e.spin = Math.random() * Math.PI * 2;
  }

  private chooseAsset(): Asset {
    // Weighted towards assets the mission still needs, with the current zone asset favoured.
    const w: Record<Asset, number> = { e: 0, d: 0, g: 0 };
    for (const a of ASSETS) {
      const need = this.alloc[a] < this.target[a];
      w[a] = need ? 3 : 0.8;
      if (this.zone === a && need) w[a] += 3;
    }
    const total = w.e + w.d + w.g;
    let r = Math.random() * total;
    for (const a of ASSETS) { r -= w[a]; if (r <= 0) return a; }
    return 'e';
  }

  private spawnRow(s: number) {
    const lanes = [-1, 0, 1];
    const difficulty = Math.min(1, (this.checkpoint - 1) / 5);
    const obstacleCount = Math.random() < 0.35 + difficulty * 0.35 ? 2 : 1;
    const shuffled = [...lanes].sort(() => Math.random() - 0.5);
    const blocked = shuffled.slice(0, obstacleCount);
    const free = shuffled.slice(obstacleCount);

    for (const lane of blocked) {
      const r = Math.random();
      if (r < 0.38) this.spawn('barricade', lane, s);
      else if (r < 0.68) this.spawn('crate', lane, s);
      else if (r < 0.86) this.spawn('trap', lane, s);
      else this.spawn('delay', lane, s - 3, 'e', 8);
    }

    const tokenLane = pick(free);
    const p = Math.random();
    if (p < 0.07) this.spawn('clock', tokenLane, s);
    else if (p < 0.12) this.spawn('magnet', tokenLane, s);
    else {
      const asset = this.chooseAsset();
      const count = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) this.spawn('token', tokenLane, s - 4 + i * 2.4, asset);
    }
    // Occasional bonus token in a second free lane, possibly a different asset (forces choices in zones).
    if (free.length > 1 && Math.random() < 0.45) {
      const other = free.find(l => l !== tokenLane)!;
      const a2 = this.chooseAsset();
      for (let i = 0; i < 2; i++) this.spawn('token', other, s + 2 + i * 2.4, a2);
    }
  }

  private nextZone() {
    if (this.zone !== 'neutral') {
      this.zone = 'neutral';
      this.zoneEnd = this.distance + NEUTRAL_ZONE_LENGTH;
      this.events.push({ kind: 'zone', text: 'NEUTRAL ZONE', sub: 'Collect all assets freely', color: '#ffffff' });
      return;
    }
    // Zones adapt to what the player still needs.
    const needed = ASSETS.filter(a => this.alloc[a] < this.target[a]);
    const pool = needed.length ? needed : ASSETS;
    const a = pool.sort((x, y) => (this.target[y] - this.alloc[y]) - (this.target[x] - this.alloc[x]))[Math.random() < 0.7 ? 0 : pool.length - 1];
    this.zone = a;
    this.zoneEnd = this.distance + ASSET_ZONE_LENGTH;
    this.events.push({ kind: 'zone', text: `${ASSET_META[a].name.toUpperCase()} ZONE`, sub: `${ASSET_META[a].name} 2× · other assets reduce ${ASSET_META[a].name}`, color: ASSET_META[a].color });
  }

  private collectToken(e: Entity) {
    const a = e.asset;
    this.tokensCollected++;
    this.events.push({ kind: 'collect', color: ASSET_META[a].glow, x: e.x });
    if (this.alloc[a] >= this.target[a]) {
      this.score += 5;
      this.events.push({ kind: 'float', text: `${ASSET_META[a].name} full`, color: '#9aa4b2' });
    } else {
      const mult = this.zone === a ? 2 : 1;
      const inc = this.step * mult;
      this.alloc[a] = Math.min(this.target[a], this.alloc[a] + inc);
      this.score += 20 * mult;
      this.events.push({ kind: 'float', text: `+${inc}% ${ASSET_META[a].name}`, color: ASSET_META[a].glow });
    }
    // Zone rule: wrong assets reduce the zone asset, unless the zone asset is already protected (full).
    if (this.zone !== 'neutral' && a !== this.zone && this.alloc[this.zone] < this.target[this.zone] && this.alloc[this.zone] > 0) {
      const z = this.zone;
      this.alloc[z] = Math.max(0, this.alloc[z] - this.step);
      this.events.push({ kind: 'float', text: `−${this.step}% ${ASSET_META[z].name}`, color: '#ff6b6b' });
    }
    if (this.allComplete) this.completeMission();
  }

  private completeMission() {
    const bonus = Math.max(TIME_BONUS_MIN, TIME_BONUS_BASE - this.checkpoint * 2);
    this.score += 500 * this.checkpoint;
    this.checkpoint++;
    this.boostT = BOOST_SECONDS;
    this.time += bonus;
    this.spawn('gate', 0, this.distance + 34);
    this.events.push({ kind: 'boost', text: 'ALLOCATION COMPLETE', sub: `Train boost activated · +${bonus}s` });
    // Next, harder mission
    this.missionIndex = (this.missionIndex + 1 + Math.floor(Math.random() * (MISSION_POOL.length - 1))) % MISSION_POOL.length;
    this.target = { ...MISSION_POOL[this.missionIndex] };
    this.alloc = { e: 0, d: 0, g: 0 };
    this.step = 5;
    const t = this.target;
    this.events.push({ kind: 'mission', text: `CHECKPOINT ${this.checkpoint}`, sub: `Equity ${t.e}% · Debt ${t.d}% · Gold ${t.g}%` });
  }

  /** Why the last run ended, shown on the results screen. */
  endReason = '';

  private gameOver(reason = 'Time ran out') {
    this.phase = 'over';
    this.endReason = reason;
    if (reason === 'Time ran out') this.time = 0;
    this.events.push({ kind: 'over', text: reason });
  }

  // ---------- main update ----------
  update(rawDt: number) {
    const dt = Math.min(rawDt, 1 / 20);
    if (this.phase !== 'playing') return;
    this.elapsed += dt;

    // timers
    this.boostT = Math.max(0, this.boostT - dt);
    this.magnetT = Math.max(0, this.magnetT - dt);
    this.stumbleT = Math.max(0, this.stumbleT - dt);
    this.time -= dt;
    if (this.time <= 0) { this.gameOver(); return; }

    // speed
    let sp = this.baseSpeed;
    if (this.boostT > 0) sp *= BOOST_MULTIPLIER;
    if (this.slowed && this.boostT <= 0) sp *= SLOW_MULTIPLIER;
    if (this.stumbleT > 0) sp *= 0.55;
    this.speed += (sp - this.speed) * Math.min(1, dt * 4);
    this.distance += this.speed * dt;
    this.score += this.speed * dt * 0.5;

    // lateral + vertical motion
    const tx = this.lane * LANE_WIDTH;
    const prevX = this.x;
    this.x += (tx - this.x) * Math.min(1, dt * 14);
    this.lean += (((this.x - prevX) / Math.max(dt, 1e-4)) * -0.03 - this.lean) * Math.min(1, dt * 10);
    if (!this.grounded) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.grounded = true; }
    }

    // zones
    if (this.distance >= this.zoneEnd) this.nextZone();

    // spawning
    while (this.nextRowS < this.distance + SPAWN_AHEAD) {
      this.spawnRow(this.nextRowS);
      const gap = rand(15, 20) - Math.min(this.checkpoint - 1, 5) * 0.9;
      this.nextRowS += gap;
    }

    // collisions / despawn
    this.slowed = false;
    const playerLaneX = this.x;
    for (const e of this.entities) {
      if (!e.active) continue;
      const dz = e.s - this.distance;
      if (dz + e.len < -DESPAWN_BEHIND) { e.active = false; continue; }
      if (e.hit) continue;

      const sameLane = Math.abs(e.x - playerLaneX) < 1.0;

      if (e.type === 'token') {
        if (this.magnetT > 0 && dz < 14 && dz > -1) {
          e.x += (playerLaneX - e.x) * Math.min(1, dt * 8);
        }
        if (Math.abs(dz) < 0.9 && (sameLane || (this.magnetT > 0 && Math.abs(e.x - playerLaneX) < 1.6))) {
          e.hit = true; e.active = false; this.collectToken(e);
        }
        continue;
      }
      if (e.type === 'gate') continue;

      if (e.type === 'delay') {
        if (dz <= 0.5 && dz + e.len >= -0.5 && sameLane && this.y < 0.5) {
          this.slowed = true;
          if (!e.hit && dz > -0.6) { e.hit = true; this.events.push({ kind: 'float', text: 'Market slowdown', color: '#ffb547' }); }
        }
        continue;
      }

      if (Math.abs(dz) > 0.7 || !sameLane) continue;

      switch (e.type) {
        case 'barricade':
          if (this.y < 1.05) this.hitObstacle(e, 'Market volatility');
          break;
        case 'crate':
          if (this.y < 2.1) this.hitObstacle(e, 'Market correction');
          break;
        case 'trap':
          if (this.y < 0.45) {
            e.hit = true;
            if (this.boostT <= 0) { this.time -= TIME_TRAP_PENALTY; this.events.push({ kind: 'float', text: `−${TIME_TRAP_PENALTY}s · Market uncertainty`, color: '#ff5a5a' }); this.events.push({ kind: 'stumble' }); }
          }
          break;
        case 'clock':
          e.hit = true; e.active = false; this.time += EXTRA_TIME; this.score += 50;
          this.events.push({ kind: 'collect', color: '#55e39b', x: e.x });
          this.events.push({ kind: 'float', text: `+${EXTRA_TIME}s Extra time`, color: '#55e39b' });
          break;
        case 'magnet':
          e.hit = true; e.active = false; this.magnetT = MAGNET_SECONDS; this.score += 50;
          this.events.push({ kind: 'collect', color: '#ff7bd1', x: e.x });
          this.events.push({ kind: 'float', text: 'Asset magnet', color: '#ff7bd1' });
          break;
      }
    }
  }

  private hitObstacle(e: Entity, label: string) {
    e.hit = true;
    if (this.boostT > 0) { this.score += 25; return; } // boost smashes through
    // Crashing into a barricade or cargo ends the journey.
    this.events.push({ kind: 'stumble' });
    this.gameOver(`Crashed into ${label.toLowerCase()}`);
  }

  drainEvents() { const ev = this.events; this.events = []; return ev; }
}

export const engine = new GameEngine();

// Exposed for QA tooling and automated play-tests.
if (typeof window !== 'undefined') (window as unknown as { __engine: GameEngine }).__engine = engine;
