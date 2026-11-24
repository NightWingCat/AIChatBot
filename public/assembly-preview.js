// 핸드오프 JSON → 완성 조립 프리뷰 (2D 스프라이트 + 깊이 정렬 = 3D 턴테이블 느낌의 2.5D) + 관절 포즈
// - 파츠는 suggestedPosition·approxSize·suggestedRotation으로 놓이고, Y축 회전(θ)에 따라 화면 위치·앞뒤 순서가 바뀐다.
// - 관절: parentId/pivot(있으면) 또는 connectsTo 그래프로 뼈대를 만들고, ball·hinge 관절은 드래그로 돌릴 수 있다.
//   관절을 돌리면 그 아래 달린 파츠(예: 어깨 → 팔 → 손)가 함께 움직인다. 진짜 3D 모델링은 하지 않는다.

const S = 22; // px per cm
const PITCH = (14 * Math.PI) / 180;
const SHADOW = 'rgba(74,44,34,.2)';
const DEG = Math.PI / 180;

const DEFAULT_SIZE = {
  head: [3.6, 3.4, 3.2], torso: [4, 3.6, 3], limb: [1.3, 3.4, 1.3], hand: [1.1, 1.1, 0.9], foot: [1.5, 0.9, 2],
  tail: [0.9, 3, 0.9], wing: [3, 2.6, 0.4], prop: [0.8, 2.6, 0.8], accessory: [1.4, 1, 0.6], frame: [0.8, 0.8, 4],
  base: [11, 0.6, 11], other: [2, 2, 1],
};
const POSABLE = new Set(['ball', 'hinge']);

/* ── 3x3 행렬 ── */
const I3 = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mul = (a, b) => {
  const r = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return r;
};
const mv = (m, [x, y, z]) => [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z];
const tr = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
const rotZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
function rotAxis([x, y, z], a) {
  const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
}

