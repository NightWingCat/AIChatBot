// OPENAI_API_KEY 없이 화면·흐름을 확인하는 규칙 기반 목업 검수 엔진
// 실제 이미지는 보지 못하므로 "사진 + 한 줄 설명"의 키워드와 해상도/대표색으로 판정을 흉내 낸다.
import { buildHandoff, templateLabel } from './kits.js';
import { runnerSheetSVG, svgToDataURL } from '../public/runner-sheet.js';

const has = (s, re) => re.test(s);

function detectType(t) {
  if (has(t, /고양이|냥이|강아지|댕댕|멍멍|햄스터|토끼|여우|곰|사자|호랑이|반려/)) return 'quadruped';
  if (has(t, /사람|인물|셀카|친구|내 사진|본인|아이돌|캐릭터|로봇|피규어|설정화|삼면도|소녀|소년|기사|전사/)) return 'humanoid';
  return 'object';
}

function subjectFrom(t, type) {
  const m = t.match(/(우리\s?집\s?)?([가-힣A-Za-z0-9]+\s)?(고양이|강아지|햄스터|토끼|캐릭터|로봇|피규어|인물|머그컵|컵|자동차|의자|램프|선인장)(\s[가-힣A-Za-z0-9]{1,4}(?=\s|$|[,.!]))?/);
  if (m) return m[0].trim();
  return { quadruped: '반려동물', humanoid: '오리지널 캐릭터', object: '오리지널 오브젝트' }[type];
}

function seeded(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (min, max) => { h = (h * 1103515245 + 12345) >>> 0; return min + (h % (max - min + 1)); };
}

const TONE = {
  mild: {
    ok: (s) => `손님, 이 정도면 **런너에 바로 올릴 수 있는 원판**이에요! ${s} 실루엣이 또렷해서 니퍼만 대면 되겠어요. 👍`,
    revise: '아이고 손님, 재료는 정말 좋은데 **도면으로 옮기기엔 정보가 살짝 부족**해요. 조금만 다시 찍어 주시면 바로 사출 들어갈게요!',
    reject: '음… 손님, 이건 아쉽지만 **런너에 담을 형태가 안 잡혀요.** 형태가 또렷한 걸로 다시 한번 가져와 주세요!',
    weird: '정석으로 조립한 다음 꼭 괴작 모드도 눌러 보세요. 생각보다 귀엽답니다 😆',
  },
  spicy: {
    ok: (s) => `오, 손님 웬일로 **바로 사출 가능한 원판**을 가져오셨네요? ${s} 너무 깔끔해서 제가 잔소리할 데가 없어 서운합니다. 🌶️`,
    revise: '손님, 이 사진으로 도면 뽑으라는 건 **눈 감고 먹선 넣으라는 말씀**이에요. 사진 딱 한 번만 다시 가요. 🌶️',
    reject: '손님, 이건 프라모델이 아니라 **추상화**예요. 런너는 형태가 있어야 올라갑니다. 다른 걸로 부탁드려요. 🌶️',
    weird: '정석만 조립하면 심심하죠. 역관절로 꺾어서 단톡방에 올리는 게 이 키트의 진짜 용도예요.',
  },
};

const PHOTO_TIPS = `- 피사체는 **하나**, 머리부터 발끝(꼬리 끝)까지 잘리지 않게
- 단색 배경 + 밝은 조명이면 최고예요
- 정면 + 측면이 같이 있으면 MG까지 가능해요`;

