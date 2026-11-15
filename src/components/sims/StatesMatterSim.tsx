import { useEffect, useRef, useState } from 'react';
import LabReport from '@/components/LabReport';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
}

type Phase = 'solid' | 'liquid' | 'gas';

function getPhase(temp: number): Phase {
  if (temp < 100) return 'solid';
  if (temp < 300) return 'liquid';
  return 'gas';
}

export default function StatesMatterSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const [temp, setTemp] = useState(50);
  const [pressure, setPressure] = useState(1);
  const [zoom, setZoom] = useState(1);

  const phase = getPhase(temp);
  const KE = (temp * 0.4).toFixed(1);

  useEffect(() => {
    const W = 400, H = 280;
    const N = 48;
    const particles: Particle[] = [];

    if (phase === 'solid') {
      const cols = 8, rows = 6;
      const sx = W / (cols + 1), sy = H / (rows + 1);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (particles.length >= N) break;
          particles.push({
            x: sx * (c + 1) + (Math.random() - 0.5) * 4,
            y: sy * (r + 1) + (Math.random() - 0.5) * 4,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: 8,
          });
        }
      }
    } else {
      for (let i = 0; i < N; i++) {
        const spd = phase === 'gas' ? 2.5 + Math.random() * 3 : 0.8 + Math.random() * 1.2;
        const ang = Math.random() * Math.PI * 2;
        particles.push({
          x: 20 + Math.random() * (W - 40),
          y: 20 + Math.random() * (H - 40),
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          r: phase === 'gas' ? 5 : 7,
        });
      }
    }
    particlesRef.current = particles;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const speedFactor = temp < 100 ? 0.1 + temp / 400 : temp < 300 ? 0.3 + (temp - 100) / 400 : 0.8 + (temp - 300) / 400;
    const vibration = temp / 1200;
    const W = 400 / zoom, H = 280 / zoom;

    const draw = () => {
      const dpr = window.devicePixelRatio;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Walls
      const wallPressureColor = pressure > 1.5 ? `rgba(249,115,22,${Math.min((pressure - 1) * 0.3, 0.6)})` : 'rgba(100,120,160,0.15)';
      ctx.strokeStyle = wallPressureColor; ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      ctx.fillStyle = wallPressureColor.replace(')', ',0.03)').replace('rgba', 'rgba');
      ctx.fillRect(2, 2, W - 4, H - 4);

      const pts = particlesRef.current;

      // Update
      pts.forEach(p => {
        if (phase === 'solid') {
          p.vx += (Math.random() - 0.5) * vibration;
          p.vy += (Math.random() - 0.5) * vibration;
          p.vx *= 0.92; p.vy *= 0.92;
        } else {
          const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (sp > 0) { p.vx = (p.vx / sp) * speedFactor * (0.6 + Math.random() * 0.8); p.vy = (p.vy / sp) * speedFactor * (0.6 + Math.random() * 0.8); }
          if (phase === 'liquid') {
            p.vx += (Math.random() - 0.5) * 0.08;
            p.vy += (Math.random() - 0.5) * 0.08;
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        // Bounce off walls
        if (p.x < p.r + 2) { p.x = p.r + 2; p.vx = Math.abs(p.vx); }
        if (p.x > W - p.r - 2) { p.x = W - p.r - 2; p.vx = -Math.abs(p.vx); }
        if (p.y < p.r + 2) { p.y = p.r + 2; p.vy = Math.abs(p.vy); }
        if (p.y > H - p.r - 2) { p.y = H - p.r - 2; p.vy = -Math.abs(p.vy); }
      });

      // Draw bonds (solid/liquid)
      if (phase !== 'gas') {
        pts.forEach((a, i) => {
          pts.forEach((b, j) => {
            if (j <= i) return;
            const dx = b.x - a.x, dy = b.y - a.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            const threshold = phase === 'solid' ? 55 : 42;
            if (d < threshold) {
              const alpha = (1 - d / threshold) * (phase === 'solid' ? 0.5 : 0.25);
              ctx.strokeStyle = `rgba(100,180,255,${alpha})`; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
          });
        });
      }

      // Draw particles
      pts.forEach(p => {
        const baseColor = phase === 'solid' ? [80, 140, 255] : phase === 'liquid' ? [80, 200, 180] : [255, 140, 80];
        const gr = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, 1, p.x, p.y, p.r);
        gr.addColorStop(0, `rgba(${baseColor.map(v => Math.min(255, v + 80)).join(',')},0.95)`);
        gr.addColorStop(1, `rgba(${baseColor.join(',')},0.7)`);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = gr; ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, temp, pressure, zoom]);

  const obs = [
    { label: 'Temperature', value: temp, unit: '°C' },
    { label: 'Pressure', value: pressure.toFixed(1), unit: 'atm' },
    { label: 'Phase', value: phase.charAt(0).toUpperCase() + phase.slice(1) },
    { label: 'Avg kinetic energy (rel.)', value: KE, unit: 'arb. units' },
    { label: 'Particle arrangement', value: phase === 'solid' ? 'Regular lattice' : phase === 'liquid' ? 'Close, disordered' : 'Random, far apart' },
    { label: 'Inter-particle forces', value: phase === 'solid' ? 'Strong' : phase === 'liquid' ? 'Moderate' : 'Negligible' },
  ];

  const phaseColor = { solid: 'text-blue-400', liquid: 'text-cyan-400', gas: 'text-orange-400' }[phase];

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg bg-[#080c18]" style={{ height: 280 }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
        <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
          <button onClick={() => setZoom(z => Math.min(2.5, z * 1.25))} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-300 hover:bg-orange-500/40 hover:text-white transition-colors text-base font-bold flex items-center justify-center">+</button>
          <button onClick={() => setZoom(z => Math.max(0.4, z * 0.8))} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-300 hover:bg-orange-500/40 hover:text-white transition-colors text-base font-bold flex items-center justify-center">−</button>
          <button onClick={() => setZoom(1)} className="w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-400 hover:bg-slate-700/80 hover:text-white transition-colors text-xs flex items-center justify-center">↺</button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Temperature: <span className="text-white font-mono">{temp} °C</span></label>
          <input type="range" min={0} max={500} value={temp} onChange={e => setTemp(+e.target.value)} className="w-full accent-orange-500" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Pressure: <span className="text-white font-mono">{pressure.toFixed(1)} atm</span></label>
          <input type="range" min={0.1} max={3} step={0.1} value={pressure} onChange={e => setPressure(+e.target.value)} className="w-full accent-blue-500" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          <button onClick={() => setZoom(z => Math.min(2.5, z + 0.25))} className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-sm border border-slate-700 hover:border-slate-500">+</button>
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-sm border border-slate-700 hover:border-slate-500">−</button>
          <span className="text-xs text-slate-500 self-center">Zoom {Math.round(zoom * 100)}%</span>
        </div>
        <div className={`ml-auto px-4 py-1.5 rounded-full border text-sm font-semibold ${phase === 'solid' ? 'bg-blue-500/15 border-blue-500/40 text-blue-300' : phase === 'liquid' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' : 'bg-orange-500/15 border-orange-500/40 text-orange-300'}`}>
          {phase.toUpperCase()}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[['Temperature', `${temp}°C`, 'text-orange-400'], ['Pressure', `${pressure.toFixed(1)} atm`, 'text-blue-400'], ['Phase', phase.charAt(0).toUpperCase() + phase.slice(1), phaseColor]].map(([k, v, c]) => (
          <div key={k} className="bg-slate-800/60 rounded-lg py-2 px-2 border border-slate-700/50">
            <div className={`text-sm font-bold font-mono ${c}`}>{v}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
        <span className="font-semibold text-slate-300">Phase transitions: </span>
        Below 100°C → Solid (rigid lattice) | 100–300°C → Liquid (flowing) | Above 300°C → Gas (rapid random motion)
      </div>

      <LabReport
        labTitle="States of Matter"
        aim="To investigate how temperature and pressure affect the state of matter and to observe particle behaviour in solid, liquid, and gas phases."
        theory={`Matter exists in three main states depending on temperature and pressure:\n\nSolid: Particles in fixed positions, vibrate in place, strong intermolecular forces, definite shape and volume.\n\nLiquid: Particles move but stay close, moderate intermolecular forces, definite volume but no fixed shape.\n\nGas: Particles move rapidly and randomly, negligible intermolecular forces (at low pressures), no definite shape or volume.\n\nPhase transitions:\n  Solid → Liquid: Melting (requires latent heat of fusion)\n  Liquid → Gas:   Vaporisation (requires latent heat of vaporisation)\n  Solid → Gas:    Sublimation\n\nKinetic theory: Temperature is proportional to average kinetic energy of particles.`}
        apparatus={['Particle simulation model', 'Thermometer', 'Pressure gauge', 'Sealed container']}
        variables={[
          { name: 'Independent variable', desc: 'Temperature (°C) and pressure (atm)' },
          { name: 'Dependent variable', desc: 'State/phase of matter' },
          { name: 'Controlled variables', desc: 'Number of particles, type of substance' },
        ]}
        observations={obs}
        conclusion={`At ${temp}°C and ${pressure.toFixed(1)} atm, the substance is in the ${phase} state. ${phase === 'solid' ? 'Particles vibrate in a regular lattice with strong bonds.' : phase === 'liquid' ? 'Particles move freely but remain close with moderate intermolecular forces.' : 'Particles move rapidly and randomly with negligible intermolecular forces.'} Increasing temperature increases kinetic energy, leading to phase transitions.`}
      />
    </div>
  );
}
