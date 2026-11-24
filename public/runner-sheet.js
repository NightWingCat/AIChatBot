// 핸드오프 JSON → 런너(게이트) 도면 SVG 문자열. 브라우저와 Node 모두에서 동작 (DOM 미사용)

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const SHAPE = {
  head: (x, y, w, h) => `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}"/>`,
  torso: (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>`,
  limb: (x, y, w, h) => `<rect x="${x + w * 0.28}" y="${y}" width="${w * 0.44}" height="${h}" rx="${w * 0.22}"/>`,
  hand: (x, y, w, h) => `<rect x="${x + w * 0.15}" y="${y + h * 0.15}" width="${w * 0.7}" height="${h * 0.7}" rx="10"/>`,
  foot: (x, y, w, h) => `<rect x="${x}" y="${y + h * 0.35}" width="${w}" height="${h * 0.45}" rx="8"/>`,
  tail: (x, y, w, h) => `<path d="M${x + 6} ${y + h - 6} Q ${x + w} ${y + h} ${x + w - 8} ${y + 6}" fill="none" stroke-width="9" stroke-linecap="round"/>`,
  wing: (x, y, w, h) => `<path d="M${x} ${y + h} L ${x + w} ${y} L ${x + w * 0.7} ${y + h} Z"/>`,
  frame: (x, y, w, h) => `<rect x="${x + 4}" y="${y + h * 0.3}" width="${w - 8}" height="${h * 0.4}" rx="4"/><circle cx="${x + 10}" cy="${y + h / 2}" r="7"/><circle cx="${x + w - 10}" cy="${y + h / 2}" r="7"/>`,
  base: (x, y, w, h) => `<ellipse cx="${x + w / 2}" cy="${y + h * 0.6}" rx="${w / 2}" ry="${h * 0.25}"/>`,
};
const shapeFor = (c) => SHAPE[c] || ((x, y, w, h) => `<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="6"/>`);

/**
 * @param {object} kit 핸드오프 JSON
 * @param {object} [opt] { cols }
 */
export function runnerSheetSVG(kit, opt = {}) {
  const runners = kit?.runners || [];
  const cols = opt.cols || Math.min(3, Math.max(1, runners.length));
  const cell = 74, pad = 22, frameGap = 26, headerH = 64;
  const perRow = 4;

  const frames = runners.map((r) => {
    const rows = Math.ceil(r.parts.length / perRow);
    return { r, w: pad * 2 + perRow * cell, h: pad * 2 + rows * (cell + 20) + 6 };
  });
  const colW = frames.length ? frames[0].w : 360;
  const colHeights = Array(cols).fill(headerH);
  const placed = frames.map((f) => {
    const c = colHeights.indexOf(Math.min(...colHeights));
    const x = frameGap + c * (colW + frameGap);
    const y = colHeights[c] + frameGap;
    colHeights[c] = y + f.h;
    return { ...f, x, y };
  });
  const W = frameGap + cols * (colW + frameGap);
  const H = Math.max(...colHeights) + frameGap + 30;

  const body = placed.map(({ r, x, y, w, h }) => {
    const parts = r.parts.map((p, i) => {
      const px = x + pad + (i % perRow) * cell + 6;
      const py = y + pad + Math.floor(i / perRow) * (cell + 20) + 10;
      const pw = cell - 12, ph = cell - 16;
      const clear = p.finish === 'clear';
      const color = esc(p.colorHex || '#999999');
      const gateY = py - 6;
      return `<g>
  <line x1="${px + pw / 2}" y1="${y + 8}" x2="${px + pw / 2}" y2="${gateY + 6}" stroke="#9A9DA3" stroke-width="3"/>
  <g fill="${color}" stroke="${clear ? '#7FA7C9' : '#00000033'}" stroke-width="${clear ? 2 : 1.5}" fill-opacity="${clear ? 0.55 : 1}" ${p.category === 'tail' ? `style="stroke:${color};stroke-opacity:1"` : ''}>${shapeFor(p.category)(px, py, pw, ph)}</g>
  ${p.cautionNote ? `<circle cx="${px + pw - 2}" cy="${py + 2}" r="8" fill="#F5A524"/><text x="${px + pw - 2}" y="${py + 6}" font-size="11" font-weight="800" text-anchor="middle" fill="#1B1B1F">!</text>` : ''}
  <text x="${px + pw / 2}" y="${py + ph + 16}" font-size="12" font-weight="700" text-anchor="middle" fill="#2A2C31">${esc(p.partId)}</text>
</g>`;
    }).join('\n');
    return `<g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="none" stroke="#9A9DA3" stroke-width="7"/>
  <rect x="${x - 2}" y="${y - 16}" width="54" height="28" rx="6" fill="#FF6B2C"/>
  <text x="${x + 25}" y="${y + 4}" font-size="18" font-weight="900" text-anchor="middle" fill="#fff">${esc(r.gate)}</text>
  <text x="${x + 60}" y="${y - 7}" font-size="12" font-weight="700" fill="#3A3D44">${esc(r.runnerName || r.runnerId)}</text>
  ${parts}
</g>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Pretendard, 'Apple SD Gothic Neo', system-ui, sans-serif">
<rect width="${W}" height="${H}" fill="#D9DBDF"/>
<rect x="0" y="0" width="${W}" height="${headerH}" fill="#1B1B1F"/>
<text x="${frameGap}" y="28" font-size="13" font-weight="700" fill="#FF6B2C" letter-spacing="2">RUNNER LAB · ${esc(kit?.grade || '')}</text>
<text x="${frameGap}" y="50" font-size="18" font-weight="800" fill="#fff">${esc(kit?.kitName || '')}</text>
<text x="${W - frameGap}" y="50" font-size="13" font-weight="600" fill="#B7BAC1" text-anchor="end">${esc(kit?.kitId || '')}</text>
${body}
<text x="${frameGap}" y="${H - 14}" font-size="11" fill="#5B5F67">! = 주의 파츠 · 색상은 colorHex, 반투명은 clear 마감</text>
</svg>`;
}

export const svgToDataURL = (svg) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
