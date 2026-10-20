/* GLSL for the plate. One parametric family draws everything: the fork ribbon and the hero rosette. */

const SHARED = /* glsl */ `
#define TAU 6.28318530718
uniform float uTime, uHL, uHR, uUnr, uCh, uWake, uMorph, uPortrait, uScale, uLayer, uSpin;
uniform vec3 uRosC;
uniform float uRosR;
uniform vec2 uRosTilt;

vec3 ribbonBase(float t) {
  float s = sin(t), c = cos(t);
  float d = 1.0 + s * s;
  return vec3(1.85 * c / d, 2.55 * s * c / d, 0.62 * s);
}

vec3 forkPos(float u, float lane, out float side, out float h, out float light) {
  float t = u * TAU;
  vec3 p = ribbonBase(t);
  vec3 T = normalize(ribbonBase(t + 0.004) - p);
  vec3 N = normalize(cross(T, vec3(0.0, 0.0, 1.0)));
  vec3 B = normalize(cross(T, N));
  side = smoothstep(-0.32, 0.32, p.x);
  h = mix(uHL, uHR, side);
  float tw = 0.85 * sin(t + uTime * 0.11) + uLayer * 0.9 + 0.35 * sin(2.0 * t - uTime * 0.07);
  vec3 W = N * cos(tw) + B * sin(tw);
  float f = mix(11.0, 17.0, uLayer);
  float f2 = mix(25.0, 39.0, uLayer);
  float lace = 0.055 * sin(t * f + lane * 21.0 + uTime * 0.55) + 0.03 * sin(t * f2 - lane * 34.0 - uTime * 0.36);
  lace *= 1.0 + 1.0 * h + uWake * 1.6;
  float width = (0.30 + 0.05 * uLayer) * (1.0 + 0.55 * h);
  vec3 pos = p + W * ((lane - 0.5) * width + lace);
  vec2 c = vec2(mix(-1.05, 1.05, side), 0.0);
  pos.xy = c + (pos.xy - c) * (1.0 + 0.1 * h);
  float ch = 1.0 - abs(side - uCh);
  float un = uUnr * ch;
  pos.xy = c + (pos.xy - c) * (1.0 + un * 1.25) + W.xy * (lane - 0.5) * un * 1.0;
  pos.z += un * 0.9;
  vec3 nrm = normalize(cross(T, W));
  light = abs(dot(nrm, normalize(vec3(-0.45, 0.6, 0.66))));
  if (uPortrait > 0.5) pos.xy = vec2(pos.y, -pos.x);
  return pos * uScale;
}

vec3 rosettePos(float u, float lane, out float light) {
  float th = u * TAU;
  float off = (lane - 0.5) * 0.62;
  float lace = 0.07 * sin(9.0 * th + lane * 21.0 + uTime * 0.35)
             + 0.035 * sin(25.0 * th - lane * 33.0 - uTime * 0.27)
             + 0.02 * sin(4.0 * th + uTime * 0.2);
  float r = uRosR * (1.0 + off * 0.5 + lace * 0.55);
  vec3 p = vec3(cos(th) * r, sin(th) * r, 0.1 * sin(3.0 * th + lane * 5.0 + uTime * 0.25) * uRosR);
  float sp = uTime * 0.035 + uSpin;
  float cs = cos(sp), sn = sin(sp);
  p.xy = vec2(p.x * cs - p.y * sn, p.x * sn + p.y * cs);
  float ax = uRosTilt.x, ay = uRosTilt.y;
  p = vec3(p.x, p.y * cos(ax) - p.z * sin(ax), p.y * sin(ax) + p.z * cos(ax));
  p = vec3(p.x * cos(ay) + p.z * sin(ay), p.y, -p.x * sin(ay) + p.z * cos(ay));
  light = 0.5 + 0.5 * sin(th * 2.0 + lane * 3.0 + uSpin);
  return p + uRosC;
}

vec3 plateP(float u, float lane, out float side, out float h, out float light) {
  if (uMorph >= 1.0) {
    side = 0.5; h = 0.0;
    return rosettePos(u, lane, light);
  }
  float l1;
  vec3 a = forkPos(u, lane, side, h, l1);
  if (uMorph <= 0.0) { light = l1; return a; }
  float l2;
  vec3 b = rosettePos(u, lane, l2);
  float m = clamp(uMorph * 1.6 - lane * 0.6, 0.0, 1.0);
  m = m * m * (3.0 - 2.0 * m);
  light = mix(l1, l2, m);
  return mix(a, b, m);
}
`;

