import { runnerSheetSVG } from './runner-sheet.js';
import { mountTurntable } from './assembly-preview.js';

const $ = (s, el = document) => el.querySelector(s);
const chat = $('#chat');
const form = $('#composer');
const textEl = $('#text');
const fileEl = $('#file');
const sendBtn = $('#send');
const preview = $('#preview');
const dialog = $('#handoff');

const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 저장 불가 환경 */ } },
};

const state = {
  tone: store.get('rl.tone', 'mild'),
  grade: store.get('rl.grade', 'auto'),
  history: [], // { role, text }
  attachment: null, // { dataURL, meta }
  busy: false,
};

const md = (s) => DOMPurify.sanitize(marked.parse(s || '', { gfm: true, breaks: true }));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ───────── 설정 (톤·등급) ───────── */
function syncControls() {
  document.querySelectorAll('.tone button').forEach((b) => {
    const on = b.dataset.tone === state.tone;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
  });
  $('#grade').value = state.grade;
}
document.querySelectorAll('.tone button').forEach((b) =>
  b.addEventListener('click', () => { state.tone = b.dataset.tone; store.set('rl.tone', state.tone); syncControls(); }),
);
$('#grade').addEventListener('change', (e) => { state.grade = e.target.value; store.set('rl.grade', state.grade); });
syncControls();