// 이미지 없는 상담 턴: "어떻게 오셨어요?" 흐름
function chatReply(t, tone) {
  const spicy = tone === 'spicy';
  if (!t || has(t, /^(안녕|하이|hi|hello|처음|시작)/i)) {
    return `어서 오세요, 손님! 🧡 손프라는 공간 걱정 없이 웹에서 프라모델을 조립해 데스크톱에 진열하는 곳이에요. 오늘은 어떻게 오셨어요?
만들고 싶은 디자인이 있으신지, 반려동물이나 손님 본인을 키트로 만들고 싶으신지, 아니면 괴작 조립하러 오셨는지 편하게 말씀해 주세요~`;
  }
  if (has(t, /괴작|이상하게|웃기|역관절|밈/)) {
    return `${spicy ? '오, 손님 뭘 좀 아시네요? 🌶️' : '와, 괴작 손님이시군요! 😆'} 손프라 키트는 모든 파츠가 **괴작 조립 허용**이라 역관절, 대두, 팔다리 바꿔 끼우기 다 돼요.
일단 원판이 있어야 런너를 뽑으니까, **괴작으로 만들어 보고 싶은 디자인을 올려 주세요~** 반려동물 사진이 의외로 괴작이 제일 잘 나와요.`;
  }
  if (has(t, /구경|둘러|뭐 하는|뭐하는|어떤 곳/)) {
    return `편하게 구경하세요~ 😊 손프라는 실물 프라모델을 갖고 싶지만 둘 공간이 없는 분들을 위해, **웹에서 원하는 프라모델을 조립하고 완성작을 데스크톱에 진열**하는 곳이에요.
가져오신 사진이나 디자인이 검수에 합격하면 A~Z 게이트 런너 시안이랑 조립실로 넘길 설계 데이터를 드려요. 위에 **이런 의뢰가 많아요** 카드를 눌러 보시면 바로 맛보기 하실 수 있어요!`;
  }
  if (has(t, /반려|고양이|강아지|댕댕|냥이|햄스터|토끼|나를|내 사진|셀카|본인/)) {
    return `아 너무 좋죠, 요즘 제일 많이 들어오는 의뢰예요! 🐾 선물용이세요, 소장용이세요?
준비되시면 **키트로 만들어 보고 싶은 사진을 올려 주세요~** 이런 사진이면 합격률이 높아요.
${PHOTO_TIPS}`;
  }
  if (has(t, /디자인|캐릭터|그림|설정화|만들고 싶|만들어|도면|단면/)) {
    return `오, 직접 만드신 디자인이세요? 손님 디자인을 진짜 런너에 올리는 게 저희 일이에요. 🎨
**프라모델로 만들어 보고 싶은 디자인을 올려 주세요~** 설정화·삼면도·단면도 다 좋아요.
${PHOTO_TIPS}`;
  }
  if (has(t, /등급|SD|HG|MG|차이/i)) {
    return `등급은 세 가지예요.
- **SD**: 머리 큰 귀여운 데포르메, 파츠 10~25개로 금방 완성
- **HG**: 표준 사양, 관절이 살아 있는 25~60개
- **MG**: 정면+측면처럼 정보가 많을 때, 내부 프레임까지 60개 이상

정하기 어려우시면 사진 보고 제가 추천해 드릴게요. 원판을 올려 주세요~`;
  }
  if (has(t, /구경|그냥|둘러|뭐 하는|뭐하는|어떤 곳/)) {
    return `편하게 구경하세요~ 😊 손프라는 실물 프라모델을 갖고 싶지만 둘 공간이 없는 분들을 위해, **웹에서 원하는 프라모델을 조립하고 완성작을 데스크톱에 진열**하는 곳이에요.
가져오신 사진이나 디자인이 검수에 합격하면 A~Z 게이트 런너 시안이랑 조립실로 넘길 설계 데이터를 드려요. 위에 **이런 의뢰가 많아요** 카드를 눌러 보시면 바로 맛보기 하실 수 있어요!`;
  }
  return `말씀 잘 들었어요, 손님! "${t.slice(0, 30)}${t.length > 30 ? '…' : ''}" 좋네요.
정확한 설계는 실물을 봐야 해서요, **프라모델로 만들어 보고 싶은 디자인이나 사진을 올려 주세요~**
${PHOTO_TIPS}`;
}

/**
 * @param {object} o
 * @param {string} o.text 이번 유저 메시지
 * @param {{width:number,height:number,palette?:string[]}|null} o.imageMeta 업로드 이미지 정보
 * @param {'mild'|'spicy'} o.tone
 * @param {'auto'|'SD'|'HG'|'MG'} o.grade
 */
