// 숍 진열용 의뢰 키트 3종 — Desktop/손프라 의뢰 사진에서 구도·색만 가져와 설계 (인물은 특정인 얼굴 재현 없이 일반화)
// 좌표: Y-up, cm, 완성체 발밑 중심이 원점. size = approxSize(폭·높이·깊이 cm)

const P = (gate, n, partName, category, pos, o = {}) => ({ gate, n, partName, category, pos, ...o });

const SKIN = '#E8BFA4';

const KITS = {
  // 두상: 정장 차림 흉상 (부스스한 짙은 갈색 머리, 흰 셔츠, 네이비 재킷)
  bust: {
    kitId: 'KIT-BUST01', grade: 'HG', name: 'HG 1/12 정장 두상(흉상)', subject: '정장 차림 인물 두상', views: ['front'],
    runnerNames: { A: '머리·얼굴', B: '목·셔츠', C: '재킷', F: '흉상 받침대' },
    parts: [
      P('A', 1, '얼굴', 'head', [0, 8.1, 0.2], { size: [3.3, 4.2, 3.4], color: SKIN, connectsTo: ['B1'], jointType: 'ball' }),
      P('A', 2, '앞머리(부스스 헤어)', 'head', [0, 10.1, 0.4], { size: [3.9, 1.7, 3.2], color: '#4A3428', connectsTo: ['A1'], jointType: 'snap', caution: '삐친 머리끝이 얇음 — 사포로 마감' }),
      P('A', 3, '뒷머리', 'head', [0, 8.9, -1.2], { size: [3.6, 3.2, 1.4], color: '#3E2B21', connectsTo: ['A1'], jointType: 'snap' }),
      P('A', 4, '귀(좌)', 'head', [-1.75, 8.1, 0], { size: [0.5, 1.1, 0.8], color: '#DDAF93', connectsTo: ['A1'], jointType: 'peg' }),
      P('A', 5, '귀(우)', 'head', [1.75, 8.1, 0], { size: [0.5, 1.1, 0.8], color: '#DDAF93', connectsTo: ['A1'], jointType: 'peg' }),
      P('A', 6, '눈·눈썹 데칼', 'head', [0, 8.6, 1.85], { size: [2, 0.55, 0.1], color: '#5B6B73', connectsTo: ['A1'], jointType: 'fixed', caution: '데칼(스티커) — 물 전사 시 위치 주의' }),
      P('B', 1, '목', 'torso', [0, 5.7, 0], { size: [1.6, 1.5, 1.5], color: '#DDAF93', connectsTo: ['A1', 'B3'], jointType: 'ball' }),
      P('B', 2, '셔츠 칼라', 'accessory', [0, 5.05, 0.75], { size: [2.7, 0.9, 1.3], color: '#F7F6F2', connectsTo: ['B3'], jointType: 'snap' }),
      P('B', 3, '셔츠 앞판', 'torso', [0, 3.1, 0.9], { size: [2.1, 3.9, 1], color: '#F7F6F2', connectsTo: ['C1', 'C2'], jointType: 'snap' }),
      P('C', 1, '재킷(좌)', 'torso', [-1.55, 2.7, 0], { size: [3.1, 4.6, 3.2], color: '#1F2638', connectsTo: ['C2'], jointType: 'snap' }),
      P('C', 2, '재킷(우)', 'torso', [1.55, 2.7, 0], { size: [3.1, 4.6, 3.2], color: '#1F2638', connectsTo: ['C1'], jointType: 'snap' }),
      P('C', 3, '새틴 라펠(좌)', 'accessory', [-0.95, 3.5, 1.65], { size: [0.8, 3.3, 0.2], rot: [0, 0, -8], color: '#111522', finish: 'gloss', connectsTo: ['C1'], jointType: 'snap' }),
      P('C', 4, '새틴 라펠(우)', 'accessory', [0.95, 3.5, 1.65], { size: [0.8, 3.3, 0.2], rot: [0, 0, 8], color: '#111522', finish: 'gloss', connectsTo: ['C2'], jointType: 'snap' }),
      P('F', 1, '흉상 받침대', 'base', [0, -0.3, 0], { size: [8, 0.7, 6], color: '#6E3B2C', finish: 'gloss' }),
    ],
    weird: [
      { id: 'hair-boom', label: '헤어 대폭발', description: 'A2 앞머리만 2.5배로 키워 사자 갈기' },
      { id: 'big-head', label: '대두 흉상', description: 'A 게이트 전체 1.8배, 재킷은 그대로' },
      { id: 'ear-swap', label: '귀 위치 바꾸기', description: 'A4·A5 귀를 머리 위에 꽂아 동물 귀' },
    ],
  },

  // 전신: 무대 위 프레젠터 (은발, 안경, 가죽 재킷, 블랙 티·진, 양팔을 벌린 포즈)
  fullbody: {
    kitId: 'KIT-FULL02', grade: 'HG', name: 'HG 1/12 가죽 재킷 프레젠터 전신', subject: '가죽 재킷 차림 인물 전신', views: ['front'],
    runnerNames: { A: '머리·헤어', B: '재킷·몸통', C: '팔(벌린 포즈)', D: '다리·신발', E: '소품', F: '디스플레이 베이스' },
    parts: [
      P('A', 1, '얼굴', 'head', [0, 16.3, 0], { size: [2.9, 3.4, 2.8], color: SKIN, connectsTo: ['B3'], jointType: 'ball' }),
      P('A', 2, '은발 헤어', 'head', [0, 17.75, -0.1], { size: [3.1, 1.4, 3], color: '#CFCFD2', connectsTo: ['A1'], jointType: 'snap' }),
      P('A', 3, '안경', 'accessory', [0, 16.65, 1.45], { size: [2.6, 0.6, 0.2], color: '#3A3A44', finish: 'clear', connectsTo: ['A1'], jointType: 'peg', caution: '안경테가 매우 얇음 — 니퍼 두 번 컷' }),
      P('B', 1, '가죽 재킷 앞(좌)', 'torso', [-1.2, 12.5, 0.6], { size: [1.5, 4.4, 1.2], color: '#2E2433', finish: 'gloss', connectsTo: ['B5'], jointType: 'snap' }),
      P('B', 2, '가죽 재킷 앞(우)', 'torso', [1.2, 12.5, 0.6], { size: [1.5, 4.4, 1.2], color: '#2E2433', finish: 'gloss', connectsTo: ['B5'], jointType: 'snap' }),
      P('B', 3, '블랙 티셔츠', 'torso', [0, 12.6, 0.4], { size: [1.6, 4, 1], color: '#141417', connectsTo: ['B5'], jointType: 'snap' }),
      P('B', 4, '벨트', 'accessory', [0, 10.2, 0.3], { size: [3.4, 0.5, 2], color: '#1A1A1D', finish: 'gloss', connectsTo: ['B6'], jointType: 'snap' }),
      P('B', 5, '재킷 등판', 'torso', [0, 12.6, -0.4], { size: [3.9, 4.4, 1.3], color: '#2A2030', finish: 'gloss', connectsTo: ['B3'], jointType: 'snap' }),
      P('B', 6, '골반(진)', 'torso', [0, 9.3, 0], { size: [3.2, 1.6, 2], color: '#1D1F26', connectsTo: ['B5', 'D1', 'D2'], jointType: 'ball' }),
      P('C', 1, '상완(좌)', 'limb', [-2.6, 13.0, 0], { size: [1.3, 2.9, 1.3], rot: [0, 0, 28], color: '#2E2433', finish: 'gloss', connectsTo: ['B5'], jointType: 'ball' }),
      P('C', 2, '상완(우)', 'limb', [2.6, 13.0, 0], { size: [1.3, 2.9, 1.3], rot: [0, 0, -28], color: '#2E2433', finish: 'gloss', connectsTo: ['B5'], jointType: 'ball' }),
      P('C', 3, '전완(좌)', 'limb', [-4.3, 11.6, 0.3], { size: [1.2, 2.6, 1.2], rot: [0, 0, 62], color: '#2E2433', finish: 'gloss', connectsTo: ['C1'], jointType: 'hinge' }),
      P('C', 4, '전완(우)', 'limb', [4.3, 11.6, 0.3], { size: [1.2, 2.6, 1.2], rot: [0, 0, -62], color: '#2E2433', finish: 'gloss', connectsTo: ['C2'], jointType: 'hinge' }),
      P('C', 5, '손(좌)', 'hand', [-5.7, 11.0, 0.4], { size: [1.1, 1.2, 0.8], color: SKIN, connectsTo: ['C3'], jointType: 'ball', caution: '손가락 분할 — 유격 주의' }),
      P('C', 6, '손(우)', 'hand', [5.7, 11.0, 0.4], { size: [1.1, 1.2, 0.8], color: SKIN, connectsTo: ['C4'], jointType: 'ball', caution: '손가락 분할 — 유격 주의' }),
      P('D', 1, '허벅지(좌)', 'limb', [-0.85, 6.5, 0], { size: [1.5, 3.7, 1.6], color: '#1D1F26', connectsTo: ['B6'], jointType: 'ball' }),
      P('D', 2, '허벅지(우)', 'limb', [0.85, 6.5, 0], { size: [1.5, 3.7, 1.6], color: '#1D1F26', connectsTo: ['B6'], jointType: 'ball' }),
      P('D', 3, '정강이(좌)', 'limb', [-0.85, 2.9, 0], { size: [1.4, 3.6, 1.5], color: '#1D1F26', connectsTo: ['D1'], jointType: 'hinge' }),
      P('D', 4, '정강이(우)', 'limb', [0.85, 2.9, 0], { size: [1.4, 3.6, 1.5], color: '#1D1F26', connectsTo: ['D2'], jointType: 'hinge' }),
      P('D', 5, '신발(좌)', 'foot', [-0.85, 0.55, 0.4], { size: [1.5, 0.9, 2.4], color: '#111113', finish: 'gloss', connectsTo: ['D3'], jointType: 'ball' }),
      P('D', 6, '신발(우)', 'foot', [0.85, 0.55, 0.4], { size: [1.5, 0.9, 2.4], color: '#111113', finish: 'gloss', connectsTo: ['D4'], jointType: 'ball' }),
      P('E', 1, '프레젠터 리모컨', 'prop', [-6.2, 11.1, 0.7], { size: [0.5, 1.3, 0.4], rot: [0, 0, 70], color: '#2B2B2E', connectsTo: ['C5'], jointType: 'peg', caution: '작은 소품 — 분실 주의' }),
      P('E', 2, '재킷 지퍼 장식', 'accessory', [-0.45, 12.4, 1.25], { size: [0.15, 4, 0.1], color: '#C8C8CC', finish: 'gloss', connectsTo: ['B1'], jointType: 'fixed' }),
      P('F', 1, '무대 베이스', 'base', [0, -0.3, 0], { size: [12, 0.6, 9], color: '#2E211C', finish: 'gloss' }),
    ],
    weird: [
      { id: 'reverse-elbow', label: '역관절 프레젠터', description: 'C3·C4 전완을 반대로 꺾어 끼우기' },
      { id: 'tiny-legs', label: '롱재킷 숏다리', description: 'D 게이트 다리 0.5배 + 재킷 1.3배' },
      { id: 'remote-hat', label: '리모컨 모자', description: 'E1 리모컨을 머리 위에 꽂기' },
    ],
  },

  // 고양이: 한 발을 들고 인사하는 아기 고등어 태비 (SD)
  kitten: {
    kitId: 'KIT-CATS03', grade: 'SD', name: 'SD 손 흔드는 아기 고양이', subject: '앞발을 든 아기 고등어 태비', views: ['front'],
    runnerNames: { A: '머리·얼굴', B: '몸통', C: '앞다리(들어 올린 발)', D: '뒷다리', E: '꼬리', F: '디스플레이 베이스' },
    parts: [
      P('A', 1, '머리(태비 무늬)', 'head', [0.6, 7.6, 2.4], { size: [5.0, 4.5, 4.4], color: '#8C7766', connectsTo: ['B1'], jointType: 'ball' }),
      P('A', 2, '귀(좌)', 'head', [-1.3, 10.3, 2.4], { size: [1.6, 2, 0.6], rot: [0, 0, -12], color: '#7A6555', connectsTo: ['A1'], jointType: 'peg', caution: '얇은 귀 끝 — 게이트 컷 시 백화 주의' }),
      P('A', 3, '귀(우)', 'head', [2.3, 10.3, 2.4], { size: [1.6, 2, 0.6], rot: [0, 0, 12], color: '#7A6555', connectsTo: ['A1'], jointType: 'peg', caution: '얇은 귀 끝 — 게이트 컷 시 백화 주의' }),
      P('A', 4, '주둥이', 'head', [0.6, 6.7, 5.0], { size: [2.2, 1.4, 1.2], color: '#EDE4D8', connectsTo: ['A1'], jointType: 'snap' }),
      P('A', 5, '파란 눈 클리어 파츠', 'head', [0.6, 7.9, 5.05], { size: [3, 1, 0.3], color: '#7FA9CF', finish: 'clear', connectsTo: ['A1'], jointType: 'snap' }),
      P('A', 6, '분홍 코', 'head', [0.6, 7.05, 5.55], { size: [0.6, 0.4, 0.3], color: '#E8A2A0', finish: 'gloss', connectsTo: ['A4'], jointType: 'fixed' }),
      P('B', 1, '몸통(앞, 크림 가슴)', 'torso', [0, 3.6, 1.4], { size: [3.4, 3.4, 2.8], color: '#E6DACB', connectsTo: ['B2'], jointType: 'snap' }),
      P('B', 2, '몸통(뒤, 태비)', 'torso', [0, 3.7, -1.2], { size: [3.6, 3.4, 3.4], color: '#8C7766', connectsTo: ['B1'], jointType: 'snap' }),
      P('C', 1, '앞다리(좌, 들어 올림)', 'limb', [-3.0, 6.3, 3.3], { size: [1.3, 3, 1.3], rot: [0, 0, -24], parentId: 'B1', pivot: { x: -1.4, y: 4.8, z: 2.2 }, color: '#9A8574', connectsTo: ['B1'], jointType: 'ball', caution: '들어 올린 포즈 — 어깨 볼 조인트 유격 체크' }),
      P('C', 2, '앞다리(우)', 'limb', [1.2, 2.0, 2.0], { size: [1.2, 2.6, 1.2], color: '#9A8574', connectsTo: ['B1'], jointType: 'ball' }),
      P('C', 3, '젤리 발바닥(들어 올린 발)', 'hand', [-3.5, 8.3, 3.6], { size: [1.7, 1.6, 0.8], color: '#6A584C', connectsTo: ['C1'], jointType: 'hinge' }),
      P('C', 4, '앞발(우)', 'foot', [1.2, 0.5, 2.4], { size: [1.5, 0.9, 1.6], color: '#E6DACB', connectsTo: ['C2'], jointType: 'hinge' }),
      P('D', 1, '뒷다리(좌)', 'limb', [-1.5, 1.6, -1.6], { size: [1.6, 2.6, 1.8], color: '#8C7766', connectsTo: ['B2'], jointType: 'ball' }),
      P('D', 2, '뒷다리(우)', 'limb', [1.5, 1.6, -1.6], { size: [1.6, 2.6, 1.8], color: '#8C7766', connectsTo: ['B2'], jointType: 'ball' }),
      P('D', 3, '뒷발(좌)', 'foot', [-1.5, 0.45, -0.9], { size: [1.5, 0.9, 1.7], color: '#E6DACB', connectsTo: ['D1'], jointType: 'hinge' }),
      P('D', 4, '뒷발(우)', 'foot', [1.5, 0.45, -0.9], { size: [1.5, 0.9, 1.7], color: '#E6DACB', connectsTo: ['D2'], jointType: 'hinge' }),
      P('E', 1, '꼬리 뿌리', 'tail', [-1.4, 4.0, -2.9], { size: [0.9, 2.6, 0.9], rot: [-20, 0, 32], color: '#8C7766', connectsTo: ['B2'], jointType: 'ball' }),
      P('E', 2, '꼬리 끝(줄무늬)', 'tail', [-2.6, 6.0, -3.3], { size: [0.8, 2.4, 0.8], rot: [-30, 0, 18], color: '#4B3B30', connectsTo: ['E1'], jointType: 'ball', caution: '가장 얇은 파츠 — 니퍼 두 번 컷' }),
      P('F', 1, '디스플레이 베이스', 'base', [0, -0.3, 0.4], { size: [10, 0.6, 9], color: '#6E3B2C', finish: 'gloss' }),
    ],
    weird: [
      { id: 'double-wave', label: '양손 인사', description: 'C1을 하나 더 복제해 C2 자리에 끼우기' },
      { id: 'tail-antenna', label: '꼬리 안테나', description: 'E 게이트 꼬리를 머리 위에 꽂기' },
      { id: 'giant-paw', label: '왕발 냥펀치', description: 'C3 젤리 발바닥만 3배' },
    ],
  },
};

