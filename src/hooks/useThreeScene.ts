import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface ThreeCtx {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  /** Register a callback that fires every frame with elapsed seconds. */
  onFrame: (fn: (t: number, dt: number) => void) => void;
}

interface SceneOptions {
  height?: number;
  bg?: number;
  cameraPos?: [number, number, number];
  fov?: number;
  fog?: boolean;
  shadows?: boolean;
}

/**
 * Mounts a Three.js scene into a div ref.
 * Re-runs (teardown + setup) whenever deps change.
 * Returns a ref to attach to the container div.
 */
export function useThreeScene(
  setupFn: (ctx: ThreeCtx) => (() => void) | void,
  deps: React.DependencyList,
  opts: SceneOptions = {},
): React.RefObject<HTMLDivElement | null> {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || 800;
    const H = opts.height ?? 440;
    const bg = opts.bg ?? 0x070b18;

    // ── Scene ────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bg);
    if (opts.fog) scene.fog = new THREE.FogExp2(bg, 0.04);

    // ── Camera ───────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(opts.fov ?? 55, W / H, 0.01, 2000);
    camera.position.set(...(opts.cameraPos ?? [0, 4, 10]));
    camera.lookAt(0, 0, 0);

    // ── Renderer ─────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (opts.shadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    mount.appendChild(renderer.domElement);

    // ── Controls ─────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;

    // ── Default lighting ─────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(8, 15, 8);
    if (opts.shadows) { sun.castShadow = true; }
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8899ff, 0.3);
    fill.position.set(-6, -4, -6);
    scene.add(fill);

    // ── Frame callbacks ──────────────────────────────────────────────────
    const frameFns: Array<(t: number, dt: number) => void> = [];
    const onFrame = (fn: (t: number, dt: number) => void) => frameFns.push(fn);

    const ctx: ThreeCtx = { scene, camera, renderer, controls, onFrame };

    let userCleanup: (() => void) | void;
    try { userCleanup = setupFn(ctx); } catch (e) { console.error('[ThreeScene]', e); }

    // ── Animation loop ───────────────────────────────────────────────────
    let raf: number;
    let prev = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - prev) / 1000, 0.1);
      prev = now;
      controls.update();
      frameFns.forEach(fn => fn(now / 1000, dt));
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    // ── Resize observer ──────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const nW = mount.clientWidth;
      if (!nW) return;
      camera.aspect = nW / H;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, H);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      userCleanup?.();
      controls.dispose();
      renderer.dispose();
      scene.traverse(obj => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        const mat = (obj as THREE.Mesh).material;
        if (mat) Array.isArray(mat) ? mat.forEach(m => m.dispose()) : mat.dispose();
      });
      scene.clear();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return mountRef;
}
