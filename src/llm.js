// OpenAI Responses API: 비전 검수 + 이미지 생성(런너 시안) + 핸드오프 JSON
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import { mockReply } from './mock.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SYSTEM_PROMPT = fs.readFileSync(path.join(here, '../prompts/system-prompt.md'), 'utf8');
export const GREETING = fs.readFileSync(path.join(here, '../prompts/greeting.md'), 'utf8');

export const MODEL = process.env.OPENAI_MODEL || 'gpt-6.1-terra';
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || ''; // 비우면 기본 이미지 모델
const IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'medium';
const IMAGE_SIZE = process.env.OPENAI_IMAGE_SIZE || '1536x1024';
const IMAGE_FORMAT = process.env.OPENAI_IMAGE_FORMAT || 'webp';

const hasKey = () => Boolean(process.env.OPENAI_API_KEY);
// 키가 없으면 목업. 키가 있어도 MOCK_AI=true 이면 목업.
export const aiMode = () => (hasKey() && process.env.MOCK_AI !== 'true' ? 'live' : 'mock');

let client = null;
const getClient = () => (client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

const TONE_LABEL = { mild: '순한맛', spicy: '매운맛' };

function sessionNote({ tone, grade }) {
  return `\n\n# 현재 세션 설정 (화면에서 유저가 고른 값)\n- 톤: ${TONE_LABEL[tone] || '순한맛'}\n- 희망 등급: ${grade === 'auto' || !grade ? '없음 — 네가 추천' : grade}`;
}

/**
 * @param {object} o
 * @param {{role:'user'|'assistant', text:string}[]} o.history 이전 대화 (텍스트만)
 * @param {string} o.text 이번 유저 메시지
 * @param {string|null} o.image data URL (image/png|jpeg|webp)
 * @param {object|null} o.imageMeta { width, height, palette }
 * @returns {Promise<{text:string, images:string[]}>}
 */
export async function inspect({ history = [], text = '', image = null, imageMeta = null, tone = 'mild', grade = 'auto' }) {
  if (aiMode() === 'mock') return mockReply({ text, imageMeta: image ? imageMeta || { width: 0, height: 0 } : null, tone, grade });

  const userContent = [{ type: 'input_text', text: text || (image ? '이 이미지 검수해 주세요.' : '안녕하세요') }];
  if (image) userContent.push({ type: 'input_image', image_url: image, detail: 'high' });

  // webp: Vercel 응답 한도(4.5MB) 안에 시안 이미지가 들어가도록
  const tool = { type: 'image_generation', size: IMAGE_SIZE, quality: IMAGE_QUALITY, output_format: IMAGE_FORMAT };
  if (IMAGE_MODEL) tool.model = IMAGE_MODEL;

  const res = await getClient().responses.create({
    model: MODEL,
    instructions: SYSTEM_PROMPT + sessionNote({ tone, grade }),
    input: [
      ...history.slice(-12).map((m) => ({ role: m.role, content: m.text })),
      { role: 'user', content: userContent },
    ],
    tools: [tool],
    store: false,
  });

  const images = (res.output || [])
    .filter((o) => o.type === 'image_generation_call' && o.result)
    .slice(0, 1) // 핵심 시안 1장만
    .map((o) => {
      const fmt = o.output_format || 'png';
      return `data:image/${fmt === 'svg' ? 'svg+xml' : fmt};base64,${o.result}`;
    });

  return { text: res.output_text || '', images };
}
