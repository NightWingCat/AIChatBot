// 사건 데이터 검증: node scripts/validate-cases.cjs <파일>   (파일 = CASES 배열 원소들, 쉼표로 구분된 객체 조각)
//   또는 인자 없이 실행하면 public/index.html 안의 CASES 전체를 검사
const fs = require('fs');
const path = require('path');
const PEOPLE = ['woman', 'merchant', 'granny', 'courier', 'office', 'son', 'chef', 'american', 'vol_leader', 'vol_woman', 'vol_young', 'biker_a', 'biker_b'];
const ANIMALS = { 강아지: 'dog', 고양이: 'cat', 원숭이: 'monkey' };
const ACC = ['phoneUp', 'eyeliner', 'strings', 'piercing', 'chain', 'sunglassesHead', 'pocketHands', 'tilt', 'gum', 'shifty', 'breadHidden', 'medal', 'thumb', 'bigSmile', 'sunglasses', 'envelope', 'toothpick', 'flowers', 'gentle', 'headband', 'armsCrossed', 'scowl', 'heartTee', 'peace', 'backpack', 'donationBox', 'clipboard', 'tattoo', 'helmetArm', 'scar'];
const OUTFITS = ['hoodie', 'rider', 'hoodup', 'uniform', 'suit', 'shirt', 'apron', 'tee', 'vest'];
const HAIR = ['long', 'slick', 'bun', 'short', 'neat', 'bob', 'messy', 'buzz', 'mohawk', 'cap'];
const MOODS = ['calm', 'nervous', 'crying', 'angry', 'smug'];
const HEX = /^#[0-9a-fA-F]{6}$/;