const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const vec = (o, d) => [num(o?.x, d), num(o?.y, d), num(o?.z, d)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function darken(hex, amt = 0.24) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  if (Number.isNaN(n)) return '#7A6F66';
  const f = (v) => Math.max(0, Math.round(v * (1 - amt)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/* ── 키트 → 관절 뼈대 모델 ── */
export function buildModel(kit) {
  const parts = (kit?.runners || []).flatMap((r) => r.parts || []).map((p) => {
    const sc = vec(p.suggestedScale, 1);
    const base = p.approxSize ? vec(p.approxSize, 1) : DEFAULT_SIZE[p.category] || DEFAULT_SIZE.other;
    const rot = vec(p.suggestedRotation, 0);
    return {
      id: p.partId, name: p.partName || p.partId, cat: p.category, color: p.colorHex || '#999999', finish: p.finish,
      pos: vec(p.suggestedPosition, 0), size: [base[0] * sc[0], base[1] * sc[1], base[2] * sc[2]],
      rest: mul(rotZ(-rot[2] * DEG), rotX(rot[0] * DEG)), // +z = 화면 시계 방향, -x = 뒤로 젖힘
      joint: p.jointType, links: p.connectsTo || [], parentId: p.parentId, pivot: p.pivot ? vec(p.pivot, 0) : null,
      R: I3(), parent: null, children: [],
    };
  });
  const byId = new Map(parts.map((p) => [p.id, p]));
  const body = parts.filter((p) => p.cat !== 'base');
  const base = parts.find((p) => p.cat === 'base') || null;

  // 루트: 연결이 가장 많은 몸통 파츠
  const deg = new Map(body.map((p) => [p.id, 0]));
  for (const p of body) for (const l of p.links) if (deg.has(l)) { deg.set(p.id, deg.get(p.id) + 1); deg.set(l, deg.get(l) + 1); }
  const torsos = body.filter((p) => p.cat === 'torso');
  const root = (torsos.length ? torsos : body).slice().sort((a, b) => deg.get(b.id) - deg.get(a.id))[0];

  // 부모: 명시된 parentId 우선, 없으면 connectsTo(양방향) 그래프 BFS
  const adj = new Map(body.map((p) => [p.id, new Set()]));
  for (const p of body) {
    const ls = p.parentId ? [...p.links, p.parentId] : p.links;
    for (const l of ls) if (adj.has(l) && l !== p.id) { adj.get(p.id).add(l); adj.get(l).add(p.id); }
  }
  const order = [];
  if (root) {
    const seen = new Set([root.id]);
    const q = [root];
    while (q.length) {
      const cur = q.shift();
      order.push(cur);
      const next = [...adj.get(cur.id)].map((id) => byId.get(id)).filter((c) => c && !seen.has(c.id));
      // 명시 parentId가 다른 파츠를 가리키면 그쪽에서 붙도록 미룸
      for (const c of next) {
        if (c.parentId && c.parentId !== cur.id && byId.has(c.parentId) && !seen.has(c.parentId)) continue;
        seen.add(c.id); c.parent = c.parentId && byId.get(c.parentId) && seen.has(c.parentId) ? byId.get(c.parentId) : cur; q.push(c);
      }
    }
    for (const p of body) if (!seen.has(p.id)) { p.parent = root; order.push(p); } // 떨어진 파츠는 몸통에 고정
  }
  for (const p of order) {
    if (!p.parent) continue;
    p.parent.children.push(p);
    if (!p.pivot) {
      const d = sub(p.parent.pos, p.pos);
      const len = Math.hypot(...d) || 1;
      const reach = Math.min(len, p.size[1] / 2);
      p.pivot = add(p.pos, d.map((v) => (v / len) * reach));
    }
    p.posable = POSABLE.has(p.joint);
  }
  return { parts, body, base, root, order, byId };
}

/** 관절 회전을 반영한 월드 변환 계산 (M: 회전, t: 이동) */
function solve(model) {
  for (const p of model.order) {
    if (!p.parent) { p.M = p.R; p.t = [0, 0, 0]; continue; }
    const P = p.parent;
    p.M = mul(P.M, p.R);
    p.t = add(mv(P.M, sub(p.pivot, mv(p.R, p.pivot))), P.t);
    p.wPivot = add(mv(P.M, p.pivot), P.t);
  }
  for (const p of model.order) p.wPos = add(mv(p.M, p.pos), p.t);
}

function project([x, y, z], th) {
  const c = Math.cos(th), s = Math.sin(th);
  const X = x * c + z * s;
  const Z = -x * s + z * c;
  return { sx: X * S, sy: (-y * Math.cos(PITCH) + Z * Math.sin(PITCH)) * S, depth: Z };
}
/** 화면을 바라보는 방향(모델 좌표) — 드래그 회전축 */
function viewAxis(th) {
  const c = Math.cos(th), s = Math.sin(th);
  return [-s * Math.cos(PITCH), Math.sin(PITCH), c * Math.cos(PITCH)];
}

function shape(cat, w, h) {
  const x = -w / 2, y = -h / 2;
  switch (cat) {
    case 'head': return `<ellipse rx="${w / 2}" ry="${h / 2}"/>`;
    case 'limb': case 'tail': case 'prop': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}"/>`;
    case 'foot': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/>`;
    case 'wing': return `<path d="M${x} ${-y} L${-x} ${y} L${-x * 0.4} ${-y} Z"/>`;
    default: return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) * 0.32}"/>`;
  }
}

function frameBounds(model) {
  solve(model);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let a = 0; a < 360; a += 30) {
    const th = a * DEG;
    for (const p of [...model.body, model.base].filter(Boolean)) {
      const { sx, sy } = project(p.wPos || p.pos, th);
      const r = (Math.max(p.size[0], p.size[2]) / 2) * S;
      const hh = p.cat === 'base' ? (p.size[2] / 2) * S * Math.sin(PITCH) + p.size[1] * S : (Math.max(p.size[1], p.size[0]) / 2) * S;
      minX = Math.min(minX, sx - r); maxX = Math.max(maxX, sx + r);
      minY = Math.min(minY, sy - hh); maxY = Math.max(maxY, sy + hh);
    }
  }
  if (!Number.isFinite(minX)) return { x: -100, y: -100, w: 200, h: 200 };
  const pad = 26;
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 + 8 };
}

