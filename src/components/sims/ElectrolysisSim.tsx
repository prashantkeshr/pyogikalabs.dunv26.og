import React, { useEffect, useRef, useState } from 'react';
import LabReport from '@/components/LabReport';

type Speed = 'slow' | 'normal' | 'fast';

interface Bubble { x: number; y: number; r: number; vy: number; alpha: number; side: 'L' | 'R'; }

const TUBE_W = 60; const TUBE_H = 180; const TUBE_GAP = 80;
const LEFT_X = 90; const RIGHT_X = LEFT_X + TUBE_GAP + TUBE_W;
const TUBE_TOP = 60; const BASE_Y = TUBE_TOP + TUBE_H;
const ELECTRODE_Y = BASE_Y - 10;
const WATER_LEVEL_MAX = TUBE_H - 20;

const SPEEDS: Record<Speed, number> = { slow: 0.4, normal: 1.0, fast: 2.5 };

export default function ElectrolysisSim(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [on, setOn] = useState(false);
  const [speed, setSpeed] = useState<Speed>('normal');
  const [hCount, setHCount] = useState(0);
  const [oCount, setOCount] = useState(0);
  const [step, setStep] = useState(0);
  const [voltage, setVoltage] = useState(6);

  const onRef   = useRef(false);
  const speedRef= useRef<Speed>('normal');
  const vRef    = useRef(6);
  const bubblesRef = useRef<Bubble[]>([]);
  const hRef    = useRef(0); const oRef = useRef(0);
  const hCollRef= useRef(0); const oCollRef = useRef(0);
  const rafRef  = useRef(0);

  onRef.current    = on;
  speedRef.current = speed;
  vRef.current     = voltage;

  const STEPS = [
    { title:'Fill the H-tube', body:'Both arms of the H-shaped tube are filled with dilute sulfuric acid (H₂SO₄ solution). The electrolyte allows ions to carry current between the electrodes.' },
    { title:'Connect the power supply', body:`Apply ${voltage} V DC. The cathode (−) is on the left and the anode (+) is on the right.` },
    { title:'Observe gas at cathode (−)', body:'Bubbles form at the cathode (left). Water is reduced: 4H₂O + 4e⁻ → 2H₂ + 4OH⁻. Hydrogen forms faster than oxygen.' },
    { title:'Observe gas at anode (+)', body:'Bubbles also form at the anode (right, slower). Water is oxidised: 2H₂O → O₂ + 4H⁺ + 4e⁻. Notice H₂:O₂ = 2:1 by volume.' },
    { title:'Compare volumes', body:'The hydrogen column is exactly twice the oxygen column. This confirms H₂O contains hydrogen and oxygen in a 2:1 mole ratio.' },
  ];

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let last = performance.now();

    const spawnRate = () => {
      const v = vRef.current;
      const s = SPEEDS[speedRef.current];
      return (v / 6) * s * 0.06;
    };

    const addBubble = (side: 'L'|'R') => {
      const bx = side==='L' ? LEFT_X + TUBE_W/2 + (Math.random()-0.5)*20
                            : RIGHT_X + TUBE_W/2 + (Math.random()-0.5)*20;
      bubblesRef.current.push({ x:bx, y:ELECTRODE_Y, r:2+Math.random()*3, vy:-(0.4+Math.random()*0.6), alpha:0.85, side });
    };

    let spawnAccH = 0, spawnAccO = 0;

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);
      const dt = Math.min((now-last)/16, 3); last = now;
      const spd = SPEEDS[speedRef.current];
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      ctx.fillStyle = '#0a0f1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // H-tube connector (bottom bridge)
      const bridgeY = BASE_Y + 20; const bridgeH = 30;
      ctx.strokeStyle = '#334455'; ctx.lineWidth = 3;
      roundRect(ctx, LEFT_X, BASE_Y, TUBE_W, bridgeH+10, 4); ctx.stroke();
      roundRect(ctx, RIGHT_X, BASE_Y, TUBE_W, bridgeH+10, 4); ctx.stroke();
      // Bridge
      ctx.beginPath(); ctx.moveTo(LEFT_X+TUBE_W, bridgeY); ctx.lineTo(RIGHT_X, bridgeY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(LEFT_X+TUBE_W, bridgeY+bridgeH); ctx.lineTo(RIGHT_X, bridgeY+bridgeH); ctx.stroke();

      // Tube outlines
      ctx.strokeStyle = '#445566'; ctx.lineWidth = 2;
      roundRect(ctx, LEFT_X, TUBE_TOP, TUBE_W, TUBE_H+bridgeH+10, 6); ctx.stroke();
      roundRect(ctx, RIGHT_X, TUBE_TOP, TUBE_W, TUBE_H+bridgeH+10, 6); ctx.stroke();

      // Water fill (animated)
      const hGas = Math.min(hCollRef.current * 0.8, WATER_LEVEL_MAX*0.7);
      const oGas = Math.min(oCollRef.current * 0.8, WATER_LEVEL_MAX*0.7);
      const wL = WATER_LEVEL_MAX - hGas; const wR = WATER_LEVEL_MAX - oGas;

      // Left water
      ctx.save(); ctx.beginPath(); roundRect(ctx, LEFT_X+1, TUBE_TOP+1, TUBE_W-2, TUBE_H+bridgeH+8, 5); ctx.clip();
      ctx.fillStyle = 'rgba(100,180,220,0.18)';
      ctx.fillRect(LEFT_X+1, TUBE_TOP + hGas, TUBE_W-2, TUBE_H+bridgeH+8-hGas); ctx.restore();
      // Right water
      ctx.save(); ctx.beginPath(); roundRect(ctx, RIGHT_X+1, TUBE_TOP+1, TUBE_W-2, TUBE_H+bridgeH+8, 5); ctx.clip();
      ctx.fillStyle = 'rgba(100,180,220,0.18)';
      ctx.fillRect(RIGHT_X+1, TUBE_TOP + oGas, TUBE_W-2, TUBE_H+bridgeH+8-oGas); ctx.restore();
      // Bridge water
      ctx.fillStyle = 'rgba(100,180,220,0.18)';
      ctx.fillRect(LEFT_X+TUBE_W, bridgeY, RIGHT_X-LEFT_X-TUBE_W, bridgeH);

      // Gas columns (shaded)
      if (hGas > 2) {
        ctx.save(); ctx.beginPath(); roundRect(ctx, LEFT_X+1, TUBE_TOP+1, TUBE_W-2, hGas, 5); ctx.clip();
        ctx.fillStyle = 'rgba(140,210,255,0.22)'; ctx.fillRect(LEFT_X+1, TUBE_TOP+1, TUBE_W-2, hGas); ctx.restore();
      }
      if (oGas > 2) {
        ctx.save(); ctx.beginPath(); roundRect(ctx, RIGHT_X+1, TUBE_TOP+1, TUBE_W-2, oGas, 5); ctx.clip();
        ctx.fillStyle = 'rgba(255,160,80,0.22)'; ctx.fillRect(RIGHT_X+1, TUBE_TOP+1, TUBE_W-2, oGas); ctx.restore();
      }

      // Electrodes
      ctx.fillStyle = '#889999';
      ctx.fillRect(LEFT_X + TUBE_W/2 - 4, ELECTRODE_Y - 20, 8, 40);  // cathode
      ctx.fillStyle = '#998866';
      ctx.fillRect(RIGHT_X + TUBE_W/2 - 4, ELECTRODE_Y - 20, 8, 40); // anode
      ctx.fillStyle = '#4499ff'; ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('−', LEFT_X + TUBE_W/2, ELECTRODE_Y + 50);
      ctx.fillStyle = '#ff7744';
      ctx.fillText('+', RIGHT_X + TUBE_W/2, ELECTRODE_Y + 50);

      // Labels
      ctx.font = '11px system-ui'; ctx.fillStyle = '#8899aa'; ctx.textAlign = 'center';
      ctx.fillText('Cathode', LEFT_X + TUBE_W/2, TUBE_TOP - 20);
      ctx.fillText('H₂', LEFT_X + TUBE_W/2, TUBE_TOP - 8);
      ctx.fillText('Anode', RIGHT_X + TUBE_W/2, TUBE_TOP - 20);
      ctx.fillText('O₂', RIGHT_X + TUBE_W/2, TUBE_TOP - 8);

      // Gas volume indicators
      if (hGas > 5) {
        ctx.fillStyle = '#88ccff'; ctx.font = 'bold 10px system-ui';
        ctx.fillText(`${Math.round(hGas/0.8)} units`, LEFT_X + TUBE_W/2, TUBE_TOP + hGas/2 + 5);
      }
      if (oGas > 5) {
        ctx.fillStyle = '#ffaa66'; ctx.font = 'bold 10px system-ui';
        ctx.fillText(`${Math.round(oGas/0.8)} units`, RIGHT_X + TUBE_W/2, TUBE_TOP + oGas/2 + 5);
      }

      // Ratio badge
      if (hCollRef.current > 2 && oCollRef.current > 0) {
        const ratio = hCollRef.current / oCollRef.current;
        ctx.fillStyle = ratio > 1.8 && ratio < 2.2 ? '#44ff88' : '#ffaa44';
        ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(`H₂:O₂ ≈ ${ratio.toFixed(1)}:1`, canvas.width/2, TUBE_TOP + TUBE_H + 80);
      }

      // Spawn bubbles
      if (onRef.current) {
        const rate = spawnRate();
        spawnAccH += rate * dt; spawnAccO += rate * 0.5 * dt;
        while (spawnAccH >= 1) { addBubble('L'); spawnAccH--; hCollRef.current += 0.5; setHCount(Math.round(hCollRef.current)); }
        while (spawnAccO >= 1) { addBubble('R'); spawnAccO--; oCollRef.current += 0.25; setOCount(Math.round(oCollRef.current)); }
      }

      // Draw & update bubbles
      bubblesRef.current = bubblesRef.current.filter(b => b.alpha > 0.05);
      bubblesRef.current.forEach(b => {
        b.y += b.vy * spd * dt;
        b.x += Math.sin(b.y * 0.1) * 0.3;
        if (b.y < TUBE_TOP + (b.side==='L' ? hGas : oGas)) { b.alpha -= 0.04; }
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${b.side==='L'?'160,220,255':'255,170,100'},${b.alpha})`;
        ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = `rgba(${b.side==='L'?'180,235,255':'255,190,130'},${b.alpha*0.4})`;
        ctx.fill();
      });

      // Wire animation
      if (onRef.current) {
        const t = now/400;
        [0,1,2,3].forEach(i => {
          const frac = ((i/4)+t)%1;
          const wx = LEFT_X + TUBE_W/2 + (RIGHT_X + TUBE_W/2 - LEFT_X - TUBE_W/2) * frac;
          const wy = TUBE_TOP - 42;
          ctx.beginPath(); ctx.arc(wx, wy, 2.5, 0, Math.PI*2);
          ctx.fillStyle = `rgba(255,160,80,${0.5+Math.sin(frac*Math.PI)*0.5})`; ctx.fill();
        });
      }
      // Wire
      ctx.strokeStyle = onRef.current ? '#ff8844' : '#445566'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(LEFT_X+TUBE_W/2, TUBE_TOP-10);
      ctx.lineTo(LEFT_X+TUBE_W/2, TUBE_TOP-40);
      ctx.lineTo(RIGHT_X+TUBE_W/2, TUBE_TOP-40);
      ctx.lineTo(RIGHT_X+TUBE_W/2, TUBE_TOP-10);
      ctx.stroke();
      // Battery symbol
      const bx = (LEFT_X+TUBE_W/2+RIGHT_X+TUBE_W/2)/2;
      ctx.fillStyle = onRef.current ? '#ff9944' : '#445566';
      ctx.fillRect(bx-18, TUBE_TOP-50, 36, 20);
      ctx.fillStyle = '#0a0f1a'; ctx.font = '10px system-ui'; ctx.textAlign='center';
      ctx.fillText(`${vRef.current}V`, bx, TUBE_TOP-37);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  }

  const reset = () => {
    setOn(false); onRef.current = false;
    bubblesRef.current = []; hRef.current=0; oRef.current=0;
    hCollRef.current=0; oCollRef.current=0;
    setHCount(0); setOCount(0); setStep(0);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 min-w-0">
        <canvas ref={canvasRef} width={340} height={320} className="w-full max-w-sm mx-auto rounded-lg block" style={{background:'#0a0f1a'}} />

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {[['Power',on?'ON':'Off'],['Voltage',`${voltage} V`],['H₂ formed',`${hCount} units`],['O₂ formed',`${oCount} units`]].map(([k,v])=>(
            <div key={k} className="bg-slate-800/60 border border-slate-700/50 rounded px-2 py-1.5 text-center">
              <div className="text-slate-500">{k}</div>
              <div className="text-white font-mono font-semibold mt-0.5">{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={()=>{ setOn(o=>!o); if(!on) setStep(s=>Math.max(s,2)); }}
            className={`px-4 py-1.5 text-sm rounded-lg font-semibold transition-colors ${on?'bg-orange-500/30 border border-orange-500/50 text-orange-300':'bg-orange-500 text-white'}`}>
            {on?'Switch Off':'Switch ON'}
          </button>
          {(['slow','normal','fast'] as Speed[]).map(s=>(
            <button key={s} onClick={()=>setSpeed(s)}
              className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${speed===s?'bg-blue-500/30 border border-blue-500/50 text-blue-300':'bg-slate-800 border border-slate-700 text-slate-400'}`}>{s}</button>
          ))}
          <button onClick={reset} className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-500">Reset</button>
        </div>

        <div className="mt-2">
          <label className="text-xs text-slate-500">Voltage: {voltage} V</label>
          <input type="range" min={3} max={12} step={1} value={voltage} onChange={e=>setVoltage(Number(e.target.value))}
            className="w-full mt-1 accent-orange-500" />
        </div>
      </div>

      <div className="lg:w-72 flex flex-col gap-3">
        <div className="flex gap-1 flex-wrap">
          {STEPS.map((_,i)=>(
            <button key={i} onClick={()=>setStep(i)}
              className={`w-7 h-7 rounded text-xs font-bold ${i===step?'bg-blue-500 text-white':i<step?'bg-slate-700 text-slate-300':'bg-slate-800 text-slate-600'}`}>{i+1}</button>
          ))}
        </div>
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-4">
          <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1">Step {step+1}</div>
          <div className="text-sm font-bold text-white mb-2">{STEPS[step].title}</div>
          <p className="text-xs text-slate-400 leading-relaxed">{STEPS[step].body}</p>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-3 text-xs space-y-1.5">
          <div className="font-semibold text-slate-500 uppercase tracking-wider mb-2">Reactions</div>
          <div className="font-mono text-slate-400 leading-relaxed">
            <div className="text-blue-400 font-semibold mb-0.5">Cathode (−):</div>
            <div>4H₂O + 4e⁻ → 2H₂ + 4OH⁻</div>
            <div className="text-orange-400 font-semibold mt-2 mb-0.5">Anode (+):</div>
            <div>2H₂O → O₂ + 4H⁺ + 4e⁻</div>
            <div className="text-green-400 font-semibold mt-2 mb-0.5">Overall:</div>
            <div>2H₂O → 2H₂ + O₂</div>
          </div>
        </div>
        <button onClick={()=>setStep(s=>Math.min(s+1,STEPS.length-1))} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">Next step →</button>
      </div>

      <LabReport
        labTitle="Electrolysis of Water"
        aim="To decompose water into hydrogen and oxygen using an electric current, and verify the 2:1 volume ratio."
        theory={`Electrolysis uses electrical energy to drive non-spontaneous chemical reactions.\n\nIn the electrolysis of dilute H₂SO₄:\n• Cathode (−): Water is REDUCED → H₂ gas (bubbles appear faster)\n• Anode (+): Water is OXIDISED → O₂ gas (bubbles appear at half the rate)\n\nStoichiometry requires H₂:O₂ = 2:1 by moles AND by volume (at same T, P).\n\nThis proves water is H₂O, not some other ratio.`}
        apparatus={['Virtual H-tube electrolysis apparatus','DC power supply (3–12 V)','Dilute sulfuric acid electrolyte','Carbon electrodes']}
        variables={[{name:'Independent',desc:'Voltage, current'},{name:'Dependent',desc:'Volume of gas at each electrode'}]}
        observations={[
          { label: 'Power', value: on?'ON':'Off' },
          { label: 'Voltage', value: voltage, unit:'V' },
          { label: 'H₂ collected', value: hCount, unit:'units' },
          { label: 'O₂ collected', value: oCount, unit:'units' },
          { label: 'Ratio H₂:O₂', value: oCount>0 ? (hCount/oCount).toFixed(2) : 'N/A' },
        ]}
        conclusion={`The hydrogen volume is approximately twice the oxygen volume (ratio ≈ 2:1), confirming the formula H₂O. Increasing voltage increases the rate of electrolysis. The overall equation is: 2H₂O(l) → 2H₂(g) + O₂(g).`}
      />
    </div>
  );
}
