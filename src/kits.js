// 피사체 유형별 파츠 템플릿 → 핸드오프 JSON 생성 (목업 엔진과 샘플 데이터에서 사용)
// 좌표: Y-up, cm, 완성체 발밑 중심이 원점

const P = (gate, n, partName, category, pos, extra = {}) => ({ gate, n, partName, category, pos, ...extra });

// tone: body | accent | detail | clear | base  → 팔레트에서 색을 고른다
// grades: 이 파츠가 들어가는 등급 (기본: 전 등급)
const TEMPLATES = {
  quadruped: {
    label: '네발 동물',
    runnerNames: { A: '머리·얼굴', B: '몸통 코어', C: '앞다리', D: '뒷다리', E: '꼬리', F: '디스플레이 베이스', G: '내부 프레임' },
    parts: [
      P('A', 1, '머리 본체', 'head', [0, 9.5, 4.5], { connectsTo: ['B3'], jointType: 'ball' }),
      P('A', 2, '귀(좌)', 'head', [-1.2, 11.6, 4.3], { tone: 'accent', connectsTo: ['A1'], jointType: 'peg', caution: '얇은 귀 끝 — 게이트 컷 시 백화 주의' }),
      P('A', 3, '귀(우)', 'head', [1.2, 11.6, 4.3], { tone: 'accent', connectsTo: ['A1'], jointType: 'peg', caution: '얇은 귀 끝 — 게이트 컷 시 백화 주의' }),
      P('A', 4, '주둥이', 'head', [0, 8.9, 6.2], { tone: 'detail', connectsTo: ['A1'], jointType: 'snap' }),
      P('A', 5, '눈 클리어 파츠', 'head', [0, 9.9, 6.0], { tone: 'clear', connectsTo: ['A1'], jointType: 'snap', grades: ['HG', 'MG'] }),
      P('B', 1, '몸통(앞)', 'torso', [0, 6.0, 2.0], { connectsTo: ['B2'], jointType: 'snap' }),
      P('B', 2, '몸통(뒤)', 'torso', [0, 6.2, -2.5], { connectsTo: ['B1'], jointType: 'snap' }),
      P('B', 3, '목 조인트', 'frame', [0, 8.2, 3.6], { tone: 'detail', connectsTo: ['B1', 'A1'], jointType: 'ball', grades: ['HG', 'MG'] }),
      P('C', 1, '앞다리(좌)', 'limb', [-1.5, 3.0, 2.5], { connectsTo: ['B1'], jointType: 'ball' }),
      P('C', 2, '앞다리(우)', 'limb', [1.5, 3.0, 2.5], { connectsTo: ['B1'], jointType: 'ball' }),
      P('C', 3, '앞발(좌)', 'foot', [-1.5, 0.5, 3.0], { tone: 'accent', connectsTo: ['C1'], jointType: 'hinge', grades: ['HG', 'MG'] }),
      P('C', 4, '앞발(우)', 'foot', [1.5, 0.5, 3.0], { tone: 'accent', connectsTo: ['C2'], jointType: 'hinge', grades: ['HG', 'MG'] }),
      P('D', 1, '뒷다리(좌)', 'limb', [-1.6, 3.2, -3.0], { connectsTo: ['B2'], jointType: 'ball' }),
      P('D', 2, '뒷다리(우)', 'limb', [1.6, 3.2, -3.0], { connectsTo: ['B2'], jointType: 'ball' }),
      P('D', 3, '뒷발(좌)', 'foot', [-1.6, 0.5, -2.6], { tone: 'accent', connectsTo: ['D1'], jointType: 'hinge', grades: ['HG', 'MG'] }),
      P('D', 4, '뒷발(우)', 'foot', [1.6, 0.5, -2.6], { tone: 'accent', connectsTo: ['D2'], jointType: 'hinge', grades: ['HG', 'MG'] }),
      P('E', 1, '꼬리 뿌리', 'tail', [0, 6.5, -5.4], { rot: [-35, 0, 0], connectsTo: ['B2'], jointType: 'ball' }),
      P('E', 2, '꼬리 끝', 'tail', [0, 9.2, -6.8], { tone: 'accent', rot: [-60, 0, 0], connectsTo: ['E1'], jointType: 'ball', caution: '가장 얇은 파츠 — 니퍼 두 번 컷 권장', grades: ['HG', 'MG'] }),
      P('F', 1, '디스플레이 베이스', 'base', [0, -0.3, 0], { tone: 'base' }),
      P('G', 1, '척추 프레임', 'frame', [0, 6.1, 0], { tone: 'frame', connectsTo: ['B1', 'B2'], jointType: 'peg', grades: ['MG'] }),
      P('G', 2, '어깨 프레임', 'frame', [0, 5.6, 2.4], { tone: 'frame', connectsTo: ['G1', 'C1', 'C2'], jointType: 'ball', grades: ['MG'] }),
      P('G', 3, '골반 프레임', 'frame', [0, 5.8, -2.8], { tone: 'frame', connectsTo: ['G1', 'D1', 'D2'], jointType: 'ball', grades: ['MG'] }),
    ],
    weird: [
      { id: 'reverse-knee', label: '역관절 모드', description: 'D 게이트 뒷다리를 180도 돌려 끼워 닭다리 보행' },
      { id: 'big-head', label: '대두 SD 변신', description: 'A1 머리만 2.5배 키워서 왕머리 마스코트' },
      { id: 'tail-swap', label: '꼬리 안테나', description: 'E 게이트 꼬리를 머리 위에 꽂아 수신 안테나로' },
    ],
  },

  humanoid: {
    label: '인물·캐릭터',
    runnerNames: { A: '머리·얼굴', B: '몸통·허리', C: '팔', D: '다리', E: '소품·액세서리', F: '디스플레이 베이스', G: '내부 프레임' },
    parts: [
      P('A', 1, '머리 본체', 'head', [0, 16.2, 0], { connectsTo: ['B1'], jointType: 'ball' }),
      P('A', 2, '얼굴 플레이트', 'head', [0, 16.0, 0.9], { tone: 'skin', connectsTo: ['A1'], jointType: 'snap' }),
      P('A', 3, '앞머리', 'head', [0, 17.2, 0.6], { tone: 'accent', connectsTo: ['A1'], jointType: 'snap', caution: '머리카락 끝 샤프 파츠 — 사포 마감 필수' }),
      P('A', 4, '뒷머리', 'head', [0, 16.6, -0.8], { tone: 'accent', connectsTo: ['A1'], jointType: 'snap', grades: ['HG', 'MG'] }),
      P('A', 5, '눈 클리어 파츠', 'head', [0, 16.1, 1.1], { tone: 'clear', connectsTo: ['A2'], jointType: 'snap', grades: ['MG'] }),
      P('B', 1, '가슴(앞)', 'torso', [0, 12.8, 0.4], { connectsTo: ['B2', 'B3'], jointType: 'snap' }),
      P('B', 2, '등(뒤)', 'torso', [0, 12.8, -0.5], { connectsTo: ['B1'], jointType: 'snap' }),
      P('B', 3, '허리', 'torso', [0, 10.6, 0], { tone: 'detail', connectsTo: ['B1', 'B4'], jointType: 'ball', grades: ['HG', 'MG'] }),
      P('B', 4, '골반', 'torso', [0, 9.4, 0], { tone: 'detail', connectsTo: ['B3', 'D1', 'D2'], jointType: 'ball' }),
      P('C', 1, '상완(좌)', 'limb', [-2.6, 12.6, 0], { rot: [0, 0, 8], connectsTo: ['B1'], jointType: 'ball' }),
      P('C', 2, '상완(우)', 'limb', [2.6, 12.6, 0], { rot: [0, 0, -8], connectsTo: ['B1'], jointType: 'ball' }),
      P('C', 3, '전완(좌)', 'limb', [-3.0, 10.4, 0.2], { connectsTo: ['C1'], jointType: 'hinge', grades: ['HG', 'MG'] }),
      P('C', 4, '전완(우)', 'limb', [3.0, 10.4, 0.2], { connectsTo: ['C2'], jointType: 'hinge', grades: ['HG', 'MG'] }),
      P('C', 5, '손(좌)', 'hand', [-3.2, 8.8, 0.3], { tone: 'skin', connectsTo: ['C3'], jointType: 'ball', caution: '손가락 분할 — 유격 주의' }),
      P('C', 6, '손(우)', 'hand', [3.2, 8.8, 0.3], { tone: 'skin', connectsTo: ['C4'], jointType: 'ball', caution: '손가락 분할 — 유격 주의' }),
      P('D', 1, '허벅지(좌)', 'limb', [-1.0, 7.4, 0], { connectsTo: ['B4'], jointType: 'ball' }),
      P('D', 2, '허벅지(우)', 'limb', [1.0, 7.4, 0], { connectsTo: ['B4'], jointType: 'ball' }),
      P('D', 3, '정강이(좌)', 'limb', [-1.0, 3.8, 0], { connectsTo: ['D1'], jointType: 'hinge', grades: ['HG', 'MG'] }),
      P('D', 4, '정강이(우)', 'limb', [1.0, 3.8, 0], { connectsTo: ['D2'], jointType: 'hinge', grades: ['HG', 'MG'] }),
      P('D', 5, '발(좌)', 'foot', [-1.0, 0.6, 0.4], { tone: 'detail', connectsTo: ['D3'], jointType: 'ball' }),
      P('D', 6, '발(우)', 'foot', [1.0, 0.6, 0.4], { tone: 'detail', connectsTo: ['D4'], jointType: 'ball' }),
      P('E', 1, '손 소품', 'prop', [3.4, 8.6, 1.2], { tone: 'accent', connectsTo: ['C6'], jointType: 'peg' }),
      P('E', 2, '액세서리', 'accessory', [0, 14.4, 0.8], { tone: 'accent', connectsTo: ['B1'], jointType: 'peg', grades: ['HG', 'MG'] }),
      P('F', 1, '디스플레이 베이스', 'base', [0, -0.3, 0], { tone: 'base' }),
      P('G', 1, '상체 프레임', 'frame', [0, 12.4, 0], { tone: 'frame', connectsTo: ['B1', 'B2'], jointType: 'peg', grades: ['MG'] }),
      P('G', 2, '어깨 연동 프레임', 'frame', [0, 13.4, 0], { tone: 'frame', connectsTo: ['C1', 'C2'], jointType: 'ball', grades: ['MG'] }),
      P('G', 3, '하체 프레임', 'frame', [0, 6.0, 0], { tone: 'frame', connectsTo: ['D1', 'D2'], jointType: 'hinge', grades: ['MG'] }),
    ],
    weird: [
      { id: 'reverse-knee', label: '역관절 모드', description: 'D3·D4 정강이를 뒤집어 끼워 새다리 포즈' },
      { id: 'arm-leg-swap', label: '팔다리 체인지', description: 'C 게이트 팔을 골반에, D 게이트 다리를 어깨에' },
      { id: 'tiny-head', label: '소두 근육맨', description: 'A1 머리 0.4배 + B1 가슴 1.8배' },
    ],
  },

  object: {
    label: '사물',
    runnerNames: { A: '본체', B: '상판·뚜껑', C: '돌출부', D: '디테일 패널', F: '디스플레이 베이스', G: '내부 프레임' },
    parts: [
      P('A', 1, '본체(상)', 'torso', [0, 6.5, 0], { connectsTo: ['A2'], jointType: 'snap' }),
      P('A', 2, '본체(하)', 'torso', [0, 3.0, 0], { connectsTo: ['A1'], jointType: 'snap' }),
      P('B', 1, '상판·뚜껑', 'accessory', [0, 9.2, 0], { tone: 'accent', connectsTo: ['A1'], jointType: 'hinge' }),
      P('C', 1, '돌출부(좌)', 'prop', [-3.6, 5.0, 0], { tone: 'detail', connectsTo: ['A1'], jointType: 'peg' }),
      P('C', 2, '돌출부(우)', 'prop', [3.6, 5.0, 0], { tone: 'detail', connectsTo: ['A1'], jointType: 'peg' }),
      P('D', 1, '디테일 패널(앞)', 'other', [0, 5.0, 2.1], { tone: 'detail', connectsTo: ['A1'], jointType: 'snap', grades: ['HG', 'MG'] }),
      P('D', 2, '투명 창', 'other', [0, 6.8, 2.2], { tone: 'clear', connectsTo: ['A1'], jointType: 'snap', grades: ['MG'], caution: '클리어 파츠 — 게이트 자국이 비침, 칼로 정리' }),
      P('F', 1, '디스플레이 베이스', 'base', [0, -0.3, 0], { tone: 'base' }),
      P('G', 1, '내부 보강 프레임', 'frame', [0, 4.8, 0], { tone: 'frame', connectsTo: ['A1', 'A2'], jointType: 'peg', grades: ['MG'] }),
    ],
    weird: [
      { id: 'legs-on-object', label: '다리 달린 사물', description: '다른 키트의 D 게이트 다리를 본체 밑에 장착' },
      { id: 'stack-tower', label: '무한 탑 쌓기', description: 'A1 본체를 0.6배씩 줄여 세 단으로 쌓기' },
    ],
  },
};

