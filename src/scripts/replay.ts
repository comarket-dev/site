/* The agent replay: scan sources, vet creators, pitch the good ones, send briefs. Example data. */
import { onceVisible, reduceMotion } from './ui';

interface Node {
  x: number;
  y: number;
  r: number;
  cluster: number;
  pass: boolean;
  vetAt: number;
  appearAt: number;
  short?: number;
}

const CLUSTERS = ['churn', 'onboarding', 'activation', 'pricing', 'retention'];
const SHORT = [
  ['@buildlog', 'Substack', '8.2k', '2%', '7.4%'],
  ['u/mika_ships', 'Reddit', '3.1k', '1%', '9.2%'],
  ['@lena.codes', 'TikTok', '19k', '4%', '5.5%'],
  ['@saasnotes', 'YouTube', '12k', '3%', '6.1%'],
  ['@thefunnel', 'Substack', '27k', '2%', '4.8%'],
  ['@ops.daily', 'TikTok', '41k', '5%', '3.9%'],
  ['u/trialtopaid', 'Reddit', '1.4k', '0%', '11.0%'],
  ['@growthmemo', 'Blog', '6.6k', '2%', '5.2%'],
];

// seeded random so every run looks the same
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const T = { type: 1.1, scan: 4.2, vet: 7.8, pitch: 9.8, brief: 12.2, end: 14 };

