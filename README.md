# 🧡 손프라 — 내 책상 위 프라모델 숍

**손프라**는 실물 프라모델을 갖고 싶지만 공간이 없어 못 만드는 취미를 대신해, **웹에서 원하는 프라모델을 조립하고 완성작을 데스크톱에 진열**하는 서비스입니다.
이 저장소는 그 첫 단계인 **설계 상담·검수 챗봇**입니다. 숍 사장님처럼 "어떻게 오셨어요?"로 손님을 맞고, 사진·디자인을 받으면

1. **비전 검수**: 윤곽선 명확도 · 부위 분리 가능성 · 대칭/입체 추론 난이도 → ✅ 합격 / 🛠️ 보완 필요 / ⛔ 불가
2. **런너 시안 이미지**: 합격 시 SD/HG/MG 등급에 맞춘 A~Z 게이트 런너 시안 1장 (2D 기반 2.5D 일러스트)
3. **핸드오프 JSON**: 뒤이어 만들 **조립 마이크로서비스**가 그대로 받아 쓰는 파츠 설계 데이터
4. **한눈에 보기**: 런너 → 완성 조립 프리뷰를 나란히. 완성품은 JSON의 위치·깊이로 2D 파츠를 쌓아 턴테이블처럼 돌아가는 **3D 프리뷰 느낌**(드래그로 회전)

을 돌려줍니다. 정석 조립뿐 아니라 역관절·크기 왜곡·부위 바꿔 끼우기 같은 **괴작 조립**도 전제로 설계합니다.

- 디자인: Figma **kg-design-system**(Kigle Web Design System) 토큰 — 플레이 팔레트, 크림 서피스, 그라운드 섀도 버튼, Nunito + Noto Sans KR
- 화면 구성: 공지 띠 → 숍 GNB·카테고리 → 히어로 배너 → "이런 의뢰가 많아요" 상품 카드 → 설계 상담 카운터

## 두 가지 사용 방법

| | ChatGPT GPTs | 웹앱 (이 저장소) |
|---|---|---|
| 준비 | ChatGPT 유료 플랜 | Node 20+, (선택) OpenAI API 키 |
| 방법 | [`prompts/custom-gpt.md`](prompts/custom-gpt.md) 따라 GPT 만들기 → 지침에 [`prompts/system-prompt.md`](prompts/system-prompt.md) 붙여 넣기 | 아래 "실행" |
| 비전 검수 / 시안 생성 | ChatGPT 기본 기능 | OpenAI Responses API (`input_image` + `image_generation` 도구) |
| 핸드오프 JSON | 답변 속 코드 블록 | 자동 추출 + 스키마 검증 + 도면/파츠 표/다운로드 |

## 실행

```bash
npm install
cp .env.example .env   # OPENAI_API_KEY 입력 (비워 두면 목업 모드)
npm start              # http://localhost:3100
```

- **LIVE 모드**: `.env`에 `OPENAI_API_KEY`가 있으면 실제 비전 검수 + 런너 시안 이미지 생성.
- **MOCK 모드**: 키가 없거나 `MOCK_AI=true`. 이미지를 실제로 보지는 않고 **해상도·대표색 + 설명 문구 키워드**로 판정을 흉내 내며, 시안 이미지 대신 JSON으로 그린 런너 도면(SVG)을 보여 줍니다. 비용 없이 화면 흐름과 JSON 핸드오프를 확인할 때 씁니다.
- 화면 하단 **샘플로 테스트** 버튼(고양이 정면 / 캐릭터 정면+측면 / 흐리고 잘린 사진)으로 바로 합격·보완 흐름을 볼 수 있어요.

| 환경 변수 | 기본값 | 설명 |
|---|---|---|
| `OPENAI_API_KEY` | (없음) | 없으면 목업 모드 |
| `OPENAI_MODEL` | `gpt-6.1-terra` | 비전 입력 + `image_generation` 도구를 지원하는 모델 |
| `OPENAI_IMAGE_MODEL` | (기본) | 시안 이미지 모델 지정 시 |
| `OPENAI_IMAGE_QUALITY` | `medium` | 시안 품질 (비용과 직결) |
| `OPENAI_IMAGE_SIZE` | `1536x1024` | 런너 시트는 가로형이 잘 맞음 |
| `OPENAI_IMAGE_FORMAT` | `webp` | Vercel 응답 한도(4.5MB) 안에 들도록 |
| `PORT` | `3100` | |
| `MOCK_AI` | `false` | `true`면 키가 있어도 목업 |

## 대화 플로우

```
[첫 인사 + 업로드 가이드]
        │ 사진/단면도 + 한 줄 설명 (+ 톤 🍼/🌶️, 등급 자동/SD/HG/MG)
        ▼
  비전 검수 (3개 항목 0~100)
   ├─ 평균 70+ & 결함 없음 ─▶ ✅ 합격 ─▶ 1) 코멘트(등급 추천·주의 파츠·괴작 한 줄)
   │                                   2) A~Z 게이트 런너 시안 1장
   │                                   3) ```json 핸드오프 ─▶ 3D 조립 마이크로서비스
   ├─ 45~69 또는 고칠 수 있는 결함 ─▶ 🛠️ 보완 필요 ─▶ 재업로드 체크리스트, JSON 보류
   └─ 45 미만 / 형태 없음 ─▶ ⛔ 불가 ─▶ 다른 피사체 요청
