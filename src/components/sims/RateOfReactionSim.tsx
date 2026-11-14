import React, { useEffect, useRef, useState } from 'react';
import LabReport from '@/components/LabReport';

interface DataPoint { time: number; volume: number; }
interface Particle { x: number; y: number; vx: number; vy: number; type: 'acid'|'marble'|'co2'|'product'; r: number; alpha: number; }

type Concentration = '0.5 M' | '1.0 M' | '2.0 M' | '3.0 M';
type Temp = '20°C' | '30°C' | '40°C' | '60°C';

const CONC_RATE: Record<Concentration, number> = { '0.5 M':0.4, '1.0 M':1.0, '2.0 M':2.2, '3.0 M':4.0 };
const TEMP_RATE: Record<Temp, number>  = { '20°C':0.6, '30°C':1.0, '40°C':1.9, '60°C':4.1 };
const FLASK_CX = 160; const FLASK_BY = 230; const FLASK_R = 70;

export default function RateOfReactionSim(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [conc, setConc] = useState<Concentration>('1.0 M');
  const [temp, setTemp] = useState<Temp>('30°C');
  const [elapsed, setElapsed] = useState(0);
  const [gasVol, setGasVol] = useState(0);
  const [data, setData] = useState<DataPoint[]>([]);
  const [finished, setFinished] = useState(false);

  const runRef   = useRef(false);
  const concRef  = useRef<Concentration>('1.0 M');
  const tempRef  = useRef<Temp>('30°C');
  const elRef    = useRef(0);
  const gasRef   = useRef(0);
  const dataRef  = useRef<DataPoint[]>([]);
  const finRef   = useRef(false);
  const pRef     = useRef<Particle[]>([]);
  const rafRef   = useRef(0);
  const MAX_GAS  = 100;

  runRef.current  = running;
  concRef.current = conc;
  tempRef.current = temp;

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let last = performance.now();

    const initParticles = () => {
      const ps: Particle[] = [];
      for (let i=0;i<30;i++) {
        const a = Math.random()*Math.PI*2, rr = Math.random()*40;
        ps.push({ x:FLASK_CX+rr*Math.cos(a), y:FLASK_BY-25+rr*Math.sin(a)*0.4, vx:(Math.random()-0.5)*0.6, vy:(Math.random()-0.5)*0.4, type:'marble', r:4+Math.random()*3, alpha:1 });
      }
      for (let i=0;i<20;i++) {
        const a = Math.random()*Math.PI*2, rr=Math.random()*55;
        ps.push({ x:FLASK_CX+rr*Math.cos(a), y:FLASK_BY-45+rr*Math.sin(a)*0.5, vx:(Math.random()-0.5)*1.2, vy:(Math.random()-0.5)*0.8, type:'acid', r:2, alpha:0.7 });
      }
      pRef.current = ps;
    };
    initParticles();

    const drawFlask = () => {
      const liqH = 90 * (1-gasRef.current/MAX_GAS);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(FLASK_CX-30, FLASK_BY-120);
      ctx.lineTo(FLASK_CX-30, FLASK_BY-80);
      ctx.quadraticCurveTo(FLASK_CX-80, FLASK_BY-30, FLASK_CX-78, FLASK_BY);
      ctx.arc(FLASK_CX, FLASK_BY, 78, Math.PI, 0);
      ctx.quadraticCurveTo(FLASK_CX+80, FLASK_BY-30, FLASK_CX+30, FLASK_BY-80);
      ctx.lineTo(FLASK_CX+30, FLASK_BY-120);
      ctx.closePath();
      // Clip to flask shape
      ctx.clip();

      // Liquid
      const gradient = ctx.createLinearGradient(FLASK_CX-78, FLASK_BY-liqH, FLASK_CX+78, FLASK_BY);
      gradient.addColorStop(0, 'rgba(100,200,180,0.25)'); gradient.addColorStop(1, 'rgba(60,160,220,0.30)');
      ctx.fillStyle = gradient;
      ctx.fillRect(FLASK_CX-80, FLASK_BY-liqH, 160, liqH+5);

      // Bubbles at marbles
      if (runRef.current && !finRef.current) {
        const rate = CONC_RATE[concRef.current] * TEMP_RATE[tempRef.current];
        if (Math.random() < rate * 0.1) {
          const mx = FLASK_CX + (Math.random()-0.5)*80;
          const my = FLASK_BY - 15;
          pRef.current.push({ x:mx, y:my, vx:(Math.random()-0.5)*0.3, vy:-(0.5+Math.random()*0.8), type:'co2', r:2+Math.random()*3, alpha:0.8 });
        }
      }
      ctx.restore();
    };

    const drawFlaskOutline = () => {
      ctx.strokeStyle = '#445566'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(FLASK_CX-30, FLASK_BY-120);
      ctx.lineTo(FLASK_CX-30, FLASK_BY-80);
      ctx.quadraticCurveTo(FLASK_CX-80, FLASK_BY-30, FLASK_CX-78, FLASK_BY);
      ctx.arc(FLASK_CX, FLASK_BY, 78, Math.PI, 0);
      ctx.quadraticCurveTo(FLASK_CX+80, FLASK_BY-30, FLASK_CX+30, FLASK_BY-80);
      ctx.lineTo(FLASK_CX+30, FLASK_BY-120);
      ctx.closePath(); ctx.stroke();
      // Neck close
      ctx.beginPath(); ctx.moveTo(FLASK_CX-30,FLASK_BY-120); ctx.lineTo(FLASK_CX+30,FLASK_BY-120); ctx.stroke();
    };

    const drawGraph = () => {
      const GX=10, GY=250, GW=canvas.width-20, GH=70;
      ctx.fillStyle='rgba(15,20,35,0.9)'; ctx.fillRect(GX,GY,GW,GH);
      ctx.strokeStyle='#334455'; ctx.lineWidth=1; ctx.strokeRect(GX,GY,GW,GH);
      // Axes
      ctx.strokeStyle='#445566'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(GX+5,GY+5); ctx.lineTo(GX+5,GY+GH-5); ctx.lineTo(GX+GW-5,GY+GH-5); ctx.stroke();
      // Labels
      ctx.fillStyle='#8899aa'; ctx.font='9px system-ui'; ctx.textAlign='center';
      ctx.fillText('Time (s)', GX+GW/2, GY+GH-1);
      ctx.save(); ctx.translate(GX+12, GY+GH/2); ctx.rotate(-Math.PI/2);
      ctx.fillText('CO₂ (units)', 0, 0); ctx.restore();
      // Data
      if (dataRef.current.length>1) {
        ctx.beginPath(); ctx.strokeStyle='#44cc88'; ctx.lineWidth=1.5;
        const maxT = Math.max(60, dataRef.current[dataRef.current.length-1].time);
        dataRef.current.forEach((pt,i) => {
          const px = GX+5 + (pt.time/maxT)*(GW-10);
          const py = GY+GH-5 - (pt.volume/MAX_GAS)*(GH-10);
          if (i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
        }); ctx.stroke();
      }
    };

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);
      const dt = Math.min((now-last)/16, 3); last=now;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='#080d1a'; ctx.fillRect(0,0,canvas.width,canvas.height);

      // Update elapsed
      if (runRef.current && !finRef.current) {
        elRef.current += dt*0.016*16/1000; // seconds
        setElapsed(Math.round(elRef.current));
        const rate = CONC_RATE[concRef.current] * TEMP_RATE[tempRef.current];
        const dV = rate * dt * 0.04 * (1-gasRef.current/MAX_GAS);
        gasRef.current = Math.min(gasRef.current + dV, MAX_GAS);
        setGasVol(Math.round(gasRef.current));
        if (gasRef.current >= MAX_GAS*0.98) { finRef.current=true; setFinished(true); setRunning(false); }
        if (Math.round(elRef.current*2)/2 !== Math.round((elRef.current-dt*0.016*16/1000)*2)/2) {
          dataRef.current.push({ time:elRef.current, volume:gasRef.current });
          setData([...dataRef.current]);
        }
      }

      drawFlask();
      // Particles
      pRef.current = pRef.current.filter(p=>p.alpha>0.05);
      pRef.current.forEach(p => {
        if (p.type==='co2') {
          p.y += p.vy*dt; p.x += p.vx*dt; p.alpha -= 0.004*dt;
          if (p.y < FLASK_BY-130) p.alpha=0;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
          ctx.strokeStyle=`rgba(100,220,180,${p.alpha})`; ctx.lineWidth=0.8; ctx.stroke();
        } else if (p.type==='acid') {
          p.x += p.vx*dt; p.y += p.vy*dt;
          const dx=p.x-FLASK_CX, dy=p.y-(FLASK_BY-30);
          if (Math.abs(dx)>65||Math.abs(dy)>40) { p.vx*=-1; p.vy*=-1; }
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
          ctx.fillStyle=`rgba(100,180,255,${p.alpha})`; ctx.fill();
        } else if (p.type==='marble') {
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
          ctx.strokeStyle=`rgba(200,210,220,${gasRef.current/MAX_GAS<0.8?1:1-gasRef.current/MAX_GAS*0.5})`; ctx.lineWidth=1; ctx.stroke();
          ctx.fillStyle=`rgba(170,185,200,0.5)`; ctx.fill();
        }
      });
      drawFlaskOutline();

      // Delivery tube + measuring cylinder
      ctx.strokeStyle='#334455'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(FLASK_CX+28,FLASK_BY-115); ctx.lineTo(FLASK_CX+45,FLASK_BY-125); ctx.lineTo(FLASK_CX+45,FLASK_BY-170); ctx.stroke();
      // Cylinder
      ctx.strokeRect(FLASK_CX+38, FLASK_BY-200, 22, 60);
      const cylFill = (gasRef.current/MAX_GAS)*50;
      ctx.fillStyle='rgba(100,220,180,0.2)'; ctx.fillRect(FLASK_CX+39, FLASK_BY-150-cylFill, 20, cylFill);
      ctx.fillStyle='#8899aa'; ctx.font='9px system-ui'; ctx.textAlign='left';
      ctx.fillText(`${Math.round(gasRef.current)} mL`, FLASK_CX+62, FLASK_BY-150);

      // Stopwatch
      ctx.fillStyle='#aabbcc'; ctx.font='bold 14px monospace'; ctx.textAlign='center';
      ctx.fillText(`${elRef.current.toFixed(1)} s`, FLASK_CX, FLASK_BY+20);
      ctx.font='10px system-ui'; ctx.fillStyle='#667788';
      ctx.fillText(`${concRef.current}  ${tempRef.current}`, FLASK_CX, FLASK_BY+36);

      drawGraph();
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const reset = () => {
    setRunning(false); runRef.current=false;
    elRef.current=0; gasRef.current=0; dataRef.current=[]; finRef.current=false;
    setElapsed(0); setGasVol(0); setData([]); setFinished(false);
    pRef.current=[];
  };

  const CONCS: Concentration[] = ['0.5 M','1.0 M','2.0 M','3.0 M'];
  const TEMPS: Temp[] = ['20°C','30°C','40°C','60°C'];

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 min-w-0">
        <canvas ref={canvasRef} width={320} height={330} className="w-full max-w-sm mx-auto rounded-lg block" style={{background:'#080d1a'}} />
        <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
          {[['Concentration',conc],['Temperature',temp],['Time',`${elapsed} s`],['CO₂',`${gasVol} mL`]].map(([k,v])=>(
            <div key={k} className="bg-slate-800/60 border border-slate-700/50 rounded px-2 py-1.5 text-center">
              <div className="text-slate-500">{k}</div>
              <div className="text-white font-mono font-semibold mt-0.5">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={()=>{ if(!finished){ setRunning(r=>!r); }}} className={`px-4 py-1.5 text-sm rounded-lg font-semibold transition-colors ${finished?'opacity-40 cursor-not-allowed bg-slate-700 text-slate-400':running?'bg-orange-500/30 border border-orange-500/50 text-orange-300':'bg-orange-500 text-white'}`}>
            {finished?'Complete':running?'⏸ Pause':'▶ Start'}
          </button>
          <button onClick={reset} className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-500">Reset</button>
        </div>
      </div>

      <div className="lg:w-72 flex flex-col gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1.5 font-semibold">HCl Concentration</div>
          <div className="flex gap-1">
            {CONCS.map(c=>(
              <button key={c} onClick={()=>{ if(!running){ setConc(c); reset(); }}}
                className={`flex-1 py-1.5 text-xs rounded font-mono transition-colors ${conc===c?'bg-orange-500/30 border border-orange-500/50 text-orange-300':'bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-500'}`}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1.5 font-semibold">Temperature</div>
          <div className="flex gap-1 flex-wrap">
            {TEMPS.map(t=>(
              <button key={t} onClick={()=>{ if(!running){ setTemp(t); reset(); }}}
                className={`flex-1 py-1.5 text-xs rounded font-mono transition-colors ${temp===t?'bg-blue-500/30 border border-blue-500/50 text-blue-300':'bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-500'}`}>{t}</button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-3 text-xs">
          <div className="font-semibold text-slate-500 uppercase tracking-wider mb-2">Reaction</div>
          <div className="font-mono text-slate-300 leading-relaxed">
            <div>CaCO₃ + 2HCl →</div>
            <div>CaCl₂ + H₂O + CO₂↑</div>
          </div>
          <div className="mt-2 text-slate-500">Marble chips + hydrochloric acid</div>
        </div>

        {data.length>2 && (
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-3 text-xs">
            <div className="font-semibold text-slate-500 mb-1.5">Rate</div>
            <div className="font-mono text-green-400">{(gasVol/Math.max(elapsed,1)*60).toFixed(1)} mL/min</div>
          </div>
        )}
      </div>

      <LabReport
        labTitle="Rate of Reaction — Marble Chips & HCl"
        aim="To investigate how acid concentration and temperature affect the rate of reaction between calcium carbonate and hydrochloric acid."
        theory={`Rate of reaction = change in quantity / time taken.\n\nFor CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂:\n\nConcentration effect:\n• Higher [HCl] → more frequent collisions → faster rate\n• Doubling concentration ≈ doubles rate (first order)\n\nTemperature effect:\n• Higher T → more kinetic energy → more successful collisions\n• Arrhenius equation: k = Ae^(-Ea/RT)\n• Rate roughly doubles per 10°C rise\n\nMeasured by: volume of CO₂ collected vs time`}
        apparatus={['Virtual conical flask','Marble chips (CaCO₃)','Hydrochloric acid (0.5–3.0 M)','Gas syringe / measuring cylinder','Stopwatch', 'Water bath (20–60°C)']}
        variables={[{name:'Independent',desc:'HCl concentration, temperature'},{name:'Dependent',desc:'Volume of CO₂ per unit time'}]}
        observations={data.slice(-5).map((d,i)=>({ label:`t=${d.time.toFixed(1)}s`, value:d.volume.toFixed(1), unit:'mL CO₂' }))}
        conclusion={`At ${conc} and ${temp}, rate ≈ ${(gasVol/Math.max(elapsed,1)*60).toFixed(1)} mL/min. The graph shows the rate is fastest at the start (high [HCl]), then slows as reactants are consumed. Higher concentration and higher temperature both increase the rate, as predicted by collision theory.`}
      />
    </div>
  );
}
