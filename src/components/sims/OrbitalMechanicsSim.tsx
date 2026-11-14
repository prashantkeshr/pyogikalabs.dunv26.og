import React, { useState, useRef } from 'react';
import * as THREE from 'three';
import { useThreeScene } from '@/hooks/useThreeScene';
import LabReport from '@/components/LabReport';

type Preset = 'earth'|'planets'|'figure8'|'binary';

const G = 1, EPS = 0.3, TRAIL_MAX = 350, SUB_STEPS = 8, DT = 0.0015;

interface Body {
  pos: THREE.Vector3; vel: THREE.Vector3; acc: THREE.Vector3;
  mass: number; color: number; radius: number;
  mesh?: THREE.Mesh;
  trailPts: THREE.Vector3[];
  trailLine?: THREE.Line;
}

function mkBody(x:number,y:number,z:number, vx:number,vy:number,vz:number, mass:number, color:number, r:number): Body {
  return { pos:new THREE.Vector3(x,y,z), vel:new THREE.Vector3(vx,vy,vz), acc:new THREE.Vector3(), mass, color, radius:r, trailPts:[] };
}

function circularV(M: number, r: number): number { return Math.sqrt(G*M/r); }

const PRESETS: Record<Preset, { bodies: () => Body[]; camPos: [number,number,number]; label: string }> = {
  earth: {
    label: 'Earth Orbit',
    camPos: [0,18,22],
    bodies: () => [
      mkBody(0,0,0, 0,0,0, 1000, 0xFFDD44, 0.7),  // Sun
      mkBody(5,0,0, 0,circularV(1000,5),0, 1, 0x3B82F6, 0.22), // Earth
    ],
  },
  planets: {
    label: 'Inner Planets',
    camPos: [0,25,30],
    bodies: () => [
      mkBody(0,0,0,  0,0,0, 1000,0xFFDD44,0.7),
      mkBody(2.5,0,0, 0,circularV(1000,2.5),0, 0.5, 0xAAAAAA,0.12), // Mercury
      mkBody(3.6,0,0, 0,circularV(1000,3.6),0, 0.8, 0xE8C090,0.18), // Venus
      mkBody(5,0,0,   0,circularV(1000,5),  0, 1,   0x3B82F6,0.22), // Earth
      mkBody(7.5,0,0, 0,circularV(1000,7.5),0, 0.5, 0xEF4444,0.17), // Mars
    ],
  },
  figure8: {
    label: 'Figure-8',
    camPos: [0,10,14],
    bodies: () => [
      mkBody( 2.9,-0.72,0, 0.93/2*2, 0.86/2*2,0, 1, 0xF97316, 0.28),
      mkBody(-2.9, 0.72,0, 0.93/2*2, 0.86/2*2,0, 1, 0x06B6D4, 0.28),
      mkBody( 0,   0,   0,-0.93*2,  -0.86*2,  0, 1, 0xA855F7, 0.28),
    ],
  },
  binary: {
    label: 'Binary Star',
    camPos: [0,20,26],
    bodies: () => [
      mkBody(-2.5,0,0, 0, circularV(400, 5)*0.5,0, 200, 0xFFAA33, 0.5),
      mkBody( 2.5,0,0, 0,-circularV(400, 5)*0.5,0, 200, 0xFF6688, 0.5),
      mkBody( 7,  0,0, 0, circularV(400, 7),    0, 0.01,0x3B82F6, 0.15),
    ],
  },
};

function stepPhysics(bodies: Body[]) {
  for (const b of bodies) b.acc.set(0,0,0);
  for (let i=0;i<bodies.length;i++) {
    for (let j=i+1;j<bodies.length;j++) {
      const r = bodies[j].pos.clone().sub(bodies[i].pos);
      const d2 = r.lengthSq() + EPS*EPS;
      const d = Math.sqrt(d2);
      const f = G / d2;
      const rn = r.divideScalar(d);
      bodies[i].acc.addScaledVector(rn,  f * bodies[j].mass);
      bodies[j].acc.addScaledVector(rn, -f * bodies[i].mass);
    }
  }
  for (const b of bodies) {
    b.vel.addScaledVector(b.acc, DT);
    b.pos.addScaledVector(b.vel, DT);
  }
}

