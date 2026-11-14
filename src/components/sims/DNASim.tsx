import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThreeScene } from '@/hooks/useThreeScene';
import LabReport from '@/components/LabReport';

const N_PAIRS = 20;
const PITCH    = 0.38;
const RADIUS   = 1.0;

const SEQUENCE = ['AT','GC','TA','CG','AT','GC','GC','AT','TA','CG','AT','AT','GC','TA','CG','GC','AT','GC','TA','AT'];

const BASE_NAME: Record<string, string> = {
  A: 'Adenine', T: 'Thymine', G: 'Guanine', C: 'Cytosine',
};
const BASE_COLOR: Record<string, number> = {
  A: 0x22c55e, T: 0xef4444, G: 0x3b82f6, C: 0xeab308,
};
const PAIR_COLOR: Record<string, number> = {
  AT: 0x06b6d4, TA: 0x06b6d4, GC: 0xa855f7, CG: 0xa855f7,
};

function addCyl(
  from: THREE.Vector3,
  to:   THREE.Vector3,
  r:    number,
  color: number,
  parent: THREE.Object3D,
  opacity = 1,
): void {
  const dir = to.clone().sub(from);
  const len = dir.length();
  if (len < 1e-4) return;
  const mid   = from.clone().lerp(to, 0.5);
  const norm  = dir.divideScalar(len);
  const geo   = new THREE.CylinderGeometry(r, r, len, 8, 1);
  const mat   = new THREE.MeshStandardMaterial({
    color,
    transparent: opacity < 1,
    opacity,
  });
  const mesh  = new THREE.Mesh(geo, mat);
  mesh.position.copy(mid);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), norm);
  parent.add(mesh);
}

