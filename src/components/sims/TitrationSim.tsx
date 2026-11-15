import { useEffect, useRef, useState, useCallback } from 'react';
import LabReport from '@/components/LabReport';

type AcidBase = 'strong' | 'weak';

function calcPH(volNaOH: number, type: AcidBase, concAcid: number, concBase: number, volAcid: number): number {
  const molesAcid = concAcid * volAcid / 1000;
  const molesBase = concBase * volNaOH / 1000;
  const Ka = type === 'weak' ? 1.8e-5 : 1e10;
  const totalVol = (volAcid + volNaOH) / 1000;

  if (volNaOH === 0) {
    if (type === 'weak') {
      const H = Math.sqrt(Ka * concAcid);
      return -Math.log10(H);
    }
    return -Math.log10(concAcid);
  }

  const eqVol = molesAcid / concBase * 1000;

  if (volNaOH < eqVol) {
    const remaining = molesAcid - molesBase;
    if (type === 'weak') {
      const ratio = molesBase / remaining;
      return -Math.log10(Ka) + Math.log10(ratio);
    }
    return -Math.log10(remaining / totalVol);
  }

  if (Math.abs(volNaOH - eqVol) < 0.05) {
    if (type === 'weak') return 8.72;
    return 7.0;
  }

  const excess = molesBase - molesAcid;
  const pOH = -Math.log10(excess / totalVol);
  return 14 - pOH;
}

function getIndicator(pH: number): string {
  if (pH < 3.1) return '#FF4444';
  if (pH < 4.4) return '#FF8800';
  if (pH < 6.0) return '#FFCC00';
  if (pH < 7.6) return '#AADDAA';
  if (pH < 8.3) return '#00AA88';
  return '#6666FF';
}

