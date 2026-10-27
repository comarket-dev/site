/**
 * The stage: one 3D device that lives across page changes. On the heroes it's a phone playing an example sale from a
 * creator's post to the moment the sale completes (the only moment anyone pays), then what that sale meant to each
 * side. On the fork it's whatever the visitor is probably holding (devices.ts), resting on one completed sale.
 *
 * Picking a side on the fork is one continuous move: the device squares up and starts easing toward you while its
 * browser loads that page (the address changes, a load bar runs, the page paints), then it speeds up and we fly
 * through its screen into the page itself. Going back to the fork runs the same move in reverse: the page shrinks
 * back into the device's screen as the device settles into its place, then its browser goes back to the demo.
 * The page in the screen is the real page, the view transition's own layer at its true proportions (Stage.astro),
 * and the device is placed from that layer's transform every frame, so the two can't drift apart.
 *
 * The device follows a [data-stage-anchor] element, so the page layout decides where it sits and the stage only
 * decides how it moves.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { paintScreen, type Nav } from './browser';
import { buildDevice, pickDevice, type Device, type DeviceKind } from './devices';
import { DEFAULT_BRAND, DEFAULT_CREATOR, DEFAULT_PHOTO, H, W, paint, type BrandSkin, type CreatorSkin, type Shot } from './screens';

export type StageMode = 'fork' | 'brands' | 'creators' | 'none';
export type Side = 'brands' | 'creators';
type Placement = { x: number; y: number; s: number };
interface Beat {
  id: Shot;
  dur: number;
  step: number;
  yaw?: number;
}

/* phone height from design/stage/build_stage.py */
const PH = 1.52;
const ASPECT = 0.72 / 1.52;

const FOV = 22;
const HERO_YAW = -0.2;
/** Hero loops open on the storefront (the product, and what their poster shows); the fork opens on the sale. */
const START: Record<Exclude<StageMode, 'none'>, number> = { fork: 0, brands: 1, creators: 1 };
const DIST = 7;

/* the trip from the fork into a page, in seconds from the pick */
const SQUARE = 0.35; // the device turns to face you
const COMMIT = 0.06; // the address bar changes and the load bar starts
const LOAD = 0.4; // the load bar's run to 70% (it waits at 85% for the page if the network is slow)
const PAINT = 0.06; // the page paints over the demo, near enough a cut, as in a real browser
const SLOW_END = 0.95; // until here the device eases in slowly
const SLOW_E = 0.07; // how far along it gets in that time
const SLOW_CAP = 1.6; // on a slow network it stops creeping here and waits for the page
const SHOWN = 0.45; // the page is on screen at least this long before the fast part
const FLY = 1.1;
const V0 = SLOW_E / SLOW_END;
// starts at the slow part's speed, so the move never stalls between the two
const FLY_CURVE: [number, number, number, number] = [0.55, 0.05, 0.18, 1];
/* and back: the page pulls back into the screen, then the browser goes back to the demo */
const RETURN = 1.2;
const RETURN_CURVE: [number, number, number, number] = [0.3, 0.05, 0.1, 1];
const RETURN_SWAP = 0.1; // a near-cut, as a real browser's back is
/* the page is drawn this much narrower than the screen's page area, so its edge never shows */
const MINI = 0.995;

/* when the tap ripple starts on screens that have a button, so a click can jump straight to it */
const TAP: Partial<Record<Shot, number>> = { post: 1.5, store: 1.6, checkout: 1.6, 'checkout-returning': 1.6, hub: 1.6 };
/* how long each screen keeps animating; after this it is a still and we stop redrawing it */
const SETTLE: Partial<Record<Shot, number>> = { post: 2.2, store: 2.3, checkout: 2.3, 'checkout-returning': 2.3, verify: 2.2, refused: 2.4, sale: 1.7, brand: 1.2, creator: 1.3, hub: 2.3 };

const LOOPS: Record<Exclude<StageMode, 'none'>, Beat[][]> = {
  // the fork doesn't replay the hero demo: it rests on one completed sale and turns slowly to each side's view of it
  fork: [
    [
      { id: 'sale', dur: 6.5, step: 3 },
      { id: 'brand', dur: 5, step: 4, yaw: -0.26 },
      { id: 'sale', dur: 4.5, step: 3 },
      { id: 'creator', dur: 5, step: 4, yaw: 0.26 },
    ],
  ],
  brands: [
    [
      { id: 'post', dur: 2.4, step: 0 },
      { id: 'store', dur: 2.6, step: 1 },
      { id: 'checkout', dur: 2.6, step: 2 },
      { id: 'verify', dur: 3.0, step: 3 },
      { id: 'brand', dur: 4.4, step: 4 },
    ],
    [
      { id: 'post', dur: 2.4, step: 0 },
      { id: 'store', dur: 2.6, step: 1 },
      { id: 'checkout', dur: 2.6, step: 2 },
      { id: 'verify', dur: 3.0, step: 3 },
      { id: 'brand', dur: 4.4, step: 4 },
    ],
    [
      { id: 'store', dur: 2.6, step: 1 },
      { id: 'checkout-returning', dur: 2.6, step: 2 },
      { id: 'refused', dur: 3.2, step: 3 },
      { id: 'brand', dur: 4.0, step: 4 },
    ],
  ],
  creators: [
    [
      { id: 'post', dur: 2.4, step: 0 },
      { id: 'store', dur: 2.6, step: 1 },
      { id: 'checkout', dur: 2.6, step: 2 },
      { id: 'verify', dur: 3.0, step: 3 },
      { id: 'creator', dur: 4.2, step: 4 },
      { id: 'hub', dur: 3.6, step: 4 },
    ],
  ],
};

const HOME: Record<Side, Shot> = { brands: 'brand', creators: 'creator' };

class Spring {
  x: number;
  v = 0;
  constructor(
    x = 0,
    public w = 6,
  ) {
    this.x = x;
  }
  step(target: number, dt: number) {
    const a = -this.w * this.w * (this.x - target) - 2 * this.w * this.v;
    this.v += a * dt;
    this.x += this.v * dt;
    return this.x;
  }
  set(x: number) {
    this.x = x;
    this.v = 0;
  }
}

