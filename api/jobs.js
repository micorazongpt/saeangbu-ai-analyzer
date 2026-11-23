// Vercel Serverless Function: GET /api/jobs?keyword=&ncs=&region=&hireType=&recruitType=
import { handleJobsRequest } from './_lib/alio.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }
  const { status, body } = await handleJobsRequest(req.query || {});
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.status(status).json(body);
}