export default function DNASim(): React.ReactElement {
  const [rotSpeed,     setRotSpeed]     = useState(0.3);
  const [animating,    setAnimating]    = useState(true);
  const [showHBonds,   setShowHBonds]   = useState(true);
  const [selectedPair, setSelectedPair] = useState<number | null>(null);

  const animRef    = useRef(true);
  const speedRef   = useRef(0.3);
  const pairGrpsRef = useRef<THREE.Group[]>([]);
  const helixRef   = useRef<THREE.Group | null>(null);

  useEffect(() => { animRef.current  = animating; }, [animating]);
  useEffect(() => { speedRef.current = rotSpeed;  }, [rotSpeed]);

  const mountRef = useThreeScene(
    ({ scene, onFrame }) => {
      const helix = new THREE.Group();
      scene.add(helix);
      helixRef.current   = helix;
      pairGrpsRef.current = [];

      // ── Backbone point arrays ──
      const pts1: THREE.Vector3[] = [];
      const pts2: THREE.Vector3[] = [];
      for (let i = 0; i < N_PAIRS; i++) {
        const ang = i * Math.PI / 5;
        const y   = i * PITCH - (N_PAIRS * PITCH / 2);
        pts1.push(new THREE.Vector3( RADIUS * Math.cos(ang), y,  RADIUS * Math.sin(ang)));
        pts2.push(new THREE.Vector3(-RADIUS * Math.cos(ang), y, -RADIUS * Math.sin(ang)));
      }

      // ── Backbone tubes ──
      const makeTube = (pts: THREE.Vector3[], col: number) => {
        const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N_PAIRS * 4, 0.07, 8);
        helix.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col })));
      };
      makeTube(pts1, 0x3b82f6);
      makeTube(pts2, 0xf97316);

      // ── Per-pair geometry ──
      for (let i = 0; i < N_PAIRS; i++) {
        const pg   = new THREE.Group();
        helix.add(pg);
        pairGrpsRef.current.push(pg);

        const ang  = i * Math.PI / 5;
        const y    = i * PITCH - (N_PAIRS * PITCH / 2);
        const p1   = pts1[i];
        const p2   = pts2[i];
        const b1   = new THREE.Vector3( 0.7 * RADIUS * Math.cos(ang), y,  0.7 * RADIUS * Math.sin(ang));
        const b2   = new THREE.Vector3(-0.7 * RADIUS * Math.cos(ang), y, -0.7 * RADIUS * Math.sin(ang));

        const pairType = SEQUENCE[i];

        // Spine connectors
        addCyl(p1, b1, 0.05, 0x3b82f6, pg);
        addCyl(p2, b2, 0.05, 0xf97316, pg);

        // Base-pair bridge
        addCyl(b1, b2, 0.075, PAIR_COLOR[pairType] ?? 0x888888, pg);

        // Nucleotide spheres
        const sg = new THREE.SphereGeometry(0.15, 12, 12);
        const s1 = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: BASE_COLOR[pairType[0]] ?? 0xaaa }));
        s1.position.copy(b1);
        pg.add(s1);
        const s2 = new THREE.Mesh(sg.clone(), new THREE.MeshStandardMaterial({ color: BASE_COLOR[pairType[1]] ?? 0xaaa }));
        s2.position.copy(b2);
        pg.add(s2);

        // Hydrogen bonds
        if (showHBonds) {
          const hCnt = (pairType === 'AT' || pairType === 'TA') ? 2 : 3;
          for (let h = 0; h < hCnt; h++) {
            const frac  = (h + 1) / (hCnt + 1);
            const hFrom = b1.clone().lerp(b2, frac - 0.08);
            const hTo   = b1.clone().lerp(b2, frac + 0.08);
            const geo   = new THREE.BufferGeometry().setFromPoints([hFrom, hTo]);
            pg.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true })));
          }
        }
      }

      onFrame((_, dt) => {
        if (animRef.current) helix.rotation.y += dt * speedRef.current;
      });

      return () => {
        helixRef.current    = null;
        pairGrpsRef.current = [];
      };
    },
    [showHBonds],
    { height: 460, bg: 0x070b18, cameraPos: [0, 0, 12], fov: 55 },
  );

  // Highlight selected pair
  useEffect(() => {
    pairGrpsRef.current.forEach((pg, i) => {
      pg.scale.setScalar(i === selectedPair ? 1.3 : 1.0);
    });
  }, [selectedPair]);

  const atCount     = SEQUENCE.filter(p => p === 'AT' || p === 'TA').length;
  const gcCount     = SEQUENCE.filter(p => p === 'GC' || p === 'CG').length;
  const totalHBonds = SEQUENCE.reduce((s, p) => s + (p === 'AT' || p === 'TA' ? 2 : 3), 0);
  const selSeq      = selectedPair !== null ? SEQUENCE[selectedPair] : null;

  return (
    <div>
      <div ref={mountRef as React.RefObject<HTMLDivElement>} className="w-full rounded-lg" style={{ height: 460, background: '#070b18' }} />

      {/* Controls */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">
            Rotation speed: <span className="font-mono text-white">{rotSpeed.toFixed(1)}</span>
          </label>
          <input type="range" min={0} max={2} step={0.05} value={rotSpeed}
            onChange={e => setRotSpeed(+e.target.value)} className="w-full accent-orange-500" />
        </div>
        <div className="flex gap-2 items-center flex-wrap pt-1">
          <button onClick={() => setAnimating(a => !a)}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${animating ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            {animating ? '⏸ Pause' : '▶ Rotate'}
          </button>
          <button onClick={() => setShowHBonds(h => !h)}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${showHBonds ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            H-Bonds {showHBonds ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {([
          ['A·T / T·A', atCount,     'text-cyan-400'],
          ['G·C / C·G', gcCount,     'text-purple-400'],
          ['H-bonds',   totalHBonds, 'text-white'],
        ] as [string, number, string][]).map(([k, v, c]) => (
          <div key={k} className="bg-slate-800/60 rounded-lg py-2 border border-slate-700/50">
            <div className={`text-sm font-bold font-mono ${c}`}>{v}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k}</div>
          </div>
        ))}
      </div>

      {/* Base pair sequence */}
      <div className="mt-3">
        <div className="text-xs text-slate-400 mb-2">Base-pair sequence — click to inspect</div>
        <div className="flex flex-wrap gap-1.5">
          {SEQUENCE.map((pair, i) => {
            const isAT = pair === 'AT' || pair === 'TA';
            return (
              <button key={i} onClick={() => setSelectedPair(sp => sp === i ? null : i)}
                className={`w-9 h-9 rounded text-xs font-bold border transition-all ${
                  selectedPair === i ? 'ring-2 ring-white/60 scale-110' : 'hover:scale-105'
                } ${isAT
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-purple-500/20 border-purple-500/40 text-purple-300'}`}>
                {pair}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selSeq !== null && selectedPair !== null && (
        <div className="mt-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm">
          <div className="font-semibold text-white mb-1.5">Base Pair #{selectedPair + 1}: {selSeq}</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-400">
            <span>Strand 1 base: <span className="text-white font-medium">{BASE_NAME[selSeq[0]]}</span></span>
            <span>Strand 2 base: <span className="text-white font-medium">{BASE_NAME[selSeq[1]]}</span></span>
            <span>Hydrogen bonds: <span className="text-white font-mono font-bold">{(selSeq === 'AT' || selSeq === 'TA') ? 2 : 3}</span></span>
            <span>Position: <span className="text-white font-mono">{selectedPair + 1} / {N_PAIRS}</span></span>
          </div>
        </div>
      )}

      <LabReport
        labTitle="DNA Double Helix"
        aim="To investigate the 3D structure of the DNA double helix including base pair arrangement, hydrogen bonding patterns, and helical geometry."
        theory={`The DNA double helix (Watson & Crick, 1953) consists of two antiparallel strands wound in a right-handed spiral:\n\n• Two sugar-phosphate backbones on the outside; nitrogen bases pointing inward\n• Complementary base pairing: Adenine–Thymine (2 H-bonds), Guanine–Cytosine (3 H-bonds)\n• One complete helical turn every 10 base pairs; rise of 0.34 nm per base pair\n• Helix diameter ~2.0 nm; pitch ~3.4 nm\n• G–C pairs form 3 hydrogen bonds, making GC-rich regions more thermally stable (higher melting temperature Tm)`}
        apparatus={['Virtual 3D DNA model', '20-base-pair strand', 'Hydrogen bond visualiser']}
        variables={[
          { name: 'Fixed', desc: 'Helix geometry, Watson–Crick base-pairing rules' },
          { name: 'Observed', desc: 'Sequence composition, H-bond count, GC content' },
        ]}
        observations={[
          { label: 'Total base pairs',    value: N_PAIRS },
          { label: 'A-T / T-A pairs',     value: atCount },
          { label: 'G-C / C-G pairs',     value: gcCount },
          { label: 'Total hydrogen bonds',value: totalHBonds },
          { label: 'GC content',          value: ((gcCount / N_PAIRS) * 100).toFixed(1), unit: '%' },
          { label: 'Helix length',         value: (N_PAIRS * 0.34).toFixed(2), unit: 'nm' },
          { label: 'Complete turns',       value: (N_PAIRS / 10).toFixed(1) },
        ]}
        conclusion={`This 20-bp segment contains ${atCount} A-T/T-A pairs and ${gcCount} G-C/C-G pairs (GC content ${((gcCount/N_PAIRS)*100).toFixed(0)}%). The ${totalHBonds} total hydrogen bonds stabilise the double helix. ${gcCount >= atCount ? 'The relatively high GC content predicts above-average thermal stability.' : 'The majority of A-T pairs suggests lower melting temperature compared to GC-rich segments.'} The molecule spans ${(N_PAIRS * 0.34).toFixed(2)} nm and completes ${(N_PAIRS/10).toFixed(1)} helical turns.`}
      />
    </div>
  );
}
