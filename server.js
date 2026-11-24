// 지옥문의 사신 — 정적 호스팅 + (선택) OpenAI 프록시
// · public/index.html 은 이 서버 없이 파일로 열어도 동작합니다.
// · 서버에 OPENAI_API_KEY 가 있으면 브라우저에 키를 노출하지 않고 /api/chat 으로 AI 심문을 제공합니다.
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import OpenAI from 'openai';

const here = path.dirname(fileURLToPath(import.meta.url));
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const hasKey = () => Boolean(process.env.OPENAI_API_KEY);
let client = null;
const openai = () => (client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(here, 'public')));

app.get('/api/config', (_req, res) => res.json({ ai: hasKey(), model: hasKey() ? MODEL : null }));

// 아주 단순한 IP별 분당 요청 제한 (공개 배포 시 키 요금 보호)
const LIMIT = Number(process.env.RATE_LIMIT_PER_MIN) || 20;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > LIMIT;
}

app.post('/api/chat', async (req, res) => {
  if (!hasKey()) return res.status(503).json({ error: '서버에 OPENAI_API_KEY가 없습니다.' });
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: '잠시 후 다시 시도해 주세요.' });

  const { messages } = req.body || {};
  const ok = Array.isArray(messages) && messages.length > 0 && messages.length <= 30
    && messages.every((m) => m && ['system', 'user', 'assistant'].includes(m.role) && typeof m.content === 'string')
    && messages.reduce((n, m) => n + m.content.length, 0) <= 16000;
  if (!ok) return res.status(400).json({ error: '잘못된 요청입니다.' });

  try {
    const out = await openai().chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.8,
      max_tokens: 350,
      response_format: { type: 'json_object' },
    });
    res.json({ content: out.choices[0]?.message?.content || '' });
  } catch (err) {
    console.error(err);
    const status = err instanceof OpenAI.APIError ? err.status || 502 : 500;
    res.status(status).json({ error: 'AI 응답에 실패했습니다.' });
  }
});

export default app;

if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 3100;
  app.listen(PORT, () => console.log(`☠ 지옥문의 사신: http://localhost:${PORT}  (AI: ${hasKey() ? MODEL : '없음 — 내장 엔진'})`));
}
