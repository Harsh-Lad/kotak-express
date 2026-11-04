// Framework-free entry used for single-page hosting (CDN, artifact previews, kiosks).
// The Next.js app (app/page.tsx) renders the exact same <Game />.
import { createRoot } from 'react-dom/client';
import Game from './components/Game';

const el = document.getElementById('kmae-root')!;
createRoot(el).render(<Game />);
