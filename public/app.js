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
  history: [], // { role, text }
  attachment: null, // { dataURL, meta }
  busy: false,
  greeted: false,
  greeting: '',
};

const md = (s) => DOMPurify.sanitize(marked.parse(s || '', { gfm: true, breaks: true }));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const partCount = (kit) => kit.runners.reduce((n, r) => n + r.parts.length, 0);

/* ───────── 화면 전환: 홈 ↔ 상담 (구글 검색 → 결과 페이지처럼) ───────── */
function openConsult() {
  document.body.classList.remove('is-home');
  $('#home').hidden = true;
  $('#consult').hidden = false;
  if (!state.greeted) {
    state.greeted = true;
    const el = addBot(md(state.greeting));
    quickReplies($('.bubble', el));
  }
  window.scrollTo(0, 0);
  textEl.focus();
}
function openHome() {
  document.body.classList.add('is-home');
  $('#consult').hidden = true;
  $('#home').hidden = false;
}
$('#start').addEventListener('click', openConsult);
$('#home-btn').addEventListener('click', openHome);

/* ───────── 말투 ───────── */
function syncTone() {
  document.querySelectorAll('.tone button').forEach((b) => {
    const on = b.dataset.tone === state.tone;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
  });
}
document.querySelectorAll('.tone button').forEach((b) =>
  b.addEventListener('click', () => { state.tone = b.dataset.tone; store.set('rl.tone', state.tone); syncTone(); }),
);
syncTone();

/* ───────── 한눈에 보기 (런너 → 완성 3D 프리뷰, 관절 포즈) ───────── */
function glanceHTML(kit, tag = '완성 3D 프리뷰') {
  return `<div class="pane-runner">${runnerSheetSVG(kit, { cols: 2 })}<span class="pane-tag">런너</span></div>
    <span class="glance-arrow" aria-hidden="true">→</span>
    <div class="pane-built"><div class="tt"></div><span class="pane-tag hot">${esc(tag)}</span></div>`;
}
/** 완성 프리뷰에 [관절 움직이기] [원래대로] 버튼을 단다 */
function mountPosable(container, kit) {
  const ctl = mountTurntable($('.tt', container), kit);
  const bar = document.createElement('div');
  bar.className = 'pose-bar';
  bar.innerHTML = '<button type="button" data-pose aria-pressed="false">🦾 관절 움직이기</button><button type="button" data-reset hidden>↺ 원래대로</button>';
  const poseBtn = $('[data-pose]', bar);
  const resetBtn = $('[data-reset]', bar);
  poseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const on = poseBtn.getAttribute('aria-pressed') !== 'true';
    poseBtn.setAttribute('aria-pressed', String(on));
    poseBtn.classList.toggle('on', on);
    poseBtn.textContent = on ? '🦾 노란 점을 드래그하세요' : '🦾 관절 움직이기';
    resetBtn.hidden = !on;
    ctl.setPose(on);
  });
  resetBtn.addEventListener('click', (e) => { e.stopPropagation(); ctl.reset(); });
  $('.pane-built', container).append(bar);
  return ctl;
}

/* ───────── 이런 의뢰가 많아요 ───────── */
async function renderKits() {
  const grid = $('#kit-grid');
  try {
    const list = await (await fetch('/api/sample-kits')).json();
    grid.innerHTML = '';
    for (const { label, kit } of list) {
      const el = document.createElement('article');
      el.className = 'kit';
      el.innerHTML = `<div class="glance">${glanceHTML(kit)}</div>
        <button type="button" class="kit-meta" aria-label="${esc(label)} 키트 관절 움직여 보기">
          <span><strong>${esc(label)}</strong> <small>${esc(kit.grade)} · 파츠 ${partCount(kit)} · 런너 ${kit.runners.length}</small></span>
          <span class="go">관절 움직여 보기 →</span>
        </button>`;
      $('.kit-meta', el).addEventListener('click', () => openHandoff(kit, [], true));
      grid.append(el);
      mountTurntable($('.tt', el), kit);
    }
  } catch {
    grid.innerHTML = '<p class="hint">의뢰 키트를 불러오지 못했어요.</p>';
  }
}

