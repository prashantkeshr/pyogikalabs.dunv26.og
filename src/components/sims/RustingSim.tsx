import React, { useEffect, useRef, useState } from 'react';
import LabReport from '@/components/LabReport';

interface Preset { name: string; moisture: number; oxygen: number; salt: number; }
const PRESETS: Preset[] = [
  { name: 'Dry air',     moisture: 0,  oxygen: 100, salt: 0   },
  { name: 'Humid air',   moisture: 80, oxygen: 100, salt: 0   },
  { name: 'Salt water',  moisture: 100,oxygen: 100, salt: 100 },
  { name: 'Oil-coated',  moisture: 10, oxygen: 10,  salt: 0   },
];

export default function RustingSim(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [moisture, setMoisture] = useState(80);
  const [oxygen,   setOxygen]   = useState(100);
  const [salt,     setSalt]     = useState(0);
  const [time,     setTime]     = useState(0);
  const [running,  setRunning]  = useState(false);
  const [cvZoom,   setCvZoom]   = useState(1);

  const moistRef = useRef(80); const oxRef = useRef(100); const saltRef = useRef(0);
  const timeRef  = useRef(0);  const runRef = useRef(false);
  const rafRef   = useRef(0);

  moistRef.current = moisture; oxRef.current = oxygen; saltRef.current = salt; runRef.current = running;

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let last = performance.now();

    const drawScene = (now: number) => {
      rafRef.current = requestAnimationFrame(drawScene);
      const dt = Math.min((now-last)/16, 3); last = now;

      if (runRef.current) {
        const rate = (moistRef.current/100) * (oxRef.current/100) * (1 + saltRef.current/100 * 2) * 0.003;
        timeRef.current = Math.min(timeRef.current + dt * rate, 100);
        setTime(Math.round(timeRef.current));
      }

      const rust = timeRef.current / 100;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Sky/environment
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      const humidity = moistRef.current/100;
      skyGrad.addColorStop(0, `rgba(${20+humidity*30},${30+humidity*10},${50+humidity*20},1)`);
      skyGrad.addColorStop(1, `rgba(${10+humidity*20},${15+humidity*10},25,1)`);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Moisture droplets in air
      if (moistRef.current > 40) {
        const t = now/1000;
        for (let i=0;i<Math.floor(moistRef.current/15);i++) {
          const dx = ((i*73+t*18)%280)+10; const dy = ((i*47+t*12)%160)+20;
          ctx.beginPath(); ctx.arc(dx, dy, 1.5, 0, Math.PI*2);
          ctx.fillStyle = `rgba(100,160,220,${humidity*0.4})`; ctx.fill();
        }
      }

      // Salt particles (if salt > 0)
      if (saltRef.current > 20) {
        const t = now/1000;
        for (let i=0;i<Math.floor(saltRef.current/25);i++) {
          const dx = ((i*61+t*8)%280)+10; const dy = ((i*39+t*5)%160)+20;
          ctx.beginPath(); ctx.arc(dx, dy, 1, 0, Math.PI*2);
          ctx.fillStyle = `rgba(255,255,255,${saltRef.current/200})`; ctx.fill();
        }
      }

      // Ground/surface
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, canvas.height-40, canvas.width, 40);

      // === Iron nail ===
      const NX = canvas.width/2; const NY = 100; const NW = 22; const NH = 160;

      // Rust patches (layered under nail)
      if (rust > 0.05) {
        const nPatch = Math.floor(rust * 20);
        for (let i=0;i<nPatch;i++) {
          const px = NX - NW/2 + (i*37)%NW; const py = NY + (i*23)%NH;
          const pr = rust * (3 + (i*7)%4);
          const hue = 20 + (i%3)*8;
          ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI*2);
          ctx.fillStyle = `hsla(${hue}, 80%, 35%, ${rust * 0.85})`; ctx.fill();
        }
      }

      // Nail body
      const nailGrad = ctx.createLinearGradient(NX-NW/2, 0, NX+NW/2, 0);
      const steelR = Math.round(100 + rust*60); const steelG = Math.round(100 - rust*60); const steelB = Math.round(110 - rust*90);
      nailGrad.addColorStop(0, `rgb(${steelR-30},${steelG-30},${steelB-30})`);
      nailGrad.addColorStop(0.3, `rgb(${steelR+40},${steelG+30},${steelB+20})`);
      nailGrad.addColorStop(0.7, `rgb(${steelR},${steelG},${steelB})`);
      nailGrad.addColorStop(1, `rgb(${steelR-20},${steelG-20},${steelB-20})`);
      ctx.fillStyle = nailGrad;
      // Head
      ctx.beginPath(); ctx.ellipse(NX, NY, NW*1.5, 10, 0, 0, Math.PI*2); ctx.fill();
      // Shaft
      ctx.fillRect(NX-NW/2, NY, NW, NH*0.85);
      // Point
      ctx.beginPath(); ctx.moveTo(NX-NW/2, NY+NH*0.85); ctx.lineTo(NX, NY+NH); ctx.lineTo(NX+NW/2, NY+NH*0.85); ctx.closePath(); ctx.fill();

      // Rust overlay on surface
      if (rust > 0.02) {
        const rustOverlay = ctx.createLinearGradient(NX-NW/2, NY, NX+NW/2, NY+NH);
        rustOverlay.addColorStop(0, `rgba(160,70,20,${rust * 0.7})`);
        rustOverlay.addColorStop(0.4, `rgba(180,80,15,${rust * 0.5})`);
        rustOverlay.addColorStop(1, `rgba(130,55,10,${rust * 0.8})`);
        ctx.fillStyle = rustOverlay;
        ctx.beginPath(); ctx.ellipse(NX, NY, NW*1.5, 10, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillRect(NX-NW/2, NY, NW, NH*0.85);
        ctx.beginPath(); ctx.moveTo(NX-NW/2, NY+NH*0.85); ctx.lineTo(NX, NY+NH); ctx.lineTo(NX+NW/2, NY+NH*0.85); ctx.closePath(); ctx.fill();
      }

      // Surface texture dots on rust
      if (rust > 0.3) {
        for (let i=0;i<Math.floor(rust*15);i++) {
          const px = NX-NW/2+2+(i*31)%((NW-4)); const py = NY+5+(i*17)%(NH-10);
          ctx.beginPath(); ctx.arc(px,py,1,0,Math.PI*2);
          ctx.fillStyle=`rgba(100,40,10,${rust*0.6})`; ctx.fill();
        }
      }

      // Rust level indicator
      ctx.fillStyle = '#8899aa'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
      const label = rust<0.05?'No rust':rust<0.2?'Slight rust':rust<0.5?'Moderate rust':rust<0.8?'Heavy rust':'Severely corroded';
      ctx.fillText(label, NX, NY + NH + 20);

      // Rust % badge
      const badgeColor = rust<0.1?'#44aa66':rust<0.4?'#ddaa44':'#cc4422';
      ctx.fillStyle = badgeColor; ctx.font = 'bold 13px system-ui';
      ctx.fillText(`${Math.round(rust*100)}%`, NX, NY + NH + 36);

      // Equation (when rusting)
      if (rust > 0.05) {
        ctx.fillStyle = `rgba(255,160,100,${Math.min(rust*3,0.9)})`; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('4Fe + 3O₂ + 6H₂O → 4Fe(OH)₃', canvas.width/2, 25);
        ctx.fillStyle = `rgba(200,120,80,${Math.min(rust*2,0.7)})`;
        ctx.fillText('→ 2Fe₂O₃·xH₂O (rust)', canvas.width/2, 38);
      }
    };

    rafRef.current = requestAnimationFrame(drawScene);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const reset = () => {
    setRunning(false); runRef.current = false;
    timeRef.current = 0; setTime(0);
  };

  const applyPreset = (p: Preset) => {
    setMoisture(p.moisture); setOxygen(p.oxygen); setSalt(p.salt);
    reset();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 min-w-0">
        <div className="relative overflow-hidden rounded-lg max-w-xs mx-auto bg-[#0a0f1a]">
          <canvas ref={canvasRef} width={300} height={280} className="w-full block" style={{ transform: `scale(${cvZoom})`, transformOrigin: 'center' }} />
          <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
            <button onClick={() => setCvZoom(z => Math.min(3, z * 1.25))} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-300 hover:bg-orange-500/40 hover:text-white transition-colors text-base font-bold flex items-center justify-center">+</button>
            <button onClick={() => setCvZoom(z => Math.max(0.4, z * 0.8))} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-300 hover:bg-orange-500/40 hover:text-white transition-colors text-base font-bold flex items-center justify-center">−</button>
            <button onClick={() => setCvZoom(1)} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-400 hover:bg-slate-700/80 hover:text-white transition-colors text-xs flex items-center justify-center">↺</button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs max-w-xs mx-auto">
          {[['Rust level',`${time}%`],['Running',running?'Yes':'No']].map(([k,v])=>(
            <div key={k} className="bg-slate-800/60 border border-slate-700/50 rounded px-2 py-1.5 text-center">
              <div className="text-slate-500">{k}</div><div className="text-white font-mono font-semibold mt-0.5">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2 justify-center">
          <button onClick={()=>setRunning(r=>!r)} className={`px-4 py-1.5 text-sm rounded-lg font-semibold ${running?'bg-orange-500/30 border border-orange-500/50 text-orange-300':'bg-orange-500 text-white'}`}>{running?'⏸ Pause':'▶ Start'}</button>
          <button onClick={reset} className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-500">Reset</button>
        </div>
      </div>

      <div className="lg:w-72 flex flex-col gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Quick Presets</div>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map(p=>(
              <button key={p.name} onClick={()=>applyPreset(p)}
                className="px-2 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-orange-500/50 transition-colors text-left">{p.name}</button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {[
            { label:'Moisture', val:moisture, set:setMoisture, ref:moistRef, color:'text-blue-400' },
            { label:'Oxygen %', val:oxygen,   set:setOxygen,   ref:oxRef,    color:'text-green-400' },
            { label:'Salt',     val:salt,     set:setSalt,     ref:saltRef,  color:'text-orange-400' },
          ].map(({label,val,set,color})=>(
            <div key={label}>
              <div className={`text-xs ${color} font-semibold mb-1`}>{label}: {val}%</div>
              <input type="range" min={0} max={100} value={val}
                onChange={e=>{ set(Number(e.target.value)); reset(); }}
                className="w-full accent-orange-500" />
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-3 text-xs space-y-1">
          <div className="font-semibold text-slate-500 uppercase tracking-wider mb-2">Conditions needed</div>
          <div className={`flex items-center gap-2 ${moisture>20?'text-blue-400':'text-slate-600'}`}>
            <span>{moisture>20?'✓':'✗'}</span><span>Moisture (H₂O)</span>
          </div>
          <div className={`flex items-center gap-2 ${oxygen>20?'text-green-400':'text-slate-600'}`}>
            <span>{oxygen>20?'✓':'✗'}</span><span>Oxygen (O₂)</span>
          </div>
          <div className={`flex items-center gap-2 ${salt>20?'text-orange-400':'text-slate-500'}`}>
            <span>{salt>20?'+':'○'}</span><span>Salt (accelerates)</span>
          </div>
        </div>
      </div>

      <LabReport
        labTitle="Rusting of Iron"
        aim="To investigate the conditions required for rusting (corrosion of iron), and the effect of salt as an accelerant."
        theory={`Rusting is the electrochemical corrosion of iron:\n\nOverall: 4Fe + 3O₂ + 6H₂O → 4Fe(OH)₃ → 2Fe₂O₃·xH₂O\n\nBoth water AND oxygen are required — neither alone causes rusting.\n\nSalt: NaCl dissolves in water to give Na⁺ and Cl⁻ ions, which increase the electrolyte conductivity, speeding up the electrochemical reactions and dramatically increasing the corrosion rate.\n\nPrevention methods:\n• Physical barrier (paint, oil, grease)\n• Sacrificial protection (zinc coating — galvanising)\n• Stainless steel (Cr₂O₃ passive layer)`}
        apparatus={['Iron nail','Variable moisture environment','Oxygen control','Salt solution (NaCl)']}
        variables={[{name:'Independent',desc:'Moisture, O₂ level, salt concentration'},{name:'Dependent',desc:'Degree of rusting (mass change, visual)'},{name:'Controlled',desc:'Temperature, nail material, surface area'}]}
        observations={[
          { label: 'Moisture', value: moisture, unit:'%' },
          { label: 'Oxygen', value: oxygen, unit:'%' },
          { label: 'Salt', value: salt, unit:'%' },
          { label: 'Rust level', value: time, unit:'%' },
        ]}
        conclusion={`At moisture=${moisture}%, O₂=${oxygen}%, salt=${salt}%, rust = ${time}%. ${moisture<20||oxygen<20?'Low moisture or oxygen prevents rusting — confirming both are required.':'Both water and oxygen are present — rusting occurs.'} ${salt>50?' High salt greatly accelerates corrosion.':''}`}
      />
    </div>
  );
}
