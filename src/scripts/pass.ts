/**
 * The waitlist pass in 3D. Geometry is modeled in Blender (public/assets/pass/pass.glb);
 * the printed faces are drawn at runtime so each pass carries its holder's name and number.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PASS_H, PASS_W, drawFoilMask, drawPassBack, drawPassFront } from './passArt.js';

export interface PassData {
  side: 'brand' | 'creator';
  passNo: number;
  label: string;
  issued?: string;
}

function canvasTexture(draw: (x: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = PASS_W;
  c.height = PASS_H;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  t.flipY = false;
  return t;
}

/** Card geometry fallback when the GLB can't load: a rounded slab with the same UV layout. */
function fallbackCard(): THREE.Group {
  const w = 1.585;
  const h = 1;
  const r = 0.07;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.028, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3 });
  geo.translate(0, 0, -0.014);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo));
  g.userData.fallback = true;
  return g;
}

export async function mountPass(canvas: HTMLCanvasElement, data: PassData) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, 0, 3.7);

  try {
    await document.fonts.load('700 100px Satoshi');
    await document.fonts.load('30px "Fragment Mono"');
  } catch {
    /* draw with fallbacks */
  }
  const issued = data.issued ? new Date(data.issued) : new Date();
  const front = canvasTexture((x) => drawPassFront(x, { side: data.side, passNo: data.passNo, label: data.label, issued }));
  const back = canvasTexture((x) => drawPassBack(x, { passNo: data.passNo }));
  const foil = canvasTexture((x) => drawFoilMask(x), false);

  const frontMat = new THREE.MeshPhysicalMaterial({
    map: front,
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.3,
    iridescence: 1,
    iridescenceMap: foil,
    iridescenceIOR: 1.6,
    iridescenceThicknessRange: [180, 620],
  });
  const backMat = new THREE.MeshPhysicalMaterial({ map: back, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.3 });
  const edgeMat = new THREE.MeshPhysicalMaterial({ color: 0x00978d, roughness: 0.3, metalness: 0.35, clearcoat: 0.5 });

  let card: THREE.Object3D;
  try {
    const gltf = await new GLTFLoader().loadAsync('/assets/pass/pass.glb');
    card = gltf.scene;
    card.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const name = ((Array.isArray(m.material) ? m.material[0] : m.material) as THREE.Material).name.toLowerCase();
      m.material = name.includes('front') ? frontMat : name.includes('back') ? backMat : edgeMat;
    });
  } catch {
    card = fallbackCard();
    const mesh = card.children[0] as THREE.Mesh;
    // ExtrudeGeometry groups: 0 = caps, 1 = sides. Caps use planar UVs from the shape.
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / 1.585 + 0.5, 1 - (pos.getY(i) + 0.5));
    }
    mesh.material = [frontMat, edgeMat];
  }

  const pivot = new THREE.Group();
  pivot.add(card);
  scene.add(pivot);
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(-2, 3, 4);
  scene.add(key);

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.position.z = camera.aspect < 1.3 ? 3.7 / Math.max(0.62, camera.aspect / 1.3) : 3.7;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let tx = 0;
  let ty = 0;
  let rx = 0;
  let ry = 0;
  let drag = false;
  let dragY = 0;
  let spin = 0;
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (drag) spin += (nx - dragY) * 3;
    dragY = nx;
    tx = ny * 0.25;
    ty = nx * 0.35;
  };
  const onDown = (e: PointerEvent) => {
    drag = true;
    const r = canvas.getBoundingClientRect();
    dragY = ((e.clientX - r.left) / r.width) * 2 - 1;
    canvas.setPointerCapture(e.pointerId);
  };
  const onUp = () => {
    drag = false;
    spin = Math.round(spin / Math.PI) * Math.PI;
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let intro = reduce ? 1 : 0;
  let shown = 0;
  let raf = 0;
  let last = performance.now();
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    intro = Math.min(1, intro + dt / 1.8);
    const e = 1 - Math.pow(1 - intro, 4);
    rx += (tx - rx) * (1 - Math.exp(-dt * 5));
    ry += (ty - ry) * (1 - Math.exp(-dt * 5));
    shown += (spin - shown) * (1 - Math.exp(-dt * 6));
    pivot.rotation.set(rx * e + (1 - e) * 0.6, ry * e + shown + (1 - e) * Math.PI * 4, (1 - e) * -0.4);
    pivot.position.y = Math.sin(now / 1400) * 0.02 + (1 - e) * 1.4;
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    /** PNG of the current view. */
    snapshot(): string {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      [front, back, foil].forEach((t) => t.dispose());
      [frontMat, backMat, edgeMat].forEach((m) => m.dispose());
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
