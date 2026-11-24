// 핸드오프 JSON 검증: npm run validate -- 파일.json [파일2.json ...]
// 파일 안에 ```json 코드 블록이 섞인 챗봇 답변 전체를 넣어도 블록만 꺼내 검사합니다.
import fs from 'node:fs';
import { extractHandoff, validateHandoff } from '../src/handoff.js';

const files = process.argv.slice(2);
if (!files.length) { console.error('사용법: npm run validate -- <파일.json>'); process.exit(2); }
let failed = 0;
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  let errors;
  try { errors = validateHandoff(JSON.parse(raw)); }
  catch { const r = extractHandoff(raw); errors = r.handoff ? r.handoffErrors : r.handoffErrors.length ? r.handoffErrors : ['JSON 또는 ```json 블록을 찾지 못함']; }
  if (errors.length) { failed++; console.log(`✗ ${f}`); errors.forEach((e) => console.log(`   - ${e}`)); }
  else console.log(`✓ ${f}`);
}
process.exit(failed ? 1 : 0);
