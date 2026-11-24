// 모델 답변에서 ```json 블록을 꺼내 스키마 검증 + 교차 검증
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const schema = JSON.parse(fs.readFileSync(path.join(here, '../schema/handoff.schema.json'), 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateSchema = ajv.compile(schema);

const FENCE = /```json\s*\n([\s\S]*?)```/i;

/** 답변 텍스트에서 첫 번째 ```json 블록을 분리 */
export function splitHandoff(text = '') {
  const m = text.match(FENCE);
  if (!m) return { text, raw: null };
  return { text: text.replace(m[0], '').replace(/\n{3,}/g, '\n\n').trim(), raw: m[1].trim() };
}

/** @returns {string[]} 오류 목록 (비어 있으면 통과) */
export function validateHandoff(kit) {
  const errors = [];
  if (!validateSchema(kit)) {
    for (const e of validateSchema.errors) errors.push(`${e.instancePath || '(root)'} ${e.message}`);
  }
  if (!Array.isArray(kit?.runners)) return errors;

  const ids = new Set();
  const gates = new Set();
  for (const r of kit.runners) {
    if (gates.has(r.gate)) errors.push(`게이트 ${r.gate} 런너가 중복됨`);
    gates.add(r.gate);
    if (r.runnerId && r.gate && r.runnerId !== `RN-${r.gate}`) errors.push(`${r.runnerId}: runnerId와 gate(${r.gate}) 불일치`);
    for (const p of r.parts || []) {
      if (ids.has(p.partId)) errors.push(`partId ${p.partId} 중복`);
      ids.add(p.partId);
      if (p.gate !== r.gate) errors.push(`${p.partId}: 파츠 gate(${p.gate})가 런너 gate(${r.gate})와 다름`);
      if (p.runnerId !== r.runnerId) errors.push(`${p.partId}: 파츠 runnerId가 런너와 다름`);
      if (p.partId && p.gate && !p.partId.startsWith(p.gate)) errors.push(`${p.partId}: partId가 게이트 문자로 시작하지 않음`);
    }
  }
  for (const r of kit.runners) {
    for (const p of r.parts || []) {
      for (const c of p.connectsTo || []) if (!ids.has(c)) errors.push(`${p.partId}.connectsTo → 없는 파츠 ${c}`);
    }
  }
  return errors;
}

/** 텍스트 → { text, handoff, handoffErrors } */
export function extractHandoff(fullText) {
  const { text, raw } = splitHandoff(fullText);
  if (!raw) return { text, handoff: null, handoffErrors: [] };
  try {
    const handoff = JSON.parse(raw);
    return { text, handoff, handoffErrors: validateHandoff(handoff) };
  } catch (e) {
    return { text, handoff: null, handoffRaw: raw, handoffErrors: [`JSON 파싱 실패: ${e.message}`] };
  }
}
