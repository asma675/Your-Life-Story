import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = process.env.CHRONICLE_DB_PATH || path.join('/tmp', 'chronicle-db.json');

const emptyDb = () => ({
  users: {},
  entries: {},
  sessions: {}
});

async function readDb() {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : emptyDb();
  } catch {
    return emptyDb();
  }
}

async function writeDb(db) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

export async function getOrCreateUserByEmail({ email, name }) {
  if (!email || typeof email !== 'string') {
    const err = new Error('Email is required');
    err.status = 400;
    throw err;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const db = await readDb();

  const existingId = Object.keys(db.users).find((id) => db.users[id]?.email === normalizedEmail);
  if (existingId) return db.users[existingId];

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const user = {
    id,
    email: normalizedEmail,
    name: name || normalizedEmail.split('@')[0],
    theme_color: 'purple',
    custom_color: '',
    total_entries: 0,
    writing_streak: 0,
    created_at: now,
    updated_at: now
  };
  db.users[id] = user;
  db.entries[id] = [];
  await writeDb(db);
  return user;
}

export async function getUser(userId) {
  const db = await readDb();
  return db.users[userId] || null;
}

export async function updateUser(userId, patch) {
  const db = await readDb();
  const user = db.users[userId];
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  const allowed = ['name', 'theme_color', 'custom_color'];
  for (const k of allowed) {
    if (patch?.[k] !== undefined) user[k] = patch[k];
  }
  user.updated_at = new Date().toISOString();
  db.users[userId] = user;
  await writeDb(db);
  return user;
}

function computeUserStats(entries) {
  const total_entries = entries.length;

  // Streak: count consecutive days with at least one entry, ending today.
  const days = new Set(entries.map((e) => (e.date ? String(e.date).slice(0, 10) : '')));
  const today = new Date();
  const toYmd = (d) => d.toISOString().slice(0, 10);

  let streak = 0;
  for (;;) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - streak);
    const key = toYmd(d);
    if (!days.has(key)) break;
    streak += 1;
  }
  return { total_entries, writing_streak: streak };
}

export async function listEntries(userId, { sort = '-date', limit } = {}) {
  const db = await readDb();
  const entries = db.entries[userId] || [];
  const sorted = [...entries].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const dbt = new Date(b.date).getTime();
    return sort?.startsWith('-') ? dbt - da : da - dbt;
  });
  const limited = limit ? sorted.slice(0, Number(limit)) : sorted;
  return limited;
}

export async function createEntry(userId, data) {
  const db = await readDb();
  const entries = db.entries[userId] || [];
  const nowIso = new Date().toISOString();
  const entry = {
    id: crypto.randomUUID(),
    title: data?.title || 'Untitled',
    content: data?.content || '',
    mood: data?.mood || null,
    themes: Array.isArray(data?.themes) ? data.themes : (Array.isArray(data?.tags) ? data.tags : []),
    milestone: Boolean(data?.milestone),
    lessons_learned: data?.lessons_learned || '',
    ai_insights: data?.ai_insights || '',
    date: data?.date || nowIso,
    created_at: nowIso,
    updated_at: nowIso
  };
  entries.push(entry);
  db.entries[userId] = entries;

  const stats = computeUserStats(entries);
  db.users[userId] = { ...db.users[userId], ...stats, updated_at: nowIso };

  await writeDb(db);
  return entry;
}

export async function updateEntry(userId, entryId, patch) {
  const db = await readDb();
  const entries = db.entries[userId] || [];
  const idx = entries.findIndex((e) => e.id === entryId);
  if (idx === -1) {
    const err = new Error('Entry not found');
    err.status = 404;
    throw err;
  }
  const updated = { ...entries[idx], ...patch, updated_at: new Date().toISOString() };
  entries[idx] = updated;
  db.entries[userId] = entries;

  const stats = computeUserStats(entries);
  db.users[userId] = { ...db.users[userId], ...stats, updated_at: updated.updated_at };

  await writeDb(db);
  return updated;
}

export async function deleteEntry(userId, entryId) {
  const db = await readDb();
  const entries = db.entries[userId] || [];
  const next = entries.filter((e) => e.id !== entryId);
  if (next.length === entries.length) {
    const err = new Error('Entry not found');
    err.status = 404;
    throw err;
  }
  db.entries[userId] = next;

  const stats = computeUserStats(next);
  const nowIso = new Date().toISOString();
  db.users[userId] = { ...db.users[userId], ...stats, updated_at: nowIso };

  await writeDb(db);
  return { ok: true };
}

// -----------------------------
// Session storage (token -> userId)
// -----------------------------

export async function createSession({ token, userId }) {
  const db = await readDb();
  db.sessions[token] = {
    userId,
    created_at: new Date().toISOString()
  };
  await writeDb(db);
}

export async function getSessionUserId(token) {
  const db = await readDb();
  return db.sessions?.[token]?.userId || null;
}
