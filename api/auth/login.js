import { readJson, sendJson, sendError } from '../_lib/http.js';
import { getOrCreateUserByEmail } from '../_lib/store.js';
import { issueTokenForUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, { message: 'Method not allowed' });
    }

    const body = await readJson(req) || {};
    const user = await getOrCreateUserByEmail({ email: body.email, name: body.name });
    const token = await issueTokenForUser(user.id);
    return sendJson(res, 200, { token, user });
  } catch (err) {
    return sendError(res, err);
  }
}
