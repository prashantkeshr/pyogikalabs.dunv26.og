import { Link } from 'react-router-dom';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { MOLECULES, type Molecule } from '@/data/molecules';

type Vec3 = [number, number, number];
function rotY(v: Vec3, a: number): Vec3 { const c=Math.cos(a),s=Math.sin(a); return [v[0]*c+v[2]*s,v[1],-v[0]*s+v[2]*c]; }
function rotX(v: Vec3, a: number): Vec3 { const c=Math.cos(a),s=Math.sin(a); return [v[0],v[1]*c-v[2]*s,v[1]*s+v[2]*c]; }
function proj(v: Vec3, fov: number): Vec3 { const pz=v[2]+5; return [(v[0]*fov)/pz,(v[1]*fov)/pz,v[2]]; }
function hexRgb(h: string) { const x=h.replace('#',''); return {r:parseInt(x.slice(0,2),16),g:parseInt(x.slice(2,4),16),b:parseInt(x.slice(4,6),16)}; }
function light(h: string, f: number) { const {r,g,b}=hexRgb(h); return `rgb(${Math.min(255,Math.round(r+(255-r)*f))},${Math.min(255,Math.round(g+(255-g)*f))},${Math.min(255,Math.round(b+(255-b)*f))})` }
function dark(h: string, f: number) { const {r,g,b}=hexRgb(h); return `rgb(${Math.round(r*(1-f))},${Math.round(g*(1-f))},${Math.round(b*(1-f))})` }