export function mountReplay(root: HTMLElement): () => void {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-graph]')!;
  const ctx = canvas.getContext('2d')!;
  const queryEl = root.querySelector<HTMLElement>('[data-query]')!;
  const counts = Array.from(root.querySelectorAll<HTMLElement>('[data-count]'));
  const totalEl = root.querySelector<HTMLElement>('[data-total]')!;
  const list = root.querySelector<HTMLOListElement>('[data-shortlist]')!;
  const steps = Array.from(root.querySelectorAll<HTMLLIElement>('[data-step]'));
  const toggle = root.querySelector<HTMLButtonElement>('[data-toggle]')!;
  const replayBtn = root.querySelector<HTMLButtonElement>('[data-replay-btn]')!;
  const speedBtn = root.querySelector<HTMLButtonElement>('[data-speed]')!;
  const query = queryEl.textContent || '';
  const totalTarget = counts.reduce((s, c) => s + Number(c.dataset.count), 0);

  const rand = rng(7);
  const nodes: Node[] = [];
  const centers = CLUSTERS.map((_, i) => {
    const a = (i / CLUSTERS.length) * Math.PI * 2 - Math.PI / 2;
    return { x: 0.5 + Math.cos(a) * 0.3, y: 0.5 + Math.sin(a) * 0.32 };
  });
  for (let i = 0; i < 130; i++) {
    const c = i % CLUSTERS.length;
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 0.13;
    const pass = rand() < 0.2;
    nodes.push({
      x: centers[c].x + Math.cos(a) * d * 1.25,
      y: centers[c].y + Math.sin(a) * d,
      r: 2 + rand() * rand() * 7,
      cluster: c,
      pass,
      appearAt: T.type + rand() * (T.scan - T.type - 0.4),
      vetAt: T.scan + rand() * (T.vet - T.scan - 0.6),
    });
  }
  // the shortlist maps onto the first passing nodes, vetted in order
  let s = 0;
  for (const n of nodes) {
    if (n.pass && s < SHORT.length) {
      n.short = s;
      n.vetAt = T.scan + 0.25 + s * ((T.vet - T.scan - 0.6) / SHORT.length);
      n.r = Math.max(n.r, 4.5);
      s++;
    }
  }
  const edges: [number, number][] = [];
  nodes.forEach((a, i) =>
    nodes.forEach((b, j) => {
      if (j <= i || a.cluster !== b.cluster) return;
      if (Math.hypot(a.x - b.x, a.y - b.y) < 0.055) edges.push([i, j]);
    }),
  );

  let w = 0;
  let h = 0;
  let dpr = 1;
  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  };
  const ro = new ResizeObserver(() => {
    size();
    draw(time);
  });
  ro.observe(canvas);

  let time = 0;
  let playing = false;
  let speed = 1;
  let raf = 0;
  let last = 0;
  let rows: HTMLLIElement[] = [];

  const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

  function renderList(t: number) {
    const vetted = nodes.filter((n) => n.short !== undefined && t >= n.vetAt).sort((a, b) => a.short! - b.short!);
    while (rows.length < vetted.length) {
      const d = SHORT[rows.length];
      const li = document.createElement('li');
      li.className = 'row';
      li.innerHTML = `<div class="who"><b>${d[0]}</b><span>${d[1]} · ${d[2]}</span></div><div class="stats"><span>fake ${d[3]}</span><span>eng ${d[4]}</span></div><span class="state chip ok">Vetted</span>`;
      list.prepend(li);
      rows.unshift(li);
      requestAnimationFrame(() => li.classList.add('in'));
    }
    while (rows.length > vetted.length) rows.pop()?.remove();
    const nPitched = t >= T.vet ? Math.floor(ease((t - T.vet) / (T.pitch - T.vet)) * rows.length + 0.0001) : 0;
    const nBriefed = t >= T.pitch ? Math.floor(ease((t - T.pitch) / (T.brief - T.pitch)) * Math.min(3, rows.length) + 0.0001) : 0;
    [...rows].reverse().forEach((li, i) => {
      const st = li.querySelector('.state')!;
      const label = i < nBriefed ? 'Brief sent' : i < nPitched ? 'Pitched' : 'Vetted';
      if (st.textContent !== label) {
        st.textContent = label;
        st.className = `state chip ${label === 'Brief sent' ? 'new' : 'ok'}`;
      }
    });
  }

  function draw(t: number) {
    if (!w) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const px = (n: { x: number; y: number }) => [n.x * w, n.y * h] as const;
    const agent = { x: 0.5, y: 0.5 };

    // edges
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(141,151,168,0.16)';
    ctx.beginPath();
    for (const [i, j] of edges) {
      const a = nodes[i];
      const b = nodes[j];
      if (t < Math.max(a.appearAt, b.appearAt)) continue;
      const [ax, ay] = px(a);
      const [bx, by] = px(b);
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.stroke();

    // cluster labels
    ctx.font = '10px "Fragment Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    centers.forEach((c, i) => {
      const k = ease((t - T.type) / 1.2);
      ctx.fillStyle = `rgba(141,151,168,${0.7 * k})`;
      ctx.fillText(CLUSTERS[i].toUpperCase(), c.x * w, c.y * h - 0.17 * h);
    });

    // pitch lines from the agent to the shortlist
    if (t > T.vet - 0.2) {
      for (const n of nodes) {
        if (n.short === undefined) continue;
        const start = T.vet + n.short * 0.18;
        const k = ease((t - start) / 0.9);
        if (k <= 0) continue;
        const [x0, y0] = px(agent);
        const [x1, y1] = px(n);
        ctx.strokeStyle = `rgba(0,151,141,${0.5 * k})`;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k);
        ctx.stroke();
        if (k < 1) {
          ctx.fillStyle = '#EDF0EC';
          ctx.beginPath();
          ctx.arc(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // nodes
    for (const n of nodes) {
      const k = ease((t - n.appearAt) / 0.5);
      if (k <= 0) continue;
      const [x, y] = px(n);
      const vetted = t >= n.vetAt;
      const vk = ease((t - n.vetAt) / 0.45);
      ctx.globalAlpha = k * (vetted && !n.pass ? 1 - 0.55 * vk : 1);
      ctx.beginPath();
      ctx.arc(x, y, n.r * (0.6 + 0.4 * k) * (vetted && n.pass ? 1 + 0.25 * vk : 1), 0, Math.PI * 2);
      if (vetted && n.pass) {
        ctx.fillStyle = '#00978D';
        ctx.fill();
        if (n.short !== undefined && vk < 1) {
          ctx.strokeStyle = `rgba(0,151,141,${1 - vk})`;
          ctx.beginPath();
          ctx.arc(x, y, n.r + 14 * vk, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = vetted ? 'rgba(154,164,170,0.8)' : 'rgba(237,240,236,0.75)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // the agent
    const [ax, ay] = px(agent);
    const pulse = (t * 0.8) % 1;
    ctx.strokeStyle = `rgba(237,240,236,${0.4 * (1 - pulse)})`;
    ctx.beginPath();
    ctx.arc(ax, ay, 10 + pulse * 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#EDF0EC';
    ctx.beginPath();
    ctx.arc(ax, ay, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function update(t: number) {
    // typing
    const typed = Math.round(Math.min(1, t / T.type) * query.length);
    queryEl.textContent = query.slice(0, typed);
    // counters
    const ck = ease((t - T.type) / (T.scan - T.type));
    let total = 0;
    counts.forEach((c) => {
      const v = Math.round(Number(c.dataset.count) * ck);
      total += v;
      c.textContent = v.toLocaleString('en-US');
    });
    totalEl.textContent = Math.round(Math.min(total, totalTarget)).toLocaleString('en-US');
    // steps
    const bounds = [T.type, T.scan, T.vet, T.pitch, T.brief];
    steps.forEach((li, i) => {
      const p = Math.min(1, Math.max(0, (t - bounds[i]) / (bounds[i + 1] - bounds[i])));
      li.style.setProperty('--p', String(p));
      li.classList.toggle('on', p > 0 && p < 1);
      li.classList.toggle('done', p >= 1);
    });
    renderList(t);
    draw(t);
  }

  function loop(now: number) {
    raf = 0;
    if (!playing) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt * speed;
    if (time >= T.end) {
      time = T.end;
      playing = false;
      toggle.textContent = 'Play';
    }
    update(time);
    if (playing) raf = requestAnimationFrame(loop);
  }

  function play() {
    if (time >= T.end) restart();
    playing = true;
    toggle.textContent = 'Pause';
    last = performance.now();
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function pause() {
    playing = false;
    toggle.textContent = 'Play';
  }
  function restart() {
    time = 0;
    rows.forEach((r) => r.remove());
    rows = [];
    update(0);
  }

  toggle.addEventListener('click', () => (playing ? pause() : play()));
  replayBtn.addEventListener('click', () => {
    restart();
    play();
  });
  speedBtn.addEventListener('click', () => {
    speed = speed === 1 ? 2 : 1;
    speedBtn.textContent = `${speed}×`;
  });

  size();
  if (reduceMotion()) {
    time = T.end;
    update(time);
    toggle.textContent = 'Play';
  } else {
    update(0);
  }
  const stopVis = onceVisible(root, () => {
    if (!reduceMotion()) play();
  });

  return () => {
    cancelAnimationFrame(raf);
    playing = false;
    ro.disconnect();
    stopVis();
  };
}
