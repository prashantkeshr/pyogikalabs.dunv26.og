import { useEffect, useRef, useState, useCallback } from 'react';

const GRAVITY_OPTS = [
  { label: 'Earth', value: 9.8, icon: '🌍' },
  { label: 'Moon',  value: 1.62, icon: '🌕' },
  { label: 'Mars',  value: 3.72, icon: '🔴' },
];
const DAMPING_OPTS = [
  { label: 'None', value: 0 },
  { label: 'Air',  value: 0.08 },
  { label: 'Heavy', value: 0.4 },
];

export default function PendulumSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const stateRef  = useRef({ theta: Math.PI / 4, omega: 0 });
  const trailRef  = useRef<Array<[number, number]>>([]);

  const [running, setRunning]   = useState(true);
  const [length, setLength]     = useState(1.4);
  const [gravIdx, setGravIdx]   = useState(0);
  const [dampIdx, setDampIdx]   = useState(1);
  const [cvZoom, setCvZoom]     = useState(1);

  const gravity  = GRAVITY_OPTS[gravIdx].value;
  const damping  = DAMPING_OPTS[dampIdx].value;

  const period = 2 * Math.PI * Math.sqrt(length / gravity);

  const reset = useCallback(() => {
    stateRef.current = { theta: Math.PI / 4, omega: 0 };
    trailRef.current = [];
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setSize = () => {
      const dpr = window.devicePixelRatio;
      canvas.width  = (canvas.offsetWidth  || 400) * dpr;
      canvas.height = (canvas.offsetHeight || 300) * dpr;
      const ctx = canvas.getContext('2d');
      ctx?.scale(dpr, dpr);
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastT = performance.now();
    const animate = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const W = canvas.width / window.devicePixelRatio;
      const H = canvas.height / window.devicePixelRatio;
      const pivotX = W / 2, pivotY = H * 0.12;
      const L = length * (H * 0.72);

      // Physics update
      if (running) {
        const { theta, omega } = stateRef.current;
        const alpha = -(gravity / length) * Math.sin(theta) - damping * omega;
        stateRef.current.omega = omega + alpha * dt;
        stateRef.current.theta = theta + stateRef.current.omega * dt;
      }

      const { theta } = stateRef.current;
      const bobX = pivotX + Math.sin(theta) * L;
      const bobY = pivotY + Math.cos(theta) * L;
      const bobR = Math.max(14, W * 0.038);

      // Trail
      trailRef.current.push([bobX, bobY]);
      if (trailRef.current.length > 220) trailRef.current.shift();

      // Draw
      ctx.clearRect(0, 0, W, H);

      // Trail
      if (trailRef.current.length > 2) {
        ctx.beginPath();
        ctx.moveTo(trailRef.current[0][0], trailRef.current[0][1]);
        for (let i = 1; i < trailRef.current.length; i++) {
          ctx.lineTo(trailRef.current[i][0], trailRef.current[i][1]);
        }
        ctx.strokeStyle = 'rgba(96,165,250,0.18)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Pivot support bar
      ctx.fillStyle = '#1e2d47';
      ctx.fillRect(pivotX - 30, pivotY - 6, 60, 6);

      // String
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(bobX, bobY);
      ctx.strokeStyle = 'rgba(203,213,225,0.7)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Pivot dot
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#94a3b8';
      ctx.fill();

      // Angle arc
      if (Math.abs(theta) > 0.05) {
        ctx.beginPath();
        const arcR = 36;
        ctx.arc(pivotX, pivotY, arcR, Math.PI / 2, Math.PI / 2 - theta, theta > 0);
        ctx.strokeStyle = 'rgba(96,165,250,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = 'rgba(96,165,250,0.6)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${(theta * 180 / Math.PI).toFixed(1)}°`, pivotX + Math.sin(theta / 2) * (arcR + 14), pivotY + Math.cos(theta / 2) * (arcR + 14));
      }

      // Bob
      const gr = ctx.createRadialGradient(bobX - bobR * 0.3, bobY - bobR * 0.3, bobR * 0.1, bobX, bobY, bobR);
      gr.addColorStop(0, '#93c5fd');
      gr.addColorStop(0.5, '#3b82f6');
      gr.addColorStop(1, '#1d4ed8');
      ctx.beginPath();
      ctx.arc(bobX, bobY, bobR, 0, Math.PI * 2);
      ctx.fillStyle = gr;
      ctx.fill();
      ctx.strokeStyle = 'rgba(147,197,253,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // KE/PE bars
      const ke = 0.5 * (stateRef.current.omega * stateRef.current.omega) * length * length;
      const pe = gravity * length * (1 - Math.cos(theta));
      const maxE = gravity * length * (1 - Math.cos(Math.PI / 4));
      const bx = W - 56, bw = 10, bh = H * 0.4, by0 = H * 0.3;
      const draw_bar = (x: number, ratio: number, label: string, color: string) => {
        const h = bh * Math.min(ratio, 1);
        ctx.fillStyle = '#1a2540';
        ctx.fillRect(x, by0, bw, bh);
        ctx.fillStyle = color;
        ctx.fillRect(x, by0 + bh - h, bw, h);
        ctx.fillStyle = 'rgba(203,213,225,0.5)';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + bw / 2, by0 + bh + 14);
      };
      draw_bar(bx - 14, maxE > 0 ? ke / maxE : 0, 'KE', '#60a5fa');
      draw_bar(bx + 4,  maxE > 0 ? pe / maxE : 0, 'PE', '#34d399');

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, length, gravity, damping]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-lg" style={{ height: 300, background: 'rgba(14,19,38,0.6)' }}>
        <canvas ref={canvasRef} className="sim-canvas w-full h-full"
          style={{ transform: `scale(${cvZoom})`, transformOrigin: 'center', display: 'block' }} />
        <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
          <button onClick={() => setCvZoom(z => Math.min(3, z * 1.25))} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-300 hover:bg-orange-500/40 hover:text-white transition-colors text-base font-bold flex items-center justify-center">+</button>
          <button onClick={() => setCvZoom(z => Math.max(0.4, z * 0.8))} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-300 hover:bg-orange-500/40 hover:text-white transition-colors text-base font-bold flex items-center justify-center">−</button>
          <button onClick={() => setCvZoom(1)} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-400 hover:bg-slate-700/80 hover:text-white transition-colors text-xs flex items-center justify-center">↺</button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">String Length: {length.toFixed(1)} m</label>
          <input type="range" min={0.4} max={2.5} step={0.05} value={length}
            onChange={e => { setLength(+e.target.value); reset(); }}
            className="w-full accent-blue-400" />
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">Period: <span className="text-blue-300 font-mono">{period.toFixed(2)} s</span></div>
          <div className="text-xs text-slate-400">θ: <span className="text-blue-300 font-mono">{(stateRef.current.theta * 180 / Math.PI).toFixed(1)}°</span></div>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Gravity</label>
          <div className="flex gap-1">
            {GRAVITY_OPTS.map((g, i) => (
              <button key={g.label} onClick={() => { setGravIdx(i); reset(); }}
                className={`flex-1 py-1 text-xs rounded border transition-all ${i === gravIdx ? 'border-blue-500/60 bg-blue-500/15 text-blue-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                {g.icon} {g.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Damping</label>
          <div className="flex gap-1">
            {DAMPING_OPTS.map((d, i) => (
              <button key={d.label} onClick={() => setDampIdx(i)}
                className={`flex-1 py-1 text-xs rounded border transition-all ${i === dampIdx ? 'border-blue-500/60 bg-blue-500/15 text-blue-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setRunning(r => !r)}
          className="flex-1 py-2 text-sm font-medium rounded-lg border border-blue-500/40 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 transition-all">
          {running ? '⏸ Pause' : '▶ Resume'}
        </button>
        <button onClick={reset}
          className="flex-1 py-2 text-sm font-medium rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all">
          ↺ Reset
        </button>
      </div>
    </div>
  );
}
