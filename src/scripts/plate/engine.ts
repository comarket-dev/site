/**
 * The plate: one persistent WebGL2 canvas behind the page. It draws the fork ribbon and
 * the hero rosette from the same family of lines, so choosing a side on the fork can
 * flow straight into that page's hero without a cut.
 */
import { LINE_FS, LINE_VS, PEN_FS, PEN_VS, TEXT_FS, TEXT_VS } from './shaders';

export type PlateMode = 'fork' | 'hero' | 'none';
export type Side = 'brands' | 'creators';

type Listener = (p: { draw: number }) => void;

const INK: [number, number, number] = [5 / 255, 18 / 255, 48 / 255];
const BENZOL: [number, number, number] = [0, 151 / 255, 141 / 255];
const PAPER: [number, number, number] = [237 / 255, 240 / 255, 236 / 255];

/* ---------- small math ---------- */
type V3 = [number, number, number];
function persp(fy: number, a: number, n: number, f: number) {
  const t = 1 / Math.tan(fy / 2);
  return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0];
}
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function look(e: V3, c: V3, u: V3) {
  const z = norm(sub(e, c));
  const x = norm(cross(u, z));
  const y = cross(z, x);
  return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1];
}
function mul(a: number[], b: number[]) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let q = 0; q < 4; q++) s += a[q * 4 + r] * b[c * 4 + q];
      o[c * 4 + r] = s;
    }
  return o;
}
function project(m: number[], p: V3): [number, number] {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  return [x / w, y / w];
}
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** Frame-rate independent approach toward a target. */
const approach = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

/** Spread lane order so drawing a prefix of instances still covers the whole ribbon evenly. */
function spreadOrder(n: number) {
  const bits = Math.ceil(Math.log2(n));
  const rev = (k: number) => {
    let r = 0;
    for (let i = 0; i < bits; i++) r |= ((k >> i) & 1) << (bits - 1 - i);
    return r;
  };
  return Array.from({ length: n }, (_, i) => i).sort((a, b) => rev(a) - rev(b));
}

/* ---------- engine ---------- */
class Plate {
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private line: { prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null>; vao: WebGLVertexArrayObject } | null = null;
  private pen: { prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null>; vao: WebGLVertexArrayObject } | null = null;
  private text: { prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null>; vao: WebGLVertexArrayObject } | null = null;
  private words: { tex: WebGLTexture; aspect: number }[] = [];
  private lanes = 0;
  private seg = 0;
  private laneBudget = 1;
  private frameTimes: number[] = [];

  private W = 0;
  private H = 0;
  private dpr = 1;
  private portrait = false;
  private raf = 0;
  private last = 0;
  private time = 0;
  private reduce = false;
  private listeners = new Set<Listener>();
  private PV: number[] = [];

  ready = false;
  mode: PlateMode = 'none';
  side: Side = 'brands';

  /* animated state */
  private s = {
    fade: 0, fadeT: 0,
    hl: 0, hr: 0, tl: 0, tr: 0,
    mx: 0, my: 0, tmx: 0, tmy: 0,
    wake: 0,
    unr: 0, unrT: 0,
    morph: 0, morphT: 0,
    ch: 0,
    draw: 1, drawT: 1,
    words: 0, wordsT: 0,
    scroll: 0,
    spin: 0,
  };

