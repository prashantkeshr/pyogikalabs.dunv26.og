import React, { useState } from 'react';
import * as THREE from 'three';
import { useThreeScene } from '@/hooks/useThreeScene';
import LabReport from '@/components/LabReport';

type StructKey = 'nacl' | 'diamond' | 'fcc' | 'bcc';

interface AtomDef { pos: [number,number,number]; color: number; r: number; label: string; }

const A = 1.5; // lattice param (scaled)

function repeat(basis: AtomDef[], nx: number, ny: number, nz: number, a: number): AtomDef[] {
  const out: AtomDef[] = [];
  for (let ix = 0; ix < nx; ix++)
    for (let iy = 0; iy < ny; iy++)
      for (let iz = 0; iz < nz; iz++)
        for (const b of basis)
          out.push({ ...b, pos: [(b.pos[0]+ix)*a - nx*a/2, (b.pos[1]+iy)*a - ny*a/2, (b.pos[2]+iz)*a - nz*a/2] });
  return out;
}

const STRUCTURES: Record<StructKey, { atoms: AtomDef[]; bondDist: number; name: string; coordNum: number; latParam: string; desc: string }> = {
  nacl: {
    name: 'NaCl (Rock Salt)',
    coordNum: 6,
    latParam: '5.64 Å',
    desc: 'Ionic crystal — alternating Na⁺ and Cl⁻ in face-centred cubic arrangement',
    bondDist: 0.85,
    atoms: repeat([
      {pos:[0,0,0],       color:0x9b59b6, r:0.28, label:'Na⁺'},
      {pos:[0.5,0.5,0],   color:0x9b59b6, r:0.28, label:'Na⁺'},
      {pos:[0.5,0,0.5],   color:0x9b59b6, r:0.28, label:'Na⁺'},
      {pos:[0,0.5,0.5],   color:0x9b59b6, r:0.28, label:'Na⁺'},
      {pos:[0.5,0,0],     color:0x2ecc71, r:0.38, label:'Cl⁻'},
      {pos:[0,0.5,0],     color:0x2ecc71, r:0.38, label:'Cl⁻'},
      {pos:[0,0,0.5],     color:0x2ecc71, r:0.38, label:'Cl⁻'},
      {pos:[0.5,0.5,0.5], color:0x2ecc71, r:0.38, label:'Cl⁻'},
    ], 2, 2, 2, A),
  },
  diamond: {
    name: 'Diamond Cubic',
    coordNum: 4,
    latParam: '3.57 Å',
    desc: 'Covalent crystal — each carbon bonded to 4 others in tetrahedral sp³ geometry',
    bondDist: 0.47,
    atoms: repeat([
      {pos:[0,0,0],           color:0xaaaaaa, r:0.22, label:'C'},
      {pos:[0.5,0.5,0],       color:0xaaaaaa, r:0.22, label:'C'},
      {pos:[0.5,0,0.5],       color:0xaaaaaa, r:0.22, label:'C'},
      {pos:[0,0.5,0.5],       color:0xaaaaaa, r:0.22, label:'C'},
      {pos:[0.25,0.25,0.25],  color:0xcccccc, r:0.22, label:'C'},
      {pos:[0.75,0.75,0.25],  color:0xcccccc, r:0.22, label:'C'},
      {pos:[0.75,0.25,0.75],  color:0xcccccc, r:0.22, label:'C'},
      {pos:[0.25,0.75,0.75],  color:0xcccccc, r:0.22, label:'C'},
    ], 1, 1, 1, A * 0.95),
  },
  fcc: {
    name: 'FCC Copper',
    coordNum: 12,
    latParam: '3.62 Å',
    desc: 'Metallic crystal — densely packed copper atoms in face-centred cubic structure',
    bondDist: 0.78,
    atoms: repeat([
      {pos:[0,0,0],     color:0xe07020, r:0.32, label:'Cu'},
      {pos:[0.5,0.5,0], color:0xe07020, r:0.32, label:'Cu'},
      {pos:[0.5,0,0.5], color:0xe07020, r:0.32, label:'Cu'},
      {pos:[0,0.5,0.5], color:0xe07020, r:0.32, label:'Cu'},
    ], 3, 3, 3, A * 0.9),
  },
  bcc: {
    name: 'BCC Iron',
    coordNum: 8,
    latParam: '2.87 Å',
    desc: 'Metallic crystal — iron atoms at cube corners and body centre',
    bondDist: 0.98,
    atoms: repeat([
      {pos:[0,0,0],       color:0x607d8b, r:0.32, label:'Fe'},
      {pos:[0.5,0.5,0.5], color:0x607d8b, r:0.32, label:'Fe'},
    ], 3, 3, 3, A * 0.88),
  },
};

