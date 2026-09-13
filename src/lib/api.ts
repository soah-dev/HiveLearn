/**
 * Firebase ID tokens expire after an hour. Pages often capture the token string
 * once on mount, so a long session would start failing with 401s. AuthProvider
 * registers a refresher here, and apiFetch retries any 401 with a fresh token
 * regardless of whether the caller passed a string or a getter.
 */
let tokenRefresher: (() => Promise<string | null>) | null = null;

export function registerTokenRefresher(fn: (() => Promise<string | null>) | null) {
  tokenRefresher = fn;
}

export async function apiFetch(
  path: string,
  token: string | null | (() => Promise<string | null>),
  options: RequestInit = {}
) {
  const resolvedToken = typeof token === 'function' ? await token() : token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (resolvedToken) {
    headers['Authorization'] = `Bearer ${resolvedToken}`;
  }
  let res = await fetch(path, { ...options, headers });

  // On 401, retry once with a freshly minted token
  if (res.status === 401) {
    const refresher = typeof token === 'function' ? token : tokenRefresher;
    const freshToken = refresher ? await refresher() : null;
    if (freshToken && freshToken !== resolvedToken) {
      headers['Authorization'] = `Bearer ${freshToken}`;
      res = await fetch(path, { ...options, headers });
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}