const round = (v) => Math.round(v * 100) / 100;
const vec = ([x, y, z]) => ({ x: round(x), y: round(y), z: round(z) });

function toHandoff(t) {
  const runners = {};
  for (const p of t.parts) {
    const runnerId = `RN-${p.gate}`;
    (runners[p.gate] ||= { runnerId, gate: p.gate, runnerName: t.runnerNames[p.gate], parts: [] }).parts.push({
      runnerId,
      gate: p.gate,
      partId: `${p.gate}${p.n}`,
      partName: p.partName,
      category: p.category,
      suggestedPosition: vec(p.pos),
      suggestedRotation: vec(p.rot || [0, 0, 0]),
      suggestedScale: vec([1, 1, 1]),
      allowWeirdAssembly: true,
      colorHex: p.color.toUpperCase(),
      finish: p.finish || 'matte',
      connectsTo: p.connectsTo || [],
      jointType: p.jointType || 'fixed',
      approxSize: vec(p.size),
      ...(p.parentId ? { parentId: p.parentId } : {}),
      ...(p.pivot ? { pivot: p.pivot } : {}),
      cautionNote: p.caution || null,
    });
  }
  return {
    schemaVersion: '1.0',
    kitId: t.kitId,
    kitName: t.name,
    grade: t.grade,
    verdict: 'OK',
    source: { type: 'photo', subject: t.subject, views: t.views },
    units: { position: 'cm', rotation: 'deg', scale: 'ratio' },
    runners: Object.values(runners).sort((a, b) => a.gate.localeCompare(b.gate)),
    weirdAssemblyPresets: t.weird,
  };
}

export const SHOWCASE = [
  { key: 'bust', label: '두상', kit: toHandoff(KITS.bust) },
  { key: 'fullbody', label: '전신', kit: toHandoff(KITS.fullbody) },
  { key: 'kitten', label: '고양이', kit: toHandoff(KITS.kitten) },
];
