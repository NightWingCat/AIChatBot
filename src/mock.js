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
    ok: (s) => `좋아요, 이 정도면 **런너에 바로 올릴 수 있는 원판**이에요! ${s} 실루엣이 또렷해서 니퍼 대기만 하면 되겠습니다. 👍`,
    revise: '아이고, 재료는 좋은데 **도면으로 옮기기엔 정보가 살짝 부족**해요. 조금만 다시 찍어 주시면 바로 사출 들어갑니다!',
    reject: '음… 이건 아쉽지만 **런너에 담을 형태가 안 잡혀요.** 형태가 또렷한 피사체로 다시 도전해 봐요!',
    weird: '정석으로 조립한 다음 꼭 괴작 모드도 눌러 보세요. 생각보다 귀엽습니다 😆',
  },
  spicy: {
    ok: (s) => `오, 웬일로 **바로 사출 가능한 원판**을 가져왔네요? ${s} 실루엣이 깔끔해서 제가 할 말이 없어서 좀 서운합니다. 🌶️`,
    revise: '이 사진으로 도면 뽑으라는 건 **눈 감고 먹선 넣으라는 소리**예요. 사진 품질 딱 한 번만 다시 갑시다. 🌶️',
    reject: '이건 프라모델이 아니라 **추상화**예요. 런너는 형태가 있어야 올라갑니다. 다른 사진 주세요. 🌶️',
    weird: '정석만 조립하면 재미없죠. 역관절로 꺾어서 단톡방에 올리는 게 이 키트의 진짜 용도입니다.',
  },
};

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

  // 1) 이미지 없음 → 업로드 유도 (가설계만)
  if (!imageMeta) {
    const greet = !t || has(t, /^(안녕|하이|hi|hello|시작|뭐|어떻게|도움)/i);
    return {
      text: `### 1) 수석 설계사 코멘트
${greet ? '반가워요, 수석 설계사 **박수석**입니다! 🔧' : `"${t.slice(0, 40)}" — 설명만으로도 대충 런너 그림은 그려지는데요,`} 정식 검수랑 설계 JSON은 **사진이나 단면도를 올려 주셔야** 발급돼요.

### 2) 런너/분해 시안 이미지
**📸 이렇게 올려 주세요**
- 피사체 **하나**, 머리부터 발끝까지 잘리지 않게
- 단색 배경 + 밝은 조명
- 정면 + 측면이면 금상첨화 (뒷면까지 있으면 MG 각!)

### 3) 마이크로서비스 전달용 JSON
검수 보류 — 재업로드 후 발급`,
      images: [],
      handoff: null,
    };
  }

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
      text: `### 1) 수석 설계사 코멘트
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
    text: `### 1) 수석 설계사 코멘트
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