export function mockReply({ text = '', imageMeta, tone = 'mild', grade = 'auto' }) {
  const T = TONE[tone] || TONE.mild;
  const t = text.trim();

  // 1) 이미지 없음 → 숍 상담 (검수 형식·JSON 없이 짧은 대화)
  if (!imageMeta) return { text: chatReply(t, tone), images: [], handoff: null };

  const rnd = seeded(t + imageMeta.width + 'x' + imageMeta.height);
  const minSide = Math.min(imageMeta.width || 0, imageMeta.height || 0);
  const aspect = (imageMeta.width || 1) / (imageMeta.height || 1);

  // 2) 판정
  const hard = has(t, /연기|물줄기|불꽃|구름|풍경|노을|글자만|텍스트만/);
  const issues = [];
  if (minSide && minSide < 400) issues.push(['해상도가 낮아요', `지금 ${imageMeta.width}×${imageMeta.height}px → 짧은 변 **800px 이상**으로`]);
  if (aspect > 2.6 || aspect < 0.38) issues.push(['비율이 너무 길쭉해요', '피사체가 화면의 **60~80%** 를 차지하도록 크롭']);
  if (has(t, /흐림|흐린|흐리|흔들|초점/)) issues.push(['윤곽선이 흐려요', '흔들림 없이, **초점은 눈(얼굴)** 에']);
  if (has(t, /잘림|잘린|잘렸/)) issues.push(['부위가 잘렸어요', '머리 끝부터 발끝(꼬리 끝)까지 **전신이 다 들어오게**']);
  if (has(t, /어두|역광|그림자/)) issues.push(['실루엣이 묻혀요', '밝은 곳에서, 빛을 **피사체 정면**에서']);
  if (has(t, /단체|여러|둘이|세 마리|두 마리|같이 찍은/)) issues.push(['피사체가 여러 개예요', '키트로 만들 대상 **하나만** 나오게']);

  const multiView = has(t, /측면|옆모습|뒷면|삼면도|단면|여러 각도/);
  const scores = {
    outline: hard ? rnd(15, 35) : issues.length ? rnd(48, 66) : rnd(74, 93),
    separable: hard ? rnd(10, 30) : issues.length ? rnd(50, 68) : rnd(72, 92),
    depth: hard ? rnd(10, 30) : multiView ? rnd(78, 95) : issues.length ? rnd(42, 62) : rnd(64, 82),
  };
  const avg = Math.round((scores.outline + scores.separable + scores.depth) / 3);
  const verdict = hard || avg < 45 ? 'reject' : issues.length || avg < 70 ? 'revise' : 'ok';
  const scoreLine = `| 윤곽선 명확도 | 부위 분리 | 입체 추론 | 평균 |\n|---|---|---|---|\n| ${scores.outline} | ${scores.separable} | ${scores.depth} | **${avg}** |`;
  const toneHint = '\n\n_톤은 상단에서 🍼 순한맛 / 🌶️ 매운맛 중에 고를 수 있어요._';

  if (verdict !== 'ok') {
    const checklist = (issues.length ? issues : [['형태가 없는 대상이에요', '연기·물·풍경 대신 **형태가 또렷한 피사체**로']])
      .slice(0, 4)
      .map(([a, b]) => `- [ ] **${a}** → ${b}`)
      .join('\n');
    return {
      text: `### 1) 손프라 설계 코멘트
${verdict === 'reject' ? '⛔ **불가**' : '🛠️ **보완 필요**'} — ${verdict === 'reject' ? T.reject : T.revise}

${scoreLine}${toneHint}

### 2) 런너/분해 시안 이미지
**재업로드 가이드**
${checklist}

### 3) 마이크로서비스 전달용 JSON
검수 보류 — 재업로드 후 발급`,
      images: [],
      handoff: null,
    };
  }

  // 3) 합격 → 등급, 핸드오프, 시안
  const type = detectType(t);
  const subject = subjectFrom(t, type);
  const recommended = multiView ? 'MG' : type === 'object' ? 'SD' : 'HG';
  const g = grade === 'auto' ? recommended : grade;
  const kit = buildHandoff({
    type,
    grade: g,
    subject,
    palette: imageMeta.palette,
    sourceType: has(t, /단면/) ? 'cross-section' : has(t, /설정화|스케치|삼면도/) ? 'sketch' : 'photo',
    views: multiView ? ['front', 'side'] : ['front'],
  });
  const parts = kit.runners.flatMap((r) => r.parts);
  const cautions = parts.filter((p) => p.cautionNote).slice(0, 3);
  const gateList = kit.runners.map((r) => `**${r.gate}** ${r.runnerName}`).join(' · ');
  const gradeWhy = {
    SD: '실루엣이 단순해서 대두 데포르메가 제일 잘 어울려요',
    HG: '관절 표현이 살아나는 표준 사양이 딱이에요',
    MG: '다각도 정보가 있어서 내부 프레임까지 갈 수 있어요',
  }[g];
  const gradeNote = grade !== 'auto' && grade !== recommended ? ` (제 추천은 ${recommended}지만, 요청하신 ${g}로 갑니다)` : '';

  return {
    text: `### 1) 손프라 설계 코멘트
✅ **합격** — ${T.ok(`${templateLabel(type)} 템플릿으로 갑니다.`)}

${scoreLine}

- **추천 등급: ${g}** — ${gradeWhy}${gradeNote}
- **구성**: 런너 ${kit.runners.length}장 · 파츠 ${parts.length}개 (${gateList})
- **주의 파츠**: ${cautions.length ? cautions.map((p) => `\`${p.partId}\` ${p.partName} — ${p.cautionNote}`).join(' / ') : '특이사항 없음'}
- **괴작 한 줄**: ${kit.weirdAssemblyPresets[0].label} — ${kit.weirdAssemblyPresets[0].description}. ${T.weird}${toneHint}

### 2) 런너/분해 시안 이미지
게이트 ${kit.runners.map((r) => r.gate).join('·')} 구성의 런너 시안이에요. _(목업 모드: 이미지 생성 대신 자동 도면으로 표시)_

### 3) 마이크로서비스 전달용 JSON
\`\`\`json
${JSON.stringify(kit, null, 2)}
\`\`\``,
    images: [svgToDataURL(runnerSheetSVG(kit))],
  };
}