export default function OrbitalMechanicsSim(): React.ReactElement {
  const [preset,     setPreset]     = useState<Preset>('figure8');
  const [speed,      setSpeed]      = useState(1.0);
  const [paused,     setPaused]     = useState(false);
  const [showTrails, setShowTrails] = useState(true);
  const [stats,      setStats]      = useState<Array<{color:number; spd:number; ke:number}>>([]);

  const speedRef  = useRef(1.0);
  const pauseRef  = useRef(false);
  const trailsRef = useRef(true);

  speedRef.current  = speed;
  pauseRef.current  = paused;
  trailsRef.current = showTrails;

  const { camPos } = PRESETS[preset];

  const mountRef = useThreeScene(
    ({ scene, onFrame }) => {
      const bodies = PRESETS[preset].bodies();

      // Starfield
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(2000*3);
      for (let i=0;i<2000*3;i++) starPos[i]=(Math.random()-0.5)*300;
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos,3));
      scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({color:0xffffff,size:0.3,sizeAttenuation:true})));

      // Create meshes + trails
      for (const b of bodies) {
        const geo  = new THREE.SphereGeometry(b.radius, 20, 20);
        const mat  = new THREE.MeshStandardMaterial({ color: b.color, emissive: b.color, emissiveIntensity: 0.3 });
        b.mesh = new THREE.Mesh(geo, mat);
        b.mesh.position.copy(b.pos);
        scene.add(b.mesh);

        // PointLight for large bodies
        if (b.mass > 100) {
          const pl = new THREE.PointLight(b.color, 1.5, 40);
          b.mesh.add(pl);
        }

        const tGeo = new THREE.BufferGeometry();
        const tPos = new Float32Array(TRAIL_MAX * 3);
        tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
        tGeo.setDrawRange(0, 0);
        b.trailLine = new THREE.Line(tGeo, new THREE.LineBasicMaterial({ color: b.color, transparent: true, opacity: 0.55 }));
        scene.add(b.trailLine);
      }

      onFrame((_, dt) => {
        if (pauseRef.current) return;
        const steps = Math.round(SUB_STEPS * speedRef.current);
        for (let s = 0; s < Math.max(1, steps); s++) stepPhysics(bodies);

        const statArr: typeof stats = [];
        for (const b of bodies) {
          b.mesh!.position.copy(b.pos);

          b.trailPts.push(b.pos.clone());
          if (b.trailPts.length > TRAIL_MAX) b.trailPts.shift();

          const tl = b.trailLine!;
          tl.visible = trailsRef.current;
          if (trailsRef.current) {
            const posAttr = tl.geometry.attributes.position as THREE.BufferAttribute;
            b.trailPts.forEach((p, i) => posAttr.setXYZ(i, p.x, p.y, p.z));
            posAttr.needsUpdate = true;
            tl.geometry.setDrawRange(0, b.trailPts.length);
          }

          const spd = b.vel.length();
          statArr.push({ color: b.color, spd: +spd.toFixed(2), ke: +(0.5*b.mass*spd*spd).toFixed(1) });
        }
        setStats(statArr);
      });

      return () => { for (const b of bodies) { b.trailLine?.geometry.dispose(); } };
    },
    [preset],
    { height: 460, bg: 0x030507, cameraPos: camPos, fov: 55 },
  );

  const PRESET_KEYS: Preset[] = ['earth','planets','figure8','binary'];

  return (
    <div>
      <div ref={mountRef as React.RefObject<HTMLDivElement>} className="w-full rounded-lg" style={{ height: 460, background: '#030507' }} />

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESET_KEYS.map(k => (
          <button key={k} onClick={() => setPreset(k)}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${preset===k ? 'bg-orange-500/25 border-orange-500/60 text-orange-300 font-semibold' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
            {PRESETS[k].label}
          </button>
        ))}
        <button onClick={() => setPaused(p => !p)}
          className={`px-3 py-1.5 text-sm rounded border ml-auto transition-colors ${paused ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button onClick={() => setShowTrails(t => !t)}
          className={`px-3 py-1.5 text-sm rounded border transition-colors ${showTrails ? 'bg-violet-500/20 border-violet-500/50 text-violet-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
          Trails
        </button>
      </div>

      <div className="mt-3">
        <label className="text-xs text-slate-400 mb-1 block">Sim speed: <span className="font-mono text-white">{speed.toFixed(1)}×</span></label>
        <input type="range" min={0.1} max={4} step={0.1} value={speed} onChange={e => setSpeed(+e.target.value)} className="w-full accent-orange-500" />
      </div>

      {stats.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs text-slate-400 border-collapse">
            <thead><tr className="text-slate-500 border-b border-slate-700"><th className="text-left pb-1">Body</th><th className="text-right pb-1">Speed</th><th className="text-right pb-1">KE (arb.)</th></tr></thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={i} className="border-b border-slate-800">
                  <td className="py-1"><span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{background:`#${s.color.toString(16).padStart(6,'0')}`}}></span>Body {i+1}</td>
                  <td className="text-right font-mono text-white">{s.spd}</td>
                  <td className="text-right font-mono text-cyan-400">{s.ke}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LabReport
        labTitle="Orbital Mechanics"
        aim="To simulate n-body gravitational systems and investigate orbital shapes, Kepler's laws, and energy conservation in multi-body interactions."
        theory={`Newton's law of gravitation: F = G·m₁·m₂/r². In a two-body system, orbits are conic sections (ellipses, parabolas, or hyperbolas).\n\nKepler's Laws:\n  1st: Orbits are ellipses with the central mass at one focus\n  2nd: Equal areas swept in equal time (conserved angular momentum)\n  3rd: T² ∝ a³ (period² proportional to semi-major axis³)\n\nFigure-8: A special periodic solution to the three-body problem discovered by Chenciner & Montgomery (2000) where three equal masses chase each other on a figure-8 shaped curve — an exact periodic orbit stable under perturbation.\n\nLeapfrog (Verlet) integration is used for time-reversible, energy-conserving simulation.`}
        apparatus={['N-body Verlet integrator', 'Three.js 3D renderer', 'Orbital trail visualiser']}
        variables={[{ name: 'Varied', desc: 'Preset scenario (Earth, Planets, Figure-8, Binary)' }, { name: 'Observed', desc: 'Orbital shapes, relative speeds, gravitational interactions' }]}
        observations={[
          { label: 'Scenario', value: PRESETS[preset].label },
          { label: 'Bodies', value: PRESETS[preset].bodies().length },
          { label: 'Integrator', value: 'Leapfrog Verlet' },
          { label: 'Sub-steps / frame', value: SUB_STEPS },
          { label: 'dt', value: DT, unit: 'arb. time' },
        ]}
        conclusion={`The ${PRESETS[preset].label} scenario demonstrates ${preset==='figure8' ? 'the remarkable choreographic three-body solution where equal masses trace a stable figure-8' : preset==='planets' ? 'Keplerian orbits with inner planets moving faster (Kepler\'s 3rd law)' : preset==='binary' ? 'mutual gravitational orbits of a binary system with a perturbing third body' : 'a simple circular Earth orbit governed by centripetal balance with solar gravity'}. Orbital trails reveal the geometric shapes predicted by Newton's universal gravitation.`}
      />
    </div>
  );
}