/* ───────── 메시지 ───────── */
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

const QUICK = ['🎨 만들고 싶은 디자인이 있어요', '🐾 반려동물을 키트로 만들고 싶어요', '🤪 괴작 조립하러 왔어요', '👀 그냥 구경 왔어요'];
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

function findSection(bubble, n) {
  return [...bubble.querySelectorAll('h3')].find((h) => h.textContent.trim().startsWith(`${n})`));
}
function renderReply(data) {
  const el = addBot(md(data.text));
  const bubble = $('.bubble', el);
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
  const ok = handoffErrors.length === 0;
  card.innerHTML = `<span class="tag">HANDOFF</span>
    <div class="row"><strong>${esc(kit.kitName)}</strong><span>${esc(kit.kitId)}</span>
      <span>런너 ${kit.runners.length}장 · 파츠 ${partCount(kit)}개</span>
      <span class="valid ${ok ? 'ok' : 'bad'}">${ok ? '✓ 스키마 검증 통과' : `✗ 검증 오류 ${handoffErrors.length}건`}</span></div>
    <div class="gates">${kit.runners.map((r) => `<span><b>${esc(r.gate)}</b>${esc(r.runnerName || r.runnerId)} ${r.parts.length}</span>`).join('')}</div>
    <div class="glance mini">${glanceHTML(kit)}</div>
    <div class="actions">
      <button type="button" class="btn btn-primary s" data-open>🧩 조립 마이크로서비스로 넘길 설계 데이터 보기</button>
      <button type="button" class="btn btn-secondary s" data-copy>JSON 복사</button>
    </div>`;
  mountPosable($('.glance', card), kit);
  $('[data-open]', card).addEventListener('click', () => openHandoff(kit, handoffErrors));
  $('[data-copy]', card).addEventListener('click', (e) => copyJSON(kit, e.currentTarget));
  return card;
}

/* ───────── 설계 데이터 다이얼로그 ───────── */
let current = null;
let dialogCtl = null;
function openHandoff(kit, errors, poseOn = false) {
  current = kit;
  $('#h-title').textContent = `${kit.kitName} · ${kit.kitId}`;
  dialogCtl?.stop();
  const glance = $('.pane.glance', dialog);
  glance.innerHTML = glanceHTML(kit, '완성 3D 프리뷰 · 빈 곳을 드래그하면 회전');
  dialogCtl = mountPosable(glance, kit);
  if (poseOn) $('[data-pose]', glance).click();

  const rows = kit.runners.flatMap((r) => r.parts).map((p) => {
    const v = (o) => `${o.x}, ${o.y}, ${o.z}`;
    return `<tr><td class="gate">${esc(p.partId)}</td><td>${esc(p.partName)}</td><td>${esc(p.category)}</td>
      <td>${v(p.suggestedPosition)}</td><td>${v(p.suggestedRotation)}</td><td>${v(p.suggestedScale)}</td>
      <td><span class="sw" style="background:${esc(p.colorHex)}"></span>${esc(p.colorHex)}</td><td>${esc(p.finish)}</td>
      <td>${esc(p.jointType || '')}</td><td>${esc((p.connectsTo || []).join(', '))}</td><td>${p.allowWeirdAssembly ? '🤪 허용' : '—'}</td>
      <td class="wrap">${esc(p.cautionNote || '')}</td></tr>`;
  }).join('');
  $('.pane.parts', dialog).innerHTML = `<table><thead><tr><th>파츠</th><th>이름</th><th>분류</th><th>위치(cm)</th><th>회전(°)</th><th>스케일</th><th>색</th><th>마감</th><th>관절</th><th>연결</th><th>괴작</th><th>주의</th></tr></thead><tbody>${rows}</tbody></table>
    ${kit.weirdAssemblyPresets?.length ? `<h4>괴작 프리셋</h4><ul>${kit.weirdAssemblyPresets.map((w) => `<li><b>${esc(w.label)}</b> — ${esc(w.description)}</li>`).join('')}</ul>` : ''}`;
  $('.pane.json code', dialog).innerHTML = highlight(JSON.stringify(kit, null, 2));
  const valid = $('#h-valid');
  valid.className = `valid ${errors.length ? 'bad' : 'ok'}`;
  valid.innerHTML = errors.length ? `✗ ${errors.slice(0, 3).map(esc).join(' / ')}${errors.length > 3 ? ` 외 ${errors.length - 3}건` : ''}` : '✓ 핸드오프 스키마 검증 통과';
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
dialog.addEventListener('close', () => { dialogCtl?.stop(); dialogCtl = null; });
$('#h-copy').addEventListener('click', (e) => copyJSON(current, e.currentTarget));
$('#h-download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' }));
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