/* ───────── 메시지 렌더링 ───────── */
function scrollDown() { chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' }); }

function addUser(text, image) {
  const el = document.createElement('div');
  el.className = 'msg user';
  el.innerHTML = `<div class="bubble">${image ? `<img src="${image}" alt="업로드한 이미지" />` : ''}${text ? esc(text).replace(/\n/g, '<br>') : ''}</div>`;
  chat.append(el);
  scrollDown();
}

function addBot(html, cls = '') {
  const el = document.createElement('div');
  el.className = `msg bot ${cls}`;
  el.innerHTML = `<div class="avatar" aria-hidden="true">손</div><div class="bubble">${html}</div>`;
  chat.append(el);
  scrollDown();
  return el;
}

const WAIT = ['손프라가 살펴보는 중…', '니퍼로 게이트 자르는 중…', '런너 배치 고민하는 중…', '파츠 번호 새기는 중…', '먹선 넣는 중…'];
function addTyping() {
  const el = addBot(`<span class="dots"><i></i><i></i><i></i></span><span class="label">${WAIT[0]}</span>`, 'typing');
  let i = 0;
  const t = setInterval(() => { i = (i + 1) % WAIT.length; $('.label', el).textContent = WAIT[i]; }, 1800);
  return () => { clearInterval(t); el.remove(); };
}

function findSection(bubble, n) {
  return [...bubble.querySelectorAll('h3')].find((h) => h.textContent.trim().startsWith(`${n})`));
}

function renderReply(data) {
  const el = addBot(md(data.text));
  const bubble = $('.bubble', el);

  // 2) 시안 이미지 → 2번 섹션 끝(3번 제목 앞)에 삽입
  if (data.images?.length) {
    const box = document.createElement('div');
    for (const src of data.images) {
      const fig = document.createElement('div');
      fig.className = 'sheet-img';
      fig.innerHTML = `<img src="${src}" alt="A~Z 게이트 런너 분해 시안 (2.5D)" /><div class="bar"><button type="button" class="btn btn-secondary s" data-dl>시안 저장</button></div>`;
      $('img', fig).addEventListener('click', () => window.open().document.write(`<img src="${src}" style="max-width:100%">`));
      $('[data-dl]', fig).addEventListener('click', () => download(src, `${data.handoff?.kitId || 'runner-sheet'}.${src.includes('svg') ? 'svg' : 'png'}`));
      box.append(fig);
    }
    const h3 = findSection(bubble, 3);
    h3 ? h3.before(box) : bubble.append(box);
  }

  // 3) 핸드오프 카드
  if (data.handoff || data.handoffRaw) bubble.append(handoffCard(data));
  scrollDown();
}

function handoffCard({ handoff: kit, handoffErrors = [], handoffRaw }) {
  const card = document.createElement('div');
  card.className = 'card';
  if (!kit) {
    card.innerHTML = `<span class="tag">JSON</span><p class="valid bad">⚠ JSON을 읽지 못했어요: ${esc(handoffErrors[0] || '')}</p><pre style="white-space:pre-wrap;font-size:12px">${esc(handoffRaw)}</pre>`;
    return card;
  }
  const parts = kit.runners.flatMap((r) => r.parts);
  const ok = handoffErrors.length === 0;
  card.innerHTML = `<span class="tag">HANDOFF</span>
    <div class="row"><strong>${esc(kit.kitName)}</strong><span>${esc(kit.kitId)}</span><span>${esc(kit.grade)}</span>
      <span>런너 ${kit.runners.length}장 · 파츠 ${parts.length}개</span>
      <span class="valid ${ok ? 'ok' : 'bad'}">${ok ? '✓ 스키마 검증 통과' : `✗ 검증 오류 ${handoffErrors.length}건`}</span></div>
    <div class="gates">${kit.runners.map((r) => `<span><b>${esc(r.gate)}</b>${esc(r.runnerName || r.runnerId)} ${r.parts.length}</span>`).join('')}</div>
    <div class="glance mini">
      <div class="pane-runner">${runnerSheetSVG(kit, { cols: 2 })}<span class="pane-tag">런너</span></div>
      <span class="glance-arrow" aria-hidden="true">→</span>
      <div class="pane-built"><div class="tt"></div><span class="pane-tag hot">완성 3D 프리뷰 · 드래그</span></div>
    </div>
    <div class="actions">
      <button type="button" class="btn btn-primary s" data-open>🧩 조립 마이크로서비스로 넘길 설계 데이터 보기</button>
      <button type="button" class="btn btn-secondary s" data-copy>JSON 복사</button>
    </div>`;
  mountTurntable($('.tt', card), kit);
  $('[data-open]', card).addEventListener('click', () => openHandoff(kit, handoffErrors));
  $('[data-copy]', card).addEventListener('click', (e) => copyJSON(kit, e.currentTarget));
  return card;
}

/* ───────── 핸드오프 다이얼로그 ───────── */
let current = null;
function openHandoff(kit, errors) {
  current = kit;
  $('#h-title').textContent = `${kit.kitName} · ${kit.kitId}`;
  $('.pane.sheet', dialog).innerHTML = runnerSheetSVG(kit);
  $('.pane.glance', dialog).innerHTML = `<div class="pane-runner">${runnerSheetSVG(kit, { cols: 2 })}<span class="pane-tag">런너</span></div>
    <span class="glance-arrow" aria-hidden="true">→</span>
    <div class="pane-built"><div class="tt"></div><span class="pane-tag hot">완성 3D 프리뷰 · 드래그해서 돌려 보기</span></div>`;
  mountTurntable($('.pane.glance .tt', dialog), kit);

  const rows = kit.runners.flatMap((r) => r.parts).map((p) => {
    const v = (o) => `${o.x}, ${o.y}, ${o.z}`;
    return `<tr><td class="gate">${esc(p.partId)}</td><td>${esc(p.partName)}</td><td>${esc(p.category)}</td>
      <td>${v(p.suggestedPosition)}</td><td>${v(p.suggestedRotation)}</td><td>${v(p.suggestedScale)}</td>
      <td><span class="sw" style="background:${esc(p.colorHex)}"></span>${esc(p.colorHex)}</td><td>${esc(p.finish)}</td>
      <td>${esc(p.jointType || '')}</td><td>${esc((p.connectsTo || []).join(', '))}</td><td>${p.allowWeirdAssembly ? '🤪 허용' : '—'}</td>
      <td class="wrap">${esc(p.cautionNote || '')}</td></tr>`;
  }).join('');
  $('.pane.parts', dialog).innerHTML = `<table><thead><tr><th>파츠</th><th>이름</th><th>분류</th><th>위치(cm)</th><th>회전(°)</th><th>스케일</th><th>색</th><th>마감</th><th>조인트</th><th>연결</th><th>괴작</th><th>주의</th></tr></thead><tbody>${rows}</tbody></table>
    ${kit.weirdAssemblyPresets?.length ? `<h4>괴작 프리셋</h4><ul>${kit.weirdAssemblyPresets.map((w) => `<li><b>${esc(w.label)}</b> — ${esc(w.description)}</li>`).join('')}</ul>` : ''}`;

  $('.pane.json code', dialog).innerHTML = highlight(JSON.stringify(kit, null, 2));
  const valid = $('#h-valid');
  valid.className = `valid ${errors.length ? 'bad' : 'ok'}`;
  valid.innerHTML = errors.length ? `✗ ${errors.slice(0, 3).map(esc).join(' / ')}${errors.length > 3 ? ` 외 ${errors.length - 3}건` : ''}` : '✓ schema/handoff.schema.json 검증 통과';
  showTab('glance');
  dialog.showModal();
}
function showTab(name) {
  dialog.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  dialog.querySelectorAll('.pane').forEach((p) => (p.hidden = p.dataset.pane !== name));
}
dialog.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
$('#h-copy').addEventListener('click', (e) => copyJSON(current, e.currentTarget));
$('#h-download').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  download(url, `${current.kitId}.json`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

function highlight(json) {
  return esc(json).replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?/g, (m, str, colon, bool) => {
    if (str) return colon ? `<span class="k">${str}</span>${colon}` : `<span class="s">${str}</span>`;
    if (bool) return `<span class="b">${m}</span>`;
    return `<span class="n">${m}</span>`;
  });
}
async function copyJSON(kit, btn) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(kit, null, 2));
    const t = btn.textContent; btn.textContent = '복사됨 ✓'; setTimeout(() => (btn.textContent = t), 1200);
  } catch { btn.textContent = '복사 실패 — JSON 탭에서 직접 선택'; }
}
function download(href, name) {
  const a = document.createElement('a');
  a.href = href; a.download = name; document.body.append(a); a.click(); a.remove();
}