```

예외 처리(텍스트만, 여러 피사체, 실존 인물·미성년자, 기존 IP, 부적절 이미지, 범위 밖 질문)는 시스템 프롬프트의 `# 예외 처리`에 있습니다.

## 핸드오프 JSON

- 스키마: [`schema/handoff.schema.json`](schema/handoff.schema.json) (JSON Schema 2020-12)
- 샘플: [`schema/sample-handoff.json`](schema/sample-handoff.json) — HG 고양이, 게이트 A~F, 파츠 19개
- 검증: `npm run validate -- 파일.json` (챗봇 답변 전체를 붙여 넣은 파일도 ```json 블록만 꺼내 검사)

파츠마다 필수 필드:

| 필드 | 예 | 설명 |
|---|---|---|
| `runnerId` | `RN-A` | 런너 ID (`RN-` + 게이트) |
| `gate` | `A` | A~Z |
| `partId` | `A1` | 게이트 문자 + 번호 |
| `partName` | `귀(좌)` | 좌우 파츠는 (좌)/(우) |
| `category` | `head` | head · torso · limb · hand · foot · tail · wing · prop · accessory · frame · base · other |
| `suggestedPosition` | `{x,y,z}` | cm, Y-up, 완성체 발밑 중심 원점 — 정석 조립 위치 |
| `suggestedRotation` | `{x,y,z}` | 도(deg) |
| `suggestedScale` | `{x,y,z}` | 1 = 원본 비율 |
| `allowWeirdAssembly` | `true` | 괴작 조립 허용 (항상 true) |
| `colorHex` | `#8A7F72` | 성형색 |
| `finish` | `matte` | matte · gloss · clear |

선택 필드 `connectsTo`(정석 연결 파츠 → 스냅 힌트), `jointType`(ball/hinge/peg/snap/fixed), `cautionNote`(주의 파츠 사유), `approxSize`(파츠 대략 크기 cm → 완성 프리뷰), 키트 단위 `weirdAssemblyPresets`(괴작 프리셋)도 함께 넘깁니다.
2.5D 프리뷰에서 x·y는 화면 위치, z는 앞뒤 깊이(레이어 순서)로 쓰입니다.

서버는 스키마 검증 외에 **gate ↔ runnerId ↔ partId 일치, partId 중복, 없는 파츠를 가리키는 connectsTo**까지 교차 검사합니다.

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/config` | `{ mode, model, greeting }` |
| GET | `/api/schema` | 핸드오프 JSON 스키마 |
| GET | `/api/sample-kits` | 숍 진열용 샘플 키트 3종 |
| POST | `/api/inspect` | 요청 `{ history[], text, image(dataURL), imageMeta, tone: mild\|spicy, grade: auto\|SD\|HG\|MG }` → 응답 `{ text, fullText, images[], handoff, handoffErrors[] }` |

## 구조

```
prompts/
  system-prompt.md     시스템 프롬프트 (웹앱과 GPTs 공용, 8,000자 이내)
  greeting.md          첫 인사말
  custom-gpt.md        ChatGPT GPTs 설정값·대화 스타터·테스트 체크리스트
schema/
  handoff.schema.json  3D 조립 마이크로서비스 입력 스키마
  sample-handoff.json  샘플 (npm run sample 로 재생성)
src/
  llm.js               OpenAI Responses API 호출 (비전 + image_generation)
  handoff.js           ```json 추출 + 스키마/교차 검증
  mock.js              키 없이 쓰는 규칙 기반 목업 검수
  kits.js              피사체 유형별(네발 동물/인물·캐릭터/사물) 파츠 템플릿
public/
  index.html · app.js · style.css   채팅 UI
  runner-sheet.js      핸드오프 JSON → 2.5D 런너 도면 SVG (브라우저·Node 공용)
  assembly-preview.js  핸드오프 JSON → 완성 조립 턴테이블 프리뷰 (2D 스프라이트 + 깊이 정렬)
scripts/               make-sample.js · validate.js
server.js              Express 서버
```

## 배포 (Vercel)

`server.js`가 Express 앱을 `export default`로 내보내므로 Vercel이 그대로 함수로 실행하고, `public/`은 CDN으로 서빙됩니다.

```bash
npx vercel deploy --prod
```

API 키 없이 배포하면 체험(목업) 모드로 동작합니다. 실제 검수를 공개로 켜려면 Vercel 환경 변수에 `OPENAI_API_KEY`를 넣기 전에 이용 제한(분당 요청 수 등)을 먼저 붙이세요.

## 다음 단계: 조립 마이크로서비스

이 저장소의 `handoff` JSON을 그대로 입력으로 받아, `runners[].parts[]`를 런너 판에 배치 → 파츠를 떼어 `suggestedPosition/Rotation/Scale`로 정석 조립 스냅,
`allowWeirdAssembly`인 파츠는 자유 회전·스케일·다른 소켓 결합을 허용하고, `weirdAssemblyPresets`를 원클릭 괴작으로 제공합니다.
렌더링은 진짜 3D 모델링이 아니라 `public/assembly-preview.js`처럼 2D 파츠를 깊이 순으로 쌓는 2.5D 방식이며, 완성작은 데스크톱 진열용으로 내보냅니다.
