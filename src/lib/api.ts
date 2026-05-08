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

  // If 401 and we have a token refresher, retry once with a fresh token
  if (res.status === 401 && typeof token === 'function') {
    const freshToken = await token();
    if (freshToken) {
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
