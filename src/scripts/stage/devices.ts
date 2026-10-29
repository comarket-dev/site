/**
 * The device the fork shows: whatever we think the visitor is holding, so the flight from the fork into the next page
 * goes through a screen shaped like their own. The phone is the designed model (phone.glb). The tablet, laptop and
 * monitor are built here at load, each with a screen cut to the visitor's window plus that device's browser chrome,
 * so the page they're about to see fits its screen exactly.
 *
 * The kind and the slot's proportions are decided before first paint by the inline script in Base.astro, which
 * mirrors the constants below. Change one, change both.
 */
import * as THREE from 'three';

export type DeviceKind = 'phone' | 'tablet' | 'laptop' | 'monitor';

/** Browser chrome above the page, in CSS pixels: status bar and toolbar, or tab strip and toolbar. */
export const CHROME_TOP: Record<Exclude<DeviceKind, 'phone'>, number> = { tablet: 74, laptop: 84, monitor: 84 };

/* proportions, with the screen's width as 1 */
const TABLET_BEZEL = 0.032;
const LAPTOP = { side: 0.016, top: 0.028, bottom: 0.022, base: 0.045 };
const MONITOR = { bezel: 0.018, chin: 0.04, stand: 0.24 };

/** The phone's screen, from design/stage/build_stage.py: 0.72 x 1.52 with a 0.026 inset. */
export const PHONE_SCREEN = { w: 0.668, h: 1.468 };

export interface Device {
  kind: DeviceKind;
  root: THREE.Group;
  /** The screen surface. Its uvs run 0..1 from the top left, like the canvas drawn onto it. */
  screen: THREE.Mesh | null;
  /** Bounding box, in local units, for fitting the device to its slot. */
  size: { w: number; h: number };
  /** The page area on the screen, in local units: centre, width, height, and depth of the screen's surface. */
  content: { x: number; y: number; w: number; h: number; z: number };
  /** The screen in the visitor's CSS pixels: as wide as their window, the page area starting `top` down and inset
   *  `side` from each edge when the screen is too short to fit the window's shape between its bars. */
  css: { w: number; h: number; top: number; bottom: number; side: number };
}

/** What the visitor is probably using, from their window and pointer. Same rules as Base.astro's inline script. */
export function pickDevice(): DeviceKind {
  const d = document.documentElement.dataset.device as DeviceKind | undefined;
  if (d === 'phone' || d === 'tablet' || d === 'laptop' || d === 'monitor') return d;
  const a = innerWidth / innerHeight;
  const coarse = matchMedia('(pointer: coarse)').matches;
  // phones by width, not shape: a tall iPad is narrow too
  if (innerWidth < 600 || (coarse && Math.min(screen.width, screen.height) < 600)) return 'phone';
  if (coarse || a < 1.15) return 'tablet';
  return innerWidth >= 1800 ? 'monitor' : 'laptop';
}

/** The phone's screen as a browser: status bar on top, Safari's toolbar below, the page between at the window's shape. */
export function phoneCss(): Device['css'] {
  const w = innerWidth;
  const h = w * (PHONE_SCREEN.h / PHONE_SCREEN.w);
  const top = 50;
  const bottom = 60;
  // the page area keeps the window's shape; if it can't fit between the bars at full width, it narrows
  const ah = Math.min(innerHeight, h - top - bottom);
  const aw = Math.min(w, ah * (innerWidth / innerHeight));
  const spare = h - ah;
  const t = Math.max(top, spare * 0.42);
  return { w, h, top: t, bottom: spare - t, side: (w - aw) / 2 };
}

function rounded(w: number, h: number, r: [number, number, number, number]): THREE.Shape {
  // corners: top left, top right, bottom right, bottom left
  const [tl, tr, br, bl] = r;
  const x = -w / 2;
  const y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + bl, y);
  s.lineTo(x + w - br, y);
  s.quadraticCurveTo(x + w, y, x + w, y + br);
  s.lineTo(x + w, y + h - tr);
  s.quadraticCurveTo(x + w, y + h, x + w - tr, y + h);
  s.lineTo(x + tl, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - tl);
  s.lineTo(x, y + bl);
  s.quadraticCurveTo(x, y, x + bl, y);
  return s;
}