/** 현재 포즈·각도로 SVG 문자열 생성 */
function render(model, deg, box, { handles = false, active = null } = {}) {
  solve(model);
  const th = deg * DEG;
  const c = Math.cos(th), s = Math.sin(th);
  let out = '';

  const b = model.base;
  if (b) {
    const { sx, sy } = project(b.pos, th);
    const rx = (Math.max(b.size[0], b.size[2]) / 2) * S;
    const ry = rx * Math.sin(PITCH) * 1.15;
    const t = Math.max(6, b.size[1] * S);
    const dark = darken(b.color, 0.35);
    out += `<g transform="translate(${sx} ${sy})">
  <ellipse cy="${t + 6}" rx="${rx * 1.02}" ry="${ry}" fill="${SHADOW}"/>
  <rect x="${-rx}" y="0" width="${rx * 2}" height="${t}" fill="${dark}"/>
  <ellipse cy="${t}" rx="${rx}" ry="${ry}" fill="${dark}"/>
  <ellipse rx="${rx}" ry="${ry}" fill="${esc(b.color)}"/>
  <ellipse rx="${rx}" ry="${ry}" fill="url(#ahl)" opacity=".7"/>
  <ellipse rx="${rx * 0.62}" ry="${ry * 0.55}" fill="${SHADOW}"/>
</g>`;
  }

  const items = model.body.filter((p) => p.cat !== 'frame').map((p) => ({ p, ...project(p.wPos, th) }))
    .sort((a, b2) => a.depth - b2.depth || b2.p.wPos[1] - a.p.wPos[1]);
  for (const { p, sx, sy } of items) {
    // 파츠의 '위쪽' 축을 화면에 투영해서 기울기·원근(짧아짐)을 구한다
    const up = mv(p.M, mv(p.rest, [0, 1, 0]));
    const dx = up[0] * c + up[2] * s;
    const dy = -up[1] * Math.cos(PITCH) + (-up[0] * s + up[2] * c) * Math.sin(PITCH);
    const ang = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const fore = Math.max(0.45, Math.hypot(dx, dy));
    const w = Math.max(6, (Math.abs(p.size[0] * c) + Math.abs(p.size[2] * s)) * S);
    const h = Math.max(6, p.size[1] * S * fore);
    const clear = p.finish === 'clear';
    const sh = shape(p.cat, w, h);
    const hot = active && (active === p || isDescendant(p, active));
    out += `<g data-part="${esc(p.id)}" transform="translate(${sx.toFixed(1)} ${sy.toFixed(1)}) rotate(${ang.toFixed(1)})">
  <g fill="${esc(darken(p.color))}" transform="translate(0 3)" ${clear ? 'fill-opacity=".5"' : ''}>${sh}</g>
  <g fill="${esc(p.color)}" ${clear ? 'fill-opacity=".55" stroke="#8FCBFF" stroke-width="1.5"' : hot ? 'stroke="#FFC34A" stroke-width="2.5"' : ''}>${sh}</g>
  <g fill="url(#ahl)" opacity="${p.finish === 'gloss' ? 0.9 : clear ? 0.8 : 0.5}">${sh}</g>
</g>`;
  }

  if (handles) {
    for (const p of model.body) {
      if (!p.posable || p.cat === 'frame' && !p.children.some((ch) => ch.cat !== 'frame')) continue;
      const { sx, sy } = project(p.wPivot, th);
      const on = active === p;
      out += `<g class="joint${on ? ' on' : ''}" data-joint="${esc(p.id)}" transform="translate(${sx.toFixed(1)} ${sy.toFixed(1)})">
  <title>${esc(p.name)} 관절 — 파츠를 잡고 돌리기</title>
  <circle r="13" fill="transparent"/>
  <circle cy="2" r="7.5" fill="#D99A1E"/>
  <circle r="7.5" fill="${on ? '#FF4A4A' : '#FFC34A'}" stroke="#fff" stroke-width="2"/>
</g>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x.toFixed(1)} ${box.y.toFixed(1)} ${box.w.toFixed(1)} ${box.h.toFixed(1)}" style="overflow:visible" role="img">
<defs><linearGradient id="ahl" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
${out}
</svg>`;
}
function isDescendant(p, anc) {
  for (let q = p.parent; q; q = q.parent) if (q === anc) return true;
  return false;
}

/** 정적 SVG (Node·썸네일용). poses = { partId: 각도(도, 정면 기준 화면 시계 방향) } */
export function assemblySVG(kit, deg = 32, poses = {}) {
  const model = buildModel(kit);
  const box = frameBounds(model);
  for (const [id, a] of Object.entries(poses)) { const p = model.byId.get(id); if (p) p.R = rotZ(-a * DEG); }
  return render(model, deg, box, { handles: Object.keys(poses).length > 0 });
}

/* ── 턴테이블 + 포즈 ── */
const mounts = new Set();
let raf = 0;
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function loop(t) {
  raf = 0;
  for (const m of mounts) {
    if (!m.el.isConnected) { mounts.delete(m); m.io?.disconnect(); continue; }
    if (!m.visible) continue;
    if (m.spin && !m.drag && !reduced()) m.deg = m.baseDeg + Math.sin(t / 1600 + m.phase) * 34;
    if (m.dirty || Math.abs(m.deg - m.drawn) > 0.4) m.draw();
  }
  if (mounts.size) raf = requestAnimationFrame(loop);
}

/**
 * el 안에 회전하는 완성 프리뷰를 붙인다.
 * 빈 곳을 드래그 → 회전, 관절(노란 점)을 드래그 → 그 관절을 돌려 포즈 잡기.
 * @returns {{ setPose(on:boolean): void, reset(): void, stop(): void }}
 */
export function mountTurntable(el, kit, { deg = 32, pose = false } = {}) {
  const model = buildModel(kit);
  const box = frameBounds(model);
  const m = {
    el, deg, baseDeg: deg, drawn: NaN, phase: Math.random() * 6, visible: true, drag: null, dirty: true,
    spin: !pose, pose, active: null,
    draw() { el.innerHTML = render(model, m.deg, box, { handles: m.pose, active: m.active }); m.drawn = m.deg; m.dirty = false; },
  };
  el.classList.add('turntable');
  m.draw();
  if ('IntersectionObserver' in globalThis) {
    m.io = new IntersectionObserver(([e]) => { m.visible = e.isIntersecting; });
    m.io.observe(el);
  }

  const toSvg = (e) => {
    const svg = el.querySelector('svg');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    // 포즈 모드: 관절 점이나 파츠를 잡으면 가장 가까운 움직이는 관절(자기 또는 부모)을 돌린다
    let part = null;
    if (m.pose) {
      const hit = e.target.closest?.('[data-joint],[data-part]');
      part = hit && model.byId.get(hit.dataset.joint || hit.dataset.part);
      while (part && !part.posable) part = part.parent;
    }
    el.setPointerCapture?.(e.pointerId);
    if (part) {
      solve(model);
      const piv = project(part.wPivot, m.deg * DEG);
      const p = toSvg(e);
      const near = Math.hypot(p.x - piv.sx, p.y - piv.sy) < 16; // 관절 점 자체를 잡으면 각도가 튀므로 좌우 이동량으로 돌린다
      m.drag = { kind: 'joint', part, piv, near, x0: p.x, y0: p.y, a0: Math.atan2(p.y - piv.sy, p.x - piv.sx), R0: part.R.slice(), W: part.parent.M.slice() };
      m.active = part; m.dirty = true;
    } else {
      m.drag = { kind: 'spin', x0: e.clientX, deg0: m.deg };
    }
  });
  el.addEventListener('pointermove', (e) => {
    const d = m.drag;
    if (!d) return;
    if (d.kind === 'spin') { m.deg = d.deg0 + (e.clientX - d.x0) * 0.8; m.draw(); return; }
    const p = toSvg(e);
    let delta = d.near ? (p.x - d.x0 + (p.y - d.y0)) * 0.012 : Math.atan2(p.y - d.piv.sy, p.x - d.piv.sx) - d.a0; // 화면 시계 방향 +
    delta = Math.max(-Math.PI * 0.9, Math.min(Math.PI * 0.9, ((delta + Math.PI * 3) % (Math.PI * 2)) - Math.PI));
    const n = viewAxis(m.deg * DEG);
    // 월드에서 시선축 기준으로 돌린 뒤 부모 좌표계로 되돌린다: R = Wᵀ · Rot(n, -δ) · W · R0
    d.part.R = mul(tr(d.W), mul(rotAxis(n, -delta), mul(d.W, d.R0)));
    m.draw();
  });
  const end = () => {
    if (!m.drag) return;
    if (m.drag.kind === 'spin') { m.baseDeg = m.deg; m.phase = -performance.now() / 1600; }
    m.drag = null; m.active = null; m.dirty = true;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('click', (e) => e.stopPropagation());

  mounts.add(m);
  if (!raf) raf = requestAnimationFrame(loop);
  return {
    setPose(on) { m.pose = on; m.spin = !on; el.classList.toggle('posing', on); if (!on) { m.baseDeg = m.deg; m.phase = -performance.now() / 1600; } m.dirty = true; },
    reset() { for (const p of model.parts) p.R = I3(); m.dirty = true; },
    stop() { mounts.delete(m); m.io?.disconnect(); },
  };
}
