import React, { useState, useRef } from 'react';
import * as THREE from 'three';
import { useThreeScene } from '@/hooks/useThreeScene';
import LabReport from '@/components/LabReport';

interface Fraction {
  id: number; name: string; range: string; carbons: string;
  use: string; color: number; height: number; temp: number;
}
const FRACTIONS: Fraction[] = [
  { id:1, name:'Refinery gas',     range:'< 20 °C',    carbons:'C₁–C₄',   use:'Bottled gas, heating',         color:0x88ddff, height:0.92, temp:20  },
  { id:2, name:'Petrol',           range:'20–70 °C',   carbons:'C₅–C₁₀',  use:'Fuel for cars',                color:0x99ccff, height:0.76, temp:45  },
  { id:3, name:'Naphtha',          range:'70–120 °C',  carbons:'C₈–C₁₂',  use:'Feedstock for chemicals',      color:0xaabbee, height:0.63, temp:95  },
  { id:4, name:'Kerosene',         range:'120–200 °C', carbons:'C₁₀–C₁₆', use:'Aviation fuel',                color:0xeedd88, height:0.50, temp:160 },
  { id:5, name:'Diesel (gas oil)', range:'200–300 °C', carbons:'C₁₄–C₂₀', use:'Lorries, diesel engines',      color:0xddbb66, height:0.37, temp:250 },
  { id:6, name:'Fuel oil',         range:'300–350 °C', carbons:'C₂₀–C₃₀', use:'Ships, power stations',        color:0xcc9944, height:0.26, temp:325 },
  { id:7, name:'Lubricating oil',  range:'350–400 °C', carbons:'C₃₀–C₄₀', use:'Lubricants, waxes',            color:0xaa7733, height:0.16, temp:375 },
  { id:8, name:'Bitumen',          range:'> 400 °C',   carbons:'C₄₀+',    use:'Road surfacing, roofing',      color:0x442211, height:0.05, temp:420 },
];
const COLUMN_H = 9;

function tempColor(t01: number): THREE.Color {
  return new THREE.Color().setHSL(0.67 * t01, 0.9, 0.5 + 0.15 * t01);
}