/** A cubic-bezier easing, the same curve CSS and the Web Animations API use, so the device and the page move as one. */
function bezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 24; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-5) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}
const flyEase = bezier(...FLY_CURVE);
const returnEase = bezier(...RETURN_CURVE);
const easeOut = (k: number) => 1 - (1 - Math.min(1, Math.max(0, k))) ** 3;
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
/** The fork's device used to turn toward the side under the pointer and show that side's view. */
const FORK_HOVER_PREVIEW = false as boolean;
const coarse = () => matchMedia('(pointer: coarse)').matches || innerWidth < 820;
const transitions = () => typeof document !== 'undefined' && 'startViewTransition' in document;

/** The page layer's transform at the fork end of a trip: centred (tx, ty) off the view's middle, at scale k. */
type Mini = { tx: number; ty: number; k: number };

/** A trip between the fork and a page, in either direction. */
interface Trip {
  dir: 'in' | 'out';
  side: Side | null;
  /** seconds since it began; once the page layer is animating, its clock keeps this */
  t: number;
  /** where the page sits in the screen at the fork end */
  mini: Mini;
  yaw0: number;
  pitch0: number;
  /** in: the next page is in, and its layer is under the screen */
  arrived: boolean;
  arriveAt: number;
  flyAt: number;
  eArrive: number;
  eFly: number;
  clock: Animation | null;
  clockFrom: number;
  nav: Nav;
  resolve: (() => void) | null;
}

function guilloche(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 1080;
  const x = c.getContext('2d')!;
  x.fillStyle = '#1E0E3F';
  x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = 'rgba(160, 150, 210, 0.16)';
  x.lineWidth = 1;
  const cx = 256;
  const cy = 640;
  for (let k = 0; k < 64; k++) {
    const ph = (k / 64) * Math.PI * 2;
    x.beginPath();
    for (let i = 0; i <= 720; i++) {
      const a = (i / 720) * Math.PI * 2;
      const r = 150 + 34 * Math.sin(7 * a + ph) + 14 * Math.sin(19 * a - ph * 2);
      const px = cx + r * Math.cos(a);
      const py = cy + r * Math.sin(a);
      if (i) x.lineTo(px, py);
      else x.moveTo(px, py);
    }
    x.stroke();
  }
  x.fillStyle = 'rgba(190, 180, 230, 0.32)';
  x.font = '600 26px Satoshi, ui-sans-serif, sans-serif';
  x.textAlign = 'center';
  x.fillText('comarket', cx, cy + 9);
  return c;
}

function shadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 128, 4, 64, 128, 64);
  g.addColorStop(0, 'rgba(30,14,63,0.5)');
  g.addColorStop(0.5, 'rgba(30,14,63,0.2)');
  g.addColorStop(1, 'rgba(30,14,63,0)');
  x.setTransform(1, 0, 0, 2, 0, -128);
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

