import React, { useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useThreeScene } from '@/hooks/useThreeScene';
import LabReport from '@/components/LabReport';

// Rutherford scattering: θ = 2·arctan(a/2b), a = k·Z₁·Z₂·e²/T
// Am-241 (5.5 MeV alpha) on Au (Z=79): a ≈ 41.3 fm
const A_FM = 41.3;
const BMAX_FM = 8000; // effective atomic spacing

function rutherfordAngle(b: number): number {
  if (b < 0.001) return Math.PI;
  return 2 * Math.atan(A_FM / (2 * b));
}
function classify(theta: number): 0|1|2|3 {
  const d = theta * 180 / Math.PI;
  if (d > 90) return 3;
  if (d > 10) return 2;
  if (d > 1)  return 1;
  return 0;
}
const CAT = ['Straight through','Slight deflect','Strong deflect','Backscattered'];
const CAT_COL = [0x555566, 0x44aaff, 0xff8833, 0xff3333];

interface Ptcl {
  mesh: THREE.Mesh;
  trailLine: THREE.Line;
  trailPts: THREE.Vector3[];
  phase: 'in'|'out'|'done';
  t: number;
  start: THREE.Vector3;
  deflect: THREE.Vector3;
  end: THREE.Vector3;
  dir: THREE.Vector3;
  cat: 0|1|2|3;
}

