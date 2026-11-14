import React, { useState, useCallback } from 'react';
import * as THREE from 'three';
import { useThreeScene } from '@/hooks/useThreeScene';
import LabReport from '@/components/LabReport';

type OrbKey = '1s'|'2s'|'2px'|'2py'|'2pz'|'3dz2'|'3dxy'|'3dxz'|'3dx2y2';

interface OrbInfo { n: number; l: number; ml: string; label: string; box: number; }

const ORBITALS: Record<OrbKey, OrbInfo> = {
  '1s':    { n:1, l:0, ml:'0',  label:'1s',       box:7  },
  '2s':    { n:2, l:0, ml:'0',  label:'2s',       box:18 },
  '2px':   { n:2, l:1, ml:'±1', label:'2pₓ', box:20 },
  '2py':   { n:2, l:1, ml:'±1', label:'2pᵧ', box:20 },
  '2pz':   { n:2, l:1, ml:'0',  label:'2p₂', box:20 },
  '3dz2':  { n:3, l:2, ml:'0',  label:'3d₂²',  box:30 },
  '3dxy':  { n:3, l:2, ml:'±2', label:'3dₓᵧ', box:30 },
  '3dxz':  { n:3, l:2, ml:'±1', label:'3dₓ₂', box:30 },
  '3dx2y2':{ n:3, l:2, ml:'±2', label:'3dₓ²₋ᵧ²', box:30 },
};

// Wave functions — returns [psi, sign (+1/-1/0 for phase coloring)]
function psi(key: OrbKey, x: number, y: number, z: number): [number, number] {
  const r = Math.sqrt(x*x + y*y + z*z);
  if (r < 1e-9) return [0, 0];
  const cosT = z / r;
  const sinT = Math.sqrt(1 - cosT*cosT);
  const phi  = Math.atan2(y, x);

  switch (key) {
    case '1s': { const v = Math.exp(-r); return [v, 1]; }
    case '2s': { const v = (2 - r) * Math.exp(-r/2); return [Math.abs(v), v >= 0 ? 1 : -1]; }
    case '2pz': { const v = r * cosT * Math.exp(-r/2); return [Math.abs(v), v >= 0 ? 1 : -1]; }
    case '2px': { const v = r * sinT * Math.cos(phi) * Math.exp(-r/2); return [Math.abs(v), v >= 0 ? 1 : -1]; }
    case '2py': { const v = r * sinT * Math.sin(phi) * Math.exp(-r/2); return [Math.abs(v), v >= 0 ? 1 : -1]; }
    case '3dz2': { const v = r*r * (3*cosT*cosT - 1) * Math.exp(-r/3); return [Math.abs(v), v >= 0 ? 1 : -1]; }
    case '3dxy': { const v = r*r * sinT*sinT * Math.sin(2*phi) * Math.exp(-r/3); return [Math.abs(v), v >= 0 ? 1 : -1]; }
    case '3dxz': { const v = r*r * sinT*cosT * Math.cos(phi) * Math.exp(-r/3); return [Math.abs(v), v >= 0 ? 1 : -1]; }
    case '3dx2y2': { const v = r*r * sinT*sinT * Math.cos(2*phi) * Math.exp(-r/3); return [Math.abs(v), v >= 0 ? 1 : -1]; }
    default: return [0, 1];
  }
}

function samplePoints(key: OrbKey, nPts: number): { positions: Float32Array; colors: Float32Array } {
  const box   = ORBITALS[key].box;
  const half  = box / 2;
  const positions: number[] = [];
  const colors: number[]    = [];

  // Find max psi² for rejection sampling
  let maxP2 = 0;
  for (let k = 0; k < 5000; k++) {
    const x = (Math.random()-0.5)*box, y = (Math.random()-0.5)*box, z = (Math.random()-0.5)*box;
    const [p] = psi(key, x, y, z);
    if (p*p > maxP2) maxP2 = p*p;
  }
  if (maxP2 < 1e-30) maxP2 = 1e-30;

  let tries = 0;
  while (positions.length / 3 < nPts && tries < nPts * 40) {
    tries++;
    const x = (Math.random()-0.5)*box;
    const y = (Math.random()-0.5)*box;
    const z = (Math.random()-0.5)*box;
    if (Math.abs(x) > half || Math.abs(y) > half || Math.abs(z) > half) continue;
    const [p, sgn] = psi(key, x, y, z);
    if (Math.random() < (p*p) / maxP2) {
      positions.push(x, y, z);
      if (sgn >= 0) { colors.push(0.98, 0.57, 0.24); } // orange
      else          { colors.push(0.38, 0.65, 0.98); } // blue
    }
  }

  return {
    positions: new Float32Array(positions),
    colors:    new Float32Array(colors),
  };
}

