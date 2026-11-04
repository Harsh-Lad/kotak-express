'use client';
import dynamic from 'next/dynamic';

// WebGL only runs in the browser, so the game is loaded client-side.
const Game = dynamic(() => import('@/components/Game'), {
  ssr: false,
  loading: () => (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#0b1020', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      Boarding the Express…
    </div>
  ),
});

export default function Page() {
  return <Game />;
}
