import React, { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { useThreeScene } from '@/hooks/useThreeScene';
import LabReport from '@/components/LabReport';

type Colormap = 'viridis'|'plasma'|'heat'|'cool';

const PRESETS = [
  { label: 'Wave',      expr: 'sin(x)*cos(y)' },
  { label: 'Saddle',    expr: 'x*x - y*y' },
  { label: 'Gaussian',  expr: 'exp(-(x*x+y*y))' },
  { label: 'Ripple',    expr: 'sin(sqrt(x*x+y*y)+t)/(sqrt(x*x+y*y)+1)', anim: true },
  { label: 'Himmelblau',expr: '((x*x+y-11)*(x*x+y-11)+(x+y*y-7)*(x+y*y-7))*0.01' },
  { label: 'Crumpled',  expr: 'sin(x*3)/3+cos(y*2)' },
];

type ColorFn = (t: number) => THREE.Color;
const COLORMAPS: Record<Colormap, ColorFn> = {
  viridis: t => { const stops=[[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]]; const i=Math.min(t*(stops.length-1),stops.length-1.001); const a=stops[Math.floor(i)],b=stops[Math.ceil(i)],f=i-Math.floor(i); return new THREE.Color((a[0]+f*(b[0]-a[0]))/255,(a[1]+f*(b[1]-a[1]))/255,(a[2]+f*(b[2]-a[2]))/255); },
  plasma:  t => { const stops=[[13,8,135],[126,3,168],[204,71,120],[248,149,64],[240,249,33]]; const i=Math.min(t*(stops.length-1),stops.length-1.001); const a=stops[Math.floor(i)],b=stops[Math.ceil(i)],f=i-Math.floor(i); return new THREE.Color((a[0]+f*(b[0]-a[0]))/255,(a[1]+f*(b[1]-a[1]))/255,(a[2]+f*(b[2]-a[2]))/255); },
  heat:    t => new THREE.Color(t, t < 0.5 ? 0 : (t-0.5)*2, 0),
  cool:    t => new THREE.Color(t, 1-t, 1),
};

function buildFn(expr: string): (x: number, y: number, t: number) => number {
  const safe = expr
    .replace(/\bsin\b/g,'Math.sin').replace(/\bcos\b/g,'Math.cos').replace(/\btan\b/g,'Math.tan')
    .replace(/\bsqrt\b/g,'Math.sqrt').replace(/\babs\b/g,'Math.abs').replace(/\bexp\b/g,'Math.exp')
    .replace(/\blog\b/g,'Math.log').replace(/\bpow\b/g,'Math.pow').replace(/\bPI\b/g,'Math.PI');
  if (/window|document|fetch|import|require|eval|Function/.test(safe)) return () => 0;
  try {
    // eslint-disable-next-line no-new-func
    return new Function('x','y','t',`"use strict";try{return +(${safe})||0}catch{return 0}`) as (x:number,y:number,t:number)=>number;
  } catch { return () => 0; }
}

function buildMesh(fn: (x:number,y:number,t:number)=>number, range: number, res: number, cmap: Colormap, t=0) {
  const step = (2*range)/res;
  const verts: number[] = [], cols: number[] = [], idxs: number[] = [];
  const zVals: number[] = [];

  for (let j = 0; j <= res; j++) {
    for (let i = 0; i <= res; i++) {
      const x = -range + i*step, y = -range + j*step;
      const z = fn(x, y, t);
      verts.push(x, z, y); // Three.js: Y up, so swap y↔z
      zVals.push(isFinite(z) ? z : 0);
    }
  }

  const minZ = Math.min(...zVals), maxZ = Math.max(...zVals);
  const rangeZ = maxZ - minZ || 1;
  const colorFn = COLORMAPS[cmap];

  for (let v = 0; v < verts.length/3; v++) {
    const c = colorFn((zVals[v] - minZ) / rangeZ);
    cols.push(c.r, c.g, c.b);
  }

  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const a = j*(res+1)+i, b = a+1, c = a+(res+1), d = c+1;
      idxs.push(a,b,c, b,d,c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(cols,  3));
  geo.setIndex(idxs);
  geo.computeVertexNormals();
  return { geo, minZ, maxZ };
}

export default function SurfacePlotterSim(): React.ReactElement {
  const [expr,     setExpr]      = useState('sin(x)*cos(y)');
  const [input,    setInput]     = useState('sin(x)*cos(y)');
  const [rangeVal, setRangeVal]  = useState(3);
  const [res,      setRes]       = useState(50);
  const [cmap,     setCmap]      = useState<Colormap>('viridis');
  const [wireframe,setWireframe] = useState(false);
  const [animating,setAnimating] = useState(false);
  const [zStats,   setZStats]    = useState({ min: 0, max: 0 });

  const fnRef      = useRef(buildFn(expr));
  const animRef    = useRef(false);
  const meshRef    = useRef<THREE.Mesh | null>(null);
  const wireRef    = useRef<THREE.Mesh | null>(null);

  const apply = useCallback(() => { fnRef.current = buildFn(input); setExpr(input); }, [input]);

  const mountRef = useThreeScene(
    ({ scene, onFrame }) => {
      fnRef.current = buildFn(expr);
      const { geo, minZ, maxZ } = buildMesh(fnRef.current, rangeVal, res, cmap);
      setZStats({ min: +minZ.toFixed(3), max: +maxZ.toFixed(3) });

      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      scene.add(mesh);
      meshRef.current = mesh;

      const wireMat = new THREE.MeshBasicMaterial({ color: 0x334455, wireframe: true, transparent: true, opacity: 0.18 });
      const wire = new THREE.Mesh(geo.clone(), wireMat);
      wire.visible = wireframe;
      scene.add(wire);
      wireRef.current = wire;

      scene.add(new THREE.GridHelper(rangeVal*2, 10, 0x1a3a4a, 0x112233));

      onFrame((t) => {
        if (!animRef.current) return;
        const fn = fnRef.current;
        const { geo: newGeo, minZ: mn, maxZ: mx } = buildMesh(fn, rangeVal, res, cmap, t);
        const posAttr = mesh.geometry.attributes.position as THREE.BufferAttribute;
        const colAttr = mesh.geometry.attributes.color    as THREE.BufferAttribute;
        const newPos  = newGeo.attributes.position as THREE.BufferAttribute;
        const newCol  = newGeo.attributes.color    as THREE.BufferAttribute;
        posAttr.array.set(newPos.array);
        colAttr.array.set(newCol.array);
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
        newGeo.dispose();
        setZStats({ min: +mn.toFixed(3), max: +mx.toFixed(3) });
      });

      return () => { geo.dispose(); mat.dispose(); wireMat.dispose(); meshRef.current = null; };
    },
    [expr, rangeVal, res, cmap],
    { height: 460, bg: 0x070b18, cameraPos: [rangeVal*1.5, rangeVal, rangeVal*1.5], fov: 55, shadows: true },
  );

  // Sync wireframe visibility without full rebuild
  if (wireRef.current) wireRef.current.visible = wireframe;
  animRef.current = animating;

  const CMAPS: Colormap[] = ['viridis','plasma','heat','cool'];

  return (
    <div>
      <div ref={mountRef as React.RefObject<HTMLDivElement>} className="w-full rounded-lg" style={{ height: 460, background: '#070b18' }} />

      {/* Presets */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => { setInput(p.expr); fnRef.current = buildFn(p.expr); setExpr(p.expr); if (!p.anim) setAnimating(false); }}
            className={`px-2.5 py-1 text-xs rounded border transition-colors ${expr === p.expr ? 'bg-orange-500/25 border-orange-500/60 text-orange-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Expression input */}
      <div className="mt-3 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && apply()}
          className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/60"
          placeholder="z = f(x, y, t) — e.g. sin(x)*cos(y)" />
        <button onClick={apply} className="px-3 py-1.5 text-sm rounded bg-orange-500/20 border border-orange-500/40 text-orange-300 hover:bg-orange-500/30 transition-colors">Plot</button>
      </div>

      {/* Sliders + toggles */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Range: <span className="font-mono text-white">±{rangeVal}</span></label>
          <input type="range" min={1} max={6} step={0.5} value={rangeVal} onChange={e => setRangeVal(+e.target.value)} className="w-full accent-orange-500" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Quality (resolution): <span className="font-mono text-white">{res}×{res}</span></label>
          <input type="range" min={20} max={80} step={5} value={res} onChange={e => setRes(+e.target.value)} className="w-full accent-blue-500" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {CMAPS.map(c => (
          <button key={c} onClick={() => setCmap(c)}
            className={`px-2.5 py-1 text-xs rounded border capitalize transition-colors ${cmap === c ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-semibold' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>{c}</button>
        ))}
        <button onClick={() => setWireframe(w => !w)}
          className={`px-2.5 py-1 text-xs rounded border transition-colors ${wireframe ? 'bg-slate-600/40 border-slate-500/50 text-slate-200' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>Wireframe</button>
        <button onClick={() => setAnimating(a => !a)}
          className={`px-2.5 py-1 text-xs rounded border transition-colors ${animating ? 'bg-violet-500/20 border-violet-500/50 text-violet-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
          {animating ? '⏸' : '▶'} Animate t
        </button>
      </div>

      <div className="mt-2 flex gap-4 text-xs text-slate-500 font-mono">
        <span>z min: <span className="text-slate-300">{zStats.min}</span></span>
        <span>z max: <span className="text-slate-300">{zStats.max}</span></span>
      </div>

      <LabReport
        labTitle="3D Function Surface Plotter"
        aim={`To plot and explore the surface z = ${expr} in 3D and identify its shape, critical points, and symmetry properties.`}
        theory={`A 3D surface z = f(x, y) assigns a height value to each point in the xy-plane. Key features:\n\n• Critical points: where ∂f/∂x = 0 and ∂f/∂y = 0\n  - Local minima: bowl-shaped (second derivative test positive definite)\n  - Local maxima: dome-shaped\n  - Saddle points: f curves up in one direction, down in the other\n• Contours (level curves): f(x,y) = c, the shape of the colourmap bands\n• The colour gradient follows the chosen colormap from minimum (cool) to maximum (warm) z.`}
        apparatus={['Virtual function plotter', 'Parametric mesh renderer', '3D OrbitControls camera']}
        variables={[{ name: 'Expression', desc: expr }, { name: 'Domain', desc: `[-${rangeVal}, +${rangeVal}] × [-${rangeVal}, +${rangeVal}]` }]}
        observations={[
          { label: 'Function', value: `z = ${expr}` },
          { label: 'Domain', value: `x,y ∈ [−${rangeVal}, ${rangeVal}]` },
          { label: 'Minimum z', value: zStats.min },
          { label: 'Maximum z', value: zStats.max },
          { label: 'Range (max−min)', value: (zStats.max - zStats.min).toFixed(3) },
          { label: 'Grid resolution', value: `${res}×${res}` },
        ]}
        conclusion={`The function z = ${expr} over [−${rangeVal}, ${rangeVal}]² reaches a maximum of ${zStats.max} and a minimum of ${zStats.min} (range ${(zStats.max-zStats.min).toFixed(3)}). The 3D visualisation reveals the characteristic shape of this mathematical surface.`}
      />
    </div>
  );
}
