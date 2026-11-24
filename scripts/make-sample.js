// schema/sample-handoff.json 재생성: node scripts/make-sample.js
import fs from 'node:fs';
import { buildHandoff } from '../src/kits.js';
import { validateHandoff } from '../src/handoff.js';

const kit = buildHandoff({
  id: 'KIT-M0CH1C',
  type: 'quadruped',
  grade: 'HG',
  subject: '우리집 고양이 모찌',
  palette: ['#8A7F72', '#D9CBB8', '#4A4440'],
  views: ['front', 'side'],
});
const errors = validateHandoff(kit);
if (errors.length) { console.error(errors); process.exit(1); }
fs.writeFileSync(new URL('../schema/sample-handoff.json', import.meta.url), JSON.stringify(kit, null, 2) + '\n');
console.log(`sample-handoff.json: 런너 ${kit.runners.length}장, 파츠 ${kit.runners.flatMap((r) => r.parts).length}개 — 검증 통과`);
