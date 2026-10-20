/**
 * The split coin. Three wedges sized by who earns what, lit with matcaps rendered in Blender
 * (public/assets/matcaps), faces engraved with a guilloche bump.
 */
import * as THREE from 'three';

const MATCAPS = {
  seller: '/assets/matcaps/paper.jpg',
  creator: '/assets/matcaps/jasper.jpg',
  comarket: '/assets/matcaps/benzol.jpg',
};
const FALLBACK = { seller: 0xedf0ec, creator: 0xeb5324, comarket: 0x00978d };

function guillocheBump(): THREE.CanvasTexture {
  const s = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080';
  x.fillRect(0, 0, s, s);
  x.translate(s / 2, s / 2);
  x.lineWidth = 1.4;
  for (let k = 0; k < 64; k++) {
    const ph = (k / 64) * Math.PI * 2;
    x.strokeStyle = k % 2 ? '#a8a8a8' : '#585858';
    x.beginPath();
    for (let i = 0; i <= 720; i++) {
      const t = (i / 720) * Math.PI * 2;
      const r = s * 0.36 * (0.86 + 0.09 * Math.sin(7 * t + ph) * Math.cos(3 * t - ph * 0.5) + 0.03 * Math.sin(23 * t + ph * 2));
      const px = Math.cos(t) * r;
      const py = Math.sin(t) * r;
      if (i) x.lineTo(px, py);
      else x.moveTo(px, py);
    }
    x.stroke();
  }
  for (let ring = 0; ring < 3; ring++) {
    x.strokeStyle = '#a0a0a0';
    x.beginPath();
    x.arc(0, 0, s * (0.47 - ring * 0.012), 0, Math.PI * 2);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

function wedge(a0: number, a1: number, bump: THREE.Texture, mat: THREE.Material) {
  const shape = new THREE.Shape();
  const r = 1;
  shape.moveTo(0, 0);
  shape.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
  shape.absarc(0, 0, r, a0, a1, false);
  shape.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.022,
    bevelSegments: 4,
    curveSegments: Math.max(8, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 140)),
  });
  geo.translate(0, 0, -0.07);
  // planar UVs so the engraving lines up across wedges
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) * 0.5 + 0.5;
    uv[i * 2 + 1] = pos.getY(i) * 0.5 + 0.5;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  void bump;
  return new THREE.Mesh(geo, mat);
}

export async function mountCoin(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 1.5, 4.4);
  camera.lookAt(0, 0, 0);

  const loader = new THREE.TextureLoader();
  const bump = guillocheBump();
  const load = (url: string) =>
    new Promise<THREE.Texture | null>((res) =>
      loader.load(
        url,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          res(t);
        },
        undefined,
        () => res(null),
      ),
    );
  const caps = await Promise.all([load(MATCAPS.seller), load(MATCAPS.creator), load(MATCAPS.comarket)]);
  const mats = (['seller', 'creator', 'comarket'] as const).map((k, i) =>
    caps[i]
      ? new THREE.MeshMatcapMaterial({ matcap: caps[i]!, bumpMap: bump, bumpScale: 1.2 })
      : new THREE.MeshStandardMaterial({ color: FALLBACK[k], roughness: 0.35, metalness: 0.1, bumpMap: bump }),
  );
  if (!caps.every(Boolean)) {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 2.2));
    const d = new THREE.DirectionalLight(0xffffff, 2);
    d.position.set(2, 3, 4);
    scene.add(d);
  }

  const group = new THREE.Group();
  group.rotation.x = -0.95;
  scene.add(group);

  let shares: [number, number, number] = [0.7, 0.2, 0.1];
  let shown: [number, number, number] = [...shares];
  let meshes: THREE.Mesh[] = [];
  let intro = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rebuild = () => {
    meshes.forEach((m) => {
      group.remove(m);
      m.geometry.dispose();
    });
    meshes = [];
    const total = shown[0] + shown[1] + shown[2] || 1;
    let a = Math.PI / 2;
    const gap = 0.012;
    shown.forEach((v, i) => {
      const span = (v / total) * Math.PI * 2;
      const m = wedge(a + gap, a + span - gap, bump, mats[i]);
      const mid = a + span / 2;
      const push = i === 0 ? 0.03 : 0.11;
      m.position.set(Math.cos(mid) * push, Math.sin(mid) * push, i === 1 ? 0.06 : 0);
      group.add(m);
      meshes.push(m);
      a += span;
    });
  };
  rebuild();

  let w = 0;
  let h = 0;
  const resize = () => {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let mx = 0;
  let my = 0;
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width) * 2 - 1;
    my = ((e.clientY - r.top) / r.height) * 2 - 1;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(canvas);

  let raf = 0;
  let last = performance.now();
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    intro = reduce ? 1 : Math.min(1, intro + dt / 1.6);
    const ease = 1 - Math.pow(1 - intro, 4);
    // tween shares
    let moved = false;
    shown = shown.map((v, i) => {
      const n = v + (shares[i] - v) * (1 - Math.exp(-dt * 9));
      if (Math.abs(n - v) > 1e-4) moved = true;
      return n;
    }) as [number, number, number];
    if (moved) rebuild();
    // spin in like a tossed coin, then settle and follow the cursor
    group.rotation.y = (1 - ease) * Math.PI * 3 + mx * 0.25;
    group.rotation.x = -0.95 - my * 0.12 + (1 - ease) * 0.4;
    group.rotation.z += dt * 0.08;
    group.scale.setScalar(0.66 + 0.1 * ease);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    set(s: [number, number, number]) {
      shares = s;
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      meshes.forEach((m) => m.geometry.dispose());
      mats.forEach((m) => m.dispose());
      bump.dispose();
      renderer.dispose();
    },
  };
}
