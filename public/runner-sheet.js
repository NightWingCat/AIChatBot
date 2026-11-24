// 핸드오프 JSON → 2.5D 런너(게이트) 도면 SVG 문자열. 브라우저와 Node 모두에서 동작 (DOM 미사용)
// 2.5D: 납작한 색면 + 바닥 그림자 + 위쪽 하이라이트 + 아래쪽 음영으로 입체감만 살린다 (Kigle 토큰 기반)

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const K = {
  bg: '#FFF4E6', bgDot: '#F0E2CF', ink: '#2E211C', muted: '#5C4A42', subtle: '#8C7B73',
  runner: '#C9C3BD', runnerTop: '#DDD8D3', runnerGround: '#9E968F',
  red: '#FF4A4A', redGround: '#C92F2F', yellow: '#FFC34A', shadow: 'rgba(74,44,34,.18)',
};

const SHAPE = {
  head: (x, y, w, h) => `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}"/>`,
  torso: (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/>`,
  limb: (x, y, w, h) => `<rect x="${x + w * 0.28}" y="${y}" width="${w * 0.44}" height="${h}" rx="${w * 0.22}"/>`,
  hand: (x, y, w, h) => `<rect x="${x + w * 0.15}" y="${y + h * 0.15}" width="${w * 0.7}" height="${h * 0.7}" rx="12"/>`,
  foot: (x, y, w, h) => `<rect x="${x}" y="${y + h * 0.35}" width="${w}" height="${h * 0.45}" rx="10"/>`,
  tail: (x, y, w, h) => `<path d="M${x + 8} ${y + h - 8} Q ${x + w + 2} ${y + h} ${x + w - 10} ${y + 8} L ${x + w - 22} ${y + 12} Q ${x + w - 12} ${y + h - 14} ${x + 8} ${y + h - 20} Z"/>`,
  wing: (x, y, w, h) => `<path d="M${x} ${y + h} L ${x + w} ${y} L ${x + w * 0.7} ${y + h} Z"/>`,
  frame: (x, y, w, h) => `<rect x="${x + 4}" y="${y + h * 0.32}" width="${w - 8}" height="${h * 0.36}" rx="6"/><circle cx="${x + 11}" cy="${y + h / 2}" r="9"/><circle cx="${x + w - 11}" cy="${y + h / 2}" r="9"/>`,
  base: (x, y, w, h) => `<ellipse cx="${x + w / 2}" cy="${y + h * 0.6}" rx="${w / 2}" ry="${h * 0.26}"/>`,
};
const shapeFor = (c) => SHAPE[c] || ((x, y, w, h) => `<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="8"/>`);

function darken(hex, amt = 0.22) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  if (Number.isNaN(n)) return '#7A6F66';
  const f = (v) => Math.max(0, Math.round(v * (1 - amt)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** 파츠 한 개: 바닥 그림자 → 옆면(어두운 색, 아래로 4px) → 윗면 → 하이라이트 */
function part25d(p, x, y, w, h) {
  const shape = shapeFor(p.category)(x, y, w, h);
  const shapeDown = shapeFor(p.category)(x, y + 4, w, h);
  const clear = p.finish === 'clear';
  const gloss = p.finish === 'gloss';
  const color = esc(p.colorHex || '#999999');
  return `<g>
  <g fill="${K.shadow}" transform="translate(3 9)">${shape}</g>
  <g fill="${esc(darken(p.colorHex))}" ${clear ? 'fill-opacity=".55"' : ''}>${shapeDown}</g>
  <g fill="${color}" ${clear ? 'fill-opacity=".6" stroke="#8FCBFF" stroke-width="2"' : ''}>${shape}</g>
  <g fill="url(#hl)" opacity="${gloss ? 0.9 : clear ? 0.8 : 0.55}">${shape}</g>
</g>`;
}

/**
 * @param {object} kit 핸드오프 JSON
 * @param {object} [opt] { cols }
 */
export function runnerSheetSVG(kit, opt = {}) {
  const runners = kit?.runners || [];
  const cols = opt.cols || Math.min(3, Math.max(1, runners.length));
  const cell = 78, pad = 24, frameGap = 34, headerH = 76;
  const perRow = 4;

  const frames = runners.map((r) => {
    const rows = Math.ceil(r.parts.length / perRow);
    return { r, w: pad * 2 + perRow * cell, h: pad * 2 + rows * (cell + 22) + 8 };
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
    const rows = Math.ceil(r.parts.length / perRow);
    // 2행부터는 행 위에 가로 런너 바를 두고 거기서 게이트를 뽑는다 (윗줄 파츠를 관통하지 않게)
    const bars = Array.from({ length: rows - 1 }, (_, k) => {
      const by = y + pad + (k + 1) * (cell + 22) - 4;
      return `<rect x="${x}" y="${by + 3}" width="${w}" height="6" rx="3" fill="${K.runnerGround}"/><rect x="${x}" y="${by}" width="${w}" height="6" rx="3" fill="${K.runner}"/>`;
    }).join('');
    const parts = r.parts.map((p, i) => {
      const row = Math.floor(i / perRow);
      const px = x + pad + (i % perRow) * cell + 7;
      const py = y + pad + row * (cell + 22) + 12;
      const pw = cell - 14, ph = cell - 18;
      const sy = row === 0 ? y + 6 : y + pad + row * (cell + 22) + 2;
      return `<g>
  <rect x="${px + pw / 2 - 2}" y="${sy}" width="4" height="${py - sy + 4}" rx="2" fill="${K.runnerGround}"/>
  <rect x="${px + pw / 2 - 2}" y="${sy}" width="4" height="${py - sy + 1}" rx="2" fill="${K.runner}"/>
  ${part25d(p, px, py, pw, ph)}
  ${p.cautionNote ? `<circle cx="${px + pw - 2}" cy="${py + 4}" r="9" fill="#D99A1E"/><circle cx="${px + pw - 2}" cy="${py + 2}" r="9" fill="${K.yellow}"/><text x="${px + pw - 2}" y="${py + 6.5}" font-size="12" font-weight="900" text-anchor="middle" fill="${K.ink}">!</text>` : ''}
  <text x="${px + pw / 2}" y="${py + ph + 20}" font-size="12.5" font-weight="800" text-anchor="middle" fill="${K.ink}" font-family="Nunito, 'Noto Sans KR', sans-serif">${esc(p.partId)}</text>
</g>`;
    }).join('\n');
    return `<g>
  <rect x="${x + 2}" y="${y + 12}" width="${w}" height="${h}" rx="14" fill="${K.shadow}" opacity=".6"/>
  <rect x="${x}" y="${y + 5}" width="${w}" height="${h}" rx="14" fill="none" stroke="${K.runnerGround}" stroke-width="9"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="none" stroke="${K.runner}" stroke-width="9"/>
  ${bars}
  <rect x="${x - 4}" y="${y - 16}" width="58" height="30" rx="10" fill="${K.redGround}"/>
  <rect x="${x - 4}" y="${y - 20}" width="58" height="30" rx="10" fill="${K.red}"/>
  <text x="${x + 25}" y="${y + 1}" font-size="19" font-weight="900" text-anchor="middle" fill="#fff" font-family="Nunito, sans-serif">${esc(r.gate)}</text>
  <text x="${x + 62}" y="${y - 9}" font-size="13" font-weight="700" fill="${K.muted}">${esc(r.runnerName || r.runnerId)}</text>
  ${parts}
</g>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="'Noto Sans KR', 'Apple SD Gothic Neo', system-ui, sans-serif">
<defs>
  <linearGradient id="hl" x1="0" y1="0" x2="0.35" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".85"/>
    <stop offset=".38" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="${K.bgDot}"/></pattern>
</defs>
<rect width="${W}" height="${H}" fill="${K.bg}"/>
<rect width="${W}" height="${H}" fill="url(#dots)"/>
<text x="${frameGap}" y="34" font-size="13" font-weight="900" fill="${K.red}" letter-spacing="2" font-family="Nunito, sans-serif">SONPRA RUNNER · ${esc(kit?.grade || '')}</text>
<text x="${frameGap}" y="60" font-size="20" font-weight="800" fill="${K.ink}">${esc(kit?.kitName || '')}</text>
<text x="${W - frameGap}" y="60" font-size="13" font-weight="700" fill="${K.subtle}" text-anchor="end" font-family="Nunito, sans-serif">${esc(kit?.kitId || '')}</text>
${body}
<text x="${frameGap}" y="${H - 14}" font-size="11.5" fill="${K.subtle}">! 노란 표시 = 주의 파츠 · 색은 성형색(colorHex), 반투명은 클리어 파츠</text>
</svg>`;
}

export const svgToDataURL = (svg) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