const FALLBACK_PALETTE = ['#8A7F72', '#D9CBB8', '#4A4440'];

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function colorFor(tone, palette) {
  const [body, accent, detail] = palette;
  switch (tone) {
    case 'accent': return { colorHex: accent, finish: 'matte' };
    case 'detail': return { colorHex: detail, finish: 'matte' };
    case 'skin': return { colorHex: '#F2D7C4', finish: 'matte' };
    case 'clear': return { colorHex: '#CFE8FF', finish: 'clear' };
    case 'base': return { colorHex: '#2B2B2E', finish: 'gloss' };
    case 'frame': return { colorHex: '#6B6F76', finish: 'matte' };
    default: return { colorHex: body, finish: 'matte' };
  }
}

const round = (v) => Math.round(v * 100) / 100;
const vec = ([x, y, z]) => ({ x: round(x), y: round(y), z: round(z) });

export function kitId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32자: 바이트 하위 5비트로 균등 선택
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(6));
  return `KIT-${[...bytes].map((b) => chars[b & 31]).join('')}`;
}

export const templateLabel = (type) => TEMPLATES[type]?.label;

/**
 * @param {object} o
 * @param {'quadruped'|'humanoid'|'object'} o.type
 * @param {'SD'|'HG'|'MG'} o.grade
 * @param {string} o.subject
 * @param {string[]} [o.palette] 3색 (#RRGGBB)
 */
