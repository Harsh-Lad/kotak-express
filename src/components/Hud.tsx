'use client';
import { engine } from '@/game/engine';
import { useHud } from '@/game/store';
import { ASSET_META, Asset, ASSETS, MISSION_POOL } from '@/game/config';

const fmt = (t: number) => {
  const s = Math.max(0, Math.ceil(t));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

function Icon({ a, size = 22 }: { a: Asset; size?: number }) {
  const c = ASSET_META[a].color;
  if (a === 'e') return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="14" width="4" height="7" rx="1" fill={c} /><rect x="10" y="9" width="4" height="12" rx="1" fill={c} /><rect x="17" y="4" width="4" height="17" rx="1" fill={c} /></svg>;
  if (a === 'd') return <svg width={size} height={size} viewBox="0 0 24 24">{[0, 1, 2, 3].map(i => <ellipse key={i} cx="12" cy={18 - i * 4} rx="8" ry="2.6" fill={c} stroke="#7b8594" strokeWidth="1" />)}</svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24"><path d="M3 18 L7 8 H17 L21 18 Z" fill={c} /><path d="M7 8 L9 5 H15 L17 8 Z" fill="#ffe08a" /></svg>;
}

function Allocation() {
  const alloc = useHud(s => s.alloc);
  const target = useHud(s => s.target);
  const zone = useHud(s => s.zone);
  return (
    <div className="alloc">
      <div className="alloc-title">Portfolio Allocation</div>
      <div className="alloc-row">
        {ASSETS.map(a => {
          const pct = target[a] ? Math.min(1, alloc[a] / target[a]) : 0;
          const done = pct >= 1;
          return (
            <div key={a} className={`alloc-cell ${zone === a ? 'zone' : ''} ${done ? 'done' : ''}`} style={{ ['--c' as string]: ASSET_META[a].color }}>
              <div className="alloc-head"><Icon a={a} size={18} /><span>{ASSET_META[a].name}</span>{done && <b>✓</b>}</div>
              <div className="alloc-num">{alloc[a]}<small>/{target[a]}%</small></div>
              <div className="bar"><i style={{ width: `${pct * 100}%` }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopBar() {
  const time = useHud(s => s.time);
  const cp = useHud(s => s.checkpoint);
  const score = useHud(s => s.score);
  const set = useHud(s => s.set);
  return (
    <div className="topbar">
      <div className={`chip timer ${time < 10 ? 'low' : ''}`}><span className="clock">⏱</span>{fmt(time)}</div>
      <div className="chip cp"><small>Checkpoint</small><b>{String(cp).padStart(2, '0')}</b></div>
      <div className="chip score"><small>Score</small><b>{score.toLocaleString('en-IN')}</b></div>
      <button className="chip pause" onClick={() => { engine.pause(); set({ phase: 'paused' }); }} aria-label="Pause">❚❚</button>
    </div>
  );
}

function Effects() {
  const floats = useHud(s => s.floats);
  const banner = useHud(s => s.banner);
  const magnet = useHud(s => s.magnet);
  const boost = useHud(s => s.boost);
  return (
    <>
      {banner && (
        <div key={banner.id} className={`banner ${banner.kind}`} style={{ ['--c' as string]: banner.color || '#3AD9F5' }}>
          {banner.kind === 'boost' && <span className="tick">✓</span>}
          <div><b>{banner.text}</b>{banner.sub && <small>{banner.sub}</small>}</div>
        </div>
      )}
      <div className="floats">
        {floats.map(f => <div key={f.id} className="float" style={{ color: f.color }}>{f.text}</div>)}
      </div>
      <div className="powerups">
        {magnet > 0 && <div className="pu magnet">🧲 Magnet {magnet.toFixed(1)}s</div>}
        {boost > 0 && <div className="pu boost">⚡ Boost</div>}
      </div>
      {boost > 0 && <div className="speedlines" />}
    </>
  );
}

function Title() {
  const set = useHud(s => s.set);
  return (
    <div className="screen title">
      <div className="brand"><span className="roundel" />kotak<small>Mutual Fund</small></div>
      <div className="logo-lockup">
        <div className="l1">KOTAK</div>
        <div className="l2">MULTI-ASSET</div>
        <div className="l3">EXPRESS</div>
      </div>
      <div className="tag">Different Assets. One Express.</div>
      <div className="spacer" />
      <button className="cta" onClick={() => set({ screen: 'mission' })}>PLAY NOW ▶</button>
      <div className="pillars">{['Invest', 'Diversify', 'Grow', 'Achieve'].map(p => <span key={p}>{p}</span>)}</div>
      <p className="hint">Swipe ← → to change lanes · swipe ↑ or tap to jump</p>
    </div>
  );
}

function Mission() {
  const set = useHud(s => s.set);
  const t = MISSION_POOL[0];
  const start = () => {
    engine.start();
    set({ screen: 'none', phase: 'playing', result: null, alloc: { e: 0, d: 0, g: 0 }, target: { ...engine.target }, time: engine.time, checkpoint: 1, score: 0, zone: 'neutral' });
  };
  return (
    <div className="screen mission">
      <div className="card">
        <div className="card-title">ASSET ALLOCATION<br /><span>MISSION</span></div>
        <div className="mix">
          {ASSETS.map(a => (
            <div key={a} className={`mix-cell m-${a}`}>
              <Icon a={a} size={34} />
              <small>{ASSET_META[a].name}</small>
              <b>{t[a]}%</b>
            </div>
          ))}
        </div>
        <div className="mixbar">{ASSETS.map(a => <i key={a} style={{ flex: t[a], background: ASSET_META[a].color }}>{t[a]}%</i>)}</div>
        <div className="card-note">Collect tokens to load each wagon. Match the mix to boost the train.</div>
        <ul className="rules">
          <li><b>Zones</b> double one asset, others reduce it</li>
          <li><b>Avoid</b> barricades and cargo: one crash ends the run</li>
          <li><b>Dodge</b> −10s traps and slowdown zones</li>
          <li><b>Grab</b> +5s clocks and the asset magnet</li>
        </ul>
        <button className="cta" onClick={start}>PLAY MISSION ▶</button>
      </div>
    </div>
  );
}

function Paused() {
  const set = useHud(s => s.set);
  return (
    <div className="screen paused">
      <div className="card small">
        <div className="card-title">PAUSED</div>
        <button className="cta" onClick={() => { engine.resume(); set({ phase: 'playing' }); }}>RESUME ▶</button>
        <button className="ghost" onClick={() => { engine.phase = 'menu'; engine.reset(); set({ phase: 'menu', screen: 'title' }); }}>Exit to station</button>
      </div>
    </div>
  );
}

function Over() {
  const r = useHud(s => s.result);
  const set = useHud(s => s.set);
  if (!r) return null;
  const again = () => {
    engine.start();
    set({ phase: 'playing', screen: 'none', result: null, alloc: { e: 0, d: 0, g: 0 }, target: { ...engine.target }, time: engine.time, checkpoint: 1, score: 0, zone: 'neutral' });
  };
  return (
    <div className="screen over">
      <div className="over-sign">Next Station<br /><b>A Brighter Tomorrow →</b></div>
      <div className="over-title">{r.reason.startsWith('Crashed') ? <>DERAILED!</> : <>JOURNEY<br />COMPLETE!</>}</div>
      <div className="over-reason">{r.reason}</div>
      <div className="stats">
        <div><span>🏆</span><small>Total score</small><b>{r.score.toLocaleString('en-IN')}</b></div>
        <div><span>🏁</span><small>Checkpoints crossed</small><b>{String(r.checkpoints).padStart(2, '0')}</b></div>
        <div><span>👑</span><small>Personal best</small><b>{r.best.toLocaleString('en-IN')}</b></div>
      </div>
      {r.newBest && <div className="newbest">New personal best!</div>}
      <div className="spacer" />
      <button className="cta" onClick={again}>PLAY AGAIN ▶</button>
      <button className="ghost" onClick={() => { engine.phase = 'menu'; engine.reset(); set({ phase: 'menu', screen: 'title', result: null }); }}>Back to station</button>
    </div>
  );
}

export default function Hud() {
  const phase = useHud(s => s.phase);
  const screen = useHud(s => s.screen);
  return (
    <div className="hud">
      {(phase === 'playing' || phase === 'paused') && (<><TopBar /><Allocation /><Effects /></>)}
      {phase === 'menu' && screen === 'title' && <Title />}
      {phase === 'menu' && screen === 'mission' && <Mission />}
      {phase === 'paused' && <Paused />}
      {phase === 'over' && <Over />}
      {phase !== 'playing' && phase !== 'paused' && <div className="disclaimer">Prototype. Allocation percentages, zones and boosts are fictional game mechanics, not fund allocations or returns.</div>}
    </div>
  );
}
