export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

// Resolve a stored upload path (e.g. "/uploads/images/x.png") to a full URL.
export function mediaUrl(path) {
  if (!path) return null;
  return /^https?:\/\//i.test(path) ? path : `${API_ORIGIN}${path}`;
}

const NETWORK_ERROR_MESSAGE =
  'სერვერთან დაკავშირება ვერ მოხერხდა. დარწმუნდით, რომ ბექენდ სერვერი გაშვებულია (npm run dev:all) და სცადეთ თავიდან.';

// Wraps fetch so every caller gets the same two things instead of
// re-implementing them: a distinction between "server unreachable" (network
// failure, e.g. backend not running or blocked by CORS) and "server responded
// with an error" (4xx/5xx with a JSON message), and a Georgian message either
// way instead of a raw browser TypeError leaking to the UI.
export async function apiFetch(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    const error = new Error(NETWORK_ERROR_MESSAGE);
    error.isNetworkError = true;
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'მოთხოვნის შესრულება ვერ მოხერხდა');
    error.status = response.status;
    error.reason = data.reason;
    // Flag 401s so callers (e.g. AuthContext) can handle unauthenticated
    // responses silently without flooding the console.
    if (response.status === 401) {
      error.isAuthError = true;
    }
    throw error;
  }
  return data;
}
