import { useEffect, useRef, useState, useCallback } from 'react';
import { MOLECULES } from '@/data/molecules';

type Vec3 = [number, number, number];

function rotateY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}
function rotateX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}
function project(v: Vec3, fov: number): [number, number, number] {
  const pz = v[2] + 5;
  return [(v[0] * fov) / pz, (v[1] * fov) / pz, v[2]];
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}
function lightenHex(hex: string, f: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * f))},${Math.min(255, Math.round(g + (255 - g) * f))},${Math.min(255, Math.round(b + (255 - b) * f))})`;
}
function darkenHex(hex: string, f: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r * (1 - f))},${Math.round(g * (1 - f))},${Math.round(b * (1 - f))})`;
}

export default function MoleculeViewer({ compact = false, molIdx: externalIdx, onMolIdx }: { compact?: boolean; molIdx?: number; onMolIdx?: (i: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const rotY      = useRef(0.3);
  const rotX      = useRef(-0.2);
  const autoRot   = useRef(true);
  const drag      = useRef<{ x: number; y: number } | null>(null);
  const zoom      = useRef(1.0);
  const [internalIdx, setInternalIdx] = useState(0);
  const molIdx = externalIdx ?? internalIdx;
  const setMolIdx = (i: number) => { setInternalIdx(i); onMolIdx?.(i); };

  const mol = MOLECULES[molIdx];

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const scale = Math.min(W, H) * (compact ? 0.17 : 0.19) * zoom.current;
    const fov = 420;

    ctx.clearRect(0, 0, W, H);

    // Transform all atoms
    const transformed = mol.atoms.map(atom => {
      let p: Vec3 = [...atom.position];
      p = rotateY(p, rotY.current);
      p = rotateX(p, rotX.current);
      const [sx, sy, sz] = project(p, fov);
      return {
        ...atom,
        sx: cx + sx * scale,
        sy: cy - sy * scale,
        sz,
        r: atom.radius * scale * 0.52,
      };
    });

    // Draw bonds first
    for (const bond of mol.bonds) {
      const a1 = transformed[bond.from];
      const a2 = transformed[bond.to];
      const dx = a2.sx - a1.sx, dy = a2.sy - a1.sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / dist, ny = dx / dist;
      const offsets = bond.order === 1 ? [0] : bond.order === 2 ? [-3, 3] : [-5, 0, 5];

      for (const off of offsets) {
        ctx.beginPath();
        ctx.moveTo(a1.sx + nx * off, a1.sy + ny * off);
        ctx.lineTo(a2.sx + nx * off, a2.sy + ny * off);
        ctx.strokeStyle = 'rgba(180,190,200,0.55)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    // Sort by z — back-to-front
    const sorted = [...transformed].sort((a, b) => a.sz - b.sz);

    // Draw atoms as spheres
    for (const a of sorted) {
      const gr = ctx.createRadialGradient(
        a.sx - a.r * 0.32, a.sy - a.r * 0.32, a.r * 0.08,
        a.sx, a.sy, a.r
      );
      gr.addColorStop(0,   lightenHex(a.color, 0.55));
      gr.addColorStop(0.4, a.color);
      gr.addColorStop(1,   darkenHex(a.color, 0.45));
      ctx.beginPath();
      ctx.arc(a.sx, a.sy, a.r, 0, Math.PI * 2);
      ctx.fillStyle = gr;
      ctx.fill();
      // rim
      ctx.strokeStyle = darkenHex(a.color, 0.3);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // element label
      if (a.r > 14) {
        ctx.fillStyle = a.color === '#e8e8e8' ? '#333' : '#fff';
        ctx.font = `bold ${Math.round(a.r * 0.72)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(a.element, a.sx, a.sy);
      }
    }
  }, [mol, compact]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setSize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width  || canvas.offsetWidth  || 400;
      const h = rect.height || canvas.offsetHeight || 300;
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(canvas);

    // Wheel zoom — prevent page scroll when over canvas
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom.current = Math.max(0.25, Math.min(4.0, zoom.current * (1 - e.deltaY * 0.001)));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // Pinch zoom (touch)
    let lastPinchDist = 0;
    const onTouchStartPinch = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist = Math.sqrt(dx*dx + dy*dy);
      }
    };
    const onTouchMovePinch = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (lastPinchDist > 0) zoom.current = Math.max(0.25, Math.min(4.0, zoom.current * (dist / lastPinchDist)));
        lastPinchDist = dist;
      }
    };
    canvas.addEventListener('touchstart', onTouchStartPinch, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMovePinch,  { passive: false });

    return () => {
      ro.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStartPinch);
      canvas.removeEventListener('touchmove',  onTouchMovePinch);
    };
  }, []);

  useEffect(() => {
    rotY.current  = 0.3;
    rotX.current  = -0.2;
    zoom.current  = 1.0;
  }, [molIdx]);

  useEffect(() => {
    let last = performance.now();
    const animate = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (autoRot.current && !drag.current) {
        rotY.current += dt * 0.4;
      }
      draw();
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Mouse/touch events
  const onDown = useCallback((x: number, y: number) => {
    autoRot.current = false;
    drag.current = { x, y };
  }, []);
  const onMove = useCallback((x: number, y: number) => {
    if (!drag.current) return;
    rotY.current += (x - drag.current.x) * 0.008;
    rotX.current += (y - drag.current.y) * 0.008;
    drag.current = { x, y };
  }, []);
  const onUp = useCallback(() => {
    drag.current = null;
    setTimeout(() => { autoRot.current = true; }, 1800);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <canvas
        ref={canvasRef}
        className="sim-canvas flex-1 w-full"
        style={{ minHeight: compact ? 160 : 260, touchAction: 'none', display: 'block' }}
        onMouseDown={e => onDown(e.clientX, e.clientY)}
        onMouseMove={e => onMove(e.clientX, e.clientY)}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={e => { if (e.touches.length === 1) { e.preventDefault(); const t = e.touches[0]; onDown(t.clientX, t.clientY); } }}
        onTouchMove={e => { if (e.touches.length === 1) { e.preventDefault(); const t = e.touches[0]; onMove(t.clientX, t.clientY); } }}
        onTouchEnd={onUp}
      />
      {/* Molecule tabs */}
      <div className="flex flex-wrap gap-1 justify-center px-2 pb-1 pt-2">
        {MOLECULES.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setMolIdx(i)}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-all ${
              i === molIdx
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700'
            }`}
          >
            {m.formula}
          </button>
        ))}
      </div>
    </div>
  );
}
