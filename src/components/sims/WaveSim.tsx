import { useEffect, useRef, useState } from 'react';

export default function WaveSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const tRef      = useRef(0);

  const [freq,   setFreq]   = useState(1.6);
  const [sep,    setSep]    = useState(0.38);
  const [phase,  setPhase]  = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setSize = () => {
      const dpr = window.devicePixelRatio;
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      canvas.getContext('2d')?.scale(dpr, dpr);
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let last = performance.now();

    const animate = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!paused) tRef.current += dt;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const W = canvas.width / window.devicePixelRatio;
      const H = canvas.height / window.devicePixelRatio;

      // Source positions
      const s1x = W * (0.5 - sep / 2);
      const s1y = H * 0.5;
      const s2x = W * (0.5 + sep / 2);
      const s2y = H * 0.5;

      // Build ImageData for interference pattern
      const imgData = ctx.createImageData(Math.floor(W), Math.floor(H));
      const k = freq * 1.8; // wave number
      const t = tRef.current;

      for (let py = 0; py < Math.floor(H); py++) {
        for (let px = 0; px < Math.floor(W); px++) {
          const dx1 = px - s1x, dy1 = py - s1y;
          const dx2 = px - s2x, dy2 = py - s2y;
          const r1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
          const r2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          const v1 = r1 < 2 ? 0 : Math.sin(k * r1 - 2 * Math.PI * freq * t) / Math.max(1, r1 * 0.08);
          const v2 = r2 < 2 ? 0 : Math.sin(k * r2 - 2 * Math.PI * freq * t + phase) / Math.max(1, r2 * 0.08);
          const val = Math.max(-1, Math.min(1, (v1 + v2) * 0.5));
          const idx = (py * Math.floor(W) + px) * 4;
          if (val > 0) {
            imgData.data[idx]     = Math.round(val * 80);
            imgData.data[idx + 1] = Math.round(val * 140);
            imgData.data[idx + 2] = Math.round(val * 255);
          } else {
            imgData.data[idx]     = Math.round(-val * 220);
            imgData.data[idx + 1] = Math.round(-val * 80);
            imgData.data[idx + 2] = Math.round(-val * 60);
          }
          imgData.data[idx + 3] = 220;
        }
      }
      ctx.putImageData(imgData, 0, 0);

      // Draw sources
      for (const [sx, sy] of [[s1x, s1y], [s2x, s2y]]) {
        ctx.beginPath();
        ctx.arc(sx, sy, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Labels
      ctx.fillStyle = 'rgba(203,213,225,0.7)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('S₁', s1x, s1y - 14);
      ctx.fillText('S₂', s2x, s2y - 14);

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [freq, sep, phase, paused]);

  return (
    <div className="flex flex-col gap-3">
      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ height: 280 }} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Frequency: {freq.toFixed(1)} Hz</label>
          <input type="range" min={0.5} max={3.5} step={0.1} value={freq}
            onChange={e => setFreq(+e.target.value)} className="w-full accent-cyan-400" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Source Separation</label>
          <input type="range" min={0.1} max={0.7} step={0.02} value={sep}
            onChange={e => setSep(+e.target.value)} className="w-full accent-cyan-400" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Phase Difference: {(phase / Math.PI).toFixed(2)}π</label>
          <input type="range" min={0} max={2 * Math.PI} step={0.1} value={phase}
            onChange={e => setPhase(+e.target.value)} className="w-full accent-cyan-400" />
        </div>
        <div className="flex items-end">
          <button onClick={() => setPaused(p => !p)}
            className="w-full py-2 text-sm font-medium rounded-lg border border-cyan-500/40 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all">
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>
      </div>
      <div className="flex gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 inline-block bg-blue-400 rounded"></span>Crest</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 inline-block bg-red-400 rounded"></span>Trough</span>
        <span className="ml-auto text-slate-600">Constructive: bright · Destructive: dark</span>
      </div>
    </div>
  );
}