export const LINE_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec2 aSeg;
uniform mat4 uPV;
uniform vec2 uRes, uMouse;
uniform float uSeg, uDpr, uWidth, uDraw, uFade, uAspect, uSheen;
out float vEdge;
out float vHalf;
out float vCover;
out float vA;
out float vM;
${SHARED}
void main() {
  float u0 = aSeg.x;
  float lane = aSeg.y;
  float drawn = smoothstep(u0 - 0.015, u0, uDraw);
  if (drawn <= 0.0 || uFade <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float s0, h0, l0, s1, h1, l1;
  vec3 p0 = plateP(u0, lane, s0, h0, l0);
  vec3 p1 = plateP(u0 + uSeg, lane, s1, h1, l1);
  vec4 c0 = uPV * vec4(p0, 1.0);
  vec4 c1 = uPV * vec4(p1, 1.0);
  vec2 dirPx = (c1.xy / c1.w - c0.xy / c0.w) * uRes * 0.5;
  float len = length(dirPx);
  vec2 dir = len > 1e-5 ? dirPx / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float e = aCorner.x;
  vec4 c = mix(c0, c1, e);
  float h = mix(h0, h1, e);
  float light = mix(l0, l1, e);
  float side = mix(s0, s1, e);
  float w = uWidth * uDpr * (0.5 + 0.95 * light) * (1.0 + 0.45 * h) * mix(1.0, 0.72, uLayer);
  float halfW = max(w, 1.0) * 0.5;
  float ext = halfW + 1.0;
  c.xy += nrm * aCorner.y * ext / (uRes * 0.5) * c.w;
  gl_Position = c;
  vEdge = aCorner.y * ext;
  vHalf = halfW;
  vCover = min(w, 1.0);
  vec3 pp = mix(p0, p1, e) / uScale;
  float depth = clamp(pp.z * 0.55 + 0.5, 0.0, 1.0);
  float ch = 1.0 - abs(side - uCh);
  float other = 1.0 - uUnr * (1.0 - ch) * (1.0 - uMorph);
  vA = (0.24 + 0.36 * depth) * (0.85 + 0.4 * h) * other * mix(1.0, 0.55, uLayer) * drawn * uFade;
  vec2 ndc = c.xy / c.w;
  vec2 dd = (ndc - uMouse) * vec2(uAspect, 1.0);
  float sheen = exp(-dot(dd, dd) * 3.5) * uSheen;
  vM = clamp(h * 0.72 + sheen * 0.6 + uLayer * 0.38 + light * 0.08, 0.0, 1.0);
}`;

export const LINE_FS = /* glsl */ `#version 300 es
precision highp float;
uniform vec3 uInk, uAcc;
in float vEdge;
in float vHalf;
in float vCover;
in float vA;
in float vM;
out vec4 o;
void main() {
  float aa = clamp(vHalf + 0.5 - abs(vEdge), 0.0, 1.0);
  float a = aa * vCover * vA;
  if (a < 0.003) discard;
  o = vec4(mix(uInk, uAcc, vM), a);
}`;

/* The pen: one bright point that leads the line while it is drawn, like a rose-engine cutter. */
export const PEN_VS = /* glsl */ `#version 300 es
precision highp float;
uniform mat4 uPV;
uniform float uDraw, uDpr, uPenSize;
${SHARED}
void main() {
  float s, h, l;
  vec3 p = plateP(fract(uDraw), 0.5, s, h, l);
  gl_Position = uPV * vec4(p, 1.0);
  gl_PointSize = uPenSize * uDpr;
}`;

export const PEN_FS = /* glsl */ `#version 300 es
precision highp float;
uniform vec3 uAcc;
uniform float uPenAlpha;
out vec4 o;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r = dot(q, q);
  float core = smoothstep(0.12, 0.0, r);
  float halo = exp(-r * 5.0) * 0.45;
  float a = (core + halo) * uPenAlpha;
  if (a < 0.01) discard;
  o = vec4(mix(uAcc, vec3(1.0), core * 0.6), a);
}`;

/* Words on the fork. Plain ink at rest. On hover the letters fill with engraved lines, like a banknote numeral. */
export const TEXT_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
uniform mat4 uPV;
uniform vec3 uCenter;
uniform vec2 uSize;
out vec2 vUv;
void main() {
  vUv = vec2(aCorner.x, 1.0 - aCorner.y);
  vec3 p = uCenter + vec3((aCorner.x - 0.5) * uSize.x, (aCorner.y - 0.5) * uSize.y, 0.0);
  gl_Position = uPV * vec4(p, 1.0);
}`;

export const TEXT_FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform float uHover, uAlpha, uTime, uRows, uDepthPass;
uniform vec3 uInk, uAcc;
in vec2 vUv;
out vec4 o;
void main() {
  float a = texture(uTex, vUv).a;
  if (uDepthPass > 0.5) {
    if (a < 0.5 || uAlpha < 0.5) discard;
    o = vec4(0.0);
    return;
  }
  float ph = vUv.y * uRows + sin(vUv.x * 9.0 + uTime * 0.6) * 0.9 + sin(vUv.x * 23.0 - uTime * 0.45) * 0.25;
  float fw = fwidth(ph);
  float d = abs(fract(ph + 0.5) - 0.5);
  float line = 1.0 - smoothstep(0.11 - fw, 0.11 + fw, d);
  float fill = mix(1.0, 0.16 + 0.84 * line, uHover);
  vec3 col = mix(uInk, uAcc, uHover * 0.92);
  float alpha = a * fill * uAlpha;
  if (alpha < 0.003) discard;
  o = vec4(col, alpha);
}`;