function load(arg) {
  if (arg) return eval('[' + fs.readFileSync(arg, 'utf8') + ']');
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const i = html.lastIndexOf('<script>'), j = html.lastIndexOf('</script>');
  const m = html.slice(i + 8, j); const k = m.indexOf('const CASES'); const e = m.indexOf('\n  ];', k);
  return eval(m.slice(k + 14, e + 4));
}
function checkLook(look, sprite, where, err) {
  if (!look) return;
  const isAnimal = ['dog', 'cat', 'monkey'].includes(sprite);
  for (const [k, v] of Object.entries(look)) {
    if (isAnimal) { if (!['fur', 'shade', 'ear', 'accent', 'face'].includes(k)) err(`${where}: 동물 look 키 ${k} 불가`); else if (!HEX.test(v)) err(`${where}: look.${k} 색상 형식`); continue; }
    if (['skin', 'hair', 'top', 'top2'].includes(k)) { if (!HEX.test(v)) err(`${where}: look.${k} 색상 형식`); }
    else if (k === 'hairStyle') { if (!HAIR.includes(v)) err(`${where}: hairStyle ${v}`); }
    else if (k === 'outfit') { if (!OUTFITS.includes(v)) err(`${where}: outfit ${v}`); }
    else if (k === 'acc') { if (!Array.isArray(v)) err(`${where}: acc 배열`); else v.forEach((a) => ACC.includes(a) || err(`${where}: acc ${a}`)); }
    else err(`${where}: look 키 ${k} 불가`);
  }
}
const cases = load(process.argv[2]);
const errors = [];
const ids = new Set();
for (const c of cases) {
  const err = (m) => errors.push(`[${c.id || '?'}] ${m}`);
  for (const f of ['id', 'title', 'cause', 'death', 'truth', 'voice', 'brief', 'hooks', 'intro', 'fear', 'facts', 'evasive', 'plea', 'reveal']) if (c[f] == null) err(`필드 없음: ${f}`);
  if (ids.has(c.id)) err('id 중복'); ids.add(c.id);
  if (!['heaven', 'hell'].includes(c.truth)) err('truth');
  if (c.group) {
    if (!Array.isArray(c.members) || c.members.length < 2 || c.members.length > 3) err('members 2~3명');
    (c.members || []).forEach((m, i) => { if (!m.name || !m.age || !PEOPLE.includes(m.sprite)) err(`members[${i}] name/age/sprite`); checkLook(m.look, m.sprite, `members[${i}]`, err); });
    if (!c.name) err('group name');
  } else {
    if (!c.name || !c.age) err('name/age');
    if (c.species) { if (!ANIMALS[c.species] || ANIMALS[c.species] !== c.sprite) err(`species/sprite 불일치 ${c.species}/${c.sprite}`); }
    else if (!PEOPLE.includes(c.sprite)) err(`sprite ${c.sprite}`);
    checkLook(c.look, c.sprite, 'look', err);
  }
  if (c.lang && !['ja', 'en'].includes(c.lang)) err('lang은 ja/en만');
  if (!Array.isArray(c.hooks) || c.hooks.length !== 3) err('hooks 3개');
  if (!Array.isArray(c.evasive) || c.evasive.length !== 3) err('evasive 3개');
  if (!Array.isArray(c.fear) || c.fear.length < 2 || c.fear.length > 3 || c.fear.some((g) => !Array.isArray(g) || g.length < 2)) err('fear 2~3그룹, 그룹당 2개+');
  (c.fear || []).flat().forEach((k) => { if (k !== k.toLowerCase() || /\s/.test(k)) err(`fear 키워드 형식: ${k}`); });
  if (!Array.isArray(c.facts) || c.facts.length !== 5) err('facts 정확히 5개');
  (c.facts || []).forEach((f, i) => {
    const w = `facts[${i}]`;
    if (f.id !== `f${i + 1}`) err(`${w}.id는 f${i + 1}`);
    for (const k of ['tag', 'q', 'kw', 'a', 'lie', 'note', 'mood']) if (f[k] == null) err(`${w}.${k} 없음`);
    if (f.tag && f.tag.length > 14) err(`${w}.tag 14자 이하`);
    if (!Array.isArray(f.kw) || f.kw.length < 3) err(`${w}.kw 3개 이상`);
    (f.kw || []).forEach((k) => { if (k !== k.toLowerCase() || /\s/.test(k)) err(`${w}.kw 형식: ${k}`); });
    if (f.mood && !MOODS.includes(f.mood)) err(`${w}.mood`);
    if (c.group && (typeof f.by !== 'number' || f.by < 0 || f.by >= (c.members || []).length)) err(`${w}.by`);
    if (c.lang && f.a && !/\(.+\)\s*$/.test(f.a)) err(`${w}.a 끝에 (한국어 번역) 필요`);
    if (c.lang && f.lie && !/\(.+\)\s*$/.test(f.lie)) err(`${w}.lie 끝에 (한국어 번역) 필요`);
    if (c.species && f.a && !/\(.+\)/.test(f.a)) err(`${w}.a 울음소리 + (번역) 필요`);
    if (c.species && f.lie && !/\(.+\)/.test(f.lie)) err(`${w}.lie 울음소리 + (번역) 필요`);
  });
  const fid = (x) => (c.facts || []).some((f) => f.id === x);
  if (!c.deeds || !c.deeds.good || !c.deeds.bad || !fid(c.deeds.gf) || !fid(c.deeds.bf)) err('deeds {good, gf, bad, bf} (gf/bf는 facts id)');
  for (const v of ['hell', 'heaven']) { const p = c.plea?.[v]; if (!p?.style || !p?.line) err(`plea.${v} style/line`); if (c.group && p && typeof p.by !== 'number') err(`plea.${v}.by`); }
}
// 반전 시나리오(ALT) 검사: 인자 2개면 (사건 파일, ALT 조각 파일), 아니면 index.html 안의 ALT
function loadAlt() {
  if (process.argv[3]) return eval('({' + fs.readFileSync(process.argv[3], 'utf8') + '})');
  if (process.argv[2]) return null;
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const a = html.indexOf('/*ALT-BEGIN*/'), b = html.indexOf('/*ALT-END*/');
  return a < 0 ? null : eval('({' + html.slice(a + 13, b) + '})');
}
const ALT = loadAlt();
if (ALT) {
  const byId = Object.fromEntries(cases.map((c) => [c.id, c]));
  for (const [id, t] of Object.entries(ALT)) {
    const err = (m) => errors.push(`[alt:${id}] ${m}`);
    const c = byId[id];
    if (!c) { err('없는 사건 id'); continue; }
    if (t.truth === c.truth || !['heaven', 'hell'].includes(t.truth)) err('truth는 원본의 반대여야 함');
    if (!t.reveal) err('reveal 없음');
    const ov = Object.entries(t.facts || {});
    if (ov.length < 2 || ov.length > 3) err(`단서 덮어쓰기 2~3개 (지금 ${ov.length})`);
    for (const [fid, f] of ov) {
      if (!/^f[1-5]$/.test(fid)) err(`단서 id ${fid}`);
      for (const k of Object.keys(f)) if (!['tag', 'a', 'lie', 'note', 'mood'].includes(k)) err(`${fid}: ${k}는 바꿀 수 없음`);
      for (const k of ['tag', 'a', 'lie', 'note', 'mood']) if (f[k] == null) err(`${fid}.${k} 없음`);
      if (f.tag && f.tag.length > 14) err(`${fid}.tag 14자 이하`);
      if (f.mood && !MOODS.includes(f.mood)) err(`${fid}.mood`);
      if (c.lang && f.a && !/\(.+\)\s*$/.test(f.a)) err(`${fid}.a 끝에 (한국어 번역)`);
      if (c.lang && f.lie && !/\(.+\)\s*$/.test(f.lie)) err(`${fid}.lie 끝에 (한국어 번역)`);
      if (c.species && f.a && !/\(.+\)/.test(f.a)) err(`${fid}.a 울음소리 + (번역)`);
      if (c.species && f.lie && !/\(.+\)/.test(f.lie)) err(`${fid}.lie 울음소리 + (번역)`);
    }
    if (t.deeds) { const ok = (x) => /^f[1-5]$/.test(x); if (!t.deeds.good || !t.deeds.bad || !ok(t.deeds.gf) || !ok(t.deeds.bf)) err('deeds {good, gf, bad, bf}'); }
  }
  const missing = cases.filter((c) => !ALT[c.id]).map((c) => c.id);
  console.log(`반전 시나리오 ${Object.keys(ALT).length}개${missing.length ? ` (없음: ${missing.join(', ')})` : ''}`);
}
console.log(`${cases.length} cases — heaven ${cases.filter((c) => c.truth === 'heaven').length} / hell ${cases.filter((c) => c.truth === 'hell').length}`);
if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
console.log('OK');
