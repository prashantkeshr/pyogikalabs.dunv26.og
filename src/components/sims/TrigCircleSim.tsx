import { useEffect, useRef, useState, useCallback } from 'react';
import LabReport from '@/components/LabReport';

export default function TrigCircleSim() {
  const circleRef = useRef<HTMLCanvasElement>(null);
  const waveRef = useRef<HTMLCanvasElement>(null);
  const [angle, setAngle] = useState(45);
  const [showCos, setShowCos] = useState(true);
  const [showTan, setShowTan] = useState(true);
  const [animating, setAnimating] = useState(false);
  const animRef = useRef<number>(0);
  const angleRef = useRef(angle);
  angleRef.current = angle;

  const rad = angle * Math.PI / 180;
  const sinVal = Math.sin(rad);
  const cosVal = Math.cos(rad);
  const tanVal = Math.abs(cosVal) > 0.01 ? Math.tan(rad) : NaN;

  const drawCircle = useCallback(() => {
    const canvas = circleRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = rect.width, H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.38;
    const a = angleRef.current * Math.PI / 180;
    const px = cx + R * Math.cos(a), py = cy - R * Math.sin(a);

    // Axes
    ctx.strokeStyle = 'rgba(150,170,200,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    // Unit circle
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100,120,180,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();

    // Quadrant labels
    ctx.fillStyle = 'rgba(100,120,180,0.3)'; ctx.font = '12px Inter'; ctx.textAlign = 'center';
    ctx.fillText('I', cx + R * 0.65, cy - R * 0.65);
    ctx.fillText('II', cx - R * 0.65, cy - R * 0.65);
    ctx.fillText('III', cx - R * 0.65, cy + R * 0.65);
    ctx.fillText('IV', cx + R * 0.65, cy + R * 0.65);

    // Angle arc
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.22, 0, -a, a < 0);
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.stroke();
    const arcMidAngle = a / 2;
    ctx.fillStyle = '#fb923c'; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center';
    ctx.fillText(`${angleRef.current}°`, cx + R * 0.32 * Math.cos(arcMidAngle), cy - R * 0.32 * Math.sin(arcMidAngle) + 4);

    // Radius line
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

    // Sin (vertical, red)
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, cy);
    ctx.strokeStyle = '#f87171'; ctx.lineWidth = 2.5; ctx.stroke();
    // Sin label
    ctx.fillStyle = '#f87171'; ctx.font = 'bold 11px Inter'; ctx.textAlign = px > cx ? 'left' : 'right';
    ctx.fillText(`sin = ${Math.sin(a).toFixed(3)}`, px + (px > cx ? 6 : -6), (py + cy) / 2);

    if (showCos) {
      // Cos (horizontal, blue)
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, cy);
      ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#60a5fa'; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center';
      ctx.fillText(`cos = ${Math.cos(a).toFixed(3)}`, (cx + px) / 2, cy + 16);
    }

    if (showTan && !isNaN(tanVal) && Math.abs(tanVal) < 5) {
      // Tan line (purple) — from bottom of sin to y-axis extension
      const tanLineX = cx + R;
      const tanY = cy - R * Math.tan(a);
      ctx.beginPath(); ctx.moveTo(cx + R, cy); ctx.lineTo(tanLineX, tanY);
      ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2; ctx.stroke();
      // Tangent line from origin to tangent point
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tanLineX, tanY);
      ctx.strokeStyle = 'rgba(167,139,250,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#a78bfa'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'left';
      ctx.fillText(`tan = ${tanVal.toFixed(3)}`, tanLineX + 4, (cy + tanY) / 2);
    }

    // Point dot
    ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center';
    ctx.fillText(`(${Math.cos(a).toFixed(2)}, ${Math.sin(a).toFixed(2)})`, px + (px > cx ? 42 : -42), py - 10);

    // Axis labels
    ctx.fillStyle = 'rgba(150,170,200,0.4)'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
    ctx.fillText('1', cx + R + 8, cy - 4); ctx.fillText('-1', cx - R - 8, cy - 4);
    ctx.fillText('1', cx + 4, cy - R - 6); ctx.fillText('-1', cx + 4, cy + R + 12);
  }, [showCos, showTan, tanVal]);

  const drawWave = useCallback(() => {
    const canvas = waveRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = rect.width, H = rect.height;
    ctx.clearRect(0, 0, W, H);
    const pad = { l: 36, r: 12, t: 12, b: 28 };
    const gw = W - pad.l - pad.r, gh = H - pad.t - pad.b;
    const cy2 = pad.t + gh / 2;
    const a = angleRef.current * Math.PI / 180;

    // Grid
    ctx.strokeStyle = 'rgba(100,120,160,0.1)'; ctx.lineWidth = 1;
    [-1, -0.5, 0, 0.5, 1].forEach(v => {
      const y = cy2 - v * gh / 2;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillStyle = 'rgba(150,170,200,0.4)'; ctx.font = '9px Inter'; ctx.textAlign = 'right';
      ctx.fillText(v.toString(), pad.l - 3, y + 3);
    });

    // Axis
    ctx.strokeStyle = 'rgba(150,170,200,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, cy2); ctx.lineTo(W - pad.r, cy2); ctx.stroke();

    // Sin wave
    ctx.beginPath();
    for (let ix = 0; ix <= gw; ix++) {
      const t = (ix / gw) * Math.PI * 4;
      const y = cy2 - Math.sin(t) * (gh / 2 - 4);
      ix === 0 ? ctx.moveTo(pad.l + ix, y) : ctx.lineTo(pad.l + ix, y);
    }
    ctx.strokeStyle = '#f87171'; ctx.lineWidth = 1.5; ctx.stroke();

    if (showCos) {
      ctx.beginPath();
      for (let ix = 0; ix <= gw; ix++) {
        const t = (ix / gw) * Math.PI * 4;
        const y = cy2 - Math.cos(t) * (gh / 2 - 4);
        ix === 0 ? ctx.moveTo(pad.l + ix, y) : ctx.lineTo(pad.l + ix, y);
      }
      ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // Current angle marker
    const ix = (a % (Math.PI * 2)) / (Math.PI * 2) * (gw / 2);
    const mx = pad.l + ix;
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(mx, pad.t); ctx.lineTo(mx, H - pad.b); ctx.stroke();
    ctx.setLineDash([]);

    // Sin dot
    const sy = cy2 - Math.sin(a) * (gh / 2 - 4);
    ctx.beginPath(); ctx.arc(mx, sy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#f87171'; ctx.fill();

    if (showCos) {
      const cosy = cy2 - Math.cos(a) * (gh / 2 - 4);
      ctx.beginPath(); ctx.arc(mx, cosy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#60a5fa'; ctx.fill();
    }

    // Legend
    ctx.fillStyle = '#f87171'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'left';
    ctx.fillText('sin(θ)', pad.l + 4, pad.t + 12);
    if (showCos) { ctx.fillStyle = '#60a5fa'; ctx.fillText('cos(θ)', pad.l + 54, pad.t + 12); }
    ctx.fillStyle = 'rgba(150,170,200,0.5)'; ctx.textAlign = 'center';
    ctx.fillText('0°          90°        180°        270°        360°', pad.l + gw / 2, H - pad.b + 18);
  }, [showCos]);

  useEffect(() => { drawCircle(); drawWave(); }, [angle, drawCircle, drawWave]);

  const startAnimate = () => {
    if (animating) { cancelAnimationFrame(animRef.current); setAnimating(false); return; }
    setAnimating(true);
    const step = () => {
      setAngle(a => (a + 1) % 360);
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  };

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  // Mouse drag on circle
  const handleCircleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = circleRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = -(e.clientY - rect.top - rect.height / 2);
    const a = Math.round(Math.atan2(y, x) * 180 / Math.PI);
    setAngle(((a % 360) + 360) % 360);
  };

  const obs = [
    { label: 'Angle (θ)', value: angle, unit: '°' },
    { label: 'Radians', value: rad.toFixed(4), unit: 'rad' },
    { label: 'sin(θ)', value: sinVal.toFixed(4) },
    { label: 'cos(θ)', value: cosVal.toFixed(4) },
    { label: 'tan(θ)', value: isNaN(tanVal) ? 'undefined' : tanVal.toFixed(4) },
    { label: 'Quadrant', value: angle < 90 ? 'I (sin+, cos+)' : angle < 180 ? 'II (sin+, cos−)' : angle < 270 ? 'III (sin−, cos−)' : 'IV (sin−, cos+)' },
    { label: 'sin²(θ) + cos²(θ)', value: (sinVal ** 2 + cosVal ** 2).toFixed(6) },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">Unit Circle — click to set angle</div>
          <canvas ref={circleRef} onClick={handleCircleClick}
            className="w-full rounded-lg bg-[#080c18] cursor-crosshair" style={{ height: 280, display: 'block' }} />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Sine & Cosine Waves</div>
          <canvas ref={waveRef} className="w-full rounded-lg bg-[#080c18]" style={{ height: 280, display: 'block' }} />
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs text-slate-400 mb-1 block">Angle: <span className="text-white font-mono">{angle}°  ({rad.toFixed(3)} rad)</span></label>
        <input type="range" min={0} max={359} value={angle} onChange={e => { cancelAnimationFrame(animRef.current); setAnimating(false); setAngle(+e.target.value); }} className="w-full accent-orange-500" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-400 hover:text-slate-200">
          <input type="checkbox" checked={showCos} onChange={e => setShowCos(e.target.checked)} className="accent-blue-500 rounded" /> Show cos(θ)
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-400 hover:text-slate-200">
          <input type="checkbox" checked={showTan} onChange={e => setShowTan(e.target.checked)} className="accent-purple-500 rounded" /> Show tan line
        </label>
        <div className="ml-auto flex gap-2">
          {[0, 30, 45, 60, 90, 120, 180, 270].map(a => (
            <button key={a} onClick={() => setAngle(a)}
              className={`px-2 py-1 rounded text-xs border transition-all ${angle === a ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'border-slate-700 text-slate-500 hover:border-slate-500'}`}>
              {a}°
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 sm:grid-cols-7 gap-2 text-center">
        {[['sin', sinVal.toFixed(4), '#f87171'], ['cos', cosVal.toFixed(4), '#60a5fa'], ['tan', isNaN(tanVal) ? '∞' : tanVal.toFixed(3), '#a78bfa']].map(([k, v, c]) => (
          <div key={k} className="bg-slate-800/60 rounded-lg py-2 px-2 border border-slate-700/50 col-span-1">
            <div className="text-xs text-slate-500">{k}({angle}°)</div>
            <div className="text-sm font-bold font-mono mt-0.5" style={{ color: c }}>{v}</div>
          </div>
        ))}
        <div className="bg-slate-800/60 rounded-lg py-2 px-2 border border-slate-700/50 col-span-1 sm:col-span-4">
          <div className="text-xs text-slate-500">Pythagorean Identity</div>
          <div className="text-sm font-bold font-mono mt-0.5 text-green-400">sin²+cos² = {(sinVal**2+cosVal**2).toFixed(5)}</div>
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <button onClick={startAnimate}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${animating ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-blue-500/20 border-blue-500/40 text-blue-300'}`}>
          {animating ? '⏹ Stop' : '▶ Animate'}
        </button>
      </div>

      <LabReport
        labTitle="Trigonometric Circle"
        aim="To explore the unit circle definition of trigonometric functions and understand the relationship between sine, cosine, and tangent across all four quadrants."
        theory={`The unit circle is a circle of radius 1 centred at the origin.\n\nFor any angle θ:\n  sin(θ) = y-coordinate of the point on the unit circle\n  cos(θ) = x-coordinate of the point on the unit circle\n  tan(θ) = sin(θ) / cos(θ) = y/x\n\nPythagorean identity: sin²(θ) + cos²(θ) = 1 (always)\n\nSpecial angles:\n  sin(30°) = 0.5,  cos(30°) = √3/2\n  sin(45°) = √2/2, cos(45°) = √2/2\n  sin(60°) = √3/2, cos(60°) = 0.5\n  sin(90°) = 1,    cos(90°) = 0\n\nQuadrant signs (CAST rule):\n  Q1: sin+, cos+ | Q2: sin+, cos− | Q3: sin−, cos− | Q4: sin−, cos+`}
        apparatus={['Protractor', 'Compass', 'Graph paper', 'Calculator']}
        variables={[
          { name: 'Independent variable', desc: 'Angle θ (0° to 360°)' },
          { name: 'Dependent variable', desc: 'sin(θ), cos(θ), tan(θ)' },
        ]}
        observations={obs}
        conclusion={`At θ = ${angle}°, sin(θ) = ${sinVal.toFixed(4)}, cos(θ) = ${cosVal.toFixed(4)}, and tan(θ) = ${isNaN(tanVal) ? 'undefined' : tanVal.toFixed(4)}. The Pythagorean identity holds: sin²+cos² = ${(sinVal**2+cosVal**2).toFixed(5)}. The point lies in Quadrant ${angle < 90 ? 'I' : angle < 180 ? 'II' : angle < 270 ? 'III' : 'IV'}.`}
      />
    </div>
  );
}