/* ───────── 사진 첨부 ───────── */
function loadImage(src) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = src; });
}
// 대표색 3개: 작은 캔버스에서 4비트 양자화 후 빈도순 (흰 배경 제외)
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
  const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  state.attachment = { dataURL: c.toDataURL('image/jpeg', 0.9), meta: { width: img.naturalWidth, height: img.naturalHeight, palette: paletteOf(img) } };
  preview.hidden = false;
  $('img', preview).src = state.attachment.dataURL;
  $('.meta', preview).innerHTML = `${img.naturalWidth}×${img.naturalHeight}px ${state.attachment.meta.palette.map((h) => `<span class="sw" style="background:${h}"></span>`).join('')}`;
  textEl.focus();
}
function clearAttachment() { state.attachment = null; preview.hidden = true; fileEl.value = ''; }
function readFile(file) {
  if (!file || !/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return;
  if (document.body.classList.contains('is-home')) openConsult();
  const r = new FileReader();
  r.onload = () => attach(r.result);
  r.readAsDataURL(file);
}
fileEl.addEventListener('change', () => readFile(fileEl.files[0]));
$('.x', preview).addEventListener('click', clearAttachment);
$('.attach').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileEl.click(); } });
document.addEventListener('paste', (e) => {
  const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
  if (f) { e.preventDefault(); readFile(f); }
});
['dragenter', 'dragover'].forEach((t) => document.addEventListener(t, (e) => { e.preventDefault(); document.body.classList.add('drag'); }));
['dragleave', 'drop'].forEach((t) => document.addEventListener(t, (e) => { e.preventDefault(); if (t === 'drop' || !e.relatedTarget) document.body.classList.remove('drag'); }));
document.addEventListener('drop', (e) => readFile(e.dataTransfer?.files?.[0]));

/* ───────── 전송 ───────── */
function autosize() { textEl.style.height = 'auto'; textEl.style.height = `${Math.min(textEl.scrollHeight, 160)}px`; }
textEl.addEventListener('input', autosize);
textEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
});
form.addEventListener('submit', (e) => { e.preventDefault(); send(textEl.value.trim(), state.attachment); });

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
      body: JSON.stringify({ history: state.history, text, image: att?.dataURL || null, imageMeta: att?.meta || null, tone: state.tone, grade: 'auto' }),
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
    state.greeting = cfg.greeting;
    $('#mode').textContent = cfg.mode === 'live' ? '' : '체험 모드 — 사진을 직접 보지는 않고 설명과 해상도·대표색으로 판정해요';
    $('#hint').textContent = 'Enter 전송 · Shift+Enter 줄바꿈 · 사진은 📷 버튼, 드래그, 붙여넣기 모두 돼요';
  } catch {
    state.greeting = '서버에 연결하지 못했어요. 잠시 뒤 새로고침해 주세요.';
  }
})();