/** A flat face with uvs from its top left corner, so a canvas maps onto it the right way up. */
function face(w: number, h: number, r: [number, number, number, number], mat: THREE.Material): THREE.Mesh {
  const g = new THREE.ShapeGeometry(rounded(w, h, r), 16);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (h / 2 - pos.getY(i)) / h);
  uv.needsUpdate = true;
  return new THREE.Mesh(g, mat);
}

/** A slab with softened edges, centred on its own middle. */
function slab(w: number, h: number, d: number, r: [number, number, number, number], mat: THREE.Material): THREE.Mesh {
  const bev = Math.min(d * 0.35, 0.006);
  const g = new THREE.ExtrudeGeometry(rounded(w - bev * 2, h - bev * 2, r.map((v) => Math.max(0.002, v - bev)) as [number, number, number, number]), {
    depth: d - bev * 2,
    bevelEnabled: true,
    bevelThickness: bev,
    bevelSize: bev,
    bevelSegments: 4,
    curveSegments: 16,
  });
  g.translate(0, 0, -(d - bev * 2) / 2);
  return new THREE.Mesh(g, mat);
}

export interface Mats {
  frame: THREE.Material;
  glass: THREE.Material;
  dark: THREE.Material;
  screen: THREE.Material;
}

/** Build the device for the visitor's window. The phone comes from phone.glb, so this only describes its screen. */
export function buildDevice(kind: DeviceKind, m: Mats): Device {
  const vw = innerWidth;
  const vh = innerHeight;
  if (kind === 'phone') {
    const css = phoneCss();
    const cw = PHONE_SCREEN.w * ((css.w - css.side * 2) / css.w);
    const ch = PHONE_SCREEN.h * ((css.h - css.top - css.bottom) / css.h);
    const cy = PHONE_SCREEN.h / 2 - PHONE_SCREEN.h * (css.top / css.h) - ch / 2;
    return { kind, root: new THREE.Group(), screen: null, size: { w: 0.72, h: 1.52 }, content: { x: 0, y: cy, w: cw, h: ch, z: 0.0374 }, css };
  }
  const top = CHROME_TOP[kind];
  const css = { w: vw, h: vh + top, top, bottom: 0, side: 0 };
  const SW = 1;
  const SH = css.h / css.w;
  const root = new THREE.Group();
  const content = { x: 0, y: 0, w: SW, h: SW * (vh / vw), z: 0 };
  let size = { w: 1, h: 1 };
  let screen: THREE.Mesh;

  if (kind === 'tablet') {
    const T = 0.03;
    const bw = SW + TABLET_BEZEL * 2;
    const bh = SH + TABLET_BEZEL * 2;
    root.add(slab(bw, bh, T, [0.06, 0.06, 0.06, 0.06], m.frame));
    const glass = face(bw - 0.006, bh - 0.006, [0.057, 0.057, 0.057, 0.057], m.glass);
    glass.position.z = T / 2 + 0.0004;
    root.add(glass);
    screen = face(SW, SH, [0.03, 0.03, 0.03, 0.03], m.screen);
    screen.position.z = T / 2 + 0.0008;
    root.add(screen);
    const cam = new THREE.Mesh(new THREE.CircleGeometry(0.006, 20), m.dark);
    cam.position.set(0, bh / 2 - TABLET_BEZEL / 2, T / 2 + 0.0009);
    root.add(cam);
    size = { w: bw, h: bh };
    content.y = SH / 2 - SW * (top / vw) - content.h / 2;
    content.z = T / 2 + 0.0008;
  } else if (kind === 'laptop') {
    const T = 0.012;
    const bw = SW + LAPTOP.side * 2;
    const bh = SH + LAPTOP.top + LAPTOP.bottom;
    const lid = new THREE.Group();
    lid.add(slab(bw, bh, T, [0.024, 0.024, 0.01, 0.01], m.frame));
    const glass = face(bw - 0.004, bh - 0.004, [0.022, 0.022, 0.008, 0.008], m.glass);
    glass.position.z = T / 2 + 0.0004;
    lid.add(glass);
    screen = face(SW, SH, [0.012, 0.012, 0.004, 0.004], m.screen);
    screen.position.set(0, (LAPTOP.bottom - LAPTOP.top) / 2, T / 2 + 0.0008);
    lid.add(screen);
    const cam = new THREE.Mesh(new THREE.CircleGeometry(0.004, 20), m.dark);
    cam.position.set(0, bh / 2 - LAPTOP.top / 2, T / 2 + 0.0009);
    lid.add(cam);
    // the base lies flat in front of the lid, hinged at its bottom edge
    const depth = bw * 0.6;
    const base = slab(bw * 1.015, depth, 0.016, [0.02, 0.02, 0.03, 0.03], m.frame);
    base.rotation.x = -Math.PI / 2;
    base.position.set(0, -bh / 2 - 0.008, depth / 2 - T / 2);
    const keys = face(bw * 0.86, depth * 0.42, [0.01, 0.01, 0.01, 0.01], m.dark);
    keys.rotation.x = -Math.PI / 2;
    keys.position.set(0, -bh / 2 + 0.0005, depth * 0.3);
    const pad = face(bw * 0.34, depth * 0.3, [0.012, 0.012, 0.012, 0.012], m.glass);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, -bh / 2 + 0.0005, depth * 0.73);
    root.add(lid, base, keys, pad);
    // centre the whole thing on its visible height: the lid plus a sliver of base
    const visible = bh + LAPTOP.base;
    lid.position.y = visible / 2 - bh / 2;
    base.position.y += lid.position.y;
    keys.position.y += lid.position.y;
    pad.position.y += lid.position.y;
    size = { w: bw * 1.015, h: visible };
    content.y = lid.position.y + screen.position.y + SH / 2 - SW * (top / vw) - content.h / 2;
    content.z = T / 2 + 0.0008;
  } else {
    const T = 0.02;
    const bw = SW + MONITOR.bezel * 2;
    const bh = SH + MONITOR.bezel * 2 + MONITOR.chin;
    const panel = new THREE.Group();
    panel.add(slab(bw, bh, T, [0.016, 0.016, 0.016, 0.016], m.frame));
    const glass = face(bw - 0.004, bh - MONITOR.chin - 0.004, [0.014, 0.014, 0.004, 0.004], m.glass);
    glass.position.set(0, MONITOR.chin / 2, T / 2 + 0.0004);
    panel.add(glass);
    screen = face(SW, SH, [0.004, 0.004, 0.004, 0.004], m.screen);
    screen.position.set(0, MONITOR.chin / 2, T / 2 + 0.0008);
    panel.add(screen);
    const neck = slab(0.16, MONITOR.stand + 0.1, 0.03, [0.01, 0.01, 0.01, 0.01], m.frame);
    neck.position.set(0, -bh / 2 - MONITOR.stand / 2 + 0.05, -T / 2 - 0.02);
    const foot = slab(0.46, 0.26, 0.018, [0.03, 0.03, 0.03, 0.03], m.frame);
    foot.rotation.x = -Math.PI / 2;
    foot.position.set(0, -bh / 2 - MONITOR.stand, 0.02);
    root.add(panel, neck, foot);
    const visible = bh + MONITOR.stand;
    const lift = visible / 2 - bh / 2;
    panel.position.y = lift;
    neck.position.y += lift;
    foot.position.y += lift;
    size = { w: bw, h: visible };
    content.y = lift + screen.position.y + SH / 2 - SW * (top / vw) - content.h / 2;
    content.z = T / 2 + 0.0008;
  }
  return { kind, root, screen, size, content, css };
}
