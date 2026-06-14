import { auth } from '../firebase';

/** fetch() that attaches the current Firebase user's ID token as a Bearer
 * token, if signed in. All /api/* calls go through this -- the backend
 * requires Authorization on every request (P5 Stage 2). */
export async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();

  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(url, { ...init, headers });
}
