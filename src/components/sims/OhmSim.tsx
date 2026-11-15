import { useEffect, useRef, useState } from 'react';
import LabReport from '@/components/LabReport';

export default function OhmSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [voltage, setVoltage] = useState(6);
  const [resistance, setResistance] = useState(100);
  const [animT, setAnimT] = useState(0);
  const [cvZoom, setCvZoom] = useState(1);

  const current = voltage / resistance;
  const power = voltage * current;

  // Animate electrons
  useEffect(() => {
    let t = 0;
    const step = () => {
      t += 0.025 * (current / 0.06); // speed proportional to current
      setAnimT(t);
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [current]);

  // Draw circuit
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio;
    const W = canvas.offsetWidth || 400, H = canvas.offsetHeight || 240;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const pad = 48;
    const lx = pad, rx = W - pad, ty = pad + 20, by = H - pad;
    const cx = W / 2, cy = (ty + by) / 2;

    // Wire path: TL → TR → BR → BL → TL
    ctx.strokeStyle = 'rgba(100,180,255,0.35)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lx, ty); ctx.lineTo(rx, ty);
    ctx.lineTo(rx, by); ctx.lineTo(lx, by); ctx.lineTo(lx, ty);
    ctx.stroke();

    // Battery (left side, center)
    const bx = lx, by2 = cy;
    ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2;
    // positive plate
    ctx.beginPath(); ctx.moveTo(bx - 12, by2 - 24); ctx.lineTo(bx + 12, by2 - 24); ctx.stroke();
    ctx.fillStyle = '#a78bfa'; ctx.font = 'bold 11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('+', bx, by2 - 30);
    // negative plate (thinner)
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(bx - 7, by2 - 12); ctx.lineTo(bx + 7, by2 - 12); ctx.stroke();
    ctx.fillText('−', bx, by2 - 6);
    // Battery body
    ctx.strokeStyle = 'rgba(167,139,250,0.4)'; ctx.lineWidth = 1;
    ctx.strokeRect(bx - 16, by2 - 38, 32, 50);
    ctx.fillStyle = 'rgba(167,139,250,0.08)';
    ctx.fillRect(bx - 16, by2 - 38, 32, 50);
    // Label
    ctx.fillStyle = '#c4b5fd'; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`${voltage}V`, bx, by2 + 24);

    // Resistor (top, center)
    const rLen = 80, rH = 20;
    const r0 = cx - rLen / 2, r1 = cx + rLen / 2;
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;
    ctx.strokeRect(r0, ty - rH / 2, rLen, rH);
    ctx.fillStyle = 'rgba(249,115,22,0.08)';
    ctx.fillRect(r0, ty - rH / 2, rLen, rH);
    ctx.fillStyle = '#fb923c'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${resistance}Ω`, cx, ty - rH / 2 - 6);

    // Ammeter (bottom, center)
    ctx.beginPath(); ctx.arc(cx, by, 16, 0, Math.PI * 2);
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(52,211,153,0.1)'; ctx.fill();
    ctx.fillStyle = '#34d399'; ctx.font = 'bold 11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('A', cx, by + 4);
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(`${(current * 1000).toFixed(1)} mA`, cx, by + 20);

    // Electrons
    const totalLen = 2 * (W - 2 * pad) + 2 * (H - 2 * pad - 40);
    const numE = 8;
    for (let i = 0; i < numE; i++) {
      const frac = ((animT * 0.12 + i / numE) % 1 + 1) % 1;
      const dist = frac * totalLen;
      let ex = 0, ey = 0;
      const seg1 = rx - lx; // top
      const seg2 = by - ty; // right
      const seg3 = rx - lx; // bottom
      const seg4 = by - ty; // left

      if (dist < seg1) { ex = lx + dist; ey = ty; }
      else if (dist < seg1 + seg2) { ex = rx; ey = ty + (dist - seg1); }
      else if (dist < seg1 + seg2 + seg3) { ex = rx - (dist - seg1 - seg2); ey = by; }
      else { ex = lx; ey = by - (dist - seg1 - seg2 - seg3); }

      ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#60a5fa'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex, ey, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#93c5fd'; ctx.fill();
    }

    // Current label on wire
    ctx.fillStyle = 'rgba(96,165,250,0.6)'; ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`I = ${(current * 1000).toFixed(2)} mA →`, rx + 6, (ty + by) / 2);
  }, [voltage, resistance, animT, current]);

  // Draw V-I graph
  useEffect(() => {
    const canvas = graphRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio;
    const W = canvas.offsetWidth || 400, H = canvas.offsetHeight || 240;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const pad = { l: 44, r: 20, t: 20, b: 36 };
    const gw = W - pad.l - pad.r, gh = H - pad.t - pad.b;
    const maxV = 24, maxI = 0.24;

    // Grid
    ctx.strokeStyle = 'rgba(100,120,160,0.1)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (i / 4) * gh;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    }
    for (let i = 0; i <= 4; i++) {
      const x = pad.l + (i / 4) * gw;
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, H - pad.b); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = 'rgba(150,170,200,0.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, H - pad.b); ctx.lineTo(W - pad.r, H - pad.b); ctx.stroke();

    // Ohm's law line for current resistance
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad.l, H - pad.b);
    ctx.lineTo(pad.l + (maxV / maxV) * gw, H - pad.b - (maxV / resistance / maxI) * gh);
    ctx.stroke();

    // Current point
    const px = pad.l + (voltage / maxV) * gw;
    const py = H - pad.b - (current / maxI) * gh;
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f97316'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

    // Labels
    ctx.fillStyle = 'rgba(150,170,200,0.7)'; ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('0', pad.l, H - pad.b + 14);
    ctx.fillText(`${maxV}V`, W - pad.r, H - pad.b + 14);
    ctx.fillText('Voltage →', W / 2, H - 4);
    ctx.textAlign = 'right';
    ctx.fillText(`${(maxI * 1000).toFixed(0)}mA`, pad.l - 4, pad.t + 10);
    ctx.save(); ctx.translate(12, H / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.fillText('Current ↑', 0, 0); ctx.restore();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fb923c';
    ctx.fillText(`R = ${resistance}Ω`, pad.l + 4, pad.t + 14);
  }, [voltage, resistance, current]);

  const obs = [
    { label: 'Voltage (V)', value: voltage, unit: 'V' },
    { label: 'Resistance (R)', value: resistance, unit: 'Ω' },
    { label: 'Current (I)', value: (current * 1000).toFixed(2), unit: 'mA' },
    { label: 'Power (P)', value: power.toFixed(3), unit: 'W' },
    { label: 'V/I ratio', value: (voltage / current).toFixed(1), unit: 'Ω' },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">Circuit Diagram</div>
          <div className="relative overflow-hidden rounded-lg bg-[#080c18]" style={{ height: 240 }}>
            <canvas ref={canvasRef} className="w-full h-full" style={{ transform: `scale(${cvZoom})`, transformOrigin: 'center', display: 'block' }} />
            <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
              <button onClick={() => setCvZoom(z => Math.min(3, z * 1.25))} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-300 hover:bg-orange-500/40 hover:text-white transition-colors text-base font-bold flex items-center justify-center">+</button>
              <button onClick={() => setCvZoom(z => Math.max(0.4, z * 0.8))} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-300 hover:bg-orange-500/40 hover:text-white transition-colors text-base font-bold flex items-center justify-center">−</button>
              <button onClick={() => setCvZoom(1)} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-400 hover:bg-slate-700/80 hover:text-white transition-colors text-xs flex items-center justify-center">↺</button>
            </div>
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">V-I Graph</div>
          <div className="relative overflow-hidden rounded-lg bg-[#080c18]" style={{ height: 240 }}>
            <canvas ref={graphRef} className="w-full h-full" style={{ transform: `scale(${cvZoom})`, transformOrigin: 'center', display: 'block' }} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Voltage (V): <span className="text-white font-mono">{voltage} V</span></label>
          <input type="range" min={1} max={24} step={0.5} value={voltage} onChange={e => setVoltage(+e.target.value)} className="w-full accent-purple-500" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Resistance (R): <span className="text-white font-mono">{resistance} Ω</span></label>
          <input type="range" min={10} max={500} step={10} value={resistance} onChange={e => setResistance(+e.target.value)} className="w-full accent-orange-500" />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[['V', `${voltage} V`, 'text-purple-400'], ['R', `${resistance} Ω`, 'text-orange-400'], ['I', `${(current*1000).toFixed(2)} mA`, 'text-green-400'], ['P', `${power.toFixed(3)} W`, 'text-yellow-400']].map(([k, v, c]) => (
          <div key={k} className="bg-slate-800/60 rounded-lg py-2 px-2 border border-slate-700/50">
            <div className={`text-lg font-bold font-mono ${c}`}>{v}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k === 'V' ? 'Voltage' : k === 'R' ? 'Resistance' : k === 'I' ? 'Current' : 'Power'}</div>
          </div>
        ))}
      </div>

      <LabReport
        labTitle="Ohm's Law"
        aim="To verify Ohm's Law by measuring the current through a resistor at different voltages and demonstrating that current is directly proportional to voltage at constant resistance."
        theory={`Ohm's Law states that the current (I) through a conductor between two points is directly proportional to the voltage (V) across the two points, provided the temperature remains constant.\n\n  V = I × R  (or  I = V/R  or  R = V/I)\n\nWhere:\n  V = Voltage (Volts, V)\n  I = Current (Amperes, A)\n  R = Resistance (Ohms, Ω)\n\nPower: P = V × I = I²R = V²/R\n\nA V-I graph is a straight line through the origin; the slope equals resistance.`}
        apparatus={['Battery / power supply (variable voltage)', 'Resistor (100 Ω)', 'Ammeter', 'Voltmeter', 'Switch', 'Connecting wires']}
        variables={[
          { name: 'Independent variable', desc: 'Voltage across the resistor (V) — varied from 1V to 24V' },
          { name: 'Dependent variable', desc: 'Current through the resistor (I)' },
          { name: 'Controlled variables', desc: 'Resistance (R), temperature' },
        ]}
        observations={obs}
        conclusion={`At ${voltage} V across a ${resistance} Ω resistor, the current is ${(current*1000).toFixed(2)} mA and power dissipated is ${power.toFixed(3)} W. The V/I ratio = ${(voltage/current).toFixed(1)} Ω, confirming Ohm's Law (V = IR). The linear V-I graph verifies the direct proportionality.`}
      />
    </div>
  );
}
