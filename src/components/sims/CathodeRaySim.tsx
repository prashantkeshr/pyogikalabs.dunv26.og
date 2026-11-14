import React, { useState, useRef } from 'react';
import * as THREE from 'three';
import { useThreeScene } from '@/hooks/useThreeScene';
import LabReport from '@/components/LabReport';

type EField = 'off'|'low'|'medium'|'high';
type BField = 'off'|'low'|'medium'|'high';

const EFIELD_STRENGTH: Record<EField,number> = { off:0, low:0.3, medium:0.7, high:1.3 };
const BFIELD_STRENGTH: Record<BField,number> = { off:0, low:0.3, medium:0.7, high:1.3 };

const STEPS = [
  { title:'Switch the power on',  body:'Turn on the EHT supply while the tube is still full of air. The beam cannot form yet — electrons collide with air molecules within millimetres.' },
  { title:'Pump out the air',      body:'Reduce pressure to <0.1 mbar. Electrons now travel the full length without collisions. The screen glows where the beam lands.' },
  { title:'See the beam',          body:'The undeflected beam hits the centre of the screen. This confirms cathode rays travel in straight lines.' },
  { title:'Apply an electric field', body:'Switch on the deflecting plates. The beam bends toward the positive plate — proving cathode rays carry negative charge.' },
  { title:'Apply a magnetic field', body:'Switch off E, switch on B. The beam bends perpendicular to the field — confirming particles with charge and mass (not EM waves).' },
  { title:'Balance both fields',   body:'Apply both E and B adjusted so the beam goes straight. At balance: qE = qvB, so v = E/B. This measures the beam speed.' },
  { title:'Measure e/m',           body:'With v known, switch off B and measure deflection d. Then: e/m = 2dV/B²L² ≈ 1.76×10¹¹ C/kg. This identifies them as electrons.' },
];