class Stage {
  ready = false;
  failed = false;
  private canvas!: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 40);
  private rig = new THREE.Group();
  private turn = new THREE.Group();
  private phone: THREE.Object3D | null = null;
  private tapped = false; // the haptic dip has fired for this confirmation
  private screenMesh: THREE.Mesh | null = null;
  private screenMeshes: THREE.Mesh[] = [];
  private phoneScreen: THREE.Material | null = null;
  private shadow!: THREE.Mesh;
  private ray = new THREE.Raycaster();
  private mats: Record<string, THREE.Material> = {};

  /* the phone's own screen */
  private ui = document.createElement('canvas');
  private uiCtx = this.ui.getContext('2d')!;
  private tex!: THREE.CanvasTexture;
  /* the fork device's screen: a browser around the page area, drawn premultiplied so the page area can turn clear */
  private dev: Device | null = null;
  private devKey = '';
  private devCanvas = document.createElement('canvas');
  private devCtx = this.devCanvas.getContext('2d')!;
  private devTex!: THREE.CanvasTexture;
  private devMat!: THREE.MeshBasicMaterial;
  private devPx = 1;

  private brand: BrandSkin = { ...DEFAULT_BRAND };
  private creator: CreatorSkin = { ...DEFAULT_CREATOR };

  private mode: StageMode = 'none';
  private anchor: HTMLElement | null = null;
  private trip: Trip | null = null;
  private lastHero: Side | null = null;
  private appear = 1; // 0..1, the fork device fading up the first time it's drawn
  private reveal: HTMLElement | null = null; // the anchor's [data-reveal] wrapper, while it's still revealing
  private opacity = -1;
  private settle = 1; // 0..1, how much pointer tilt and breathing apply; eased back in after landing on a poster
  private loop = 0;
  private beat = 0;
  private t = 0;
  private extend = 0; // seconds added to a beat when a click jumps to its tap
  private hold: Shot | null = null;
  private holdT = 0;
  private holdUntil = 0;
  private resume: number | null = null;
  private shot: Shot = 'post';
  private shotT = 0;
  private prev: { id: Shot; t: number } | null = null;
  private slide = 1;
  private slideDir: 1 | -1 = 1;
  private dirty = true;
  private last: Placement | null = null;

  private px = new Spring(0, 7);
  private py = new Spring(0, 7);
  private ps = new Spring(1, 7);
  private yaw = new Spring(0, 5);
  private pitch = new Spring(0, 5);
  private dip = new Spring(0, 14);
  private pointer = { x: 0, y: 0 };
  private visible = true;
  private lastNow = 0;
  private time = 0;
  private frames = 0;
  private slowFrames = 0;
  private raf = 0;
  private drawnOnce = false;
  private frozen = false;

  init(canvas: HTMLCanvasElement): boolean {
    if (this.ready || this.failed) return this.ready;
    this.canvas = canvas;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      this.failed = true;
      return false;
    }
    if (!this.renderer.capabilities.isWebGL2) {
      this.failed = true;
      this.renderer.dispose();
      return false;
    }
    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.0;
    r.setClearColor(0x000000, 0);

    this.camera.position.set(0, 0, DIST);
    this.scene.add(this.rig);
    this.rig.add(this.turn);

    this.ui.width = W;
    this.ui.height = H;
    this.tex = new THREE.CanvasTexture(this.ui);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.flipY = false;
    this.tex.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy());
    this.tex.minFilter = THREE.LinearMipmapLinearFilter;

    this.devTex = new THREE.CanvasTexture(this.devCanvas);
    this.devTex.colorSpace = THREE.SRGBColorSpace;
    this.devTex.flipY = false;
    // premultiplied, so a clear page area filters cleanly at its edge and composites as clear
    this.devTex.premultiplyAlpha = true;
    this.devTex.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy());
    this.devTex.minFilter = THREE.LinearMipmapLinearFilter;
    this.devMat = new THREE.MeshBasicMaterial({ map: this.devTex, transparent: true, blending: THREE.NoBlending, toneMapped: false });

    const sh = new THREE.Mesh(
      // a tight contact shadow: a wider one gets cut off by the section below the hero
      new THREE.PlaneGeometry(1.05, 1.86),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, toneMapped: false }),
    );
    sh.position.set(0.08, -0.06, -0.3);
    this.shadow = sh;
    this.rig.add(sh);

    this.resize();
    addEventListener('resize', () => this.resize());
    addEventListener(
      'pointermove',
      (e) => {
        this.pointer.x = (e.clientX / innerWidth) * 2 - 1;
        this.pointer.y = (e.clientY / innerHeight) * 2 - 1;
      },
      { passive: true },
    );
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.lastNow = performance.now();
    });
    this.ready = true;
    this.load();
    this.lastNow = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    return true;
  }

  private async load() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    // Satoshi and Fragment Mono for our screens; Fernwood's own faces for its storefront and checkout
    const fonts = Promise.all(
      ['700 40px Satoshi', '900 40px Satoshi', '20px "Fragment Mono"', '40px "Fernwood Serif"', 'italic 40px "Fernwood Serif"', '400 16px "Fernwood Sans"', '600 16px "Fernwood Sans"'].map((f) => document.fonts.load(f)),
    ).catch(() => {});
    const photo = new Image();
    photo.onload = () => {
      if (this.creator.slug !== DEFAULT_CREATOR.slug) return;
      this.creator.photo = photo;
      this.dirty = true;
    };
    photo.src = DEFAULT_PHOTO;
    const gltf = new GLTFLoader();
    const [hdr, phone] = await Promise.all([
      new HDRLoader().loadAsync('/assets/stage/studio.hdr').catch(() => null),
      gltf.loadAsync('/assets/stage/phone.glb'),
      fonts,
    ]).catch(() => [null, null] as const);
    if (!phone) {
      this.fail();
      return;
    }
    let env: THREE.Texture | null = null;
    if (hdr) {
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      env = pmrem.fromEquirectangular(hdr).texture;
      this.scene.environment = env;
      hdr.dispose();
    }
    pmrem.dispose();
    this.scene.environmentIntensity = 1.0;

    const back = new THREE.CanvasTexture(guilloche());
    back.colorSpace = THREE.SRGBColorSpace;
    back.flipY = false;
    const mats: Record<string, THREE.Material> = {
      frame: new THREE.MeshPhysicalMaterial({ color: '#0A6FB8', metalness: 0.88, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.18 }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#08070D', metalness: 0, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 }),
      back: new THREE.MeshPhysicalMaterial({ map: back, metalness: 0.15, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.22 }),
      lens: new THREE.MeshPhysicalMaterial({ color: '#050409', metalness: 0.2, roughness: 0.08, clearcoat: 1 }),
      dark: new THREE.MeshPhysicalMaterial({ color: '#1A1530', metalness: 0.1, roughness: 0.55 }),
      // the larger devices' bezel: satin rather than mirror, so a big flat face doesn't split into light and dark
      bezel: new THREE.MeshPhysicalMaterial({ color: '#09080F', metalness: 0, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 0.5 }),
      screen: new THREE.MeshPhysicalMaterial({
        color: '#000000',
        emissive: '#ffffff',
        emissiveMap: this.tex,
        roughness: 0.22,
        metalness: 0,
        // a faint sheen only: head-on, the screen faces the warm softbox and a full reflection washes it out.
        // The map is set on the material because three ignores envMapIntensity when it comes from scene.environment.
        envMap: env,
        envMapIntensity: 0.14,
        toneMapped: false,
      }),
    };
    this.mats = mats;
    const dress = (root: THREE.Object3D) =>
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const swap = (mat: THREE.Material) => mats[mat.name] ?? mat;
        m.material = Array.isArray(m.material) ? m.material.map(swap) : swap(m.material);
        // the exporter splits the screen into child meshes, so find it by its material rather than its name
        const list = Array.isArray(m.material) ? m.material : [m.material];
        if (list.includes(mats.screen)) {
          this.screenMeshes.push(m);
          this.screenMesh ??= m;
        }
      });
    this.phone = phone.scene;
    dress(this.phone);
    this.phoneScreen = mats.screen;
    this.turn.add(this.phone);
    if (this.mode === 'fork') {
      this.useDevice(true);
      // the model arrived after the page: a device with no poster fades up now, its screen already settled
      if (this.kind() !== 'phone' && !reduce()) this.appear = 0;
      this.prev = null;
      this.slide = 1;
    }
    this.dirty = true;
    this.renderer.compile(this.scene, this.camera);
    document.documentElement.classList.add('stage-live');
  }

  private fail() {
    this.failed = true;
    this.ready = false;
    cancelAnimationFrame(this.raf);
    document.documentElement.classList.remove('stage-live');
    document.documentElement.classList.add('stage-off');
    this.canvas.style.display = 'none';
  }

  private resize() {
    const dpr = Math.min(coarse() ? 1.5 : 2, devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    if (this.mode === 'fork' && !this.trip) this.useDevice(true);
  }

  /* ---------------------------------------------------------------- the fork's device */

  /** Show the device for this visitor on the fork (building it to their window), or the hero phone everywhere else. */
  private useDevice(fork: boolean) {
    if (!this.phone) return;
    if (!fork) {
      this.phone.visible = true;
      if (this.dev && this.dev.kind !== 'phone') this.dev.root.visible = false;
      this.setPhoneBrowser(false);
      this.shadow.scale.set(1, 1, 1);
      return;
    }
    const kind = pickDevice();
    const key = `${kind}:${innerWidth}x${innerHeight}`;
    if (key !== this.devKey) {
      if (this.dev && this.dev.kind !== 'phone') {
        this.turn.remove(this.dev.root);
        this.dev.root.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      }
      this.dev = buildDevice(kind, { frame: this.mats.frame, glass: this.mats.bezel, dark: this.mats.dark, screen: this.devMat });
      this.devKey = key;
      if (kind !== 'phone') this.turn.add(this.dev.root);
      // the screen canvas, at about the device's drawn size on a sharp display
      const css = this.dev.css;
      this.devPx = Math.min(2048 / css.w, 1.6);
      this.devCanvas.width = Math.round(css.w * this.devPx);
      this.devCanvas.height = Math.round(css.h * this.devPx);
      this.devTex.dispose();
    }
    const d = this.dev!;
    this.phone.visible = d.kind === 'phone';
    if (d.kind !== 'phone') d.root.visible = true;
    // on the fork the phone is a phone with its browser open, so picking a side is just a page load in it
    this.setPhoneBrowser(d.kind === 'phone');
    this.shadow.scale.set(d.size.w / 0.72, d.size.h / 1.52, 1);
    this.dirty = true;
  }

  private kind(): DeviceKind {
    return this.mode === 'fork' || this.trip ? (this.dev?.kind ?? 'phone') : 'phone';
  }

  /** The phone's screen as a browser (on the fork), or its own app (on the heroes). */
  private setPhoneBrowser(on: boolean) {
    if (!this.phoneScreen) return;
    for (const m of this.screenMeshes) m.material = on ? this.devMat : this.phoneScreen;
  }

  /* ---------------------------------------------------------------- page API */

  setMode(mode: StageMode, anchor: HTMLElement | null, opts: { from?: Side } = {}) {
    if (!this.ready) return;
    const before = this.last;
    if (this.mode === 'brands' || this.mode === 'creators') this.lastHero = this.mode;
    this.mode = mode;
    this.anchor = anchor;
    this.reveal = anchor?.closest<HTMLElement>('[data-reveal]') ?? null;
    if (mode === 'none' || !anchor) {
      this.trip = null;
      this.setOpacity(0);
      return;
    }
    // mid-trip: the page we're travelling to is a still until we land, so it gets no story yet
    if (this.trip && ((this.trip.dir === 'in' && opts.from && mode !== 'fork') || (this.trip.dir === 'out' && mode === 'fork'))) {
      if (this.trip.dir === 'in') this.trip.arrived = true;
      this.dirty = true;
      return;
    }
    // without view transitions the page simply arrives, and its device fades up where it belongs
    const plain = !!this.trip;
    this.trip = null;
    this.loop = 0;
    this.beat = START[mode];
    // the fork's first frame is its settled poster
    this.t = mode === 'fork' ? 3 : 0;
    this.hold = null;
    this.yaw.w = mode === 'fork' ? 3 : 5;
    this.pitch.w = mode === 'fork' ? 3 : 5;
    const cut = Number(document.body.dataset.cut);
    if (cut > 0 && cut < 100) this.brand.cut = cut;
    const wasHero = !!before && this.kind() === 'phone' && mode === 'fork';
    this.useDevice(mode === 'fork');
    if (reduce()) this.holdOn(mode === 'creators' ? 'hub' : mode === 'fork' ? 'sale' : 'store', Infinity, 99);
    else this.show(this.current().id);
    const after = this.place();
    // a device with no poster (or a different one from last page's) fades up in place instead of springing over
    const fresh = plain || (mode === 'fork' && this.kind() !== 'phone') || (wasHero && this.kind() !== 'phone');
    if (before && after && this.drawnOnce && !fresh) {
      // spring from wherever the device was to the new anchor
      this.px.set(before.x - after.x);
      this.py.set(before.y - after.y);
      this.ps.set(before.s / after.s);
    } else {
      // first paint matches the page's poster exactly, so the hand-off is invisible
      this.px.set(0);
      this.py.set(0);
      this.ps.set(1);
      this.yaw.set(mode === 'fork' ? 0 : HERO_YAW);
      this.pitch.set(this.restPitch());
    }
    this.appear = fresh && !reduce() ? 0 : 1;
    // a device appearing fresh shows its screen settled, not sliding in from whatever it showed last
    if (fresh || !this.drawnOnce) {
      this.prev = null;
      this.slide = 1;
    }
    this.dirty = true;
    // back from a hero: start out covering the view, inside the screen, before the fork's first frame shows
    if (mode === 'fork' && document.documentElement.classList.contains('returning') && !reduce()) this.beginReturn();
  }

  /** Out: the device starts with its page area covering the view (where the hero we left is), headed for its place. */
  private beginReturn() {
    const end = this.place();
    if (!end || !this.dev) return;
    const from = location.pathname === '/' ? (this.lastHero ?? 'brands') : location.pathname.replace(/^\/+/, '');
    const nav: Nav = { url: `comarket.si/${from}`, title: 'Comarket', typing: 1, progress: null, reveal: 1 };
    this.trip = {
      dir: 'out', side: null, t: 0, mini: this.miniFor(end), yaw0: 0, pitch0: 0,
      arrived: true, arriveAt: 0, flyAt: 0, eArrive: 0, eFly: 0, clock: null, clockFrom: 0, nav, resolve: null,
    };
    this.appear = 1;
    this.yaw.set(0);
    this.pitch.set(0);
  }

  /** Fork: preview one side's view of the sale. Off since 2026-10-27: the device shows the one shared sale to both
   *  sides until a side is chosen (owner), and the side's photo zooming says which one is pointed at (index.astro). */
  hover(side: Side | null) {
    if (FORK_HOVER_PREVIEW === false) return;
    if (this.mode !== 'fork' || this.trip) return;
    if (side) this.holdOn(HOME[side], Infinity, 0, null, side === 'brands' ? -1 : 1);
    else if (this.hold) {
      this.hold = null;
      this.show(this.current().id, -1);
    }
  }

  /** Fork: set off for a side. Resolves when it's time to navigate: almost at once where the browser can draw the
   *  next page into the screen (view transitions), or once the load bar is through where it can't. */
  choose(side: Side): Promise<void> {
    if (reduce() || !this.ready || !this.last || !this.dev) {
      this.holdOn(HOME[side], Infinity);
      return Promise.resolve();
    }
    // whatever the device shows stays put: the next thing on its screen is the page itself
    this.shotT = this.hold ? this.holdT : this.t;
    this.holdT = this.shotT;
    this.hold = this.shot;
    this.holdUntil = Infinity;
    const nav: Nav = { url: `comarket.si/${side}`, title: side === 'brands' ? 'Comarket for brands' : 'Comarket for creators', typing: 0, progress: null, reveal: 0 };
    this.trip = {
      dir: 'in', side, t: 0, mini: this.miniFor(this.last), yaw0: this.yaw.x, pitch0: this.pitch.x,
      arrived: false, arriveAt: Infinity, flyAt: Infinity, eArrive: 0, eFly: 0, clock: null, clockFrom: 0, nav, resolve: null,
    };
    // the fork is snapshotted as we navigate, so let the other card finish clearing first
    if (transitions()) return new Promise((r) => setTimeout(r, 200));
    return new Promise((r) => (this.trip!.resolve = r));
  }

  /** In: the page layer's motion, asked for once the next page is in (Stage.astro animates it). From where the device
   *  has got to, it keeps creeping in with it until it's been on screen a moment, then grows on the flight's curve. */
  tripPlan(): { keyframes: Keyframe[]; ms: number; clip: string } | null {
    const trip = this.trip;
    if (!trip || trip.dir !== 'in' || !this.dev) return null;
    trip.arrived = true;
    trip.arriveAt = trip.t;
    trip.eArrive = this.slowE(trip.t);
    trip.flyAt = Math.max(SLOW_END, trip.t + SHOWN);
    trip.eFly = this.slowE(trip.flyAt);
    const span = trip.flyAt + FLY - trip.arriveAt;
    return {
      keyframes: [
        { transform: this.layerTransform(trip.mini, trip.eArrive), offset: 0, easing: 'linear' },
        { transform: this.layerTransform(trip.mini, trip.eFly), offset: (trip.flyAt - trip.arriveAt) / span, easing: `cubic-bezier(${FLY_CURVE.join(', ')})` },
        { transform: 'none', offset: 1 },
      ],
      ms: span * 1000,
      clip: this.layerClip(),
    };
  }

  /** Out: going back to the fork from a page. Starts the trip if the fork hasn't told us yet, and returns the page
   *  layer's motion: from full size back into the device's screen, then away as the browser goes back to its demo. */
  returnPlan(): { keyframes: Keyframe[]; ms: number; clip: string } | null {
    if (!this.ready || !this.phone || reduce()) return null;
    const anchor = document.querySelector<HTMLElement>('[data-stage-anchor]');
    if (!anchor) return null;
    if (this.trip?.dir !== 'out') this.setMode('fork', anchor);
    if (this.trip?.dir !== 'out') return null;
    const m = this.trip.mini;
    const span = RETURN + RETURN_SWAP;
    return {
      keyframes: [
        { transform: 'none', opacity: 1, offset: 0, easing: `cubic-bezier(${RETURN_CURVE.join(', ')})` },
        { transform: this.layerTransform(m, 0), opacity: 1, offset: RETURN / span, easing: 'linear' },
        { transform: this.layerTransform(m, 0), opacity: 0, offset: 1 },
      ],
      ms: span * 1000,
      clip: this.layerClip(),
    };
  }

  /** The page layer's animation keeps the trip's time from here, so the device and the page can't drift. */
  syncTrip(anim: Animation) {
    const trip = this.trip;
    if (!trip) return;
    trip.clock = anim;
    trip.clockFrom = trip.dir === 'in' ? trip.arriveAt : 0;
  }

  /** A click on the phone: press the button on screen, or move the story on. */
  press() {
    if (this.mode === 'none' || this.trip) return;
    const tap = TAP[this.shot];
    if (this.hold) {
      if (tap !== undefined && this.holdT < tap) {
        this.holdT = tap;
        this.holdUntil = performance.now() + 700;
        this.dirty = true;
        return;
      }
      this.release();
      return;
    }
    if (tap !== undefined && this.t < tap) {
      this.t = tap;
      this.extend = Math.max(0, tap + 0.7 - this.current().dur);
      this.dirty = true;
    } else this.next();
  }

  /** Re-dress the example brand: the visitor's own name, color and icon. */
  setBrand(p: { name?: string; color?: string | null; host?: string; icon?: string | null }) {
    const b = this.brand;
    if (p.name) b.name = p.name.slice(0, 22);
    if (p.host) b.host = p.host.replace(/^www\./, '').split('.')[0].toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || b.host;
    if (p.color) {
      b.color = p.color;
      b.ink = luminance(p.color) > 0.55 ? '#17141F' : '#FFFFFF';
    }
    b.what = 'Picked by creators';
    // the visitor's own brand: drawn in its colors, paid at checkout (we don't know its trial)
    b.look = null;
    b.trial = 0;
    if (p.host) b.domain = p.host.replace(/^www\./, '').toLowerCase().slice(0, 40);
    b.product = b.name;
    b.icon = null;
    if (p.icon) {
      const img = new Image();
      img.onload = () => {
        b.icon = img;
        this.dirty = true;
      };
      img.src = p.icon;
    }
    this.holdOn('store', 7, 0.4);
  }

  setCreator(handle: string) {
    const h = handle.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20);
    if (!h) return;
    const c = this.creator;
    c.slug = h;
    c.handle = `@${h}`;
    c.first = h.charAt(0).toUpperCase() + h.slice(1).split(/[._]/)[0];
    c.name = c.first.length > 12 ? c.first.slice(0, 12) : c.first;
    c.photo = null;
    this.holdOn('hub', 7, 0.4);
  }

  /** Hold a screen in a still pose, for posters and tests: stage.debugShot('verify', 2.6). */
  debugShot(id: Shot, t: number) {
    this.frozen = true;
    this.holdOn(id, Infinity, t);
    this.slide = 1;
    this.prev = null;
  }

  /* ---------------------------------------------------------------- timeline */

  private seq(): Beat[] {
    const loops = LOOPS[this.mode === 'none' ? 'fork' : this.mode];
    return loops[this.loop % loops.length];
  }
  private current(): Beat {
    return this.seq()[this.beat % this.seq().length];
  }
  private next() {
    const s = this.seq();
    this.beat++;
    if (this.beat >= s.length) {
      this.beat = 0;
      this.loop++;
    }
    this.t = 0;
    this.extend = 0;
    this.show(this.current().id);
  }
  /** End a held screen: resume where we were told to, or carry on from the held screen's place in the story. */
  private release() {
    const id = this.hold!;
    this.hold = null;
    if (this.resume !== null) {
      this.beat = this.resume;
      this.resume = null;
      this.t = 0;
      this.extend = 0;
      this.show(this.current().id);
      return;
    }
    const i = this.seq().findIndex((b) => b.id === id);
    if (i >= 0) this.beat = i;
    this.next();
  }
  private show(id: Shot, dir: 1 | -1 = 1) {
    if (id !== this.shot) {
      this.prev = { id: this.shot, t: this.shotT };
      this.slide = 0;
      this.slideDir = dir;
    }
    this.shot = id;
    this.dirty = true;
    const step = this.hold ? stepOf(id) : this.current().step;
    dispatchEvent(new CustomEvent('stage:beat', { detail: { step, id, returning: id === 'refused' || id === 'checkout-returning' } }));
  }
  private holdOn(id: Shot, seconds: number, t = 0, resume: number | null = null, dir: 1 | -1 = 1) {
    if (this.hold === id && seconds === Infinity) return;
    this.shotT = this.hold ? this.holdT : this.t;
    this.hold = id;
    this.holdT = t;
    this.resume = resume;
    this.holdUntil = seconds === Infinity ? Infinity : performance.now() + seconds * 1000;
    this.show(id, dir);
  }

  /* ---------------------------------------------------------------- frame */

  private upp(): number {
    return (2 * DIST * Math.tan(((FOV / 2) * Math.PI) / 180)) / innerHeight;
  }

  /** Height in world units of whatever's on show, and its width over height. */
  private modelH(): number {
    return this.kind() === 'phone' ? PH : this.dev!.size.h;
  }
  private modelAspect(): number {
    return this.kind() === 'phone' ? ASPECT : this.dev!.size.w / this.dev!.size.h;
  }
  /** A laptop's lid leans back a touch at rest, like an open laptop, so its deck is a sliver; the rest face us. */
  private restPitch(): number {
    return this.mode === 'fork' && this.kind() === 'laptop' ? -0.05 : 0;
  }

  /** World-space placement for the current anchor, or along a trip. */
  private place(): Placement | null {
    const vw = innerWidth;
    const vh = innerHeight;
    const upp = this.upp();
    if (this.trip) return this.fromLayer(this.layerAt(this.trip.mini, this.tripE()), upp);
    if (!this.anchor) return null;
    const r = this.anchor.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const h = Math.min(r.height, r.width / this.modelAspect());
    return { x: (cx - vw / 2) * upp, y: -(cy - vh / 2) * upp, s: (h * upp) / this.modelH() };
  }

  /* The page layer and the device's page area are one rectangle seen two ways. The layer is the page at scale k,
     centred (tx, ty) off the view's middle; the area is that rectangle a hair wider (MINI). Perspective is exact:
     the area sits c.z in front of the device's middle, so it projects a little larger than the device's plane. */

  /** Where the page sits in the screen for a device placement. */
  private miniFor(p: Placement): Mini {
    const c = this.dev!.content;
    const upp = this.upp();
    const persp = DIST / (DIST - c.z * p.s);
    const cx = ((p.x + c.x * p.s) * persp) / upp;
    const cy = -((p.y + c.y * p.s) * persp) / upp;
    const cw = (c.w * p.s * persp) / upp;
    return { tx: cx, ty: cy, k: (cw * MINI) / innerWidth };
  }

  /** The device placement that puts its page area around the page layer at `m`. */
  private fromLayer(m: Mini, upp: number): Placement {
    const c = this.dev!.content;
    const want = ((innerWidth * m.k) / MINI) * upp; // the area's projected width, in world units at the device plane
    let s = want / c.w;
    let persp = 1;
    for (let i = 0; i < 5; i++) {
      persp = DIST / (DIST - c.z * s);
      s = want / (c.w * persp);
    }
    return { x: (m.tx * upp) / persp - c.x * s, y: (-m.ty * upp) / persp - c.y * s, s };
  }

  /** The layer between the fork end (e = 0) and full size (e = 1); translate and scale both move linearly in e,
   *  exactly as the browser interpolates the layer's keyframes. */
  private layerAt(m: Mini, e: number): Mini {
    return { tx: m.tx * (1 - e), ty: m.ty * (1 - e), k: m.k + (1 - m.k) * e };
  }
  private layerTransform(m: Mini, e: number): string {
    const l = this.layerAt(m, e);
    return `translate(${l.tx.toFixed(2)}px, ${l.ty.toFixed(2)}px) scale(${l.k.toFixed(5)})`;
  }
  /** The page area in the layer's own pixels: fixed, since the layer's scale tracks the area. 2% over, so its edge
   *  always sits under the browser chrome or the bezel; page colour fills the hair between page and area. */
  private layerClip(): string {
    const c = this.dev!.content;
    const vw = innerWidth;
    const vh = innerHeight;
    const halfW = (vw / MINI / 2) * 1.02;
    const halfH = ((vw * (c.h / c.w)) / MINI / 2) * 1.02;
    return `inset(${(vh / 2 - halfH).toFixed(1)}px ${(vw / 2 - halfW).toFixed(1)}px)`;
  }

  /** The slow first part of the trip in: how far along it is at t. */
  private slowE(t: number): number {
    return V0 * Math.min(t, SLOW_CAP);
  }

  /** 0..1 along the trip, from the fork end to full size. Out runs it backwards. */
  private tripE(): number {
    const trip = this.trip!;
    const ct = trip.clock?.currentTime;
    const t = typeof ct === 'number' ? trip.clockFrom + ct / 1000 : trip.t;
    if (trip.dir === 'out') return 1 - returnEase(Math.min(1, t / RETURN));
    if (!trip.arrived) return this.slowE(t);
    if (t < trip.flyAt) return trip.eArrive + (trip.eFly - trip.eArrive) * clamp01((t - trip.arriveAt) / Math.max(0.001, trip.flyAt - trip.arriveAt));
    return trip.eFly + (1 - trip.eFly) * flyEase(Math.min(1, (t - trip.flyAt) / FLY));
  }

  /** Move a trip on, and the device's browser with it. */
  private stepTrip(dt: number) {
    const trip = this.trip!;
    const ct = trip.clock?.currentTime;
    trip.t = typeof ct === 'number' ? trip.clockFrom + ct / 1000 : trip.t + dt;
    const n = trip.nav;
    const e = this.tripE();
    this.dirty = true;
    if (trip.dir === 'out') {
      // the browser goes back to its demo once the page is home in the screen
      const k = clamp01((trip.t - RETURN) / RETURN_SWAP);
      n.reveal = 1 - k;
      n.typing = k > 0.5 ? 0 : 1;
      this.setOpacity(1);
      if (trip.t >= RETURN + RETURN_SWAP) this.landHome();
      return;
    }
    // a page load: the address changes, the load bar runs, the page paints over the demo
    n.typing = trip.t >= COMMIT ? 1 : 0;
    if (trip.t < COMMIT) n.progress = null;
    else if (!trip.arrived || !trip.clock) n.progress = Math.min(0.85, 0.08 + 0.62 * easeOut((trip.t - COMMIT) / LOAD) + 0.15 * clamp01((trip.t - COMMIT - LOAD) / 1.5));
    else n.progress = Math.min(1, (n.progress ?? 0.7) + dt / 0.18);
    n.reveal = trip.arrived && trip.clock ? easeOut((trip.t - trip.arriveAt) / PAINT) : 0;
    // without view transitions there's no page to show in the screen: go once the load bar is through
    if (trip.resolve && trip.t >= COMMIT + LOAD) {
      trip.resolve();
      trip.resolve = null;
    }
    // the last of the flight: the page all but fills the view, so the device's edges slip away rather than linger
    this.setOpacity(1 - clamp01((e - 0.86) / 0.12));
    if (trip.arrived && trip.clock && e >= 1) this.land();
  }

  /** In, done: the page in the screen is now the page. The hero's phone takes over from its poster in the same spot,
   *  and the story starts from its first frame, so the hand-off is invisible. */
  private land() {
    this.trip = null;
    this.useDevice(false);
    this.loop = 0;
    this.hold = null;
    this.beat = START[this.mode === 'none' ? 'fork' : this.mode];
    this.t = 0;
    this.prev = null;
    this.slide = 1;
    this.shot = this.current().id;
    this.show(this.shot);
    this.settleAt(HERO_YAW, 0);
    dispatchEvent(new CustomEvent('stage:landed'));
  }

  /** Out, done: the device is in its place on the fork, showing its demo again. */
  private landHome() {
    this.trip = null;
    this.settleAt(0, 0);
    this.yaw.w = 3;
    this.pitch.w = 3;
    dispatchEvent(new CustomEvent('stage:landed'));
  }

  private settleAt(yaw: number, pitch: number) {
    this.px.set(0);
    this.py.set(0);
    this.ps.set(1);
    this.yaw.set(yaw);
    this.pitch.set(pitch);
    this.settle = 0;
    this.setOpacity(1);
    this.dirty = true;
  }

  private setOpacity(v: number) {
    const o = Math.round(v * 1000) / 1000;
    if (o === this.opacity) return;
    this.opacity = o;
    this.canvas.style.opacity = String(o);
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    if (document.hidden || !this.ready) return;
    const dt = Math.min(1 / 30, Math.max(0, (now - this.lastNow) / 1000));
    this.lastNow = now;
    this.time += dt;
    if (this.mode === 'none' || !this.phone) return;

    const still = reduce();
    if (this.trip) this.stepTrip(dt);
    const p = this.place();
    if (!p) return;
    // stop drawing when the device has scrolled away
    const vis = this.anchorOnScreen() || !!this.trip || Math.abs(this.px.x) + Math.abs(this.py.x) > 0.01;
    if (!vis) {
      if (this.visible) {
        this.visible = false;
        this.renderer.clear();
      }
      return;
    }
    this.visible = true;

    /* timeline */
    if (!still && !this.frozen) {
      if (this.hold) {
        this.holdT += dt;
        if (performance.now() > this.holdUntil) this.release();
      } else {
        this.t += dt;
        if (this.t >= this.current().dur + this.extend) this.next();
      }
    }
    const t = this.hold ? this.holdT : this.t;
    this.shotT = t;

    /* placement: follow the anchor exactly, spring only the offset left over from the last anchor */
    const ox = still || this.trip ? 0 : this.px.step(0, dt);
    const oy = still || this.trip ? 0 : this.py.step(0, dt);
    const os = still || this.trip ? 1 : this.ps.step(1, dt);
    // appearing: it rises a touch and grows into place as it fades up
    const ea = easeOut(this.appear);
    const lift = this.trip ? 0 : (1 - ea) * 0.05 * p.s * this.modelH();
    this.rig.position.set(p.x + ox, p.y + oy - lift, 0);
    this.rig.scale.setScalar(p.s * os * (this.trip ? 1 : 0.97 + 0.03 * ea));
    if (!this.trip) this.last = { x: p.x + ox, y: p.y + oy, s: p.s * os };

    /* pose */
    const beat = this.hold ? null : this.current();
    let yawT = this.mode === 'fork' ? 0 : HERO_YAW;
    if (beat?.yaw !== undefined) yawT = beat.yaw;
    if (this.hold === 'brand' && this.mode === 'fork') yawT = -0.3;
    if (this.hold === 'creator' && this.mode === 'fork') yawT = 0.3;
    // the fork's device faces us square: no pointer tilt there, so the shared view reads the same from both sides
    const fine = !coarse() && !this.frozen && this.mode !== 'fork';
    if (this.settle < 1) this.settle = Math.min(1, this.settle + dt / 1.2);
    const live = this.trip ? 0 : this.settle * this.settle * (3 - 2 * this.settle);
    const breathe = still || this.frozen || this.trip ? 0 : Math.sin(this.time * 0.6) * 0.012 * live;
    let yaw = still ? yawT : this.yaw.step(yawT + (fine ? this.pointer.x * 0.07 * live : 0), dt);
    let pitch = still ? 0 : this.pitch.step(this.restPitch() + (fine ? this.pointer.y * 0.05 * live : 0), dt);
    if (this.trip) {
      // turn to face us, and stay square for the flight
      const sq = 1 - easeOut(this.trip.t / SQUARE);
      yaw = this.trip.yaw0 * sq;
      pitch = this.trip.pitch0 * sq;
      this.yaw.set(yaw);
      this.pitch.set(pitch);
    }
    const dip = this.dip.step(0, dt);
    this.turn.rotation.set(pitch + (this.frozen || this.trip ? 0 : Math.sin(this.time * 0.45) * 0.008 * live), yaw + breathe, 0);
    this.turn.position.z = dip;
    this.shadow.position.x = 0.08 - Math.sin(yaw) * 0.2;
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = this.trip ? 1 - this.tripE() : 1;

    /* the fork's device fades up with the page's own reveal, and the first time it's drawn */
    if (!this.trip) {
      let o = 1;
      if (this.reveal) {
        o = parseFloat(getComputedStyle(this.reveal).opacity);
        if (o >= 1) this.reveal = null;
      }
      // it waits for the page's own reveal to start, then takes its time
      if (this.appear < 1 && o > 0.05) this.appear = Math.min(1, this.appear + dt / 0.9);
      this.setOpacity(o * easeOut(this.appear));
    }

    /* a small haptic dip as the payment confirms */
    if ((this.shot === 'verify' || this.shot === 'refused') && t >= 1.4 && t < 1.6) {
      if (!this.tapped && !still) {
        this.tapped = true;
        this.dip.v = this.shot === 'verify' ? -0.32 : -0.12;
      }
    } else if (t < 1.4) this.tapped = false;

    /* screen */
    if (this.slide < 1) {
      // a slide still running when a side is picked finishes quickly, before the page paints
      this.slide = Math.min(1, this.slide + dt / (this.trip ? 0.22 : this.mode === 'fork' ? 0.8 : 0.5));
      this.dirty = true;
    }
    if ((SETTLE[this.shot] ?? 2) > t - dt) this.dirty = true;
    if (this.dirty) {
      this.dirty = false;
      const kind = this.kind();
      const prev = this.slide < 1 && this.prev ? this.prev : undefined;
      // the phone always paints its own app; it's the demo, and on the fork it's what its browser shows at first
      if (kind === 'phone') {
        paint(this.uiCtx, this.shot, t, this.brand, this.creator, prev, this.slide, this.slideDir);
        this.tex.needsUpdate = true;
      }
      if (this.dev && (this.mode === 'fork' || this.trip)) {
        paintScreen(this.devCtx, { kind, css: this.dev.css }, this.devPx, this.shot, t, this.brand, this.creator, this.trip?.nav ?? null, {
          prev,
          slide: this.slide,
          dir: this.slideDir,
          app: kind === 'phone' ? this.ui : undefined,
        });
        this.devTex.needsUpdate = true;
      }
    }

    this.renderer.render(this.scene, this.camera);
    if (!this.drawnOnce) {
      this.drawnOnce = true;
      document.documentElement.classList.add('stage-drawn');
    }
    this.watchPerf(dt);
  };

  private anchorOnScreen(): boolean {
    if (!this.anchor) return false;
    const r = this.anchor.getBoundingClientRect();
    return r.bottom > -40 && r.top < innerHeight + 40;
  }

  private watchPerf(dt: number) {
    if (this.frames > 90) return;
    this.frames++;
    if (this.frames < 10) return;
    if (dt > 0.045) this.slowFrames++;
    if (this.frames === 90 && this.slowFrames > 50) this.fail();
  }

  /** Normalized device coords of a client point, raycast to the screen's UV. */
  hitScreen(clientX: number, clientY: number): { u: number; v: number } | null {
    if (!this.screenMeshes.length) return null;
    const ndc = new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const hit = this.ray.intersectObjects(this.screenMeshes, false)[0];
    return hit?.uv ? { u: hit.uv.x, v: hit.uv.y } : null;
  }
}

function stepOf(id: Shot): number {
  return { post: 0, store: 1, checkout: 2, 'checkout-returning': 2, verify: 3, refused: 3, sale: 3, brand: 4, creator: 4, hub: 4 }[id];
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export const stage = new Stage();