/* ───────── 이미지 첨부 ───────── */
function loadImage(src) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = src; });
}

// 대표색 3개: 작은 캔버스에서 4비트 양자화 후 빈도순 (배경용 흰색/거의 흰색 제외)
function paletteOf(img) {
  const c = document.createElement('canvas');
  c.width = 48; c.height = 48;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, 48, 48);
  const { data } = ctx.getImageData(0, 0, 48, 48);
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 128 || (r > 232 && g > 232 && b > 232)) continue;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b;
    buckets.set(key, e);
  }
  const hex = (v) => Math.round(v).toString(16).padStart(2, '0');
  const picked = [];
  for (const e of [...buckets.values()].sort((a, b) => b.n - a.n)) {
    const col = [e.r / e.n, e.g / e.n, e.b / e.n];
    if (picked.every((p) => Math.hypot(p[0] - col[0], p[1] - col[1], p[2] - col[2]) > 48)) picked.push(col);
    if (picked.length === 3) break;
  }
  return picked.map(([r, g, b]) => `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase());
}

async function attach(src) {
  const img = await loadImage(src);
  const max = 1600;
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  state.attachment = {
    dataURL: c.toDataURL('image/jpeg', 0.9),
    meta: { width: img.naturalWidth, height: img.naturalHeight, palette: paletteOf(img) },
  };
  preview.hidden = false;
  $('img', preview).src = state.attachment.dataURL;
  $('.meta', preview).innerHTML = `${img.naturalWidth}×${img.naturalHeight}px ${state.attachment.meta.palette.map((h) => `<span class="sw" style="background:${h}"></span>`).join('')}`;
  textEl.focus();
}
function clearAttachment() { state.attachment = null; preview.hidden = true; fileEl.value = ''; }

function readFile(file) {
  if (!file || !/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return;
  const r = new FileReader();
  r.onload = () => attach(r.result);
  r.readAsDataURL(file);
}
fileEl.addEventListener('change', () => readFile(fileEl.files[0]));
$('.x', preview).addEventListener('click', clearAttachment);
document.addEventListener('paste', (e) => {
  const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
  if (f) { e.preventDefault(); readFile(f); }
});
['dragenter', 'dragover'].forEach((t) => document.addEventListener(t, (e) => { e.preventDefault(); document.body.classList.add('drag'); }));
['dragleave', 'drop'].forEach((t) => document.addEventListener(t, (e) => { e.preventDefault(); if (t === 'drop' || !e.relatedTarget) document.body.classList.remove('drag'); }));
document.addEventListener('drop', (e) => readFile(e.dataTransfer?.files?.[0]));
document.querySelector('.attach').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileEl.click(); } });

/* ───────── 샘플 이미지 (캔버스로 그림) ───────── */
const SAMPLES = {
  cat: { text: '우리집 고양이 모찌 정면 사진이에요. 꼬리 끝까지 다 나왔어요!', w: 1200, h: 900, draw: drawCat },
  oc: { text: '제가 그린 오리지널 캐릭터 설정화예요. 정면이랑 측면 같이 그렸어요.', w: 1400, h: 1000, draw: drawOC },
  mug: { text: '제일 아끼는 머그컵이에요. 책상에 미니어처로 두고 싶어요!', w: 1200, h: 900, draw: drawMug },
};
function drawCat(ctx, w, h) {
  ctx.fillStyle = '#F4F1EC'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#8A7F72';
  ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.66, 230, 170, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(w * 0.5, h * 0.34, 140, 0, Math.PI * 2); ctx.fill();
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(w * 0.5 + s * 120, h * 0.27); ctx.lineTo(w * 0.5 + s * 100, h * 0.08); ctx.lineTo(w * 0.5 + s * 40, h * 0.2); ctx.fill(); }
  ctx.strokeStyle = '#8A7F72'; ctx.lineWidth = 34; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(w * 0.68, h * 0.8); ctx.quadraticCurveTo(w * 0.86, h * 0.75, w * 0.8, h * 0.45); ctx.stroke();
  ctx.strokeStyle = '#5C534A'; ctx.lineWidth = 12;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(w * 0.4 + i * 40, h * 0.52); ctx.lineTo(w * 0.42 + i * 40, h * 0.62); ctx.stroke(); }
  ctx.fillStyle = '#D9CBB8'; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.4, 60, 40, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2B2622';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(w * 0.5 + s * 52, h * 0.31, 14, 0, Math.PI * 2); ctx.fill(); }
}
function drawOC(ctx, w, h) {
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h);
  const fig = (cx, side) => {
    ctx.fillStyle = '#F2D7C4'; ctx.beginPath(); ctx.arc(cx, 190, 80, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3D5A80'; ctx.beginPath(); ctx.ellipse(cx + (side ? -20 : 0), 150, 92, 70, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#EE6C4D'; ctx.fillRect(cx - (side ? 45 : 80), 280, side ? 90 : 160, 260);
    ctx.fillStyle = '#293241'; ctx.fillRect(cx - (side ? 35 : 70), 540, side ? 70 : 60, 330); if (!side) ctx.fillRect(cx + 10, 540, 60, 330);
    ctx.fillStyle = '#EE6C4D'; if (!side) { ctx.fillRect(cx - 125, 290, 40, 220); ctx.fillRect(cx + 85, 290, 40, 220); } else ctx.fillRect(cx - 20, 300, 40, 220);
  };
  fig(w * 0.3, false); fig(w * 0.72, true);
  ctx.fillStyle = '#888'; ctx.font = '28px sans-serif'; ctx.fillText('FRONT', w * 0.26, h - 40); ctx.fillText('SIDE', w * 0.69, h - 40);
}
function drawMug(ctx, w, h) {
  ctx.fillStyle = '#FFF9EC'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#E2D3C5'; ctx.beginPath(); ctx.ellipse(w * 0.48, h * 0.86, 260, 34, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#4AACFF'; ctx.lineWidth = 46;
  ctx.beginPath(); ctx.ellipse(w * 0.68, h * 0.5, 90, 120, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.fillStyle = '#4AACFF'; ctx.fillRect(w * 0.3, h * 0.18, 340, 520);
  ctx.beginPath(); ctx.ellipse(w * 0.3 + 170, h * 0.18 + 520, 170, 40, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#1F6FB5'; ctx.beginPath(); ctx.ellipse(w * 0.3 + 170, h * 0.18, 170, 40, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFC34A'; ctx.beginPath(); ctx.arc(w * 0.3 + 170, h * 0.52, 70, 0, Math.PI * 2); ctx.fill();
}
async function loadSample(key) {
  const s = SAMPLES[key];
  if (!s) return;
  const c = document.createElement('canvas');
  c.width = s.w; c.height = s.h;
  s.draw(c.getContext('2d'), s.w, s.h);
  await attach(c.toDataURL('image/png'));
  textEl.value = s.text;
  autosize();
  focusChat();
}

/* ───────── 숍 화면: 상품 카드 · 빠른 답변 · 공지 ───────── */
const KIT_COPY = {
  cat: { brand: '반려동물 키트', badges: ['<span class="badge badge-red">인기 의뢰</span>', '<span class="badge badge-grow">HG</span>'] },
  oc: { brand: '나만의 캐릭터', badges: ['<span class="badge badge-sun">정면+측면</span>', '<span class="badge badge-sky">MG</span>'] },
  mug: { brand: '사물 키트', badges: ['<span class="badge badge-mute">입문 추천</span>', '<span class="badge badge-sun">SD</span>'] },
};
async function renderKits() {
  const grid = $('#kit-grid');
  try {
    const list = await (await fetch('/api/sample-kits')).json();
    grid.innerHTML = '';
    for (const { key, kit } of list) {
      const copy = KIT_COPY[key] || { brand: '키트', badges: [] };
      const parts = kit.runners.reduce((n, r) => n + r.parts.length, 0);
      const el = document.createElement('article');
      el.className = 'kit';
      el.innerHTML = `<div class="kit-img glance">
          <div class="pane-runner">${runnerSheetSVG(kit, { cols: 2 })}<span class="pane-tag">런너</span></div>
          <span class="glance-arrow" aria-hidden="true">→</span>
          <div class="pane-built"><div class="tt"></div><span class="pane-tag hot">완성 3D 프리뷰</span></div>
        </div>
        <button type="button" class="kit-bar">이 의뢰로 상담 맛보기 →</button>
        <div class="kit-meta">
          <div class="kit-badges">${copy.badges.join('')}</div>
          <span class="kit-brand">${esc(copy.brand)}</span>
          <span class="kit-name">${esc(kit.kitName)}</span>
          <span class="kit-spec">${parts}<small>파츠</small> · ${kit.runners.length}<small>런너</small></span>
        </div>`;
      $('.kit-bar', el).addEventListener('click', () => loadSample(key));
      $('.kit-meta', el).addEventListener('click', () => loadSample(key));
      grid.append(el);
      mountTurntable($('.tt', el), kit);
    }
  } catch {
    grid.innerHTML = '<p class="hint">샘플 키트를 불러오지 못했어요.</p>';
  }
}

const QUICK = [
  '🎨 만들고 싶은 디자인이 있어요',
  '🐾 반려동물을 키트로 만들고 싶어요',
  '🤪 괴작 조립하러 왔어요',
  '👀 그냥 구경 왔어요',
  '📏 등급 차이가 궁금해요',
];
function quickReplies(container) {
  const box = document.createElement('div');
  box.className = 'quick';
  for (const q of QUICK) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = q;
    b.addEventListener('click', () => { if (!state.busy) { box.querySelectorAll('button').forEach((x) => (x.disabled = true)); send(q); } });
    box.append(b);
  }
  container.append(box);
}

function focusChat() {
  $('#consult').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  setTimeout(() => textEl.focus({ preventScroll: true }), 350);
}
document.querySelectorAll('[data-focus-chat]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); focusChat(); }));
document.querySelectorAll('[data-quick]').forEach((b) => b.addEventListener('click', () => { focusChat(); send(b.dataset.quick); }));
$('.notice-x').addEventListener('click', () => { $('#notice').hidden = true; store.set('rl.notice', 'off'); });
if (store.get('rl.notice') === 'off') $('#notice').hidden = true;

/* ───────── 전송 ───────── */
function autosize() { textEl.style.height = 'auto'; textEl.style.height = `${Math.min(textEl.scrollHeight, 160)}px`; }
textEl.addEventListener('input', autosize);
textEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
});
form.addEventListener('submit', (e) => {
  e.preventDefault();
  send(textEl.value.trim(), state.attachment);
});

async function send(text, att = null) {
  if (state.busy || (!text && !att)) return;
  state.busy = true; sendBtn.disabled = true;
  addUser(text, att?.dataURL);
  textEl.value = ''; autosize();
  if (att) clearAttachment();
  const stop = addTyping();

  try {
    const res = await fetch('/api/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: state.history, text, image: att?.dataURL || null, imageMeta: att?.meta || null, tone: state.tone, grade: state.grade }),
    });
    const data = await res.json().catch(() => ({ error: `서버 응답을 읽지 못했어요 (${res.status})` }));
    stop();
    if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
    renderReply(data);
    state.history.push({ role: 'user', text: att ? `${text || '이 이미지 검수해 주세요.'}\n[이미지 첨부됨]` : text });
    state.history.push({ role: 'assistant', text: data.fullText || data.text });
  } catch (err) {
    stop();
    addBot(esc(err.message), 'error');
  } finally {
    state.busy = false; sendBtn.disabled = false;
  }
}

/* ───────── 시작 ───────── */
(async function init() {
  renderKits();
  try {
    const cfg = await (await fetch('/api/config')).json();
    const mode = $('#mode');
    mode.textContent = cfg.mode === 'live' ? '● 실시간 상담' : '● 체험 모드';
    mode.className = `badge ${cfg.mode === 'live' ? 'badge-grow' : 'badge-sun'}`;
    mode.title = cfg.mode === 'live' ? `모델: ${cfg.model}` : 'API 키 없이 동작하는 목업 모드';
    $('#hint').textContent = cfg.mode === 'live'
      ? 'Enter 전송 · Shift+Enter 줄바꿈 · 사진은 드래그하거나 붙여넣어도 돼요'
      : '체험 모드예요: 사진을 직접 보지는 않고, 해상도·대표색과 함께 적어 주신 설명으로 판정해요.';
    const el = addBot(md(cfg.greeting));
    quickReplies($('.bubble', el));
  } catch {
    addBot('서버에 연결하지 못했어요. 잠시 뒤 새로고침해 주세요.', 'error');
  }
})();
