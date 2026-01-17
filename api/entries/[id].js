import { readJson, sendJson, sendError } from '../_lib/http.js';
import { requireUserId } from '../_lib/auth.js';
import { updateEntry, deleteEntry } from '../_lib/store.js';

export default async function handler(req, res) {
  try {
    const userId = await requireUserId(req);
    const url = new URL(req.url, 'http://localhost');
    const parts = url.pathname.split('/');
    const id = parts[parts.length - 1];

    if (req.method === 'PATCH') {
      const patch = (await readJson(req)) || {};
      const entry = await updateEntry(userId, id, patch);
      return sendJson(res, 200, entry);
    }

    if (req.method === 'DELETE') {
      const result = await deleteEntry(userId, id);
      return sendJson(res, 200, result);
    }

    res.setHeader('Allow', 'PATCH, DELETE');
    return sendJson(res, 405, { message: 'Method not allowed' });
  } catch (err) {
    return sendError(res, err);
  }
}
