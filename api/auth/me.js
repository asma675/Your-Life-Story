import { readJson, sendJson, sendError } from '../_lib/http.js';
import { requireUserId } from '../_lib/auth.js';
import { getUser, updateUser } from '../_lib/store.js';

export default async function handler(req, res) {
  try {
    const userId = await requireUserId(req);

    if (req.method === 'GET') {
      const user = await getUser(userId);
      if (!user) return sendJson(res, 404, { message: 'User not found' });
      return sendJson(res, 200, user);
    }

    if (req.method === 'PATCH') {
      const patch = (await readJson(req)) || {};
      const user = await updateUser(userId, patch);
      return sendJson(res, 200, user);
    }

    res.setHeader('Allow', 'GET, PATCH');
    return sendJson(res, 405, { message: 'Method not allowed' });
  } catch (err) {
    return sendError(res, err);
  }
}
