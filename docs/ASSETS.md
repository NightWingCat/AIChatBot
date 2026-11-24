# 에셋 교체 가이드 & OpenAI 이미지 생성 프롬프트

게임은 이미지 없이도 Canvas 픽셀 렌더링으로 완성된 화면이 나옵니다. 아래 이미지를 만들어 넣으면 **그 슬롯만** 고디테일 픽셀 아트로 바뀝니다.

## 1. 끼워 넣는 순서

1. 이미지를 `public/assets/`에 아래 **파일명 그대로** 저장합니다.
2. `public/assets/manifest.json`의 `available` 배열에 파일명을 추가합니다.
   ```json
   { "available": ["judgment_hall_bg.png", "reaper_spritesheet.png", "sinner_woman.png"] }
   ```
3. 새로고침. (파일로 직접 열었을 때는 manifest 없이도 모든 슬롯을 시도합니다.)
4. 위치·크기·프레임 수를 조정하려면 `public/index.html`의 `ASSETS` 상수(`box: [x, y, w, h]`, 320×180 캔버스 기준)를 고칩니다.

| 슬롯 | 파일명 | 권장 비율 / 배경 | 코드 위치 (`ASSETS`) | 쓰이는 곳 |
|---|---|---|---|---|
| 타이틀 | `title_screen.png` | 16:9 (예: 1792×1024) | `title` | 시작 화면 전체 |
| 심판소 배경 | `judgment_hall_bg.png` | 16:9, 가운데 지옥문 | `bg` | 플레이 화면 배경 (문 열림 연출은 Canvas가 유지) |
| 사신 | `reaper_spritesheet.png` | 프레임 4장 가로 배열, 1프레임 3:4, **투명** | `reaper` (`frames`, `fps`) | 좌측 사신, 대기 애니메이션 |
| 망자 6종 | `sinner_woman.png` `sinner_merchant.png` `sinner_granny.png` `sinner_courier.png` `sinner_office.png` `sinner_son.png` | 5:7, **투명** | `sinners.<종류>` | 우측 망자 (사건별) |
| 처벌 컷신 | `game_over_punishment.png` | 16:9 | `punishment` | 오판 시 번개 뒤에 페이드인 |

> 이미지는 nearest-neighbor로 확대해서 그리므로 도트가 번지지 않습니다. 생성 이미지가 크면 **320×180의 정수배**(640×360, 1280×720)로 줄이면 픽셀 격자가 가장 깔끔합니다.
> 투명 배경이 필요한 사신·망자는 투명 배경을 지원하는 이미지 모델 옵션(`background: transparent`)을 쓰거나, 단색 배경으로 뽑은 뒤 배경을 지우세요.

## 2. 공통 스타일 문구 (모든 프롬프트 앞에 붙이기)

```
16-bit pixel art, SNES-era JRPG style, crisp hard-edged pixels, no anti-aliasing, limited 32-color palette
(deep purple #1c0f22, blood red #ff3b3b, ember orange #ff8a2a, bone white #e8dccb, gold #ffd35a, cold cyan #9ff3ff),
dramatic rim lighting from hellfire below, dark fantasy but slightly cute, no text, no watermark
```

같은 세트로 보이도록 **팔레트 문구를 매번 그대로** 붙이고, 첫 결과(예: 배경)를 참고 이미지로 함께 넣어 "same art style as the reference"를 덧붙이면 일관성이 좋아집니다.

## 3. 에셋별 프롬프트

### title_screen.png
```
[공통 스타일] Title screen for a game called "Reaper of the Hell Gate". A colossal stone hell gate with a skull keystone
in the center, iron doors slightly ajar leaking red-orange light, a hooded grim reaper with a glowing-eyed skull face and
a huge scythe standing in front, silhouetted. Floating embers, hanging chains, braziers on both sides, jagged mountains
and a crimson sky. Leave the upper-middle area darker and empty for the title logo. 16:9 wide composition.
```

### judgment_hall_bg.png
```
[공통 스타일] Background only, no characters. Interior of the judgment hall at the gate of hell: a tall stone archway with
a skull keystone and closed iron doors with glowing red runes in the center, perspective stone floor tiles with lava
cracks, flaming braziers at the far left and far right, hanging chains, distant mountains under a dark red sky.
Keep the left third and right third of the floor clear (characters stand there). 16:9.
```

### reaper_spritesheet.png
```
[공통 스타일] Sprite sheet, 4 frames in a single horizontal row, evenly spaced, transparent background.
A grim reaper floating idle animation, facing right (three-quarter view): tattered dark purple hooded cloak, skull face with
two red glowing eyes, bony hand holding a tall scythe with a curved silver blade. Frames 1-4 show a gentle hovering bob
and cloak hem fluttering. Same size and position in every frame, full body visible, no ground shadow.
```
→ 프레임 수가 4가 아니면 `ASSETS.reaper.frames`를 맞추세요.

### 망자 공통 (각 프롬프트 앞에 추가)
```
[공통 스타일] Single character, full body, facing left (three-quarter view), transparent background.
A ghostly departed soul: slightly translucent with a faint cyan glow outline, the lower body fades into a wispy ghost tail
instead of legs. Readable expression.
```

| 파일 | 캐릭터 프롬프트 |
|---|---|
| `sinner_woman.png` | a timid woman in her late 20s, long dark brown hair, light blue summer dress, holding a smartphone to her chest, worried teary eyes |
| `sinner_merchant.png` | a portly businessman in his 60s, brown bowler hat, thick mustache, brown coat with a gold vest, a coin pouch at his hip, smug grin |
| `sinner_granny.png` | a tiny grandmother in her late 70s, silver hair in a bun, thin round glasses, rose-colored cardigan, holding two small bread rolls, gentle smile |
| `sinner_courier.png` | a delivery rider in his early 30s, yellow helmet with tinted visor pushed up, blue jacket with a reflective stripe, red delivery box, overconfident pose |
| `sinner_office.png` | a stiff office team leader in his 40s, neat black hair, thin glasses, white shirt with red tie under a dark suit jacket, calm but tired face |
| `sinner_son.png` | a weary man in his late 30s, messy brown hair, dark green hoodie, dark circles under his eyes, forced pitiful expression |

### game_over_punishment.png
```
[공통 스타일] Game over cutscene. The grim reaper being punished: a massive lightning bolt striking from a stormy crimson sky,
glowing chains wrapping the reaper's body, a burning brand mark on its chest, hellfire erupting from cracks in the floor,
the scythe broken on the ground. Strong red and white flash, dramatic. 16:9.
```

## 4. 사건(망자)을 늘리고 싶을 때

`public/index.html`의 `CASES` 배열에 같은 구조로 추가합니다. `sprite`에 새 종류를 쓰면 `ASSETS.sinners`와 Canvas용 `LOOK`에도 같은 키를 추가하세요.

- `truth`: `heaven` | `hell`
- `facts[]`: `kw`(띄어쓰기 없는 소문자 키워드 — 내장 엔진 매칭용), `a`(망자 대사), `note`(기록부 요약), `mood`
- `plea.hell` / `plea.heaven`: 그 판결을 내리려 할 때 나오는 [최후의 변론] 대사
- `reveal`: 결과 화면의 진실 공개 문구