function buildBond(a: THREE.Vector3, b: THREE.Vector3, parent: THREE.Object3D) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 1e-5) return;
  const geo = new THREE.CylinderGeometry(0.055, 0.055, len, 7, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(a).lerp(b, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(mesh);
}

export default function CrystalSim(): React.ReactElement {
  const [structKey, setStructKey] = useState<StructKey>('nacl');
  const [showBonds, setShowBonds] = useState(true);
  const [showCell,  setShowCell]  = useState(true);
  const [selected,  setSelected]  = useState<AtomDef | null>(null);
  const [autoSpin,  setAutoSpin]  = useState(true);

  const struct = STRUCTURES[structKey];

  const mountRef = useThreeScene(
    ({ scene, camera, renderer, onFrame }) => {
      const group = new THREE.Group();
      scene.add(group);

      // Atoms
      const meshes: Array<{ mesh: THREE.Mesh; atom: AtomDef }> = [];
      for (const atom of struct.atoms) {
        const geo  = new THREE.SphereGeometry(atom.r, 20, 20);
        const mat  = new THREE.MeshStandardMaterial({ color: atom.color, metalness: 0.25, roughness: 0.45 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(...atom.pos);
        mesh.castShadow = true;
        group.add(mesh);
        meshes.push({ mesh, atom });
      }

      // Bonds
      let bondGroup: THREE.Group | null = null;
      if (showBonds) {
        bondGroup = new THREE.Group();
        group.add(bondGroup);
        const pv = struct.atoms.map(a => new THREE.Vector3(...a.pos));
        for (let i = 0; i < pv.length; i++)
          for (let j = i + 1; j < pv.length; j++)
            if (pv[i].distanceTo(pv[j]) < struct.bondDist)
              buildBond(pv[i], pv[j], bondGroup);
      }

      // Unit cell outline
      let cellLine: THREE.LineSegments | null = null;
      if (showCell) {
        const s = A * 0.5;
        const pts = [-s,s].flatMap(x => [-s,s].flatMap(y => [-s,s].map(z => [x,y,z])));
        const edges = [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
        const verts: number[] = [];
        for (const [a,b] of edges) { verts.push(...pts[a], ...pts[b]); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        cellLine = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.25, transparent: true }));
        group.add(cellLine);
      }

      // Click raycasting
      const canvas = renderer.domElement;
      const raycaster = new THREE.Raycaster();
      const handleClick = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width)  * 2 - 1,
          -((e.clientY - rect.top)  / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(meshes.map(m => m.mesh));
        if (hits.length > 0) {
          const hit = meshes.find(m => m.mesh === hits[0].object);
          setSelected(hit?.atom ?? null);
        } else { setSelected(null); }
      };
      canvas.addEventListener('click', handleClick);

      onFrame((_, dt) => { if (autoSpin) group.rotation.y += dt * 0.4; });

      return () => canvas.removeEventListener('click', handleClick);
    },
    [structKey, showBonds, showCell, autoSpin],
    { height: 460, bg: 0x070b18, cameraPos: [5, 5, 5], fov: 50, shadows: true },
  );

  const bondCount = (() => {
    const pv = struct.atoms.map(a => new THREE.Vector3(...a.pos));
    let n = 0;
    for (let i = 0; i < pv.length; i++)
      for (let j = i + 1; j < pv.length; j++)
        if (pv[i].distanceTo(pv[j]) < struct.bondDist) n++;
    return n;
  })();

  const obs = [
    { label: 'Structure',           value: struct.name },
    { label: 'Coordination number', value: struct.coordNum },
    { label: 'Lattice parameter',   value: struct.latParam },
    { label: 'Atoms in model',      value: struct.atoms.length },
    { label: 'Bonds shown',         value: bondCount },
  ];

  const KEYS: StructKey[] = ['nacl', 'diamond', 'fcc', 'bcc'];
  const KEY_LABELS: Record<StructKey, string> = { nacl: 'NaCl', diamond: 'Diamond', fcc: 'FCC Cu', bcc: 'BCC Fe' };

  return (
    <div>
      <div ref={mountRef as React.RefObject<HTMLDivElement>} className="w-full rounded-lg" style={{ height: 460, background: '#070b18' }} />

      {/* Structure picker */}
      <div className="mt-4 flex flex-wrap gap-2">
        {KEYS.map(k => (
          <button key={k} onClick={() => setStructKey(k)}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${
              structKey === k ? 'bg-orange-500/25 border-orange-500/60 text-orange-300 font-semibold' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
            }`}>{KEY_LABELS[k]}</button>
        ))}
        <button onClick={() => setShowBonds(b => !b)}
          className={`px-3 py-1.5 text-sm rounded border transition-colors ${showBonds ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
          Bonds
        </button>
        <button onClick={() => setShowCell(c => !c)}
          className={`px-3 py-1.5 text-sm rounded border transition-colors ${showCell ? 'bg-slate-600/40 border-slate-500/50 text-slate-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
          Unit cell
        </button>
        <button onClick={() => setAutoSpin(s => !s)}
          className={`px-3 py-1.5 text-sm rounded border transition-colors ${autoSpin ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
          {autoSpin ? '⏸' : '▶'} Spin
        </button>
      </div>

      {/* Description */}
      <div className="mt-3 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
        <span className="font-semibold text-slate-300">{struct.name}</span> — {struct.desc}
      </div>

      {/* Stats */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[['Coord. No.', struct.coordNum, 'text-orange-400'],
          ['Atoms', struct.atoms.length, 'text-blue-400'],
          ['Bonds', bondCount, 'text-emerald-400'],
        ].map(([k, v, c]) => (
          <div key={k as string} className="bg-slate-800/60 rounded-lg py-2 border border-slate-700/50">
            <div className={`text-sm font-bold font-mono ${c}`}>{v}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k}</div>
          </div>
        ))}
      </div>

      {/* Selected atom */}
      {selected && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-600/50 text-sm">
          <span className="font-semibold text-white">Selected: </span>
          <span className="text-orange-300 font-mono">{selected.label}</span>
          <span className="text-slate-400 ml-3 text-xs font-mono">
            ({selected.pos[0].toFixed(2)}, {selected.pos[1].toFixed(2)}, {selected.pos[2].toFixed(2)})
          </span>
        </div>
      )}
      {!selected && <div className="mt-3 text-xs text-slate-600 italic">Click an atom to inspect it. Drag to rotate.</div>}

      <LabReport
        labTitle="Crystal Lattice Structures"
        aim={`To investigate the 3D arrangement of atoms in ${struct.name} and determine coordination number, bonding pattern and unit cell geometry.`}
        theory={`Crystals are solids with long-range periodic atomic order. The repeating unit is the unit cell.\n\nNaCl (ionic): Na⁺ and Cl⁻ alternate in a face-centred cubic lattice. Each ion is surrounded by 6 of the opposite type (coordination number = 6). Held by electrostatic (ionic) bonds.\n\nDiamond (covalent): Each carbon forms 4 sp³ bonds in a tetrahedral geometry (CN = 4). Extremely hard due to directional covalent bonding.\n\nFCC Cu (metallic): Closest-packed metal — 12 nearest neighbours (CN = 12). Electrons delocalised in metallic bonding → good conductor.\n\nBCC Fe (metallic): Body-centred cubic — 8 nearest neighbours (CN = 8). Less densely packed than FCC.`}
        apparatus={['Virtual crystal model', 'Atomic radius data', '3D structure viewer']}
        variables={[{ name: 'Varied', desc: 'Crystal structure type' }, { name: 'Observed', desc: 'Coordination number, bond count, atom positions' }]}
        observations={obs}
        conclusion={`${struct.name} displays a coordination number of ${struct.coordNum} with lattice parameter ${struct.latParam}. The model contains ${struct.atoms.length} atoms and ${bondCount} nearest-neighbour bonds. ${struct.desc}.`}
      />
    </div>
  );
}
