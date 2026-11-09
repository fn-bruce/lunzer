// Lunzer demo: the KubeCon + CloudNativeCon NA 2026 expo floor (from the
// public expo map PDF, see tools/venue/), shortest-path routing on a walkable
// grid, fuzzy search, and an orienteering-style course.
(async () => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('map');
  const venue = await (await fetch('/venue.json')).json();

  // ---------- Grid ----------
  const G = venue.grid;
  const COLS = G.cols, ROWS = G.rows, CELL = G.cell;
  const raw = atob(G.bits);
  const walk = new Uint8Array(COLS * ROWS);
  for (let k = 0; k < walk.length; k++) walk[k] = (raw.charCodeAt(k >> 3) >> (k & 7)) & 1;
  const ok = (i, j) => i >= 0 && j >= 0 && i < COLS && j < ROWS && walk[j * COLS + i] === 1;
  // A cell squeezed between obstacles on opposite sides is a tight gap.
  const tight = new Uint8Array(COLS * ROWS);
  const edgy = new Uint8Array(COLS * ROWS);
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      if (!ok(i, j)) continue;
      const k = j * COLS + i;
      tight[k] = (!ok(i - 1, j) && !ok(i + 1, j)) || (!ok(i, j - 1) && !ok(i, j + 1)) ? 1 : 0;
      edgy[k] = !ok(i - 1, j) || !ok(i + 1, j) || !ok(i, j - 1) || !ok(i, j + 1) ? 1 : 0;
    }
  }
  const toCell = (x, y) => [Math.floor((x - G.x0) / CELL), Math.floor((y - G.y0) / CELL)];
  const toPt = (i, j) => [G.x0 + (i + 0.5) * CELL, G.y0 + (j + 0.5) * CELL];
  const passable = (i, j, o) => ok(i, j) && !(o.wheelchair && tight[j * COLS + i]);

  function nearestWalkable(x, y, o) {
    const [ci, cj] = toCell(x, y);
    let best = null, bd = Infinity;
    for (let r = 0; r < 30 && !best; r++) {
      for (let j = cj - r; j <= cj + r; j++) {
        for (let i = ci - r; i <= ci + r; i++) {
          if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r || !passable(i, j, o)) continue;
          const [px, py] = toPt(i, j);
          const d = Math.hypot(px - x, py - y);
          if (d < bd) { bd = d; best = [i, j]; }
        }
      }
    }
    return best;
  }

  // ---------- Routing (A* with a binary heap) ----------
  function findPath(s, g, o) {
    const N = COLS * ROWS;
    const cost = new Float64Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const heap = [];
    const push = (f, k) => {
      heap.push([f, k]);
      let n = heap.length - 1;
      while (n > 0) { const p = (n - 1) >> 1; if (heap[p][0] <= heap[n][0]) break; [heap[p], heap[n]] = [heap[n], heap[p]]; n = p; }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let n = 0;
        for (;;) {
          const l = 2 * n + 1, r = l + 1;
          let m = n;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === n) break;
          [heap[m], heap[n]] = [heap[n], heap[m]];
          n = m;
        }
      }
      return top;
    };
    const h = (i, j) => { const dx = Math.abs(i - g[0]), dy = Math.abs(j - g[1]); return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy); };
    const sk = s[1] * COLS + s[0], gk = g[1] * COLS + g[0];
    cost[sk] = 0;
    push(h(...s), sk);
    while (heap.length) {
      const [, k] = pop();
      if (closed[k]) continue;
      closed[k] = 1;
      if (k === gk) {
        const path = [];
        for (let c = k; c !== -1; c = came[c]) path.push([c % COLS, Math.floor(c / COLS)]);
        return path.reverse();
      }
      const i = k % COLS, j = Math.floor(k / COLS);
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = i + di, nj = j + dj;
          if (!passable(ni, nj, o)) continue;
          if (di && dj && (!passable(i + di, j, o) || !passable(i, j + dj, o))) continue;
          const nk = nj * COLS + ni;
          const step = (di && dj ? Math.SQRT2 : 1) * (o.wheelchair && edgy[nk] ? 1.6 : 1);
          const nc = cost[k] + step;
          if (nc < cost[nk]) { cost[nk] = nc; came[nk] = k; push(nc + h(ni, nj), nk); }
        }
      }
    }
    return null;
  }

  function lineClear(a, b, o) {
    const ax = a[0] + 0.5, ay = a[1] + 0.5, bx = b[0] + 0.5, by = b[1] + 0.5;
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.ceil(len / 0.2));
    for (let t = 0; t <= n; t++) {
      const x = ax + ((bx - ax) * t) / n, y = ay + ((by - ay) * t) / n;
      for (const [ox, oy] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) {
        if (!passable(Math.floor(x + ox), Math.floor(y + oy), o)) return false;
      }
    }
    return true;
  }

  function smooth(path, o) {
    const out = [path[0]];
    let i = 0;
    while (i < path.length - 1) {
      let lo = i + 1, j = Math.min(path.length - 1, i + 60);
      while (j > lo && !lineClear(path[i], path[j], o)) j--;
      out.push(path[j]);
      i = j;
    }
    // String-pull: drop any turn point whose neighbours can see each other.
    for (let changed = true; changed; ) {
      changed = false;
      for (let k = 1; k < out.length - 1; ) {
        if (lineClear(out[k - 1], out[k + 1], o)) { out.splice(k, 1); changed = true; }
        else k++;
      }
    }
    return out;
  }

  // Turn points worth a numbered control: a real change of direction, far
  // enough from the previous control and from the finish to read on the map.
  function controlsOf(pts) {
    const MIN_GAP = 28, MIN_TURN = 22;
    const out = [];
    let last = pts[0];
    for (let i = 1; i < pts.length - 1; i++) {
      const d1 = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]];
      const d2 = [pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]];
      const ang = Math.abs((Math.atan2(d1[0] * d2[1] - d1[1] * d2[0], d1[0] * d2[0] + d1[1] * d2[1]) * 180) / Math.PI);
      const end = pts[pts.length - 1];
      if (ang < MIN_TURN) continue;
      if (Math.hypot(pts[i][0] - last[0], pts[i][1] - last[1]) < MIN_GAP) continue;
      if (Math.hypot(pts[i][0] - end[0], pts[i][1] - end[1]) < MIN_GAP) continue;
      out.push(i);
      last = pts[i];
    }
    return out;
  }

  const M_PER_UNIT = venue.metresPerUnit;
  function route(from, to, o) {
    const s = nearestWalkable(...from.anchor, o), g = nearestWalkable(...to.anchor, o);
    if (!s || !g) return null;
    const raw = findPath(s, g, o);
    if (!raw) return null;
    const cells = raw.length > 1 ? smooth(raw, o) : raw;
    const pts = cells.map(([i, j]) => toPt(i, j));
    let len = 0;
    for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    return { pts, controls: controlsOf(pts), metres: Math.round(len * M_PER_UNIT) };
  }

  // ---------- Places ----------
  const centroid = (poly) => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
  const namesByBooth = new Map();
  venue.exhibitors.forEach((e) => e.booths.forEach((n) => namesByBooth.set(n, [...(namesByBooth.get(n) || []), e.name])));

  const booths = venue.booths.map((b) => ({
    id: 'b' + b.num, kind: 'booth', num: b.num, poly: b.poly, level: b.level,
    names: namesByBooth.get(b.num) || [], anchor: b.poly ? centroid(b.poly) : [b.x, b.y], labelAt: [b.x, b.y],
    fit: b.poly ? 0.65 * Math.min(...[0, 1].map((k) => Math.max(...b.poly.map((q) => q[k])) - Math.min(...b.poly.map((q) => q[k])))) : 6,
  }));
  const L = (id, name, x, y, terms, show) => ({ id, kind: 'landmark', name, anchor: [x, y], terms, show });
  const landmarks = [
    L('main-entrance', 'Main entrance', 140, 649, ['entrance', 'main entrance', 'front door', 'doors', 'exit'], 'Main entrance'),
    L('entrance-h2', 'Secondary entrance, Hall 2', 440, 356, ['secondary entrance', 'side entrance', 'entrance hall 2', 'exit']),
    L('entrance-h1', 'Secondary entrance, Hall 1', 483, 476, ['secondary entrance', 'side entrance', 'entrance hall 1', 'exit']),
    L('meal-h5w', 'Meal pick-up, Hall 5 west', 268, 160, ['meal', 'lunch', 'food', 'meal pick-up', 'breakfast']),
    L('meal-h5e', 'Meal pick-up, Hall 5 east', 451, 176, ['meal', 'lunch', 'food', 'meal pick-up', 'breakfast']),
    L('meal-ab', 'Meal pick-up, Halls A–B', 239, 491, ['meal', 'lunch', 'food', 'meal pick-up', 'breakfast']),
    L('coffee-h1', 'Coffee bar, Hall 1', 367, 444, ['coffee', 'coffee bar', 'espresso', 'drinks']),
    L('coffee-hc', 'Coffee bar, Hall C', 78, 577, ['coffee', 'coffee bar', 'espresso', 'drinks']),
    L('coffee-h3', 'Coffee bar, Hall 3', 406, 242, ['coffee', 'coffee bar', 'espresso', 'drinks']),
    L('soda', 'Dirty Soda Bar', 308, 538, ['soda', 'dirty soda', 'drinks', 'bar']),
    L('demo-theater', 'Demo Theater', 451, 497, ['demo', 'theater', 'theatre', 'demo theater'], 'Demo Theater'),
    L('network-nook', 'Network Nook', 455, 440, ['network', 'nook', 'networking'], 'Network Nook'),
    L('poster', 'Poster Pavilion', 385, 198, ['poster', 'posters', 'poster pavilion']),
    L('mixed-use', 'Mixed-use space', 414, 177, ['mixed use', 'mixed-use space']),
    L('exhibitor-services', 'Exhibitor Services Desk', 284, 259, ['exhibitor services', 'services desk', 'help', 'info']),
    L('corner-store', 'Corner Store & T-shirt pick-up', 314, 26, ['corner store', 'store', 'shop', 't-shirt', 'tshirt', 'swag', 'merch']),
    L('cn-theater', 'Cloud Native Theater', 386, 33, ['cloud native theater', 'theater', 'theatre', 'stage']),
    L('pavilion', 'CNCF Project Pavilion', 407, 108, ['project pavilion', 'pavilion', 'cncf projects', 'projects', 'kiosks'], 'Project Pavilion'),
    L('sales-lounge', 'Sponsorship + Membership Sales Lounge', 288, 645, ['sales lounge', 'sponsorship', 'membership']),
    L('headshots', 'Headshots', 64, 624, ['headshot', 'headshots', 'photo']),
    L('learning-lounge', 'Learning Lounge', 148, 531, ['learning lounge', 'learning', 'training']),
    L('relaxation', 'Relaxation Station', 322, 310, ['relaxation', 'relax', 'quiet', 'rest']),
    L('hall-1', 'Hall 1', 363, 428, ['hall 1'], 'Hall 1'),
    L('hall-2', 'Hall 2', 356, 356, ['hall 2'], 'Hall 2'),
    L('hall-3', 'Hall 3', 363, 293, ['hall 3'], 'Hall 3'),
    L('hall-4', 'Hall 4', 361, 182, ['hall 4'], 'Hall 4'),
    L('hall-5', 'Hall 5', 339, 55, ['hall 5'], 'Hall 5'),
    L('hall-a', 'Hall A', 248, 505, ['hall a'], 'Hall A'),
    L('hall-b', 'Hall B', 166, 505, ['hall b'], 'Hall B'),
    L('hall-c', 'Hall C', 80, 504, ['hall c'], 'Hall C'),
    L('cosmic-canyon', 'Cosmic Canyon', 407, 166, ['cosmic canyon']),
    L('amber-hive', 'Amber Hive', 363, 234, ['amber hive']),
    L('honeycomb-hub', 'Honeycomb Hub', 365, 405, ['honeycomb hub']),
    L('alpine-overlook', 'Alpine Overlook', 421, 477, ['alpine overlook']),
    L('astral-peak', 'Astral Peak', 252, 592, ['astral peak']),
    L('starlight-summit', 'Starlight Summit', 126, 493, ['starlight summit']),
  ];
  const places = [...booths, ...landmarks];

  // ---------- Directions ----------
  const cardinal = (dx, dy) =>
    ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
  const boothName = (b) => (b.names.length ? `${b.names.join(' / ')}, booth ${b.num}` : `booth ${b.num}`);
  const placeLabel = (p) => (p.kind === 'booth' ? boothName(p) : /^(Hall|Main|Secondary|Meal|Coffee)/.test(p.name) ? p.name : `the ${p.name}`);

  function nearestFeature(pt, exclude) {
    let best = null, bd = 13;
    for (const b of booths) {
      if (exclude.includes(b)) continue;
      const d = Math.hypot(b.anchor[0] - pt[0], b.anchor[1] - pt[1]);
      if (d < bd) { bd = d; best = b; }
    }
    for (const l of landmarks) {
      if (exclude.includes(l) || l.id.startsWith('hall-')) continue;
      const d = Math.hypot(l.anchor[0] - pt[0], l.anchor[1] - pt[1]) - 4;
      if (d < bd) { bd = d; best = l; }
    }
    return best;
  }

  function directions(r, from, to) {
    const { pts, controls } = r;
    if (pts.length < 2) return [{ mark: 'finish', text: `You're already at ${placeLabel(to)}.` }];
    // Legs run start → controls → finish; bends between controls are walked through.
    const stops = [0, ...controls, pts.length - 1];
    const legM = (k) => {
      let d = 0;
      for (let i = stops[k]; i < stops[k + 1]; i++) d += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      return Math.round(d * M_PER_UNIT);
    };
    const steps = [{ mark: 'start', text: `Start at ${placeLabel(from)}, head ${cardinal(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1])}`, dist: legM(0) }];
    controls.forEach((i, n) => {
      const d1 = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]];
      const d2 = [pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]];
      const cross = d1[0] * d2[1] - d1[1] * d2[0];
      const ang = Math.abs((Math.atan2(cross, d1[0] * d2[0] + d1[1] * d2[1]) * 180) / Math.PI);
      const side = cross > 0 ? 'right' : 'left';
      const verb = ang < 35 ? `Bear ${side}` : ang > 140 ? `Turn sharp ${side}` : `Turn ${side}`;
      const f = nearestFeature(pts[i], [from, to]);
      const by = f ? (f.kind === 'booth' ? ` by booth ${f.num}` : ` by ${placeLabel(f)}`) : '';
      steps.push({ mark: 'control', num: n + 1, text: verb + by, dist: legM(n + 1) });
    });
    const last = pts[pts.length - 1], prev = pts[pts.length - 2];
    const [cx, cy] = to.anchor;
    const cross = (last[0] - prev[0]) * (cy - last[1]) - (last[1] - prev[1]) * (cx - last[0]);
    const side = Math.hypot(cx - last[0], cy - last[1]) < 2 ? 'ahead' : cross > 0 ? 'on your right' : 'on your left';
    steps.push({ mark: 'finish', text: `Arrive: ${placeLabel(to)}, ${side}` });
    return steps;
  }

  // ---------- Map rendering ----------
  const el = (name, attrs = {}, parent) => {
    const n = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };
  const pts = (poly) => poly.map((p) => p.join(',')).join(' ');

  const xs = venue.floors.flat().map((p) => p[0]), ys = venue.floors.flat().map((p) => p[1]);
  const FLOOR = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];

  const base = el('g', {}, svg);
  venue.floors.forEach((f) => el('polygon', { points: pts(f), class: 'floor-edge' }, base));
  venue.floors.forEach((f) => el('polygon', { points: pts(f), class: 'floor' }, base));
  venue.obstacles.forEach((o) => {
    if (o.kind === 'block') el('polygon', { points: pts(o.poly), class: 'block' }, base);
  });
  booths.forEach((b) => {
    if (!b.poly) return;
    b.node = el('polygon', { points: pts(b.poly), class: 'booth' }, base);
    const t = el('title', {}, b.node);
    t.textContent = b.names.length ? `Booth ${b.num}: ${b.names.join(', ')}` : `Booth ${b.num}`;
  });
  // Entrance marks: short ink arrows pointing into the hall.
  const entrances = [[[140, 662], [140, 652]], [[452, 356], [443, 356]], [[495, 476], [486, 476]]];
  entrances.forEach(([a, b]) => el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'entrance' }, base));

  const labelLayer = el('g', {}, svg);
  booths.forEach((b) => {
    const t = el('text', { x: b.labelAt[0], y: b.labelAt[1], class: 'booth-label' }, labelLayer);
    t.textContent = b.num;
    b.labelNode = t;
    return t;
  });
  const areaLabels = landmarks.filter((l) => l.show).map((l) => {
    const t = el('text', { x: l.anchor[0], y: l.anchor[1], class: 'area-label' }, labelLayer);
    t.textContent = l.show;
    l.labelNode = t;
    return t;
  });
  const courseLayer = el('g', { 'aria-hidden': 'true' }, svg);

  // ---------- View ----------
  let view = [FLOOR[0] - 8, FLOOR[1] - 8, FLOOR[2] - FLOOR[0] + 16, FLOOR[3] - FLOOR[1] + 16];
  let wholeFloor = false;
  const topBar = document.querySelector('.top');
  const sheet = document.querySelector('.sheet');

  // Fit a box into the part of the map not covered by the top bar and the bottom sheet.
  function frame(box) {
    const r = svg.getBoundingClientRect();
    const W = r.width || 390, H = r.height || 700;
    const T = topBar.getBoundingClientRect().bottom - r.top + 8;
    const B = r.bottom - sheet.getBoundingClientRect().top + 8;
    const avail = Math.max(120, H - T - B);
    const bw = box[2] - box[0], bh = box[3] - box[1];
    const s = Math.max(bw / W, bh / avail);
    const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
    let x0 = cx - (W * s) / 2, y0 = cy - (T + avail / 2) * s;
    // Slide toward the floor so the view isn't half blank paper, while the
    // box stays inside the uncovered part of the screen.
    const F = [FLOOR[0] - 8, FLOOR[1] - 8, FLOOR[2] + 8, FLOOR[3] + 8];
    const slide = (lo, size, f0, f1, b0, b1) => {
      let d = 0;
      if (size >= f1 - f0) d = (f0 + f1) / 2 - (lo + size / 2);
      else if (lo < f0) d = f0 - lo;
      else if (lo + size > f1) d = f1 - (lo + size);
      return Math.max(b1 - (lo + size), Math.min(b0 - lo, d));
    };
    x0 += slide(x0, W * s, F[0], F[2], box[0], box[2]);
    y0 += slide(y0 + T * s, avail * s, F[1], F[3], box[1], box[3]);
    return [x0, y0, W * s, H * s];
  }

  function boxAround(points, pad, min) {
    const xs2 = points.map((p) => p[0]), ys2 = points.map((p) => p[1]);
    const box = [Math.min(...xs2) - pad, Math.min(...ys2) - pad, Math.max(...xs2) + pad, Math.max(...ys2) + pad];
    const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
    if (box[2] - box[0] < min) { box[0] = cx - min / 2; box[2] = cx + min / 2; }
    if (box[3] - box[1] < min) { box[1] = cy - min / 2; box[3] = cy + min / 2; }
    return box;
  }

  function setView(points) {
    view = wholeFloor || !points ? frame([FLOOR[0] - 4, FLOOR[1] - 4, FLOOR[2] + 4, FLOOR[3] + 10]) : frame(boxAround(points, 22, 110));
    svg.setAttribute('viewBox', view.join(' '));
    sizeText();
  }

  // Units per CSS pixel at the current zoom.
  const unit = () => view[2] / (svg.getBoundingClientRect().width || 600);

  function sizeText() {
    const u = unit();
    // Booth numbers stay about 10px on screen; a label shows only where it fits its booth.
    const font = 10 * u;
    svg.style.setProperty('--booth-font', `${font}px`);
    booths.forEach((b) => b.labelNode.classList.toggle('hidden', font * 1.7 > b.fit));
    svg.style.setProperty('--area-font', `${12 * u}px`);
    svg.style.setProperty('--u', u);
  }

  // ---------- Course ----------
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const still = new URLSearchParams(location.search).has('still');

  function drawCourse(r, animate) {
    courseLayer.replaceChildren();
    svg.classList.remove('drawing');
    const u = unit();
    const p = r.pts;
    const R = { start: 13 * u, control: 10 * u, finish: 12 * u };
    const gap = 2.5 * u;

    // One continuous course line, cut open where it passes through a symbol.
    const cut = el('mask', { id: 'course-cut', maskUnits: 'userSpaceOnUse', x: view[0], y: view[1], width: view[2], height: view[3] }, courseLayer);
    el('rect', { x: view[0], y: view[1], width: view[2], height: view[3], fill: '#fff' }, cut);
    const hole = (x, y, rad) => el('circle', { cx: x, cy: y, r: rad + gap, fill: '#000' }, cut);
    hole(...p[0], R.start);
    r.controls.forEach((i) => hole(...p[i], R.control));
    hole(...p[p.length - 1], R.finish);
    const line = el('polyline', { points: p.map((q) => q.join(',')).join(' '), class: 'course', mask: 'url(#course-cut)' }, courseLayer);

    const [sx, sy] = p[0];
    const next = p[1] || [sx + 1, sy];
    const a = Math.atan2(next[1] - sy, next[0] - sx);
    const tri = [0, 2.094, 4.189].map((o) => `${sx + Math.cos(a + o) * R.start},${sy + Math.sin(a + o) * R.start}`).join(' ');
    el('polygon', { points: tri, class: 'course-mark' }, courseLayer);
    const along = [0];
    for (let i = 1; i < p.length; i++) along.push(along[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    const marks = [];
    r.controls.forEach((i, n) => {
      const [cx, cy] = p[i];
      // Put the number on the outside of the turn, away from both legs.
      const d1 = Math.atan2(p[i - 1][1] - cy, p[i - 1][0] - cx), d2 = Math.atan2(p[i + 1][1] - cy, p[i + 1][0] - cx);
      let mid = (d1 + d2) / 2;
      if (Math.abs(d1 - d2) < Math.PI) mid += Math.PI;
      const c = el('circle', { cx, cy, r: R.control, class: 'course-mark' }, courseLayer);
      const t = el('text', { x: cx + Math.cos(mid) * R.control * 2, y: cy + Math.sin(mid) * R.control * 2, class: 'course-num course-mark' }, courseLayer);
      t.textContent = n + 1;
      marks.push([[c, t], along[i]]);
    });
    const [fx, fy] = p[p.length - 1];
    const fin = el('g', { class: 'course-mark' }, courseLayer);
    el('circle', { cx: fx, cy: fy, r: R.finish, class: 'course-ring' }, fin);
    el('circle', { cx: fx, cy: fy, r: R.finish * 0.58, class: 'course-ring' }, fin);
    marks.push([[fin], along[along.length - 1]]);
    el('circle', { cx: sx, cy: sy, r: 3.6 * u, class: 'here' }, courseLayer);

    const total = along[along.length - 1];
    if (!animate || still || reduceMotion.matches || !total) return;
    svg.classList.add('drawing');
    const duration = Math.min(1400, 500 + (total / u) * 0.9);
    const len = line.getTotalLength();
    line.style.strokeDasharray = `${len} ${len}`;
    line.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration, easing: 'linear', fill: 'backwards' });
    marks.forEach(([nodes, at]) => nodes.forEach((m) => (m.style.animationDelay = `${Math.round((at / total) * duration)}ms`)));
  }

  function drawHere(p) {
    courseLayer.replaceChildren();
    const u = unit();
    el('circle', { cx: p[0], cy: p[1], r: 11 * u, class: 'here-ring' }, courseLayer);
    el('circle', { cx: p[0], cy: p[1], r: 4.5 * u, class: 'here' }, courseLayer);
  }

  function applyFocus(r, from, to, on) {
    svg.classList.toggle('focused', on);
    const near = (q) => {
      for (let i = 0; i < r.pts.length - 1; i++) {
        const [ax, ay] = r.pts[i], [bx, by] = r.pts[i + 1];
        const dx = bx - ax, dy = by - ay;
        const k = Math.max(0, Math.min(1, ((q[0] - ax) * dx + (q[1] - ay) * dy) / (dx * dx + dy * dy || 1)));
        if (Math.hypot(ax + dx * k - q[0], ay + dy * k - q[1]) < 11) return true;
      }
      return Math.hypot(r.pts[0][0] - q[0], r.pts[0][1] - q[1]) < 11;
    };
    booths.forEach((b) => {
      const off = !(b === from || b === to || near(b.anchor));
      if (b.node) b.node.classList.toggle('off', off);
      b.labelNode.classList.toggle('off', off);
      if (b.node) b.node.classList.toggle('target', b === to);
    });
  }

  // ---------- Search ----------
  const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const entryLabel = (p) => (p.kind === 'booth' ? (p.names.length ? `${p.num} · ${p.names.join(' / ')}` : `Booth ${p.num}`) : p.name);
  const entries = places.map((p) => ({
    place: p,
    label: entryLabel(p),
    keys: [...(p.kind === 'booth' ? [String(p.num), `booth ${p.num}`, ...p.names] : [p.name, ...(p.terms || [])])].map(fold),
  }));

  function editDistance(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 3;
    const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let diag = prev[0];
      prev[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = prev[j];
        prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
        diag = tmp;
      }
    }
    return prev[b.length];
  }

  function score(q, key) {
    if (key === q) return 100;
    if (key.startsWith(q)) return 85 - Math.min(10, key.length - q.length);
    if (key.split(/[\s./-]+/).some((w) => w.startsWith(q))) return 72;
    if (key.includes(q)) return 60;
    if (q.length >= 4) {
      const d = Math.min(editDistance(q, key), ...key.split(/\s+/).map((w) => editDistance(q, w)));
      if (d === 1) return 50;
      if (d === 2 && q.length >= 6) return 35;
    }
    return 0;
  }

  function search(query, kinds) {
    const q = fold(query);
    if (!q) return [];
    return entries
      .filter((e) => kinds.includes(e.place.kind))
      .map((e) => ({ e, s: Math.max(...e.keys.map((k) => score(q, k))) + (e.place.names && e.place.names.length ? 1 : 0) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map((r) => r.e);
  }

  const hallOf = (p) => {
    let best = null, bd = Infinity;
    landmarks.filter((l) => l.id.startsWith('hall-')).forEach((l) => {
      const d = Math.hypot(l.anchor[0] - p.anchor[0], l.anchor[1] - p.anchor[1]);
      if (d < bd) { bd = d; best = l.name; }
    });
    return best;
  };
  const kindText = (p) => (p.kind === 'booth' ? `Booth · ${hallOf(p)}` : 'Landmark');

  function combobox(input, list, kinds, suggestions) {
    const state = { chosen: null, items: [], active: -1 };
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); state.active = -1; };
    const highlight = (i) => {
      state.active = i;
      [...list.children].forEach((li, k) => li.setAttribute('aria-selected', String(k === i)));
      if (i >= 0 && list.children[i]) { input.setAttribute('aria-activedescendant', list.children[i].id); list.children[i].scrollIntoView({ block: 'nearest' }); }
    };
    const choose = (e) => { state.chosen = e; input.value = e.label; input.removeAttribute('aria-invalid'); close(); input.dispatchEvent(new CustomEvent('chosen')); };
    const render = () => {
      state.items = input.value.trim() ? search(input.value, kinds) : suggestions();
      list.replaceChildren();
      if (!state.items.length) {
        const li = document.createElement('li');
        li.className = 'empty';
        li.setAttribute('role', 'option');
        li.setAttribute('aria-disabled', 'true');
        li.textContent = 'No match. Try a booth number, like 365.';
        list.appendChild(li);
      }
      state.items.forEach((e, i) => {
        const li = document.createElement('li');
        li.id = `${list.id}-${i}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        const p = e.place;
        const code = document.createElement('span');
        code.className = 'code';
        code.textContent = p.kind === 'booth' ? p.num : '';
        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = p.kind === 'booth' ? (p.names.join(' / ') || 'Booth') : p.name;
        const k = document.createElement('span');
        k.className = 'kind';
        k.textContent = kindText(p);
        name.appendChild(k);
        li.append(code, name);
        li.addEventListener('mousedown', (ev) => { ev.preventDefault(); choose(e); });
        list.appendChild(li);
      });
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      highlight(state.items.length && input.value.trim() ? 0 : -1);
    };
    input.addEventListener('input', () => { state.chosen = null; render(); });
    input.addEventListener('focus', () => { input.select(); render(); });
    input.addEventListener('blur', () => setTimeout(close, 0));
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); if (list.hidden) render(); highlight(Math.min(state.items.length - 1, state.active + 1)); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); highlight(Math.max(0, state.active - 1)); }
      else if (ev.key === 'Escape') close();
      else if (ev.key === 'Enter' && !list.hidden && state.active >= 0) { ev.preventDefault(); choose(state.items[state.active]); }
    });
    return {
      resolve() {
        if (state.chosen && input.value === state.chosen.label) return state.chosen.place;
        const best = search(input.value, kinds)[0];
        if (best) { state.chosen = best; input.value = best.label; return best.place; }
        return null;
      },
      set(place) { const e = entries.find((x) => x.place === place); state.chosen = e; input.value = e.label; },
    };
  }

  // ---------- Wiring ----------
  const fromInput = document.getElementById('from-input');
  const toInput = document.getElementById('to-input');
  const form = document.getElementById('route-form');
  const errorBox = document.getElementById('form-error');
  const wheelchair = document.getElementById('wheelchair');
  const zoomBtn = document.getElementById('zoom-toggle');
  const panel = document.getElementById('route-panel');
  const summary = document.getElementById('route-summary');
  const stepsToggle = document.getElementById('steps-toggle');
  const stepsList = document.getElementById('steps');
  const clearTo = document.getElementById('clear-to');

  const pick = (ids) => ids.map((id) => entries.find((e) => e.place.id === id)).filter(Boolean);
  const fromBox = combobox(fromInput, document.getElementById('from-list'), ['booth', 'landmark'], () =>
    pick(['main-entrance', 'entrance-h2', 'entrance-h1', 'coffee-h1', 'meal-ab', 'demo-theater', 'pavilion', 'corner-store']));
  const toBox = combobox(toInput, document.getElementById('to-list'), ['booth', 'landmark'], () =>
    pick(['b365', 'demo-theater', 'pavilion', 'cn-theater', 'network-nook', 'b115', 'b116', 'b122']));

  // QR codes at booths open /?at=<booth or place>; links can also carry &to=<destination>.
  const params = new URLSearchParams(location.search);
  const findPlace = (q, kinds) => {
    if (!q) return null;
    const exact = places.find((p) => p.kind === 'booth' && String(p.num) === q.trim()) || places.find((p) => p.id === q.trim());
    return exact || (search(q, kinds)[0] || {}).place || null;
  };
  let from = findPlace(params.get('at') || params.get('from'), ['booth', 'landmark']) || places.find((p) => p.id === 'main-entrance');
  let to = findPlace(params.get('to'), ['booth', 'landmark']);
  fromBox.set(from);
  if (to) toBox.set(to);

  const opts = () => ({ wheelchair: wheelchair.checked });
  const symbol = (id) => `<svg aria-hidden="true"><use href="#sym-${id}"/></svg>`;
  let current = null;

  const placeId = (p) => (p.kind === 'booth' ? String(p.num) : p.id);
  function syncUrl() {
    const q = new URLSearchParams();
    q.set('at', placeId(from));
    if (to) q.set('to', placeId(to));
    if (params.has('still')) q.set('still', '');
    history.replaceState(null, '', `?${q.toString().replace(/=(&|$)/g, '$1')}`);
  }

  function showError(msg, input) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
    if (input) input.setAttribute('aria-invalid', 'true');
  }

  function render(animate) {
    if (current) {
      setView(current.r.pts);
      drawCourse(current.r, animate);
      applyFocus(current.r, current.from, current.to, true);
    } else {
      svg.classList.remove('focused');
      booths.forEach((b) => { if (b.node) b.node.classList.remove('target'); });
      view = wholeFloor
        ? frame([FLOOR[0] - 4, FLOOR[1] - 4, FLOOR[2] + 4, FLOOR[3] + 10])
        : frame(boxAround([from.anchor], 70, 240));
      svg.setAttribute('viewBox', view.join(' '));
      sizeText();
      drawHere(from.anchor);
    }
  }

  function clearRoute() {
    current = null;
    to = null;
    panel.hidden = true;
    clearTo.hidden = true;
    errorBox.hidden = true;
    syncUrl();
    render(false);
  }

  function run(animate = true) {
    errorBox.hidden = true;
    fromInput.removeAttribute('aria-invalid');
    toInput.removeAttribute('aria-invalid');
    from = fromBox.resolve();
    if (!from) return showError(`Nothing matches "${fromInput.value.trim()}". Try a booth number or a landmark like "coffee".`, fromInput);
    if (!toInput.value.trim()) { clearRoute(); return; }
    to = toBox.resolve();
    if (!to) return showError(`Nothing matches "${toInput.value.trim()}". Try an exhibitor, a booth number or a room like "demo theater".`, toInput);
    clearTo.hidden = false;
    const o = opts();
    const r = route(from, to, o);
    if (!r) return showError(`No ${o.wheelchair ? 'wheelchair ' : ''}route reaches ${placeLabel(to)} on this map.`);
    current = { r, from, to };
    syncUrl();

    stepsList.replaceChildren();
    directions(r, from, to).forEach((s) => {
      const li = document.createElement('li');
      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.innerHTML = symbol(s.mark === 'start' ? 'start' : s.mark === 'finish' ? 'finish' : 'control');
      if (s.mark === 'control') { const b = document.createElement('b'); b.textContent = s.num; mark.appendChild(b); }
      mark.setAttribute('aria-label', s.mark === 'start' ? 'Start' : s.mark === 'finish' ? 'Finish' : `Control ${s.num}`);
      const text = document.createElement('span');
      text.textContent = s.text;
      const dist = document.createElement('span');
      dist.className = 'dist';
      dist.textContent = s.dist != null ? `${s.dist} m` : '';
      li.append(mark, text, dist);
      stepsList.appendChild(li);
    });

    const mins = Math.max(1, Math.round(r.metres / 72));
    summary.replaceChildren(`${r.metres} m · ${mins} min walk`);
    if (o.wheelchair) {
      const std = route(from, to, { wheelchair: false });
      const alt = document.createElement('span');
      alt.className = 'alt';
      alt.textContent = std && std.metres !== r.metres ? ` · wide aisles (+${r.metres - std.metres} m)` : ' · wide aisles';
      summary.append(alt);
    }
    const dest = document.createElement('span');
    dest.className = 'dest';
    dest.textContent = `To ${placeLabel(to)}`;
    summary.append(dest);
    panel.hidden = false;
    render(animate);
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); toInput.blur(); run(true); });
  toInput.addEventListener('chosen', () => { toInput.blur(); run(true); });
  fromInput.addEventListener('chosen', () => { fromInput.blur(); if (toInput.value.trim()) run(true); else { from = fromBox.resolve(); syncUrl(); render(false); } });
  wheelchair.addEventListener('change', () => current && run(true));
  clearTo.addEventListener('click', () => { toInput.value = ''; clearRoute(); toInput.focus(); });
  stepsToggle.addEventListener('click', () => {
    const open = stepsList.hidden;
    stepsList.hidden = !open;
    stepsToggle.setAttribute('aria-expanded', String(open));
    stepsToggle.textContent = open ? 'Hide steps' : 'Steps';
    render(false);
  });
  zoomBtn.addEventListener('click', () => {
    wholeFloor = !wholeFloor;
    zoomBtn.textContent = wholeFloor ? 'Zoom in' : 'Whole floor';
    zoomBtn.setAttribute('aria-pressed', String(wholeFloor));
    render(false);
  });
  // Tap a booth to go there.
  booths.forEach((b) => b.node && b.node.addEventListener('click', () => { toBox.set(b); run(true); }));
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => render(false), 150); });

  if (to) run(true); else render(false);
})();