export default function CathodeRaySim(): React.ReactElement {
  const [step,     setStep]     = useState(0);
  const [powered,  setPowered]  = useState(false);
  const [vacuum,   setVacuum]   = useState(false);
  const [eField,   setEField]   = useState<EField>('off');
  const [bField,   setBField]   = useState<BField>('off');

  const powRef = useRef(false);
  const vacRef = useRef(false);
  const eRef   = useRef<EField>('off');
  const bRef   = useRef<BField>('off');

  powRef.current = powered;
  vacRef.current = vacuum;
  eRef.current   = eField;
  bRef.current   = bField;

  const beamRef      = useRef<THREE.Mesh|null>(null);
  const electronRef  = useRef<THREE.Points|null>(null);
  const plateTopRef  = useRef<THREE.Mesh|null>(null);
  const plateBotRef  = useRef<THREE.Mesh|null>(null);
  const coilsRef     = useRef<THREE.Mesh[]>([]);
  const screenGlowRef= useRef<THREE.Mesh|null>(null);

  const mountRef = useThreeScene(({ scene, onFrame }) => {
    // ── Tube assembly ──────────────────────────────────────────────────
    // Glass tube
    const tubeGeo = new THREE.CylinderGeometry(0.65, 0.65, 8, 48, 1, true);
    tubeGeo.rotateZ(Math.PI/2);
    scene.add(new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ color:0x88aacc, transparent:true, opacity:0.15, side:THREE.DoubleSide, roughness:0 })));

    // End caps
    [-4, 4].forEach((x,i) => {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 12, 0, Math.PI*2, 0, Math.PI/2),
        new THREE.MeshStandardMaterial({ color:0x667788, transparent:true, opacity:0.2, roughness:0 }));
      cap.rotation.z = i===0 ? Math.PI/2 : -Math.PI/2; cap.position.x = x;
      scene.add(cap);
    });

    // Bench / mount
    const bench = new THREE.Mesh(new THREE.BoxGeometry(10, 0.15, 2.5),
      new THREE.MeshStandardMaterial({ color:0x1a1a2e, roughness:0.9 }));
    bench.position.y = -1.1;
    scene.add(bench);

    // Cathode (negative electrode)
    const cathode = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.15, 24),
      new THREE.MeshStandardMaterial({ color:0x889999, metalness:0.8 }));
    cathode.rotation.z = Math.PI/2; cathode.position.x = -3.5;
    scene.add(cathode);

    // Anode (positive, with hole)
    const anode = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 24),
      new THREE.MeshStandardMaterial({ color:0xaabbaa, metalness:0.8 }));
    anode.rotation.z = Math.PI/2; anode.position.x = -2.5;
    scene.add(anode);

    // Deflecting plates
    const plateMat = new THREE.MeshStandardMaterial({ color:0x667788, metalness:0.7 });
    const pGeo = new THREE.BoxGeometry(1.8, 0.04, 1.0);
    const pTop = new THREE.Mesh(pGeo, plateMat); pTop.position.set(0, 0.5, 0); scene.add(pTop); plateTopRef.current = pTop;
    const pBot = new THREE.Mesh(pGeo, plateMat); pBot.position.set(0, -0.5, 0); scene.add(pBot); plateBotRef.current = pBot;

    // Magnetic coils (rings around tube)
    const coilMat = new THREE.MeshStandardMaterial({ color:0xaa7733, metalness:0.6 });
    [-0.6, 0, 0.6].forEach(x => {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.07, 10, 36), coilMat);
      coil.rotation.y = Math.PI/2; coil.position.x = x; scene.add(coil); coilsRef.current.push(coil);
    });

    // Screen
    const screenMat = new THREE.MeshStandardMaterial({ color:0x002200, roughness:1 });
    const screen = new THREE.Mesh(new THREE.CylinderGeometry(0.63, 0.63, 0.06, 32), screenMat);
    screen.rotation.z = Math.PI/2; screen.position.x = 3.8; scene.add(screen);

    // Screen glow dot
    const glowMat = new THREE.MeshBasicMaterial({ color:0x44ff44, transparent:true, opacity:0 });
    const glowMesh = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), glowMat);
    glowMesh.rotation.y = -Math.PI/2; glowMesh.position.x = 3.76; scene.add(glowMesh); screenGlowRef.current = glowMesh;

    // Beam (line from anode to screen)
    const beamGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 8);
    beamGeo.rotateZ(Math.PI/2);
    const beamMat = new THREE.MeshBasicMaterial({ color:0x44ffaa, transparent:true, opacity:0 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    scene.add(beam); beamRef.current = beam;

    // Electron stream (animated points)
    const eN = 60;
    const ePos = new Float32Array(eN * 3);
    for (let i=0;i<eN;i++) { ePos[i*3]=-2.5+i*6/eN; ePos[i*3+1]=0; ePos[i*3+2]=0; }
    const eGeo = new THREE.BufferGeometry(); eGeo.setAttribute('position', new THREE.BufferAttribute(ePos,3));
    const eMesh = new THREE.Points(eGeo, new THREE.PointsMaterial({ color:0x44ffaa, size:0.1, transparent:true, opacity:0 }));
    scene.add(eMesh); electronRef.current = eMesh;

    // EHT wires (decorative)
    const wireMat = new THREE.LineBasicMaterial({ color:0xaa3333 });
    const wireGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3.5,-0.65,0), new THREE.Vector3(-3.5,-1.4,0), new THREE.Vector3(-2.5,-1.4,0), new THREE.Vector3(-2.5,-0.65,0)]);
    scene.add(new THREE.Line(wireGeo, wireMat));

    onFrame((time) => {
      const on = powRef.current && vacRef.current;
      const E = EFIELD_STRENGTH[eRef.current];
      const B = BFIELD_STRENGTH[bRef.current];

      // Beam visibility
      const beamM = beamRef.current?.material as THREE.MeshBasicMaterial;
      const eM    = electronRef.current?.material as THREE.PointsMaterial;
      if (beamM) beamM.opacity = on ? 0.55 : 0;
      if (eM)    eM.opacity   = on ? 0.9 : 0;

      if (on && electronRef.current) {
        const posA = electronRef.current.geometry.attributes.position as THREE.BufferAttribute;
        // Net deflection: E field pushes up, B field pushes down (at given beam speed)
        const netDeflect = E - B;
        for (let i=0;i<eN;i++) {
          const x = -2.5 + ((i/eN + time*0.4) % 1) * 6;
          const frac = (x+2.5)/6; // 0=anode, 1=screen
          // Parabolic deflection in E-field zone (x in [-0.9, 0.9])
          let y = 0;
          if (x > -0.9 && x < 0.9) {
            const t2 = (x+0.9)/1.8;
            y = netDeflect * 0.35 * t2*t2;
          } else if (x >= 0.9) {
            // After plates: linear extension
            const atPlateExit = netDeflect * 0.35;
            const extraX = x - 0.9;
            y = atPlateExit + netDeflect * 0.25 * extraX / 2.9;
          }
          posA.array[i*3] = x; posA.array[i*3+1] = y; posA.array[i*3+2] = 0;
        }
        posA.needsUpdate = true;

        // Move beam mesh
        const totalDeflect = netDeflect * 0.4;
        if (beamRef.current) {
          beamRef.current.position.set(0.65, totalDeflect * 0.5, 0);
          beamRef.current.rotation.z = -Math.atan(totalDeflect * 0.1) * 0.5;
          const sc = Math.sqrt(1 + totalDeflect * totalDeflect * 0.01);
          beamRef.current.scale.set(sc, 1, 1);
        }

        // Screen glow position
        if (screenGlowRef.current) {
          screenGlowRef.current.position.y = netDeflect * 0.35;
          (screenGlowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.9;
        }
      } else if (screenGlowRef.current) {
        (screenGlowRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
      }

      // Plate color: glow when E field on
      if (plateTopRef.current && plateBotRef.current) {
        const ec = E > 0 ? 0xff4444 : 0x667788;
        const ec2 = E > 0 ? 0x4444ff : 0x667788;
        (plateTopRef.current.material as THREE.MeshStandardMaterial).color.setHex(ec);
        (plateBotRef.current.material as THREE.MeshStandardMaterial).color.setHex(ec2);
      }

      // Coil glow when B field on
      coilsRef.current.forEach(c => {
        (c.material as THREE.MeshStandardMaterial).emissive.setHex(B>0 ? 0x884400 : 0x000000);
        (c.material as THREE.MeshStandardMaterial).emissiveIntensity = B * 0.8;
      });
    });
  }, [powered, vacuum, eField, bField], { height: 460, bg: 0x020309, cameraPos: [0, 3, 10], fov: 48 });

  const canStart = step === 0;
  const canVacuum = step === 1 && powered;
  const canBeam = step >= 2;
  const beamOn = powered && vacuum;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 min-w-0">
        <div ref={mountRef as React.RefObject<HTMLDivElement>} className="w-full rounded-lg" style={{ height:460, background:'#020309' }} />

        {/* Observations strip */}
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-xs">
          {[['Power', powered?'ON':'Off'], ['Vacuum', vacuum?'<0.1 mbar':'1013 mbar'], ['E field', eField], ['B field', bField], ['Beam', beamOn?'Visible':'No beam'], ['Deflection', beamOn ? (EFIELD_STRENGTH[eField]-BFIELD_STRENGTH[bField]>0?'Up':EFIELD_STRENGTH[eField]-BFIELD_STRENGTH[bField]<0?'Down':'None') : '—']].map(([k,v])=>(
            <div key={k} className="bg-slate-800/60 border border-slate-700/50 rounded px-2 py-1.5 text-center">
              <div className="text-slate-500">{k}</div>
              <div className="text-white font-mono font-semibold mt-0.5">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Step panel */}
      <div className="lg:w-72 flex flex-col gap-3">
        {/* Step indicator */}
        <div className="flex gap-1 flex-wrap">
          {STEPS.map((_,i)=>(
            <button key={i} onClick={()=>setStep(i)}
              className={`w-7 h-7 rounded text-xs font-bold transition-colors ${i===step?'bg-orange-500 text-white':i<step?'bg-slate-700 text-slate-300':'bg-slate-800 text-slate-600'}`}>{i+1}</button>
          ))}
        </div>

        {/* Current step */}
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-4">
          <div className="text-xs text-orange-400 font-semibold uppercase tracking-wider mb-1">Step {step+1} of {STEPS.length}</div>
          <div className="text-sm font-bold text-white mb-2">{STEPS[step].title}</div>
          <p className="text-xs text-slate-400 leading-relaxed">{STEPS[step].body}</p>
        </div>

        {/* Controls */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-3 space-y-2.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Controls</div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">EHT Power</span>
            <button onClick={()=>{ setPowered(p=>!p); if(!powered) setStep(s=>Math.max(s,1)); }}
              className={`px-3 py-1 text-xs rounded font-semibold transition-colors ${powered?'bg-orange-500/30 border border-orange-500/50 text-orange-300':'bg-orange-500 text-white'}`}>
              {powered?'Switch Off':'Switch ON'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Vacuum pump</span>
            <button onClick={()=>{ if(!powered) return; setVacuum(v=>!v); if(!vacuum) setStep(s=>Math.max(s,2)); }}
              className={`px-3 py-1 text-xs rounded font-semibold transition-colors ${!powered?'opacity-30 cursor-not-allowed bg-slate-700 text-slate-500':vacuum?'bg-blue-500/30 border border-blue-500/50 text-blue-300':'bg-slate-700 border border-slate-600 text-slate-300 hover:border-slate-500'}`}>
              {vacuum?'Air: vacuum':'Pump down'}
            </button>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1.5">Electric field (plates)</div>
            <div className="flex gap-1">
              {(['off','low','medium','high'] as EField[]).map(v=>(
                <button key={v} onClick={()=>{ if(!beamOn) return; setEField(v); if(v!=='off') setStep(s=>Math.max(s,3)); }}
                  className={`flex-1 py-1 text-xs rounded capitalize transition-colors ${!beamOn?'opacity-30 cursor-not-allowed':eField===v?'bg-orange-500/30 border border-orange-500/50 text-orange-300':'bg-slate-700 border border-slate-700 text-slate-400 hover:border-slate-500'}`}>{v}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1.5">Magnetic field (coils)</div>
            <div className="flex gap-1">
              {(['off','low','medium','high'] as BField[]).map(v=>(
                <button key={v} onClick={()=>{ if(!beamOn) return; setBField(v); if(v!=='off') setStep(s=>Math.max(s,4)); }}
                  className={`flex-1 py-1 text-xs rounded capitalize transition-colors ${!beamOn?'opacity-30 cursor-not-allowed':bField===v?'bg-blue-500/30 border border-blue-500/50 text-blue-300':'bg-slate-700 border border-slate-700 text-slate-400 hover:border-slate-500'}`}>{v}</button>
              ))}
            </div>
          </div>

          {eField!=='off' && bField!=='off' && EFIELD_STRENGTH[eField]===BFIELD_STRENGTH[bField] && (
            <div className="text-xs text-green-400 border border-green-500/40 bg-green-500/10 rounded px-2 py-1.5">
              ✓ Fields balanced — beam undeflected. Speed = E/B
            </div>
          )}
        </div>

        <button onClick={()=>setStep(s=>Math.min(s+1,STEPS.length-1))} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors">
          Next step →
        </button>
      </div>

      <LabReport
        labTitle="Cathode Ray Experiment (Thomson, 1897)"
        aim="To investigate the properties of cathode rays, demonstrate they are negatively charged particles, and measure the charge-to-mass ratio e/m."
        theory={`J.J. Thomson's 1897 experiment established the existence of the electron.\n\nKey steps:\n1. EHT accelerates electrons from cathode through the anode hole\n2. Vacuum needed — electrons scatter off air molecules in <1 mm at atmospheric pressure\n3. Undeflected beam → travels in straight lines\n4. E-field deflection → beam bends toward + plate → cathode rays carry negative charge\n5. B-field deflection → perpendicular bending → particles have mass\n6. Balance both: qE = qvB → v = E/B (beam speed)\n7. With v: qE = mv²/r → e/m = v/(Br) ≈ 1.76×10¹¹ C/kg\n\nThis value is 1836× greater than the proton's q/m, confirming electrons are sub-atomic.`}
        apparatus={['Virtual CRT with EHT supply','Evacuated glass tube','Deflecting plates (E field)','Helmholtz coils (B field)','Phosphorescent ZnS screen']}
        variables={[{name:'Varied',desc:'Vacuum level, accelerating voltage, E-field, B-field strength'},{name:'Measured',desc:'Beam deflection angle on screen'}]}
        observations={[
          { label: 'Power', value: powered?'ON':'Off' },
          { label: 'Vacuum', value: vacuum?'High vacuum (<0.1 mbar)':'Atmospheric' },
          { label: 'E field', value: eField },
          { label: 'B field', value: bField },
          { label: 'Steps completed', value: step+1, unit: `of ${STEPS.length}` },
        ]}
        conclusion={`At step ${step+1}: ${STEPS[step].body} The experiment proves cathode rays are particles (electrons) with e/m ≈ 1.76×10¹¹ C/kg, identifying them as a universal constituent of matter.`}
      />
    </div>
  );
}
