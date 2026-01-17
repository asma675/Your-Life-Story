import crypto from 'crypto';
import { getSessionUserId, createSession } from './store.js';

export function newToken() {
  // URL-safe token
  return crypto.randomBytes(32).toString('base64url');
}

export async function issueTokenForUser(userId) {
  const token = newToken();
  await createSession({ token, userId });
  return token;
}

export function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header) return null;
  const [type, token] = String(header).split(' ');
  if (type !== 'Bearer') return null;
  return token || null;
}

export async function requireUserId(req) {
  const token = getBearerToken(req);
  if (!token) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  const userId = await getSessionUserId(token);
  if (!userId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  return userId;
}
