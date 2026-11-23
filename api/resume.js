// Vercel Serverless Function: POST /api/resume  { profile, posting }
import { handleResumeRequest } from './_lib/resume-ai.js';

export const config = { maxDuration: 120 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }
  try {
    const { status, body } = await handleResumeRequest(req.body);
    res.status(status).json(body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'INTERNAL', message: '이력서 생성 중 오류가 발생했습니다.' });
  }
}
