// 핸드오프 JSON → 완성 조립 프리뷰 (2D 스프라이트 + 깊이 정렬 = 3D 턴테이블 느낌의 2.5D)
// suggestedPosition(x,y,z) · suggestedScale · approxSize 로 파츠를 배치하고, Y축 회전 각도(θ)에 따라
// 화면 위치와 앞뒤 순서를 다시 계산한다. 진짜 3D 모델링은 하지 않는다.

const S = 22; // px per cm
const PITCH = (14 * Math.PI) / 180; // 살짝 위에서 내려다보는 시점
const SHADOW = 'rgba(74,44,34,.2)';

const DEFAULT_SIZE = {
  head: [3.6, 3.4, 3.2], torso: [4, 3.6, 3], limb: [1.3, 3.4, 1.3], hand: [1.1, 1.1, 0.9], foot: [1.5, 0.9, 2],
  tail: [0.9, 3, 0.9], wing: [3, 2.6, 0.4], prop: [0.8, 2.6, 0.8], accessory: [1.4, 1, 0.6], frame: [0.8, 0.8, 4],
  base: [11, 0.6, 11], other: [2, 2, 1],
};

const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const vec = (o, d) => [num(o?.x, d), num(o?.y, d), num(o?.z, d)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function darken(hex, amt = 0.24) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  if (Number.isNaN(n)) return '#7A6F66';
  const f = (v) => Math.max(0, Math.round(v * (1 - amt)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** 키트에서 프리뷰용 파츠 목록 (내부 프레임은 완성품에서 안 보이므로 제외) */
function partsOf(kit) {
  return (kit?.runners || []).flatMap((r) => r.parts || [])
    .filter((p) => p.category !== 'frame')
    .map((p) => {
      const sc = vec(p.suggestedScale, 1);
      const base = p.approxSize ? vec(p.approxSize, 1) : DEFAULT_SIZE[p.category] || DEFAULT_SIZE.other;
      return {
        id: p.partId, cat: p.category, color: p.colorHex || '#999999', finish: p.finish,
        pos: vec(p.suggestedPosition, 0), rot: vec(p.suggestedRotation, 0),
        size: [base[0] * sc[0], base[1] * sc[1], base[2] * sc[2]],
      };
    });
}

function project([x, y, z], th) {
  const c = Math.cos(th), s = Math.sin(th);
  const X = x * c + z * s;
  const Z = -x * s + z * c; // 클수록 화면 앞
  return { sx: X * S, sy: (-y * Math.cos(PITCH) + Z * Math.sin(PITCH)) * S, depth: Z };
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

function frameBounds(parts) {
  // 모든 회전 각도에서 안정적인 viewBox (흔들림 방지)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let a = 0; a < 360; a += 30) {
    const th = (a * Math.PI) / 180;
    for (const p of parts) {
      const { sx, sy } = project(p.pos, th);
      const r = (Math.max(p.size[0], p.size[2]) / 2) * S;
      const hh = p.cat === 'base' ? (p.size[2] / 2) * S * Math.sin(PITCH) + p.size[1] * S : (p.size[1] / 2) * S;
      minX = Math.min(minX, sx - r); maxX = Math.max(maxX, sx + r);
      minY = Math.min(minY, sy - hh); maxY = Math.max(maxY, sy + hh);
    }
  }
  if (!Number.isFinite(minX)) return { x: -100, y: -100, w: 200, h: 200 };
  const pad = 18;
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 + 8 };
}

/**
 * @param {object} kit 핸드오프 JSON
 * @param {number} deg Y축 회전 각도
 * @param {object} [box] frameBounds 결과 (턴테이블에서 재사용)
 */
export function assemblySVG(kit, deg = 32, box, parts = partsOf(kit)) {
  const th = (deg * Math.PI) / 180;
  const vb = box || frameBounds(parts);
  const base = parts.find((p) => p.cat === 'base');
  const items = parts.filter((p) => p !== base).map((p) => ({ p, ...project(p.pos, th) })).sort((a, b) => a.depth - b.depth || b.p.pos[1] - a.p.pos[1]);

  let out = '';
  if (base) {
    const { sx, sy } = project(base.pos, th);
    const rx = (Math.max(base.size[0], base.size[2]) / 2) * S;
    const ry = rx * Math.sin(PITCH) * 1.15;
    const t = Math.max(6, base.size[1] * S);
    const dark = darken(base.color, 0.35);
    out += `<g transform="translate(${sx} ${sy})">
  <ellipse cy="${t + 6}" rx="${rx * 1.02}" ry="${ry}" fill="${SHADOW}"/>
  <rect x="${-rx}" y="0" width="${rx * 2}" height="${t}" fill="${dark}"/>
  <ellipse cy="${t}" rx="${rx}" ry="${ry}" fill="${dark}"/>
  <ellipse rx="${rx}" ry="${ry}" fill="${esc(base.color)}"/>
  <ellipse rx="${rx}" ry="${ry}" fill="url(#ahl)" opacity=".7"/>
  <ellipse rx="${rx * 0.62}" ry="${ry * 0.55}" fill="${SHADOW}"/>
</g>`;
  }
  for (const { p, sx, sy } of items) {
    const c = Math.cos(th), s = Math.sin(th);
    const w = (Math.abs(p.size[0] * c) + Math.abs(p.size[2] * s)) * S;
    const h = p.size[1] * S;
    const rot = p.rot[2] * c - p.rot[0] * s * 0.6;
    const clear = p.finish === 'clear';
    const sh = shape(p.cat, Math.max(w, 6), Math.max(h, 6));
    out += `<g transform="translate(${sx.toFixed(1)} ${sy.toFixed(1)}) rotate(${rot.toFixed(1)})">
  <g fill="${esc(darken(p.color))}" transform="translate(0 3)" ${clear ? 'fill-opacity=".5"' : ''}>${sh}</g>
  <g fill="${esc(p.color)}" ${clear ? 'fill-opacity=".55" stroke="#8FCBFF" stroke-width="1.5"' : ''}>${sh}</g>
  <g fill="url(#ahl)" opacity="${p.finish === 'gloss' ? 0.9 : clear ? 0.8 : 0.5}">${sh}</g>
</g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}" role="img" aria-label="${esc(kit?.kitName || '키트')} 완성 프리뷰">
<defs><linearGradient id="ahl" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
${out}
</svg>`;
}

/* ── 턴테이블: 자동으로 천천히 돌고, 드래그하면 손으로 돌린다 ── */
const mounts = new Set();
let raf = 0;
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function loop(t) {
  raf = 0;
  for (const m of mounts) {
    if (!m.el.isConnected) { mounts.delete(m); m.io?.disconnect(); continue; }
    if (!m.visible) continue;
    if (!m.dragging && !reduced()) m.deg = m.baseDeg + Math.sin(t / 1600 + m.phase) * 34;
    if (Math.abs(m.deg - m.drawn) > 0.4) { m.el.innerHTML = assemblySVG(m.kit, m.deg, m.box, m.parts); m.drawn = m.deg; }
  }
  if (mounts.size) raf = requestAnimationFrame(loop);
}

/** el 안에 회전하는 완성 프리뷰를 붙인다 */
export function mountTurntable(el, kit, { deg = 32 } = {}) {
  const parts = partsOf(kit);
  const m = { el, kit, parts, box: frameBounds(parts), deg, baseDeg: deg, drawn: NaN, phase: Math.random() * 6, visible: true, dragging: false };
  el.innerHTML = assemblySVG(kit, deg, m.box, parts);
  m.drawn = deg;
  el.classList.add('turntable');
  if ('IntersectionObserver' in globalThis) {
    m.io = new IntersectionObserver(([e]) => { m.visible = e.isIntersecting; });
    m.io.observe(el);
  }
  let startX = 0, startDeg = 0;
  el.addEventListener('pointerdown', (e) => {
    m.dragging = true; startX = e.clientX; startDeg = m.deg;
    el.setPointerCapture?.(e.pointerId);
    e.stopPropagation();
  });
  el.addEventListener('pointermove', (e) => {
    if (!m.dragging) return;
    m.deg = startDeg + (e.clientX - startX) * 0.8;
    el.innerHTML = assemblySVG(kit, m.deg, m.box, parts); m.drawn = m.deg;
  });
  const end = () => { if (m.dragging) { m.dragging = false; m.baseDeg = m.deg; m.phase = -performance.now() / 1600; } };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('click', (e) => e.stopPropagation());
  mounts.add(m);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => { mounts.delete(m); m.io?.disconnect(); };
}