function MolViewer({ mol }: { mol: Molecule }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const ry = useRef(0.3), rx = useRef(-0.2);
  const drag = useRef<{x:number;y:number}|null>(null);
  const auto = useRef(true);
  const zoom = useRef(1.0);

  // Compute bounding radius so every molecule auto-fits the canvas
  const molExtent = (() => {
    let max = 0;
    for (const a of mol.atoms) {
      const r = Math.sqrt(a.position[0]**2 + a.position[1]**2 + a.position[2]**2);
      max = Math.max(max, r + a.radius * 0.52);
    }
    return max || 1;
  })();

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const resize = () => {
      const dpr = window.devicePixelRatio;
      const r = c.getBoundingClientRect();
      c.width = r.width * dpr;
      c.height = r.height * dpr;
      // canvas.width assignment resets context state — scale is fresh each time
      c.getContext('2d')?.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    // Wheel zoom
    const onWheel = (e: WheelEvent) => { e.preventDefault(); zoom.current = Math.max(0.25, Math.min(4, zoom.current * (1 - e.deltaY * 0.001))); };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => { ro.disconnect(); c.removeEventListener('wheel', onWheel); };
  }, []);

  useEffect(() => { ry.current=0.3; rx.current=-0.2; zoom.current=1.0; }, [mol]);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    let last = performance.now();
    const draw = (now: number) => {
      const dt=(now-last)/1000; last=now;
      if(auto.current && !drag.current) ry.current+=dt*0.5;
      const ctx=c.getContext('2d'); if(!ctx) return;
      const dpr=window.devicePixelRatio, W=c.width/dpr, H=c.height/dpr;
      ctx.clearRect(0,0,W,H);
      // Auto-scale: fill ~72% of canvas regardless of molecule size
      const sc = (Math.min(W,H) * 0.36 / molExtent) * zoom.current;
      const fov=5, cx=W/2, cy=H/2;
      const tf = mol.atoms.map(a => { let p:Vec3=[...a.position as Vec3]; p=rotY(p,ry.current); p=rotX(p,rx.current); const [sx,sy,sz]=proj(p,fov); return {...a,sx:cx+sx*sc,sy:cy-sy*sc,sz,r:a.radius*sc*0.52}; });
      // bonds
      for(const b of mol.bonds){
        const a1=tf[b.from],a2=tf[b.to];
        const dx=a2.sx-a1.sx,dy=a2.sy-a1.sy,dist=Math.sqrt(dx*dx+dy*dy);
        const nx=-dy/dist,ny=dx/dist;
        const offs=b.order===1?[0]:b.order===2?[-3,3]:[-5,0,5];
        for(const off of offs){ ctx.beginPath(); ctx.moveTo(a1.sx+nx*off,a1.sy+ny*off); ctx.lineTo(a2.sx+nx*off,a2.sy+ny*off); ctx.strokeStyle='rgba(180,190,210,0.5)'; ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.stroke(); }
      }
      // atoms sorted back→front
      [...tf].sort((a,b2)=>a.sz-b2.sz).forEach(a=>{
        const gr=ctx.createRadialGradient(a.sx-a.r*.32,a.sy-a.r*.32,a.r*.08,a.sx,a.sy,a.r);
        gr.addColorStop(0,light(a.color,.55)); gr.addColorStop(.4,a.color); gr.addColorStop(1,dark(a.color,.45));
        ctx.beginPath(); ctx.arc(a.sx,a.sy,a.r,0,Math.PI*2); ctx.fillStyle=gr; ctx.fill();
        ctx.strokeStyle=dark(a.color,.3); ctx.lineWidth=0.8; ctx.stroke();
        if(a.r>13){ ctx.fillStyle=a.color==='#e8e8e8'?'#333':'#fff'; ctx.font=`bold ${Math.round(a.r*.72)}px Inter,sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(a.element,a.sx,a.sy); }
      });
      rafRef.current=requestAnimationFrame(draw);
    };
    rafRef.current=requestAnimationFrame(draw);
    return ()=>cancelAnimationFrame(rafRef.current);
  },[mol, molExtent]);

  const dn=useCallback((x:number,y:number)=>{auto.current=false;drag.current={x,y};},[]);
  const mv=useCallback((x:number,y:number)=>{if(!drag.current)return;ry.current+=(x-drag.current.x)*.009;rx.current+=(y-drag.current.y)*.009;drag.current={x,y};},[]);
  const up=useCallback(()=>{drag.current=null;setTimeout(()=>{auto.current=true;},1800);},[]);

  const btnCls = "w-7 h-7 rounded-lg border border-slate-600/50 bg-slate-900/75 text-slate-300 hover:bg-orange-500/40 hover:border-orange-500/50 hover:text-white transition-colors text-base font-bold leading-none flex items-center justify-center";
  return (
    <div className="relative w-full h-full">
      <canvas ref={ref} className="sim-canvas w-full h-full" style={{ touchAction:'none', display:'block' }}
        onMouseDown={e=>dn(e.clientX,e.clientY)} onMouseMove={e=>mv(e.clientX,e.clientY)} onMouseUp={up} onMouseLeave={up}
        onTouchStart={e=>{e.preventDefault();const t=e.touches[0];dn(t.clientX,t.clientY);}}
        onTouchMove={e=>{e.preventDefault();const t=e.touches[0];mv(t.clientX,t.clientY);}} onTouchEnd={up} />
      <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
        <button className={btnCls} title="Zoom in" onClick={()=>{zoom.current=Math.min(4,zoom.current*1.25);auto.current=false;}}>+</button>
        <button className={btnCls} title="Zoom out" onClick={()=>{zoom.current=Math.max(0.25,zoom.current*0.8);auto.current=false;}}>−</button>
        <button className={btnCls+" text-xs"} title="Reset" onClick={()=>{zoom.current=1;ry.current=0.3;rx.current=-0.2;auto.current=true;}}>↺</button>
      </div>
    </div>
  );
}

const SYLLABI = ['IGCSE', 'CBSE', 'JEE / NEET', 'IB'];

export default function Hero() {
  const [molIdx, setMolIdx] = useState(0);
  const mol = MOLECULES[molIdx];

  return (
    <section className="relative overflow-hidden dot-grid">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-80px] right-[8%] w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #fb923c 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-100px] left-[2%] w-[380px] h-[380px] rounded-full opacity-7"
          style={{ background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <div>
            <div className="flex flex-wrap gap-2 mb-6">
              {SYLLABI.map(s => (
                <span key={s} className="text-xs font-medium px-2.5 py-1 rounded-full border border-slate-700/70 text-slate-400 bg-slate-800/40">{s}</span>
              ))}
            </div>
            <h1 className="font-head font-bold text-white leading-tight mb-4" style={{ fontSize: 'clamp(30px,4.5vw,52px)', textWrap:'balance' }}>
              Every concept,<br /><span style={{ color: '#fb923c' }}>an experiment.</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-md">
              Run the simulation first, then read the equation. Free interactive labs for Physics, Biology, Chemistry, and Math — no login, no download.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <Link to="/labs" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold font-head transition-all">
                <FlaskConical size={18} /> Open a free lab
              </Link>
              <Link to="/lab/molecule-vsepr" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all">
                Explore molecules <ArrowRight size={16} />
              </Link>
            </div>
            <div className="flex gap-8">
              {[['16','Labs planned'],['4','Live now · Free'],['0','Logins needed']].map(([n,l])=>(
                <div key={l}><div className="text-2xl font-bold font-head text-white">{n}</div><div className="text-xs text-slate-500 mt-0.5">{l}</div></div>
              ))}
            </div>
          </div>

          {/* Right: viewer card */}
          <div>
            <div className="rounded-2xl border border-slate-800 bg-surface/80 backdrop-blur overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-head">VSEPR Model</span>
                  <span className="w-1 h-1 rounded-full bg-slate-700 inline-block"></span>
                  <span className="text-xs text-slate-400">Drag to rotate</span>
                </div>
                <span className="text-sm font-mono font-semibold text-orange-300">{mol.formula} · {mol.name}</span>
              </div>

              {/* Canvas */}
              <div style={{ height: 240 }}>
                <MolViewer mol={mol} />
              </div>

              {/* Molecule tabs */}
              <div className="border-t border-slate-800 px-3 py-2 flex flex-wrap gap-1">
                {MOLECULES.map((m,i)=>(
                  <button key={m.id} onClick={()=>setMolIdx(i)}
                    className={`px-2.5 py-1 text-xs rounded-full transition-all ${i===molIdx?'bg-orange-500/20 text-orange-300 border border-orange-500/40':'text-slate-500 hover:text-slate-200 border border-transparent hover:border-slate-700'}`}>
                    {m.formula}
                  </button>
                ))}
              </div>

              {/* Info grid */}
              <div className="border-t border-slate-800 grid grid-cols-2 divide-x divide-slate-800">
                <div className="p-3"><div className="text-xs text-slate-500 mb-0.5">Shape</div><div className="text-sm font-medium text-white">{mol.shape}</div></div>
                <div className="p-3"><div className="text-xs text-slate-500 mb-0.5">Bond Angle</div><div className="text-sm font-mono text-white">{mol.bondAngle}</div></div>
              </div>
              <div className="border-t border-slate-800 grid grid-cols-3 divide-x divide-slate-800">
                <div className="p-3"><div className="text-xs text-slate-500 mb-0.5">Hybridization</div><div className="text-sm font-mono text-orange-300">{mol.hybridization}</div></div>
                <div className="p-3"><div className="text-xs text-slate-500 mb-0.5">Polarity</div><div className={`text-sm font-medium ${mol.polarity==='Polar'?'text-blue-300':'text-slate-300'}`}>{mol.polarity}</div></div>
                <div className="p-3"><div className="text-xs text-slate-500 mb-0.5">Lone pairs</div><div className="text-sm text-slate-200">{mol.lonePairs}</div></div>
              </div>
              <div className="border-t border-slate-800 px-4 py-2.5">
                <Link to="/lab/molecule-vsepr" className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1">
                  Open the full VSEPR lab <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
