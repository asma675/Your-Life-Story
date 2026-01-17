// Replaces Base44 SDK with a lightweight client that talks to YOUR backend.
// We keep the export name "base44" to avoid touching most UI code.

const TOKEN_KEY = 'chronicle_access_token';

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      if (!token) localStorage.removeItem(TOKEN_KEY);
      else localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // ignore
    }
  }
};

async function apiFetch(path, { method = 'GET', body, headers } = {}) {
  const token = tokenStore.get();
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const err = new Error(data?.message || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const base44 = {
  auth: {
    async login({ email, name } = {}) {
      const result = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: { email, name }
      });
      if (result?.token) tokenStore.set(result.token);
      return result;
    },
    async me() {
      return apiFetch('/api/auth/me');
    },
    async updateMe(patch) {
      return apiFetch('/api/auth/me', { method: 'PATCH', body: patch });
    },
    logout(redirectTo) {
      tokenStore.set(null);
      if (redirectTo) window.location.href = redirectTo;
    },
    redirectToLogin(redirectBackTo) {
      // Simple in-app login flow (Settings page contains login UI).
      if (redirectBackTo) {
        try {
          sessionStorage.setItem('chronicle_post_login_redirect', redirectBackTo);
        } catch {
          // ignore
        }
      }
      window.location.href = '/#/settings';
    }
  },
  entities: {
    Entry: {
      async list(sort = '-date', limit) {
        const params = new URLSearchParams();
        if (sort) params.set('sort', sort);
        if (limit) params.set('limit', String(limit));
        const qs = params.toString();
        return apiFetch(`/api/entries${qs ? `?${qs}` : ''}`);
      },
      async create(data) {
        return apiFetch('/api/entries', { method: 'POST', body: data });
      },
      async update(id, data) {
        return apiFetch(`/api/entries/${id}`, { method: 'PATCH', body: data });
      },
      async delete(id) {
        return apiFetch(`/api/entries/${id}`, { method: 'DELETE' });
      }
    }
  },
  integrations: {
    Core: {
      async InvokeLLM(payload) {
        return apiFetch('/api/ai/chat', { method: 'POST', body: payload });
      }
    }
  },
  appLogs: {
    async logUserInApp(pageName) {
      // Optional: hook your own analytics here.
      return { ok: true, pageName };
    }
  }
};