export default function TitrationSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dropAnimRef = useRef({ y: 0, active: false });

  const [volAdded, setVolAdded] = useState(0);
  const [acidType, setAcidType] = useState<AcidBase>('strong');
  const [concAcid] = useState(0.1);
  const [concBase] = useState(0.1);
  const [volAcid] = useState(25);
  const [dripping, setDripping] = useState(false);
  const [dropSize, setDropSize] = useState(0.5); // mL/click
  const [phHistory, setPhHistory] = useState<[number, number][]>([[0, calcPH(0, 'strong', 0.1, 0.1, 25)]]);
  const [cvZoom, setCvZoom] = useState(1);

  const pH = calcPH(volAdded, acidType, concAcid, concBase, volAcid);
  const eqVol = concAcid * volAcid / concBase;
  const indColor = getIndicator(pH);

  const reset = useCallback(() => {
    setVolAdded(0);
    setDripping(false);
    setPhHistory([[0, calcPH(0, acidType, concAcid, concBase, volAcid)]]);
  }, [acidType, concAcid, concBase, volAcid]);

  useEffect(() => { reset(); }, [acidType, reset]);

  const addDrop = useCallback(() => {
    setVolAdded(v => {
      const nv = Math.min(v + dropSize, 50);
      const newPH = calcPH(nv, acidType, concAcid, concBase, volAcid);
      setPhHistory(h => [...h, [nv, newPH]]);
      return nv;
    });
    // Animate drop
    dropAnimRef.current = { y: 0, active: true };
  }, [acidType, concAcid, concBase, dropSize, volAcid]);

  // Auto-drip
  useEffect(() => {
    if (!dripping) return;
    const id = setInterval(() => addDrop(), 400);
    return () => clearInterval(id);
  }, [dripping, addDrop]);

  // Drop animation
  useEffect(() => {
    const anim = () => {
      if (dropAnimRef.current.active) {
        dropAnimRef.current.y += 6;
        if (dropAnimRef.current.y > 120) dropAnimRef.current.active = false;
      }
      drawScene();
      animRef.current = requestAnimationFrame(anim);
    };
    animRef.current = requestAnimationFrame(anim);
    return () => cancelAnimationFrame(animRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pH, indColor, volAdded]);

  function drawScene() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio;
    const W = canvas.offsetWidth || 400, H = canvas.offsetHeight || 280;
    if (canvas.width !== W * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    }
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;

    // Burette body
    const bx = cx, bTop = 20, bH = 160;
    ctx.strokeStyle = 'rgba(150,200,255,0.4)'; ctx.lineWidth = 2;
    ctx.strokeRect(bx - 14, bTop, 28, bH);
    ctx.fillStyle = 'rgba(100,180,255,0.07)';
    ctx.fillRect(bx - 14, bTop, 28, bH);

    // NaOH level in burette
    const fillFraction = 1 - Math.min(volAdded / 50, 1);
    ctx.fillStyle = 'rgba(100,200,255,0.25)';
    ctx.fillRect(bx - 13, bTop + 1, 26, bH * fillFraction);

    // Graduation marks
    ctx.strokeStyle = 'rgba(150,200,255,0.3)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = bTop + (i / 5) * bH;
      ctx.beginPath(); ctx.moveTo(bx - 14, y); ctx.lineTo(bx - 6, y); ctx.stroke();
      ctx.fillStyle = 'rgba(150,170,200,0.5)'; ctx.font = '9px Inter'; ctx.textAlign = 'right';
      ctx.fillText(`${i * 10}`, bx - 17, y + 3);
    }

    // Burette tip
    ctx.strokeStyle = 'rgba(150,200,255,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(bx - 4, bTop + bH); ctx.lineTo(bx, bTop + bH + 20); ctx.lineTo(bx + 4, bTop + bH); ctx.stroke();

    // Drop
    if (dropAnimRef.current.active) {
      const dy = bTop + bH + 20 + dropAnimRef.current.y;
      ctx.beginPath(); ctx.arc(bx, dy, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100,200,255,0.8)'; ctx.fill();
    }

    // Conical flask
    const fBase = 60, fNeck = 20, fH = 90;
    const fy0 = H - 30, fy1 = fy0 - fH;
    ctx.beginPath();
    ctx.moveTo(cx - fNeck, fy1);
    ctx.lineTo(cx + fNeck, fy1);
    ctx.lineTo(cx + fBase, fy0);
    ctx.lineTo(cx - fBase, fy0);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(150,200,150,0.5)'; ctx.lineWidth = 2; ctx.stroke();

    // Solution colour
    ctx.save(); ctx.clip();
    const solutionH = fH * 0.6;
    ctx.fillStyle = indColor + '55';
    ctx.fillRect(cx - fBase, fy0 - solutionH, fBase * 2, solutionH);
    ctx.restore();

    // Stirrer bar
    ctx.strokeStyle = 'rgba(150,100,200,0.4)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 18, fy0 - 10); ctx.lineTo(cx + 18, fy0 - 10); ctx.stroke();

    // pH display
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(cx + 70, H - 70, 90, 50);
    ctx.strokeStyle = 'rgba(150,170,200,0.2)'; ctx.lineWidth = 1;
    ctx.strokeRect(cx + 70, H - 70, 90, 50);
    ctx.fillStyle = pH < 7 ? '#f87171' : pH > 7 ? '#60a5fa' : '#4ade80';
    ctx.font = 'bold 22px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`pH ${pH.toFixed(2)}`, cx + 115, H - 42);
    ctx.fillStyle = 'rgba(150,170,200,0.4)'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
    ctx.fillText('pH Meter', cx + 115, H - 28);

    // Vol label
    ctx.fillStyle = 'rgba(100,200,255,0.6)'; ctx.font = '11px Inter'; ctx.textAlign = 'center';
    ctx.fillText(`${volAdded.toFixed(1)} mL added`, bx, H - 10);
  }

  // Draw pH curve
  useEffect(() => {
    const canvas = graphRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio;
    const W = canvas.offsetWidth || 400, H = canvas.offsetHeight || 280;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const pad = { l: 36, r: 16, t: 16, b: 32 };
    const gw = W - pad.l - pad.r, gh = H - pad.t - pad.b;
    const maxVol = 50, maxPH = 14;

    // Grid
    ctx.strokeStyle = 'rgba(100,120,160,0.1)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 7; i++) {
      const y = pad.t + (i / 7) * gh;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = 'rgba(150,170,200,0.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, H - pad.b); ctx.lineTo(W - pad.r, H - pad.b); ctx.stroke();

    // Equivalence point line
    const ex = pad.l + (eqVol / maxVol) * gw;
    ctx.strokeStyle = 'rgba(167,139,250,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(ex, pad.t); ctx.lineTo(ex, H - pad.b); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(167,139,250,0.5)'; ctx.font = '9px Inter'; ctx.textAlign = 'center';
    ctx.fillText(`EP ${eqVol.toFixed(0)}mL`, ex, pad.t + 10);

    // pH 7 line
    const py7 = pad.t + (1 - 7 / maxPH) * gh;
    ctx.strokeStyle = 'rgba(74,222,128,0.2)'; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(pad.l, py7); ctx.lineTo(W - pad.r, py7); ctx.stroke();
    ctx.setLineDash([]);

    // pH curve
    if (phHistory.length > 1) {
      ctx.beginPath();
      phHistory.forEach(([v, p], i) => {
        const x = pad.l + (v / maxVol) * gw;
        const y = pad.t + (1 - p / maxPH) * gh;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
    }

    // Current point
    const cpx = pad.l + (volAdded / maxVol) * gw;
    const cpy = pad.t + (1 - pH / maxPH) * gh;
    ctx.beginPath(); ctx.arc(cpx, cpy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#60a5fa'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

    // Axis labels
    ctx.fillStyle = 'rgba(150,170,200,0.6)'; ctx.font = '10px Inter';
    ctx.textAlign = 'center'; ctx.fillText('Volume NaOH (mL) →', W / 2, H - 4);
    ctx.textAlign = 'right'; ctx.fillText('14', pad.l - 4, pad.t + 10);
    ctx.fillText('7', pad.l - 4, py7 + 4);
    ctx.fillText('0', pad.l - 4, H - pad.b + 4);
    ctx.save(); ctx.translate(10, H / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.fillText('pH', 0, 0); ctx.restore();
  }, [phHistory, volAdded, pH, eqVol]);

  const obs = [
    { label: 'Acid type', value: acidType === 'strong' ? 'Strong acid (HCl)' : 'Weak acid (CH₃COOH)' },
    { label: 'Acid concentration', value: `${concAcid * 1000} mM` },
    { label: 'NaOH concentration', value: `${concBase * 1000} mM` },
    { label: 'Volume of acid', value: volAcid, unit: 'mL' },
    { label: 'Volume NaOH added', value: volAdded.toFixed(1), unit: 'mL' },
    { label: 'Current pH', value: pH.toFixed(2) },
    { label: 'Equivalence point', value: eqVol.toFixed(1), unit: 'mL' },
    { label: 'Indicator colour', value: pH < 4 ? 'Red (acidic)' : pH > 10 ? 'Blue/Purple (alkaline)' : 'Near endpoint' },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <span className="text-xs text-slate-500">Acid type:</span>
        {(['strong', 'weak'] as AcidBase[]).map(t => (
          <button key={t} onClick={() => setAcidType(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize ${acidType === t ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
            {t === 'strong' ? 'Strong acid (HCl)' : 'Weak acid (CH₃COOH)'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">Burette & Flask</div>
          <div className="relative overflow-hidden rounded-lg bg-[#080c18]" style={{ height: 280 }}>
            <canvas ref={canvasRef} className="w-full h-full" style={{ transform: `scale(${cvZoom})`, transformOrigin: 'center', display: 'block' }} />
            <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
              <button onClick={() => setCvZoom(z => Math.min(3, z * 1.25))} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-300 hover:bg-orange-500/40 hover:text-white transition-colors text-base font-bold flex items-center justify-center">+</button>
              <button onClick={() => setCvZoom(z => Math.max(0.4, z * 0.8))} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-300 hover:bg-orange-500/40 hover:text-white transition-colors text-base font-bold flex items-center justify-center">−</button>
              <button onClick={() => setCvZoom(1)} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-400 hover:bg-slate-700/80 hover:text-white transition-colors text-xs flex items-center justify-center">↺</button>
            </div>
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">pH Curve</div>
          <div className="relative overflow-hidden rounded-lg bg-[#080c18]" style={{ height: 280 }}>
            <canvas ref={graphRef} className="w-full h-full" style={{ transform: `scale(${cvZoom})`, transformOrigin: 'center', display: 'block' }} />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs text-slate-400 mb-1 block">Drop size: <span className="text-white font-mono">{dropSize} mL</span></label>
        <input type="range" min={0.1} max={2} step={0.1} value={dropSize} onChange={e => setDropSize(+e.target.value)} className="w-full accent-blue-500" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={addDrop} className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-400 transition-colors">
          + Add drop ({dropSize} mL)
        </button>
        <button onClick={() => setDripping(d => !d)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${dripping ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-green-500/20 border-green-500/40 text-green-300'}`}>
          {dripping ? '⏹ Stop drip' : '▶ Auto drip'}
        </button>
        <button onClick={reset} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:border-slate-500 transition-colors">
          Reset
        </button>
        <div className="ml-auto flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border border-slate-600" style={{ background: indColor }} />
          <span className="text-sm font-mono font-bold" style={{ color: pH < 7 ? '#f87171' : pH > 7 ? '#60a5fa' : '#4ade80' }}>
            pH {pH.toFixed(2)}
          </span>
        </div>
      </div>

      {Math.abs(volAdded - eqVol) < 1 && (
        <div className="mt-3 px-4 py-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm">
          Near equivalence point! ({eqVol.toFixed(1)} mL)
        </div>
      )}

      <LabReport
        labTitle="Acid-Base Titration"
        aim="To determine the volume of NaOH solution required to neutralise a known volume of acid, and to plot the pH curve to identify the equivalence point."
        theory={`Titration is a quantitative analytical technique. A base (titrant) is added to an acid (analyte) until neutralisation is complete — the equivalence point.\n\nStrong acid + strong base:\n  HCl + NaOH → NaCl + H₂O\n  pH at EP = 7.0\n\nWeak acid + strong base:\n  CH₃COOH + NaOH → CH₃COONa + H₂O\n  pH at EP > 7 (salt hydrolysis)\n  Buffer region: pH = pKa + log([A⁻]/[HA])  (Henderson-Hasselbalch)\n\nIndicators change colour around their pKi. Choose an indicator whose transition range overlaps the equivalence point.`}
        apparatus={['Burette (50 mL)', 'Conical flask (250 mL)', 'Pipette (25 mL)', '0.1 M NaOH solution', '0.1 M HCl or CH₃COOH', 'Phenolphthalein indicator', 'Clamp stand', 'White tile']}
        variables={[
          { name: 'Independent variable', desc: 'Volume of NaOH added (mL)' },
          { name: 'Dependent variable', desc: 'pH of solution' },
          { name: 'Controlled variables', desc: 'Concentration of acid and base, temperature, volume of acid' },
        ]}
        observations={obs}
        conclusion={`${volAdded.toFixed(1)} mL of ${concBase * 1000} mM NaOH has been added to ${volAcid} mL of ${acidType} acid. The current pH is ${pH.toFixed(2)}. The equivalence point occurs at ${eqVol.toFixed(1)} mL. ${acidType === 'weak' ? 'The buffer region is visible in the pH curve before the equivalence point. The pH at EP > 7 due to salt hydrolysis.' : 'The sharp inflection in the pH curve at the equivalence point is characteristic of a strong acid–strong base titration.'}`}
      />
    </div>
  );
}