  init(canvas: HTMLCanvasElement) {
    if (this.canvas) return this.ready;
    this.canvas = canvas;
    this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) {
      document.documentElement.classList.add('no-gl');
      return false;
    }
    this.gl = gl;
    try {
      this.build();
    } catch (e) {
      console.error('plate init failed', e);
      document.documentElement.classList.add('no-gl');
      this.gl = null;
      return false;
    }
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      cancelAnimationFrame(this.raf);
    });
    new ResizeObserver(() => this.resize()).observe(canvas);
    window.addEventListener('pointermove', (e) => this.onPointer(e), { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.kick();
    });
    this.resize();
    this.ready = true;
    this.kick();
    return true;
  }

  private compile(vs: string, fs: string, uniforms: string[]) {
    const gl = this.gl!;
    const mk = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link');
    const u: Record<string, WebGLUniformLocation | null> = {};
    for (const n of uniforms) u[n] = gl.getUniformLocation(prog, n);
    return { prog, u };
  }

  private build() {
    const gl = this.gl!;
    const shared = ['uTime', 'uHL', 'uHR', 'uUnr', 'uCh', 'uWake', 'uMorph', 'uPortrait', 'uScale', 'uLayer', 'uSpin', 'uRosC', 'uRosR', 'uRosTilt'];
    const small = Math.min(innerWidth, innerHeight) < 700 || (navigator.hardwareConcurrency ?? 8) <= 4;
    this.lanes = small ? 84 : 140;
    this.seg = small ? 620 : 900;

    // line program
    const l = this.compile(LINE_VS, LINE_FS, [...shared, 'uPV', 'uRes', 'uMouse', 'uSeg', 'uDpr', 'uWidth', 'uDraw', 'uFade', 'uAspect', 'uSheen', 'uInk', 'uAcc']);
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const corner = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, corner);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, -1, 0, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const order = spreadOrder(this.lanes);
    const inst = new Float32Array(this.lanes * this.seg * 2);
    let k = 0;
    for (const lane of order) {
      const lv = lane / (this.lanes - 1);
      for (let j = 0; j < this.seg; j++) {
        inst[k++] = j / this.seg;
        inst[k++] = lv;
      }
    }
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ib);
    gl.bufferData(gl.ARRAY_BUFFER, inst, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    this.line = { ...l, vao };

    // pen
    const p = this.compile(PEN_VS, PEN_FS, [...shared, 'uPV', 'uDraw', 'uDpr', 'uPenSize', 'uAcc', 'uPenAlpha']);
    this.pen = { ...p, vao: gl.createVertexArray()! };

    // words
    const t = this.compile(TEXT_VS, TEXT_FS, ['uPV', 'uCenter', 'uSize', 'uTex', 'uHover', 'uAlpha', 'uTime', 'uRows', 'uDepthPass', 'uInk', 'uAcc']);
    const tvao = gl.createVertexArray()!;
    gl.bindVertexArray(tvao);
    const tb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.text = { ...t, vao: tvao };
    gl.bindVertexArray(null);
  }

  /** Render "Brands" and "Creators" into textures once Satoshi has loaded. */
  async setWords(words: [string, string]) {
    if (!this.gl) return;
    try {
      await document.fonts.load('700 200px Satoshi');
    } catch {
      /* fall back to whatever loaded */
    }
    const gl = this.gl;
    this.words = words.map((w) => {
      const F = 220;
      const c = document.createElement('canvas');
      const x = c.getContext('2d')!;
      const font = `700 ${F}px Satoshi, ui-sans-serif, system-ui, sans-serif`;
      x.font = font;
      const ls = -0.05 * F;
      const m = x.measureText(w);
      const width = Math.ceil(m.width + ls * (w.length - 1) + F * 0.2);
      c.width = width;
      c.height = Math.ceil(F * 1.25);
      x.font = font;
      if ('letterSpacing' in x) (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${ls}px`;
      x.textBaseline = 'middle';
      x.textAlign = 'center';
      x.fillStyle = '#000';
      x.fillText(w, c.width / 2 - ls / 2, c.height * 0.53);
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return { tex, aspect: c.width / c.height };
    });
    this.kick();
  }

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /* ---------- public controls ---------- */
  setMode(mode: PlateMode, side?: Side, opts: { intro?: boolean } = {}) {
    const prev = this.mode;
    this.mode = mode;
    if (side) this.side = side;
    const s = this.s;
    if (mode === 'fork') {
      s.fadeT = 1;
      s.morphT = 0;
      s.unrT = 0;
      s.wordsT = 1;
      if (prev === 'none' || !this.ready) s.morph = 0;
    } else if (mode === 'hero') {
      s.fadeT = 1;
      s.morphT = 1;
      s.wordsT = 0;
      s.tl = s.tr = 0;
      if (prev !== 'fork') {
        s.morph = 1;
        s.unr = s.unrT = 0;
      }
    } else {
      s.fadeT = 0;
      s.wordsT = 0;
    }
    if (opts.intro && !this.reduce) {
      s.draw = 0;
      s.drawT = 1;
      if (prev === 'none') s.fade = 1;
    } else {
      s.drawT = 1;
      if (this.reduce) s.draw = 1;
    }
    if (this.reduce) {
      s.fade = s.fadeT;
      s.morph = s.morphT;
      s.words = s.wordsT;
    }
    this.kick();
  }

  hover(side: Side | null) {
    this.s.tl = side === 'brands' ? 1 : 0;
    this.s.tr = side === 'creators' ? 1 : 0;
    this.kick();
  }

  /** Lean into a side, then let the rosette form. Navigation happens alongside. */
  choose(side: Side) {
    this.side = side;
    this.s.ch = side === 'brands' ? 0 : 1;
    this.hover(side);
    this.s.unrT = 1;
    this.s.morphT = 1;
    this.kick();
  }

  setScroll(v: number) {
    this.s.scroll = clamp(v, 0, 1);
    this.kick();
  }

  isPortrait() {
    return this.portrait;
  }

  private wordHeight() {
    return (this.portrait ? 0.56 : 0.42) * this.scale();
  }

  /** Screen position of each loop's center and the drawn word height, for placing HTML over the words. */
  loopCenters(): { brands: [number, number]; creators: [number, number]; wordPx: number } | null {
    if (!this.PV.length) return null;
    const sc = this.scale();
    const a: V3 = this.portrait ? [0, 1.05 * sc, 0] : [-1.05 * sc, 0, 0];
    const b: V3 = this.portrait ? [0, -1.05 * sc, 0] : [1.05 * sc, 0, 0];
    const toPx = (p: [number, number]): [number, number] => [(p[0] * 0.5 + 0.5) * this.W, (1 - (p[1] * 0.5 + 0.5)) * this.H];
    const h = this.wordHeight();
    const top = project(this.PV, [a[0], a[1] + h / 2, 0.02]);
    const bottom = project(this.PV, [a[0], a[1] - h / 2, 0.02]);
    const wordPx = Math.abs(top[1] - bottom[1]) * 0.5 * this.H;
    return { brands: toPx(project(this.PV, a)), creators: toPx(project(this.PV, b)), wordPx };
  }

  /* ---------- internals ---------- */
  private onPointer(e: PointerEvent) {
    if (!this.W) return;
    const nx = (e.clientX / this.W) * 2 - 1;
    const ny = -((e.clientY / this.H) * 2 - 1);
    const dx = nx - this.s.tmx;
    const dy = ny - this.s.tmy;
    this.s.wake = Math.min(1, this.s.wake + Math.hypot(dx, dy) * 0.9);
    this.s.tmx = nx;
    this.s.tmy = ny;
    if (this.mode !== 'none') this.kick();
  }

  private resize() {
    if (!this.canvas || !this.gl) return;
    this.dpr = Math.min(this.W * this.H > 2_400_000 ? 1.5 : 2, window.devicePixelRatio || 1);
    this.W = this.canvas.clientWidth;
    this.H = this.canvas.clientHeight;
    this.canvas.width = Math.max(1, Math.round(this.W * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.H * this.dpr));
    this.portrait = this.H > this.W * 1.08;
    this.kick();
  }

  private scale() {
    const a = this.W / Math.max(1, this.H);
    if (this.portrait) return clamp(0.62 + a * 0.34, 0.72, 0.98);
    return clamp(0.98 + (a - 1.2) * 0.16, 0.96, 1.22);
  }

  private kick() {
    if (!this.gl || this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  private frame(now: number) {
    this.raf = 0;
    const gl = this.gl!;
    if (!gl || document.hidden) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const s = this.s;
    const r = this.reduce;
    if (!r) this.time += dt;

    s.fade = r ? s.fadeT : approach(s.fade, s.fadeT, 4, dt);
    s.hl = r ? s.tl : approach(s.hl, s.tl, 6, dt);
    s.hr = r ? s.tr : approach(s.hr, s.tr, 6, dt);
    s.mx = approach(s.mx, s.tmx, 3, dt);
    s.my = approach(s.my, s.tmy, 3, dt);
    s.wake *= Math.exp(-dt * 2.4);
    s.unr = r ? s.unrT : approach(s.unr, s.unrT, 2.6, dt);
    s.morph = r ? s.morphT : s.morph + clamp(s.morphT - s.morph, -dt * 0.9, dt * 0.9);
    s.words = r ? s.wordsT : approach(s.words, s.wordsT, s.wordsT > s.words ? 3 : 7, dt);
    if (s.draw < s.drawT) s.draw = Math.min(s.drawT, s.draw + dt / 1.9);
    if (this.mode === 'hero' && s.morph >= 1 && s.unr > 0.001) {
      s.unr = s.unrT = 0;
    }
    if (this.mode === 'hero') s.spin = approach(s.spin, s.scroll * 1.4, 5, dt);

    for (const fn of this.listeners) fn({ draw: s.draw });

    gl.viewport(0, 0, this.canvas!.width, this.canvas!.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const visible = s.fade > 0.003;
    if (visible) this.render(now);

    const settling =
      Math.abs(s.fade - s.fadeT) > 0.002 || Math.abs(s.morph - s.morphT) > 0.0005 || s.draw < s.drawT || Math.abs(s.unr - s.unrT) > 0.002;
    const alive = this.mode !== 'none' && !r;
    if ((visible && alive) || settling) this.raf = requestAnimationFrame((t) => this.frame(t));

    // Adaptive quality: drop lanes when frames run long, restore when there's room.
    if (visible && alive) {
      this.frameTimes.push(dt);
      if (this.frameTimes.length > 45) {
        const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        this.frameTimes.length = 0;
        if (avg > 0.024 && this.laneBudget > 0.45) this.laneBudget -= 0.15;
        else if (avg < 0.0135 && this.laneBudget < 1) this.laneBudget = Math.min(1, this.laneBudget + 0.1);
      }
    }
  }

  private render(now: number) {
    const gl = this.gl!;
    const s = this.s;
    const aspect = this.W / Math.max(1, this.H);
    const fov = 0.56;
    const dist = this.portrait ? 8.4 : 7.2;
    const sc = this.scale();
    const heroish = this.mode === 'hero' ? 1 : 0;
    const yaw = s.mx * (0.16 - 0.1 * heroish);
    const pitch = (0.75 - 0.4 * heroish) + s.my * (0.35 - 0.25 * heroish);
    const eye: V3 = [Math.sin(yaw) * dist, pitch, Math.cos(yaw) * dist];
    this.PV = mul(persp(fov, aspect, 0.1, 60), look(eye, [0, 0, 0], [0, 1, 0]));

    // Rosette placement: right of the headline on wide screens, behind it on tall ones.
    const halfH = dist * Math.tan(fov / 2);
    const halfW = halfH * aspect;
    let rc: V3;
    let rr: number;
    let tilt: [number, number];
    if (this.portrait) {
      rc = [0.12 * halfW, 0.5 * halfH + s.scroll * 0.8, -0.8];
      rr = halfW * 0.7;
      tilt = [-0.95 - s.scroll * 0.4, 0.25];
    } else {
      rc = [0.6 * halfW, 0.04 * halfH + s.scroll * 1.1, -0.4];
      rr = Math.min(halfH * 0.7, halfW * 0.34);
      tilt = [-0.85 - s.scroll * 0.5, 0.42];
    }
    const heroFade = this.mode === 'hero' ? 1 - clamp((s.scroll - 0.3) / 0.45, 0, 1) : 1;

    const L = this.line!;
    gl.useProgram(L.prog);
    const setShared = (u: Record<string, WebGLUniformLocation | null>, layer: number) => {
      gl.uniform1f(u.uTime, this.time);
      gl.uniform1f(u.uHL, s.hl);
      gl.uniform1f(u.uHR, s.hr);
      gl.uniform1f(u.uUnr, s.unr);
      gl.uniform1f(u.uCh, s.ch);
      gl.uniform1f(u.uWake, s.wake);
      gl.uniform1f(u.uMorph, clamp(s.morph, 0, 1));
      gl.uniform1f(u.uPortrait, this.portrait ? 1 : 0);
      gl.uniform1f(u.uScale, sc);
      gl.uniform1f(u.uLayer, layer);
      gl.uniform1f(u.uSpin, s.spin);
      gl.uniform3f(u.uRosC, rc[0], rc[1], rc[2]);
      gl.uniform1f(u.uRosR, rr);
      gl.uniform2f(u.uRosTilt, tilt[0], tilt[1]);
    };

    const PV = new Float32Array(this.PV);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // 1. words write depth so lines behind them hide and lines in front cross over.
    const wordsAlpha = s.words * s.fade;
    if (wordsAlpha > 0.01 && this.words.length === 2) {
      const T = this.text!;
      gl.useProgram(T.prog);
      gl.bindVertexArray(T.vao);
      gl.uniformMatrix4fv(T.u.uPV, false, PV);
      gl.uniform1f(T.u.uTime, this.time);
      gl.uniform3f(T.u.uInk, ...INK);
      gl.uniform3f(T.u.uAcc, ...BENZOL);
      gl.uniform1f(T.u.uRows, 22);
      gl.uniform1i(T.u.uTex, 0);
      gl.activeTexture(gl.TEXTURE0);
      const wordH = this.wordHeight();
      const centers: V3[] = this.portrait ? [[0, 1.05 * sc, 0.02], [0, -1.05 * sc, 0.02]] : [[-1.05 * sc, 0, 0.02], [1.05 * sc, 0, 0.02]];
      const hov = [s.hl, s.hr];
      for (const pass of [0, 1]) {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(pass === 1);
        gl.colorMask(pass === 0, pass === 0, pass === 0, pass === 0);
        gl.uniform1f(T.u.uDepthPass, pass);
        this.words.forEach((w, i) => {
          const hideOther = 1 - s.unr * (i === Math.round(s.ch) ? 0 : 1);
          gl.bindTexture(gl.TEXTURE_2D, w.tex);
          gl.uniform3f(T.u.uCenter, ...centers[i]);
          const h = wordH * (1 + hov[i] * 0.04);
          gl.uniform2f(T.u.uSize, h * w.aspect, h);
          gl.uniform1f(T.u.uHover, hov[i]);
          gl.uniform1f(T.u.uAlpha, wordsAlpha * hideOther * (1 - 0.55 * hov[1 - i]));
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        });
      }
      gl.colorMask(true, true, true, true);
    }

    // 2. lines, depth-tested against the words, blended among themselves.
    gl.useProgram(L.prog);
    gl.bindVertexArray(L.vao);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    gl.uniformMatrix4fv(L.u.uPV, false, PV);
    gl.uniform2f(L.u.uRes, this.canvas!.width, this.canvas!.height);
    gl.uniform2f(L.u.uMouse, s.mx, s.my);
    gl.uniform1f(L.u.uSeg, 1 / this.seg);
    gl.uniform1f(L.u.uDpr, this.dpr);
    gl.uniform1f(L.u.uWidth, this.portrait ? 0.72 : 0.8);
    gl.uniform1f(L.u.uDraw, s.draw >= 1 ? 2 : s.draw);
    gl.uniform1f(L.u.uFade, s.fade * heroFade);
    gl.uniform1f(L.u.uAspect, aspect);
    gl.uniform1f(L.u.uSheen, this.mode === 'none' ? 0 : 1);
    gl.uniform3f(L.u.uInk, ...INK);
    gl.uniform3f(L.u.uAcc, ...BENZOL);
    const lanes = Math.max(24, Math.round(this.lanes * this.laneBudget));
    setShared(L.u, 1);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, Math.round(lanes * 0.5) * this.seg);
    setShared(L.u, 0);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, lanes * this.seg);

    // 3. the pen, while the line is being cut.
    if (s.draw < 1) {
      const P = this.pen!;
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(P.prog);
      gl.bindVertexArray(P.vao);
      setShared(P.u, 0);
      gl.uniformMatrix4fv(P.u.uPV, false, PV);
      gl.uniform1f(P.u.uDraw, s.draw);
      gl.uniform1f(P.u.uDpr, this.dpr);
      gl.uniform1f(P.u.uPenSize, 26);
      gl.uniform3f(P.u.uAcc, ...BENZOL);
      gl.uniform1f(P.u.uPenAlpha, Math.min(1, s.draw * 12) * (1 - Math.max(0, (s.draw - 0.94) / 0.06)) * s.fade);
      gl.drawArrays(gl.POINTS, 0, 1);
    }
    gl.bindVertexArray(null);
    void now;
    void PAPER;
  }
}

export const plate = new Plate();
