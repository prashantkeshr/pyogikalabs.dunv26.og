import { useEffect, useRef, useState, useCallback } from 'react';
import LabReport from '@/components/LabReport';

const G_OPTIONS = [
  { label: 'Earth', value: 9.8 },
  { label: 'Moon', value: 1.62 },
  { label: 'Mars', value: 3.72 },
];

export default function ProjectileSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [angle, setAngle] = useState(45);
  const [speed, setSpeed] = useState(50);
  const [gLabel, setGLabel] = useState('Earth');
  const [running, setRunning] = useState(false);
  const [zoom, setZoom] = useState(1);

  const g = G_OPTIONS.find(o => o.label === gLabel)!.value;
  const angleR = angle * Math.PI / 180;
  const range = speed * speed * Math.sin(2 * angleR) / g;
  const maxH  = speed * speed * Math.sin(angleR) ** 2 / (2 * g);
  const tof   = 2 * speed * Math.sin(angleR) / g;

  const trailRef = useRef<[number, number][]>([]);
  const tRef = useRef(0);
  const posRef = useRef<[number, number]>([0, 0]);

  const reset = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    setRunning(false);
    trailRef.current = [];
    tRef.current = 0;
    posRef.current = [0, 0];
    drawStatic();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angle, speed, g, zoom]);

  function getScale(canvas: HTMLCanvasElement) {
    const W = canvas.width / window.devicePixelRatio;
    const H = canvas.height / window.devicePixelRatio;
    const pad = 60;
    const scaleX = (W - pad * 2) / (range || 1);
    const scaleY = (H - pad * 2) / (maxH || 1);
    return Math.min(scaleX, scaleY) * zoom;
  }

  function drawScene(canvas: HTMLCanvasElement, t: number) {
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pad = 60;
    const sc = getScale(canvas);
    const ox = pad;
    const oy = H - pad;

    // Grid lines
    ctx.strokeStyle = 'rgba(100,120,160,0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= range; x += range / 5) {
      const px = ox + x * sc;
      ctx.beginPath(); ctx.moveTo(px, pad); ctx.lineTo(px, oy); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = 'rgba(150,170,200,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ox, pad - 10); ctx.lineTo(ox, oy); ctx.lineTo(W - 20, oy); ctx.stroke();

    // Axis labels
    ctx.fillStyle = 'rgba(150,170,200,0.6)';
    ctx.font = `11px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('0', ox, oy + 16);
    ctx.fillText(`${range.toFixed(0)} m`, ox + range * sc, oy + 16);
    ctx.textAlign = 'left';
    ctx.fillText(`${maxH.toFixed(0)} m`, ox + 4, pad + 12);
    ctx.fillText('Range →', W / 2, oy + 28);
    ctx.save(); ctx.translate(ox - 32, H / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.fillText('Height ↑', 0, 0); ctx.restore();

    // Dashed trajectory outline
    if (range > 0) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(96,165,250,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let si = 0; si <= 200; si++) {
        const ti = (si / 200) * tof;
        const px = ox + speed * Math.cos(angleR) * ti * sc;
        const py = oy - (speed * Math.sin(angleR) * ti - 0.5 * g * ti * ti) * sc;
        si === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Trail
    if (trailRef.current.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      trailRef.current.forEach(([tx, ty], i) => {
        const px = ox + tx * sc;
        const py = oy - ty * sc;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    // Max height marker
    if (t > 0) {
      const hx = ox + speed * Math.cos(angleR) * (tof / 2) * sc;
      const hy = oy - maxH * sc;
      ctx.strokeStyle = 'rgba(167,139,250,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(ox, hy); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, oy); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Projectile
    if (t > 0 && t <= tof) {
      const [px_, py_] = posRef.current;
      const px = ox + px_ * sc;
      const py = oy - py_ * sc;
      const gr = ctx.createRadialGradient(px - 3, py - 3, 1, px, py, 10);
      gr.addColorStop(0, '#93c5fd');
      gr.addColorStop(1, '#2563eb');
      ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fillStyle = gr; ctx.fill();
      ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // Launch arrow (when not running)
    if (t === 0) {
      const ax = ox, ay = oy;
      const len = 44;
      const ex = ax + len * Math.cos(angleR);
      const ey = ay - len * Math.sin(angleR);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.beginPath();
      const nx = -(ey - ay) / len, ny = (ex - ax) / len;
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - 10 * Math.cos(angleR) + 5 * nx, ey + 10 * Math.sin(angleR) + 5 * ny);
      ctx.lineTo(ex - 10 * Math.cos(angleR) - 5 * nx, ey + 10 * Math.sin(angleR) - 5 * ny);
      ctx.closePath(); ctx.fillStyle = '#f97316'; ctx.fill();
    }
  }

  function drawStatic() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawScene(canvas, 0);
  }

  useEffect(() => { reset(); }, [reset]);

  const launch = () => {
    if (running) return;
    trailRef.current = [];
    tRef.current = 0;
    setRunning(true);
    const dt = 0.016;
    const step = () => {
      const t = tRef.current;
      if (t > tof + dt) {
        setRunning(false);
        return;
      }
      const x = speed * Math.cos(angleR) * t;
      const y = speed * Math.sin(angleR) * t - 0.5 * g * t * t;
      posRef.current = [x, Math.max(0, y)];
      trailRef.current.push([x, Math.max(0, y)]);
      tRef.current += dt;
      const canvas = canvasRef.current;
      if (canvas) drawScene(canvas, tRef.current);
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio;
      canvas.width  = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      drawStatic();
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const obs = [
    { label: 'Launch Angle', value: angle, unit: '°' },
    { label: 'Initial Speed', value: speed, unit: 'm/s' },
    { label: 'Gravity', value: g, unit: 'm/s²' },
    { label: 'Max Height', value: maxH.toFixed(2), unit: 'm' },
    { label: 'Range', value: range.toFixed(2), unit: 'm' },
    { label: 'Time of Flight', value: tof.toFixed(2), unit: 's' },
    { label: 'Horizontal Velocity', value: (speed * Math.cos(angleR)).toFixed(2), unit: 'm/s' },
    { label: 'Vertical Velocity (initial)', value: (speed * Math.sin(angleR)).toFixed(2), unit: 'm/s' },
  ];

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg bg-[#080c18]" style={{ height: 340 }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
        <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
          <button onClick={() => setZoom(z => Math.min(3, z * 1.25))} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-300 hover:bg-orange-500/40 hover:text-white transition-colors text-base font-bold flex items-center justify-center">+</button>
          <button onClick={() => setZoom(z => Math.max(0.25, z * 0.8))} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-300 hover:bg-orange-500/40 hover:text-white transition-colors text-base font-bold flex items-center justify-center">−</button>
          <button onClick={() => setZoom(1)} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-400 hover:bg-slate-700/80 hover:text-white transition-colors text-xs flex items-center justify-center">↺</button>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Angle: <span className="text-white font-mono">{angle}°</span></label>
          <input type="range" min={5} max={85} value={angle} onChange={e => { setAngle(+e.target.value); reset(); }}
            className="w-full accent-blue-500" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Initial Speed: <span className="text-white font-mono">{speed} m/s</span></label>
          <input type="range" min={10} max={100} value={speed} onChange={e => { setSpeed(+e.target.value); reset(); }}
            className="w-full accent-blue-500" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-500">Gravity:</span>
        {G_OPTIONS.map(o => (
          <button key={o.label} onClick={() => { setGLabel(o.label); reset(); }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${gLabel === o.label ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
            {o.label} ({o.value} m/s²)
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-sm border border-slate-700 hover:border-slate-500">+</button>
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-sm border border-slate-700 hover:border-slate-500">−</button>
          <span className="text-xs text-slate-500 self-center">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[['Range', `${range.toFixed(1)} m`], ['Max Height', `${maxH.toFixed(1)} m`], ['Flight Time', `${tof.toFixed(2)} s`]].map(([k, v]) => (
          <div key={k} className="bg-slate-800/60 rounded-lg py-2 px-3 border border-slate-700/50">
            <div className="text-xs text-slate-500">{k}</div>
            <div className="text-sm font-mono font-bold text-white mt-0.5">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={launch} disabled={running}
          className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold disabled:opacity-40 hover:bg-blue-400 transition-colors">
          {running ? 'Launching…' : '▶ Launch'}
        </button>
        <button onClick={reset} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:border-slate-500 transition-colors">
          Reset
        </button>
      </div>

      <LabReport
        labTitle="Projectile Motion"
        aim="To investigate how the angle of projection affects the range, maximum height, and time of flight of a projectile, and to verify the equations of projectile motion."
        theory={`A projectile is an object moving under gravity with no air resistance. The motion is split into independent horizontal and vertical components.\n\nHorizontal: x = u·cos(θ)·t  (constant velocity)\nVertical:   y = u·sin(θ)·t − ½gt²  (uniform acceleration)\n\nKey equations:\n  Range R = u²·sin(2θ)/g\n  Max height H = u²·sin²(θ)/(2g)\n  Time of flight T = 2u·sin(θ)/g\n\nRange is maximum at θ = 45°. Complementary angles (e.g. 30° and 60°) give equal ranges.`}
        apparatus={['Launcher / cannon model', 'Protractor (angle measurement)', 'Stopwatch', 'Metre rule / measuring tape', 'Graph paper']}
        variables={[
          { name: 'Independent variable', desc: 'Angle of projection (θ) — varied from 5° to 85°' },
          { name: 'Dependent variable', desc: 'Range, max height, and time of flight' },
          { name: 'Controlled variables', desc: 'Initial speed (u), gravitational acceleration (g)' },
        ]}
        observations={obs}
        conclusion={`At θ = ${angle}°, the projectile reaches a maximum height of ${maxH.toFixed(2)} m, travels a horizontal range of ${range.toFixed(2)} m, and stays airborne for ${tof.toFixed(2)} s. ${angle === 45 ? 'At 45° the range is at its maximum for this speed.' : (angle < 45 ? 'Increasing the angle towards 45° would increase range. The complementary angle ' + (90 - angle) + '° gives the same range.' : 'Decreasing the angle towards 45° would increase range. The complementary angle ' + (90 - angle) + '° gives the same range.')} The simulation confirms the theoretical equations of projectile motion.`}
      />
    </div>
  );
}
