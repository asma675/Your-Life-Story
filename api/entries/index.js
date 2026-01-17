import { readJson, sendJson, sendError } from '../_lib/http.js';
import { requireUserId } from '../_lib/auth.js';
import { listEntries, createEntry } from '../_lib/store.js';

export default async function handler(req, res) {
  try {
    const userId = await requireUserId(req);

    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost');
      const sort = url.searchParams.get('sort') || '-date';
      const limit = url.searchParams.get('limit');
      const entries = await listEntries(userId, { sort, limit });
      return sendJson(res, 200, entries);
    }

    if (req.method === 'POST') {
      const body = (await readJson(req)) || {};
      const entry = await createEntry(userId, body);
      return sendJson(res, 200, entry);
    }

    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { message: 'Method not allowed' });
  } catch (err) {
    return sendError(res, err);
  }
}
