import React, { useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useThreeScene } from '@/hooks/useThreeScene';
import LabReport from '@/components/LabReport';

interface Charge { id: number; pos: THREE.Vector3; sign: 1 | -1; }

let _id = 0;
const mkCharge = (x: number, z: number, sign: 1|-1): Charge => ({ id: _id++, pos: new THREE.Vector3(x, 0, z), sign });

const DEFAULT_CHARGES = (): Charge[] => [mkCharge(-2.5, 0, 1), mkCharge(2.5, 0, -1)];

function computeE(pt: THREE.Vector3, charges: Charge[]): THREE.Vector3 {
  const E = new THREE.Vector3();
  for (const ch of charges) {
    const r = pt.clone().sub(ch.pos);
    const d2 = r.lengthSq() + 0.04;
    E.addScaledVector(r.normalize(), ch.sign / d2);
  }
  return E;
}

export default function ElectricField3DSim(): React.ReactElement {
  const [charges,     setCharges]     = useState<Charge[]>(DEFAULT_CHARGES);
  const [selectedSign,setSelectedSign]= useState<1|-1>(1);
  const [fieldDensity,setFieldDensity]= useState(5);

  const chargesRef = useRef<Charge[]>(charges);
  chargesRef.current = charges;

  const addCharge = useCallback((pos: THREE.Vector3) => {
    const c = mkCharge(pos.x, pos.z, selectedSign);
    setCharges(prev => [...prev, c]);
  }, [selectedSign]);

  const removeById = useCallback((id: number) => {
    setCharges(prev => prev.filter(c => c.id !== id));
  }, []);

  const reset = useCallback(() => { _id = 0; setCharges(DEFAULT_CHARGES()); }, []);

  const mountRef = useThreeScene(
    ({ scene, camera, renderer }) => {
      // Grid helper
      scene.add(new THREE.GridHelper(12, 12, 0x1a3550, 0x0d2030));

      // Ground plane (invisible, for raycasting)
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
      );
      scene.add(ground);

      // ── Charge spheres ───────────────────────────────────────────────
      const chargeGroup = new THREE.Group();
      scene.add(chargeGroup);

      function rebuildCharges() {
        while (chargeGroup.children.length) {
          const c = chargeGroup.children[0] as THREE.Mesh;
          c.geometry?.dispose();
          (c.material as THREE.Material)?.dispose();
          chargeGroup.remove(c);
        }
        for (const ch of chargesRef.current) {
          const col = ch.sign > 0 ? 0xff3333 : 0x3388ff;
          const geo = new THREE.SphereGeometry(0.22, 16, 16);
          const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.4 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.copy(ch.pos);
          mesh.userData = { chargeId: ch.id };
          chargeGroup.add(mesh);
          // Point light per charge
          const pl = new THREE.PointLight(col, 0.9, 5);
          mesh.add(pl);
        }
      }

      // ── Arrow field ─────────────────────────────────────────────────
      const arrowGroup = new THREE.Group();
      scene.add(arrowGroup);

      function rebuildField() {
        while (arrowGroup.children.length) arrowGroup.remove(arrowGroup.children[0]);
        const N = fieldDensity;
        const step = 10 / N;
        for (let ix = 0; ix <= N; ix++) {
          for (let iz = 0; iz <= N; iz++) {
            for (let iy = 0; iy < 2; iy++) {
              const x = -5 + ix*step, z = -5 + iz*step, y = iy * 1.5;
              const pt = new THREE.Vector3(x, y, z);
              // Skip if inside a charge sphere
              if (chargesRef.current.some(c => c.pos.distanceTo(pt) < 0.5)) continue;
              const E = computeE(pt, chargesRef.current);
              const len = E.length();
              if (len < 1e-4) continue;
              const dir = E.normalize();
              const scaledLen = Math.min(Math.log1p(len) * 0.35, 1.2);
              const t = Math.min(len / 4, 1);
              const color = new THREE.Color().setHSL(0.67 - 0.67*t, 1, 0.55);
              const arrow = new THREE.ArrowHelper(dir, pt, scaledLen, color.getHex(), 0.22, 0.12);
              arrowGroup.add(arrow);
            }
          }
        }
      }

      rebuildCharges();
      rebuildField();

      // Watch for charge changes via a simple setInterval
      let prev = JSON.stringify(chargesRef.current.map(c => [c.id,c.sign]));
      const watchId = setInterval(() => {
        const cur = JSON.stringify(chargesRef.current.map(c => [c.id,c.sign]));
        if (cur !== prev) { prev = cur; rebuildCharges(); rebuildField(); }
      }, 120);

      // ── Raycasting: click to add, dblclick to remove ─────────────────
      const canvas = renderer.domElement;
      const raycaster = new THREE.Raycaster();

      const getNDC = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        return new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width)  * 2 - 1,
          -((e.clientY - rect.top)  / rect.height) * 2 + 1,
        );
      };

      let lastClick = 0;
      const onClick = (e: MouseEvent) => {
        const now = Date.now();
        const dbl = now - lastClick < 300;
        lastClick = now;

        raycaster.setFromCamera(getNDC(e), camera);

        if (dbl) {
          // Double-click: remove charge
          const hits = raycaster.intersectObjects(chargeGroup.children, false);
          if (hits.length > 0) { removeById(hits[0].object.userData.chargeId); }
          return;
        }

        // Single click on ground: add charge
        const hits = raycaster.intersectObject(ground, false);
        if (hits.length > 0) {
          const p = hits[0].point;
          const clamped = new THREE.Vector3(
            Math.max(-5, Math.min(5, p.x)), 0, Math.max(-5, Math.min(5, p.z)),
          );
          addCharge(clamped);
        }
      };

      canvas.addEventListener('click', onClick);
      return () => { canvas.removeEventListener('click', onClick); clearInterval(watchId); };
    },
    [charges, fieldDensity],
    { height: 460, bg: 0x030810, cameraPos: [0, 9, 11], fov: 55 },
  );

  const posCount = charges.filter(c => c.sign > 0).length;
  const negCount = charges.filter(c => c.sign < 0).length;

  return (
    <div>
      <div ref={mountRef as React.RefObject<HTMLDivElement>} className="w-full rounded-lg" style={{ height: 460, background: '#030810' }} />

      {/* Controls */}
      <div className="mt-4 flex flex-wrap gap-2 items-center">
        <button onClick={() => setSelectedSign(1)}
          className={`px-4 py-1.5 text-sm rounded border font-bold transition-colors ${selectedSign===1 ? 'bg-red-500/25 border-red-500/60 text-red-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
          + Positive
        </button>
        <button onClick={() => setSelectedSign(-1)}
          className={`px-4 py-1.5 text-sm rounded border font-bold transition-colors ${selectedSign===-1 ? 'bg-blue-500/25 border-blue-500/60 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
          − Negative
        </button>
        <button onClick={reset} className="px-3 py-1.5 text-sm rounded border bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 transition-colors">↺ Reset</button>
        <button onClick={() => setCharges([])} className="px-3 py-1.5 text-sm rounded border bg-slate-800 border-slate-700 text-slate-400 hover:border-red-700 transition-colors">Clear all</button>
      </div>

      <div className="mt-3">
        <label className="text-xs text-slate-400 mb-1 block">Arrow density: <span className="font-mono text-white">{fieldDensity}×{fieldDensity}</span></label>
        <input type="range" min={3} max={8} step={1} value={fieldDensity} onChange={e => setFieldDensity(+e.target.value)} className="w-full accent-orange-500" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[['+ charges', posCount, 'text-red-400'], ['− charges', negCount, 'text-blue-400'], ['Total', posCount+negCount, 'text-white']].map(([k,v,c]) => (
          <div key={k as string} className="bg-slate-800/60 rounded-lg py-2 border border-slate-700/50">
            <div className={`text-sm font-bold font-mono ${c}`}>{v}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k}</div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-xs text-slate-600 italic">
        Click on the grid to place a charge · Double-click a charge sphere to remove it
      </div>

      <LabReport
        labTitle="Electric Field Visualiser"
        aim="To visualise the 3D electric field produced by point charges and investigate how charge arrangement affects field direction and magnitude."
        theory={`Coulomb's Law: F = k·q₁·q₂/r² (k ≈ 8.99×10⁹ N·m²/C²)\nElectric field: E = F/q = k·Q/r² (N/C)\nSuperposition principle: the net field at any point is the vector sum of contributions from all charges.\n\nField lines:\n• Start on positive charges, end on negative\n• Density indicates field strength\n• Direction: force on a positive test charge\n• Arrow colour: blue (weak) → red (strong)\n\nEquipotential surfaces are perpendicular to field lines everywhere.`}
        apparatus={['Virtual point charge model', '3D arrow-field renderer', 'Interactive charge placement']}
        variables={[{ name: 'Varied', desc: 'Number, sign, and position of point charges' }, { name: 'Observed', desc: 'Field arrow directions and magnitudes' }]}
        observations={[
          { label: 'Positive charges', value: posCount },
          { label: 'Negative charges', value: negCount },
          { label: 'Net charge', value: posCount - negCount, unit: 'q' },
          { label: 'Arrow grid', value: `${fieldDensity}×${fieldDensity}×2` },
        ]}
        conclusion={`With ${posCount} positive and ${negCount} negative charges (net charge ${posCount-negCount}q), the field arrows show ${posCount===negCount && posCount>0 ? 'a dipole-like pattern with field lines running from + to −' : posCount>negCount ? 'net outward field (positive net charge)' : negCount>posCount ? 'net inward field (negative net charge)' : 'no field (empty space)'}. The superposition principle determines the resultant field vector at each grid point.`}
      />
    </div>
  );
}
