import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import OpenAI from 'openai';
import { inspect, aiMode, GREETING, MODEL } from './src/llm.js';
import { extractHandoff, schema } from './src/handoff.js';
import { SHOWCASE } from './src/showcase.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(here, 'public')));

app.get('/api/config', (_req, res) => {
  res.json({ mode: aiMode(), model: aiMode() === 'live' ? MODEL : null, greeting: GREETING });
});

app.get('/api/schema', (_req, res) => res.json(schema));

// "이런 의뢰가 많아요" 진열 키트: 두상 · 전신 · 고양이
app.get('/api/sample-kits', (_req, res) => res.json(SHOWCASE));

const IMAGE_RE = /^data:image\/(png|jpe?g|webp|gif);base64,/;

app.post('/api/inspect', async (req, res) => {
  const { history, text, image, imageMeta, tone, grade } = req.body || {};
  if (image && !IMAGE_RE.test(image)) return res.status(400).json({ error: 'PNG·JPG·WEBP·GIF 이미지만 올릴 수 있어요.' });
  if (typeof text === 'string' && text.length > 2000) return res.status(400).json({ error: '메시지는 2,000자 이내로 써 주세요.' });

  try {
    const out = await inspect({
      history: Array.isArray(history) ? history.filter((m) => m && ['user', 'assistant'].includes(m.role) && typeof m.text === 'string') : [],
      text: typeof text === 'string' ? text : '',
      image: image || null,
      imageMeta: imageMeta || null,
      tone: tone === 'spicy' ? 'spicy' : 'mild',
      grade: ['SD', 'HG', 'MG'].includes(grade) ? grade : 'auto',
    });
    const { text: body, handoff, handoffErrors, handoffRaw } = extractHandoff(out.text);
    res.json({ mode: aiMode(), text: body, fullText: out.text, images: out.images, handoff, handoffErrors, handoffRaw });
  } catch (err) {
    console.error(err);
    const status = err instanceof OpenAI.APIError ? err.status || 502 : 500;
    const msg =
      err instanceof OpenAI.AuthenticationError ? 'OpenAI API 키가 올바르지 않아요. .env를 확인해 주세요.'
      : err instanceof OpenAI.RateLimitError ? '요청이 많아 잠시 쉬는 중이에요. 조금 뒤 다시 시도해 주세요.'
      : err instanceof OpenAI.BadRequestError ? `요청을 처리하지 못했어요: ${err.message}`
      : '설계실에 잠깐 문제가 생겼어요. 다시 시도해 주세요.';
    res.status(status).json({ error: msg });
  }
});

// Vercel은 default export된 앱을 함수로 실행하고 public/ 은 CDN으로 서빙합니다.
export default app;

if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 3100;
  app.listen(PORT, () => {
    console.log(`🧡 손프라 설계 상담: http://localhost:${PORT}  (모드: ${aiMode()})`);
  });
}