export default function AtomicOrbitalSim(): React.ReactElement {
  const [orbKey,    setOrbKey]    = useState<OrbKey>('2pz');
  const [phase,     setPhase]     = useState(true);
  const [nPts,      _setNPts]    = useState(10000);
  const [seed,      setSeed]      = useState(0); // bump to resample

  const resample = useCallback(() => setSeed(s => s + 1), []);

  const info = ORBITALS[orbKey];

  const mountRef = useThreeScene(
    ({ scene }) => {
      const { positions, colors } = samplePoints(orbKey, nPts);

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const displayColors = phase ? colors : new Float32Array(Array.from({length: positions.length}, () => 0.95));
      geo.setAttribute('color', new THREE.BufferAttribute(displayColors, 3));

      const mat = new THREE.PointsMaterial({
        size:           0.12,
        vertexColors:   true,
        transparent:    true,
        opacity:        0.80,
        sizeAttenuation:true,
      });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);

      // Axes
      const axes = new THREE.AxesHelper(info.box * 0.42);
      scene.add(axes);

      // Nucleus marker
      const nuc = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0x996600, emissiveIntensity: 0.4 }),
      );
      scene.add(nuc);

      return () => { geo.dispose(); mat.dispose(); };
    },
    [orbKey, phase, seed],
    { height: 460, bg: 0x070b18, cameraPos: [0, 0, info.box * 0.6], fov: 55 },
  );

  const ORB_KEYS: OrbKey[] = ['1s','2s','2px','2py','2pz','3dz2','3dxy','3dxz','3dx2y2'];

  return (
    <div>
      <div ref={mountRef as React.RefObject<HTMLDivElement>} className="w-full rounded-lg" style={{ height: 460, background: '#070b18' }} />

      {/* Orbital picker */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {ORB_KEYS.map(k => (
          <button key={k} onClick={() => setOrbKey(k)}
            className={`px-2.5 py-1 text-xs rounded border font-mono transition-colors ${
              orbKey === k ? 'bg-orange-500/25 border-orange-500/60 text-orange-300 font-bold' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
            }`}>{k}</button>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <button onClick={() => setPhase(p => !p)}
          className={`px-3 py-1.5 text-sm rounded border transition-colors ${phase ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
          Phase colors {phase ? 'On' : 'Off'}
        </button>
        <button onClick={resample}
          className="px-3 py-1.5 text-sm rounded border bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 transition-colors">
          ↺ Resample
        </button>
        <div className="ml-auto text-xs text-slate-500 font-mono">{nPts.toLocaleString()} points</div>
      </div>

      {/* Quantum numbers */}
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[['Orbital', info.label, 'text-orange-300'],
          ['n', info.n, 'text-white'],
          ['ℓ', info.l, 'text-blue-300'],
          ['mₗ', info.ml, 'text-violet-300'],
        ].map(([k, v, c]) => (
          <div key={k as string} className="bg-slate-800/60 rounded-lg py-2 border border-slate-700/50">
            <div className={`text-sm font-bold font-mono ${c}`}>{v}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k}</div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-3 text-xs text-slate-500">
        <span><span className="inline-block w-2 h-2 rounded-full bg-orange-400 mr-1"></span>+ve phase (ψ &gt; 0)</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1"></span>−ve phase (ψ &lt; 0)</span>
        <span className="ml-auto text-slate-600">Drag to rotate · Scroll to zoom</span>
      </div>

      <LabReport
        labTitle="Atomic Orbital Shapes"
        aim={`To visualise the 3D probability density of the hydrogen ${info.label} atomic orbital and understand its shape, phase, and quantum numbers.`}
        theory={`Atomic orbitals are mathematical functions ψ(r,θ,φ) describing the quantum state of an electron. The probability density |ψ|² at each point gives the chance of finding the electron there.\n\nQuantum numbers:\n  n (principal) = ${info.n} → energy level\n  ℓ (azimuthal) = ${info.l} → orbital shape (0=s, 1=p, 2=d)\n  mₗ (magnetic) = ${info.ml} → orientation\n\nPhase (sign of ψ): important in bonding — overlap of same-sign lobes = bonding MO; opposite signs = antibonding.\n\nNode count: ${info.n - info.l - 1} radial node(s), ${info.l} angular node(s).`}
        apparatus={['Hydrogen-like wave function model', 'Monte Carlo probability sampling', '3D point-cloud renderer']}
        variables={[{ name: 'Varied', desc: 'Orbital type (quantum numbers n, ℓ, mₗ)' }, { name: 'Observed', desc: 'Shape, lobes, nodes, phase distribution' }]}
        observations={[
          { label: 'Orbital', value: info.label },
          { label: 'Principal quantum number n', value: info.n },
          { label: 'Azimuthal quantum number ℓ', value: info.l },
          { label: 'Magnetic quantum number mₗ', value: info.ml },
          { label: 'Radial nodes', value: info.n - info.l - 1 },
          { label: 'Angular nodes', value: info.l },
          { label: 'Total nodes', value: info.n - 1 },
        ]}
        conclusion={`The ${info.label} orbital (n=${info.n}, ℓ=${info.l}) shows ${info.l === 0 ? 'spherical symmetry with no angular nodes' : info.l === 1 ? 'dumbbell shape with 1 angular nodal plane' : 'complex multi-lobe geometry with 2 angular nodes'}. ${info.n - info.l - 1 > 0 ? `There ${info.n-info.l-1 === 1 ? 'is' : 'are'} ${info.n-info.l-1} radial node(s) visible as phase boundaries.` : 'No radial nodes are present.'}`}
      />
    </div>
  );
}
