import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import OpenAI from 'openai';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const app = express();
const port = Number(process.env.PORT || 8788);
const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const apiKey = process.env.DEEPSEEK_API_KEY;

const deepseek = apiKey
  ? new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com',
    })
  : null;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(apiKey),
    model,
  });
});

app.post('/api/refine', async (req, res) => {
  if (!deepseek) {
    res.status(503).json({
      error: 'DEEPSEEK_API_KEY is missing. Add it to .env before refining prompts.',
    });
    return;
  }

  const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript.trim() : '';

  if (!transcript) {
    res.status(400).json({
      error: 'Transcript is required.',
    });
    return;
  }

  try {
    const response = await deepseek.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            '你是一名资深 AI 编程 Prompt 架构师。请把用户杂乱的口述内容重构成可以直接交给 AI 编程助手执行的高质量 Prompt。输出语言使用简体中文。保留用户真实意图，去除口头语和重复内容，补足结构，但不要编造事实。请尽量按这些部分组织结果：目标、背景、功能需求、技术约束、交付标准、输出要求。如果信息不足，请增加“假设”小节。',
        },
        {
          role: 'user',
          content: `请把下面这段口述内容整理成适合 AI 编程助手直接执行的高质量 Prompt。\n\n原始口述：\n${transcript}`,
        },
      ],
      temperature: 0.3,
    });

    const choice = response.choices?.[0];
    const content = choice?.message?.content;
    const prompt =
      typeof content === 'string'
        ? content.trim()
        : Array.isArray(content)
          ? content
              .map((item) => (typeof item?.text === 'string' ? item.text : ''))
              .join('\n')
              .trim()
          : '';

    if (!prompt) {
      res.status(502).json({
        error: 'DeepSeek returned an empty response.',
        details: response,
      });
      return;
    }

    res.json({
      prompt,
      model,
      responseId: response.id,
    });
  } catch (error) {
    const status = typeof error?.status === 'number' ? error.status : 500;
    const apiMessage =
      error?.error?.message ||
      error?.response?.data?.error?.message ||
      error?.message ||
      'Unexpected error while refining prompt.';

    console.error('Refine failed:', {
      status,
      message: apiMessage,
    });

    res.status(status).json({
      error: apiMessage,
    });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distDir));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`VoicePrompt-Gen API listening on http://localhost:${port}`);
});