export function buildHandoff({ type, grade, subject, palette, sourceType = 'photo', views = ['front'], id }) {
  const t = TEMPLATES[type] || TEMPLATES.object;
  const pal = (palette?.length ? palette : FALLBACK_PALETTE).slice(0, 3);
  while (pal.length < 3) pal.push(shade(pal[0], pal.length === 1 ? 0.25 : -0.25));

  const sd = grade === 'SD';
  const parts = t.parts.filter((p) => !p.grades || p.grades.includes(grade));
  const kept = new Set(parts.map((p) => `${p.gate}${p.n}`));

  const runners = {};
  for (const p of parts) {
    const runnerId = `RN-${p.gate}`;
    let pos = p.pos;
    let scale = [1, 1, 1];
    if (sd) {
      // SD 데포르메: 머리 크게, 몸은 짧게
      if (p.category === 'head') { scale = [1.6, 1.6, 1.6]; pos = [pos[0] * 1.4, pos[1] * 0.85, pos[2]]; }
      else if (p.category !== 'base') { pos = [pos[0], pos[1] * 0.6, pos[2]]; scale = [1.05, 0.75, 1.05]; }
    }
    const part = {
      runnerId,
      gate: p.gate,
      partId: `${p.gate}${p.n}`,
      partName: p.partName,
      category: p.category,
      suggestedPosition: vec(pos),
      suggestedRotation: vec(p.rot || [0, 0, 0]),
      suggestedScale: vec(scale),
      allowWeirdAssembly: true,
      ...colorFor(p.tone, pal),
      connectsTo: (p.connectsTo || []).filter((c) => kept.has(c)),
      jointType: p.jointType || 'fixed',
      cautionNote: p.caution || null,
    };
    (runners[p.gate] ||= { runnerId, gate: p.gate, runnerName: t.runnerNames[p.gate], parts: [] }).parts.push(part);
  }

  const scaleLabel = { SD: 'SD', HG: 'HG 1/144', MG: 'MG 1/100' }[grade];
  return {
    schemaVersion: '1.0',
    kitId: id || kitId(),
    kitName: `${scaleLabel} ${subject}`,
    grade,
    verdict: 'OK',
    source: { type: sourceType, subject, views },
    units: { position: 'cm', rotation: 'deg', scale: 'ratio' },
    runners: Object.values(runners).sort((a, b) => a.gate.localeCompare(b.gate)),
    weirdAssemblyPresets: t.weird,
  };
}