export default function FractionalDistillationSim(): React.ReactElement {
  const [selected, setSelected] = useState<Fraction|null>(null);
  const [running,  setRunning]  = useState(true);
  const [hovered,  setHovered]  = useState<number|null>(null);

  const runRef     = useRef(true);
  const selRef     = useRef<Fraction|null>(null);
  const hovRef     = useRef<number|null>(null);
  const labelSpheresRef = useRef<THREE.Mesh[]>([]);

  runRef.current  = running;
  selRef.current  = selected;
  hovRef.current  = hovered;

  const mountRef = useThreeScene(({ scene, camera, renderer, onFrame }) => {
    // Gradient column segments
    const SEG = 24;
    for (let i = 0; i < SEG; i++) {
      const t0 = i/SEG, t1 = (i+1)/SEG;
      const y0 = -0.3 + t0*COLUMN_H, y1 = -0.3 + t1*COLUMN_H;
      const col = tempColor(i/SEG);
      const geo = new THREE.CylinderGeometry(0.9, 0.9, (y1-y0)*1.01, 32);
      const mat = new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.20, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = (y0+y1)/2;
      scene.add(mesh);
    }
    // Glass shell
    const shellGeo = new THREE.CylinderGeometry(0.95, 0.95, COLUMN_H, 48, 1, true);
    scene.add(new THREE.Mesh(shellGeo, new THREE.MeshStandardMaterial({ color:0x88aacc, transparent:true, opacity:0.15, side:THREE.DoubleSide, roughness:0 })));

    // Furnace
    const furnace = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 1.2, 32),
      new THREE.MeshStandardMaterial({ color:0x442211, roughness:0.9 }));
    furnace.position.y = -COLUMN_H/2 - 0.9;
    scene.add(furnace);
    const glow = new THREE.PointLight(0xff4400, 3, 6); glow.position.y = -COLUMN_H/2 - 0.3; scene.add(glow);

    // Fraction pipes + spheres
    const flaskMeshes: THREE.Mesh[] = [];
    const labelSpheres: THREE.Mesh[] = [];
    FRACTIONS.forEach((f, i) => {
      const y = f.height * COLUMN_H - COLUMN_H/2;
      const pGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.6, 12); pGeo.rotateZ(Math.PI/2);
      scene.add(Object.assign(new THREE.Mesh(pGeo, new THREE.MeshStandardMaterial({ color:0x445566, metalness:0.6 })), { position: new THREE.Vector3(1.6, y, 0) }));
      const fMat = new THREE.MeshStandardMaterial({ color:f.color, transparent:true, opacity:0.75, roughness:0.2 });
      const flask = new THREE.Mesh(new THREE.SphereGeometry(0.22,16,16), fMat);
      flask.position.set(2.65, y, 0); scene.add(flask); flaskMeshes.push(flask);
      const sMat = new THREE.MeshStandardMaterial({ color:f.color, emissive:f.color, emissiveIntensity:0.3, transparent:true, opacity:0.85 });
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.3,16,16), sMat);
      sp.position.set(2.65, y, 0); sp.userData.fi = i; scene.add(sp); labelSpheres.push(sp);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12,0.02,8,32),
        new THREE.MeshStandardMaterial({ color:f.color, emissive:f.color, emissiveIntensity:0.6 }));
      ring.position.set(0.95, y, 0); scene.add(ring);
    });
    labelSpheresRef.current = labelSpheres;

    // Vapor particles
    const N = 150;
    const pos = new Float32Array(N*3), col = new Float32Array(N*3);
    const vels = new Float32Array(N), phases = new Float32Array(N);
    for (let i=0;i<N;i++) {
      pos[i*3]  =(Math.random()-0.5)*1.5; pos[i*3+1]=-COLUMN_H/2+Math.random()*COLUMN_H; pos[i*3+2]=(Math.random()-0.5)*1.5;
      const c=tempColor(1-(pos[i*3+1]+COLUMN_H/2)/COLUMN_H); col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;
      vels[i]=0.4+Math.random()*1.1; phases[i]=Math.random()*Math.PI*2;
    }
    const vGeo=new THREE.BufferGeometry(); vGeo.setAttribute('position',new THREE.BufferAttribute(pos,3)); vGeo.setAttribute('color',new THREE.BufferAttribute(col,3));
    scene.add(new THREE.Points(vGeo, new THREE.PointsMaterial({ vertexColors:true, size:0.08, sizeAttenuation:true, transparent:true, opacity:0.65 })));

    // Click
    const rc = new THREE.Raycaster();
    const onClick = (e:MouseEvent) => {
      const rect=renderer.domElement.getBoundingClientRect();
      rc.setFromCamera(new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1),camera);
      const hits=rc.intersectObjects(labelSpheres);
      if (hits.length) { const f=FRACTIONS[hits[0].object.userData.fi]; setSelected(s=>s===f?null:f); }
    };
    renderer.domElement.addEventListener('click', onClick);

    onFrame((time, dt) => {
      glow.intensity = runRef.current ? 2.5+Math.sin(time*3)*0.5 : 0;
      if (!runRef.current) return;
      const posA=vGeo.attributes.position as THREE.BufferAttribute, colA=vGeo.attributes.color as THREE.BufferAttribute;
      for (let i=0;i<N;i++) {
        posA.array[i*3+1]+=dt*vels[i];
        posA.array[i*3]+=dt*Math.sin(time*0.8+phases[i])*0.08;
        posA.array[i*3+2]+=dt*Math.cos(time*0.7+phases[i])*0.08;
        if (posA.array[i*3+1]>COLUMN_H/2) { posA.array[i*3]=(Math.random()-0.5)*1.4; posA.array[i*3+1]=-COLUMN_H/2+0.1; posA.array[i*3+2]=(Math.random()-0.5)*1.4; vels[i]=0.4+Math.random()*1.1; }
        const dx=posA.array[i*3],dz=posA.array[i*3+2]; const r=Math.sqrt(dx*dx+dz*dz); if(r>0.78){posA.array[i*3]*=0.7;posA.array[i*3+2]*=0.7;}
        const th=Math.max(0,Math.min(1,(posA.array[i*3+1]+COLUMN_H/2)/COLUMN_H)); const c=tempColor(th); colA.array[i*3]=c.r;colA.array[i*3+1]=c.g;colA.array[i*3+2]=c.b;
      }
      posA.needsUpdate=true; colA.needsUpdate=true;
      flaskMeshes.forEach((m,i)=>m.scale.setScalar(1+Math.sin(time*0.5+i*0.8)*0.06));
      labelSpheres.forEach((s,i)=>{
        const isSel=selRef.current===FRACTIONS[i],isHov=hovRef.current===i;
        (s.material as THREE.MeshStandardMaterial).emissiveIntensity=isSel?1.2:isHov?0.7:0.25;
      });
    });
    return () => { renderer.domElement.removeEventListener('click', onClick); vGeo.dispose(); };
  }, [], { height: 500, bg: 0x030507, cameraPos: [8, 1, 8], fov: 50 });

  return (
    <div className="flex flex-col xl:flex-row gap-4">
      <div className="flex-1 min-w-0">
        <div ref={mountRef as React.RefObject<HTMLDivElement>} className="w-full rounded-lg" style={{ height:500, background:'#030507' }} />
        <div className="mt-3 flex gap-2 flex-wrap">
          <button onClick={()=>setRunning(r=>!r)}
            className={`px-4 py-1.5 text-sm rounded-lg border font-semibold transition-colors ${running?'bg-orange-500/25 border-orange-500/50 text-orange-300':'bg-orange-500 border-orange-600 text-white'}`}>
            {running?'⏸ Pause furnace':'▶ Run furnace'}
          </button>
          <button onClick={()=>setSelected(null)} className="px-3 py-1.5 text-sm rounded-lg border bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500">Clear</button>
        </div>
        <p className="mt-2 text-xs text-slate-600 italic">Click a flask to inspect a fraction · Drag to rotate</p>
      </div>

      <div className="xl:w-72 flex flex-col gap-1.5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Fractions — hot bottom to cool top</div>
        {FRACTIONS.map((f,i)=>(
          <button key={f.id} onClick={()=>setSelected(s=>s===f?null:f)}
            onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}
            className={`text-left rounded-lg border px-3 py-2 transition-all ${selected===f?'border-orange-500/70 bg-orange-500/10':'border-slate-700/50 bg-slate-800/40 hover:border-slate-600'}`}>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex-shrink-0 text-xs font-bold flex items-center justify-center text-slate-900 flex-shrink-0"
                style={{background:`#${f.color.toString(16).padStart(6,'0')}`}}>{f.id}</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{f.name}</div>
                <div className="text-xs text-slate-400">{f.range} · {f.carbons}</div>
              </div>
            </div>
            {selected===f&&<div className="mt-1.5 text-xs text-slate-300 border-t border-slate-700/50 pt-1.5">
              <div><span className="text-slate-500">Use: </span>{f.use}</div>
            </div>}
          </button>
        ))}
      </div>

      <LabReport
        labTitle="Fractional Distillation of Crude Oil"
        aim="To separate crude oil into usable fractions using fractional distillation, based on boiling point differences of hydrocarbon mixtures."
        theory={`Crude oil is a complex mixture of hydrocarbons. It is heated to ~400°C and passes into a fractionating column where a temperature gradient exists: hot (400°C) at the bottom, cool (~20°C) at the top.\n\nSeparation principle:\n• Vapours rise up the column and cool down\n• Each fraction condenses at the temperature matching its boiling point\n• Shorter chains → weaker van der Waals forces → lower boiling point → collect higher\n\nThis is a continuous industrial process — crude enters, fractions exit constantly.`}
        apparatus={['Virtual fractionating column','Furnace heating crude oil to 400°C','8 fraction collection points']}
        variables={[{name:'Height in column',desc:'Determines temperature and fraction collected'},{name:'Chain length',desc:'Determines boiling point and fraction identity'}]}
        observations={FRACTIONS.map(f=>({label:f.name,value:f.range,unit:f.carbons}))}
        conclusion="The 8 fractions separated show a clear trend: chain length increases from top (C₁–C₄, refinery gas) to bottom (C₄₀+, bitumen), reflecting increasing van der Waals forces and boiling points. This confirms the relationship between molecular size and intermolecular forces."
      />
    </div>
  );
}