export default function RutherfordSim(): React.ReactElement {
  const [running,   setRunning]   = useState(false);
  const [slowmo,    setSlowmo]    = useState(false);
  const [counts,    setCounts]    = useState([0,0,0,0]);
  const [showNucleus, setShowNucleus] = useState(true);
  const [rate,      setRate]      = useState(300);

  const runRef   = useRef(false);
  const slowRef  = useRef(false);
  const rateRef  = useRef(300);
  const ptclsRef = useRef<Ptcl[]>([]);
  const countsRef= useRef([0,0,0,0]);
  const spawnRef = useRef(0);
  const nucleusRef = useRef<THREE.Mesh|null>(null);

  runRef.current  = running;
  slowRef.current = slowmo;
  rateRef.current = rate;

  const reset = useCallback(() => {
    setRunning(false); runRef.current = false;
    countsRef.current = [0,0,0,0];
    setCounts([0,0,0,0]);
    ptclsRef.current.forEach(p => { p.mesh.parent?.remove(p.mesh); p.trailLine.parent?.remove(p.trailLine); });
    ptclsRef.current = [];
    spawnRef.current = 0;
  }, []);

  const mountRef = useThreeScene(({ scene, onFrame }) => {
    // ── Apparatus ──────────────────────────────────────────────────────
    // Ground ring / platform
    const platGeo = new THREE.CylinderGeometry(7, 7, 0.08, 64, 1, false);
    const platMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.4, roughness: 0.8 });
    scene.add(new THREE.Mesh(platGeo, platMat));

    // ZnS detection cylinder screen
    const screenGeo = new THREE.CylinderGeometry(5.5, 5.5, 3.6, 128, 1, true);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x0a1a0f, side: THREE.DoubleSide, transparent: true, opacity: 0.55, roughness: 1 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.y = 1.8;
    scene.add(screen);

    // Screen rim rings
    [0.04, 3.56].forEach(y => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.07, 8, 64), new THREE.MeshStandardMaterial({ color: 0x334455 }));
      rim.rotation.x = Math.PI/2; rim.position.y = y;
      scene.add(rim);
    });

    // Lead collimator (cylinder with hole) at z = -4
    const leadMat = new THREE.MeshStandardMaterial({ color: 0x3a3a4a, metalness: 0.6, roughness: 0.5 });
    const collimator = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.5, 32), leadMat);
    collimator.rotation.z = Math.PI/2; collimator.position.set(-4, 1.8, 0);
    scene.add(collimator);
    // Source end cap
    const source = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshStandardMaterial({ color: 0x667788, metalness: 0.8 }));
    source.position.set(-4.9, 1.8, 0);
    scene.add(source);

    // Gold foil (thin disk)
    const foilMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const foil = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.02, 64), foilMat);
    foil.rotation.z = Math.PI/2; foil.position.set(0, 1.8, 0);
    scene.add(foil);

    // Nucleus
    const nucMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 1.5 });
    const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), nucMat);
    nuc.position.set(0, 1.8, 0);
    scene.add(nuc);
    nucleusRef.current = nuc;

    // Detector label posts
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x334455 }));
      post.position.set(Math.cos(ang)*5.5, 1.8, Math.sin(ang)*5.5);
      scene.add(post);
    }

    // Particle + flash pools
    const pGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const flashGeo = new THREE.SphereGeometry(0.22, 10, 10);
    const flashes: THREE.Mesh[] = [];
    const flashTimes: number[] = [];
    for (let i = 0; i < 40; i++) {
      const fm = new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
      scene.add(fm); flashes.push(fm); flashTimes.push(-99);
    }

    let flashIdx = 0;
    function spawnFlash(pos: THREE.Vector3, cat: 0|1|2|3, time: number) {
      const fm = flashes[flashIdx % flashes.length];
      fm.position.copy(pos);
      (fm.material as THREE.MeshBasicMaterial).color.setHex(cat===3?0xff4444:cat===2?0xff8833:cat===1?0x44aaff:0xdddddd);
      (fm.material as THREE.MeshBasicMaterial).opacity = 1;
      flashTimes[flashIdx % flashes.length] = time;
      flashIdx++;
    }

    // ── Particle factory ────────────────────────────────────────────────
    function spawnParticle(cat_override?: 0|1|2|3) {
      // Random impact parameter (area-uniform)
      let b: number, cat: 0|1|2|3;
      if (cat_override !== undefined) {
        // seeded spawn for demonstration variety
        const thresholds = [A_FM/2, A_FM/2/Math.tan(5*Math.PI/180), A_FM/2/Math.tan(0.5*Math.PI/180)];
        b = thresholds[Math.min(cat_override, 2)] * (0.3 + Math.random()*0.6);
        cat = cat_override;
      } else {
        b = BMAX_FM * Math.sqrt(Math.random());
        const theta = rutherfordAngle(b);
        cat = classify(theta);
      }

      const theta = rutherfordAngle(b);
      const phi = Math.random() * Math.PI * 2;
      // Perpendicular offset in y-z plane
      const by = Math.cos(phi) * Math.min(b/BMAX_FM * 1.1, 0.95);
      const bz = Math.sin(phi) * Math.min(b/BMAX_FM * 1.1, 0.95);

      const startX = -6.5, foilX = 0;
      const start = new THREE.Vector3(startX, 1.8 + by, bz);
      const deflect = new THREE.Vector3(foilX, 1.8 + by * (foilX/startX), bz * (foilX/startX));

      // Post-scattering direction: scatter in xz plane (or any plane containing beam axis)
      const dirIn = new THREE.Vector3(1, 0, 0); // beam along +x
      // Rotation axis perpendicular to beam, in direction of impact parameter
      const impactDir = new THREE.Vector2(by, bz).length() > 1e-6
        ? new THREE.Vector3(0, by, bz).normalize()
        : new THREE.Vector3(0, 1, 0);
      const axis = new THREE.Vector3().crossVectors(dirIn, impactDir).normalize();
      if (axis.length() < 0.1) axis.set(0, 0, 1);
      const dirOut = dirIn.clone().applyAxisAngle(axis, theta);

      // Find where dirOut hits the cylinder r=5.5 or exits behind (backscatter hits back cap or source side)
      let endPos: THREE.Vector3;
      if (cat === 3) {
        // backscattered: travels toward source; hits the cylinder behind
        const t2 = (-6 - deflect.x) / dirOut.x;
        endPos = deflect.clone().addScaledVector(dirOut, t2);
        endPos.y = Math.max(-0.1, Math.min(3.6, endPos.y));
      } else {
        // Find intersection with cylinder (x ignored, radial = sqrt(y²+z²) = 5.5 in y,z plane)
        // Parametric: P = deflect + t*dirOut; dist_xz from y-axis (treating x-axis as beam)
        // We want sqrt((P.y-1.8)²+P.z²) = 5.5 approximately
        // Simple: integrate until r > 5.3 (hits screen)
        let t2 = 0, pos = deflect.clone();
        for (let i = 0; i < 500; i++) {
          pos.addScaledVector(dirOut, 0.03);
          const dy = pos.y - 1.8, dz = pos.z;
          if (Math.sqrt(dy*dy + dz*dz) > 5.2 || pos.x > 6 || pos.x < -6) break;
        }
        endPos = pos;
      }

      const col = CAT_COL[cat];
      const mat = new THREE.MeshBasicMaterial({ color: col });
      const mesh = new THREE.Mesh(pGeo, mat);
      mesh.position.copy(start);
      scene.add(mesh);

      const tGeo = new THREE.BufferGeometry();
      const tArr = new Float32Array(200 * 3);
      tGeo.setAttribute('position', new THREE.BufferAttribute(tArr, 3));
      tGeo.setDrawRange(0, 0);
      const trailLine = new THREE.Line(tGeo, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.5 }));
      scene.add(trailLine);

      ptclsRef.current.push({ mesh, trailLine, trailPts: [], phase: 'in', t: 0, start, deflect, end: endPos, dir: dirOut, cat });
    }

    // Seed initial variety
    spawnParticle(3); spawnParticle(2); spawnParticle(1);

    onFrame((time, dt) => {
      if (!runRef.current) return;
      const speed = slowRef.current ? 0.4 : 1.6;

      // Update existing particles
      const toRemove: Ptcl[] = [];
      for (const p of ptclsRef.current) {
        if (p.phase === 'done') continue;
        p.t += dt * speed * (p.phase === 'in' ? 1.2 : 0.9);

        if (p.phase === 'in') {
          const pos = p.start.clone().lerp(p.deflect, Math.min(p.t, 1));
          p.mesh.position.copy(pos);
          p.trailPts.push(pos.clone());
          if (p.t >= 1) { p.phase = 'out'; p.t = 0; }
        } else if (p.phase === 'out') {
          const pos = p.deflect.clone().lerp(p.end, Math.min(p.t, 1));
          p.mesh.position.copy(pos);
          p.trailPts.push(pos.clone());
          if (p.t >= 1) {
            spawnFlash(p.end, p.cat, time);
            countsRef.current[p.cat]++;
            setCounts([...countsRef.current]);
            p.phase = 'done';
            toRemove.push(p);
          }
        }

        // Update trail
        const pts = p.trailPts.slice(-60);
        const posAttr = p.trailLine.geometry.attributes.position as THREE.BufferAttribute;
        pts.forEach((pt, i) => posAttr.setXYZ(i, pt.x, pt.y, pt.z));
        posAttr.needsUpdate = true;
        p.trailLine.geometry.setDrawRange(0, pts.length);
      }

      // Fade flashes
      flashes.forEach((fm, i) => {
        const age = time - flashTimes[i];
        if (age < 1.2) {
          (fm.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - age/1.2);
        }
      });

      // Remove finished particles
      for (const p of toRemove) {
        scene.remove(p.mesh); p.mesh.geometry.dispose();
        scene.remove(p.trailLine); p.trailLine.geometry.dispose();
        ptclsRef.current = ptclsRef.current.filter(x => x !== p);
      }

      // Spawn new particles
      spawnRef.current += dt * rateRef.current / 60;
      while (spawnRef.current >= 1) {
        spawnRef.current -= 1;
        spawnParticle();
      }

      // Nucleus visibility
      if (nucleusRef.current) nucleusRef.current.visible = showNucleus;
    });

    return () => {
      ptclsRef.current.forEach(p => { p.mesh.geometry.dispose(); p.trailLine.geometry.dispose(); });
      ptclsRef.current = [];
    };
  }, [showNucleus], { height: 480, bg: 0x020408, cameraPos: [4, 7, 10], fov: 50 });

  const total = counts.reduce((a,b) => a+b, 0);

  return (
    <div>
      <div ref={mountRef as React.RefObject<HTMLDivElement>} className="w-full rounded-lg" style={{ height: 480, background: '#020408' }} />

      {/* Controls bar */}
      <div className="mt-4 flex flex-wrap gap-2 items-center">
        <button onClick={() => { setRunning(r => !r); }}
          className={`px-4 py-1.5 text-sm rounded-lg font-semibold border transition-colors ${running ? 'bg-orange-500/30 border-orange-500/60 text-orange-300' : 'bg-orange-500 border-orange-600 text-white hover:bg-orange-600'}`}>
          {running ? '⏸ Pause' : '▶ Start'}
        </button>
        <button onClick={() => setSlowmo(s => !s)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${slowmo ? 'bg-blue-500/25 border-blue-500/60 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
          🐌 Slow motion
        </button>
        <button onClick={reset} className="px-3 py-1.5 text-sm rounded-lg border bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 transition-colors">↺ Reset</button>
        <button onClick={() => setShowNucleus(n => !n)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${showNucleus ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
          ⚛ Nucleus
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">Rate:</span>
          <input type="range" min={60} max={600} step={60} value={rate} onChange={e => setRate(+e.target.value)} className="w-24 accent-orange-500" />
          <span className="text-xs font-mono text-white w-12">{rate}/s</span>
        </div>
      </div>

      {/* Detection counters */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CAT.map((label, i) => (
          <div key={label} className="rounded-lg border border-slate-700/60 bg-slate-800/60 p-3 text-center">
            <div className="text-xl font-bold font-mono" style={{ color: `#${CAT_COL[i].toString(16).padStart(6,'0')}` }}>{counts[i]}</div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
            <div className="text-xs text-slate-600 mt-0.5">{total ? ((counts[i]/total)*100).toFixed(1)+'%' : '—'}</div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-xs text-slate-600 italic">
        Drag to orbit · Scroll to zoom · Backscattering (&gt;90°) is rare — Rutherford&apos;s key observation
      </div>

      <LabReport
        labTitle="Rutherford Gold Foil Experiment"
        aim="To investigate the structure of the atom by observing the deflection of alpha particles fired at a thin gold foil, reproducing Geiger & Marsden (1909)."
        theory={`Alpha particles (charge +2e, 5.5 MeV from Am-241) are fired at a 400 nm gold foil (Z=79).\n\nRutherford scattering formula: θ = 2·arctan(a/2b)\nwhere: a = k·Z₁·Z₂·e²/T ≈ 41.3 fm (closest-approach distance, head-on)\nb = impact parameter (perpendicular distance from nucleus)\n\nResults:\n• Most particles pass straight through → atom is mostly empty space\n• Small fraction deflected → nuclear charge concentrated in a tiny region\n• Very few backscattered → nucleus is very small (<10 fm)\n\nThis disproved Thomson's "plum pudding" model and established the nuclear model.`}
        apparatus={['Virtual Am-241 alpha source (5.5 MeV)', 'Gold foil (400 nm, Z=79)', 'ZnS circular detection screen', '3D OrbitControls camera']}
        variables={[{ name: 'Varied', desc: 'Impact parameter b (uniform area distribution)' }, { name: 'Observed', desc: 'Scattering angle θ — categorised into 4 classes' }]}
        observations={[
          { label: 'Total particles detected', value: total },
          { label: 'Straight through (<1°)', value: counts[0], unit: `(${total ? ((counts[0]/total)*100).toFixed(1) : '—'}%)` },
          { label: 'Slight deflect (1–10°)', value: counts[1] },
          { label: 'Strong deflect (10–90°)', value: counts[2] },
          { label: 'Backscattered (>90°)', value: counts[3] },
        ]}
        conclusion={`${counts[0]} of ${total} particles (${total ? ((counts[0]/total)*100).toFixed(1) : '—'}%) passed straight through, confirming that the atom is mostly empty space. The ${counts[3]} backscattered particles confirm a small, dense, positively charged nucleus. This matches Rutherford's original result of approximately 1 in 8000 backscattered, disproving the Thomson plum-pudding model.`}
      />
    </div>
  );
}
