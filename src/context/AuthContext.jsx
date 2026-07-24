import { createContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

export const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = 'tc_auth_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async (activeToken) => {
    if (!activeToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch('/auth/me', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      setUser(data.user);
    } catch (err) {
      // A network hiccup doesn't mean the token is invalid — only clear it
      // on an actual auth rejection (expired/invalid token) from the server.
      if (!err.isNetworkError) {
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = useCallback(async (email, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (formData) => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: formData,
    });

    // Teacher registrations come back with no token: the account is pending
    // admin approval and must not be treated as an active session yet.
    if (data.token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
    }

    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Request a password-reset code. Returns the server payload (may include a
  // devCode in dev when no SMTP is configured). Never throws for unknown emails
  // — the backend answers generically to avoid leaking which accounts exist.
  const forgotPassword = useCallback(async (email) => {
    return apiFetch('/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  }, []);

  // Submit the code + new password.
  const resetPassword = useCallback(async (email, code, password) => {
    return apiFetch('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password }),
    });
  }, []);

  // Re-fetch the current user without toggling the full-screen loading state —
  // used after tier purchases / profile edits so UI (tier, badges) updates live.
  const refreshUser = useCallback(async () => {
    if (!token) return null;
    try {
      const data = await apiFetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      setUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  }, [token]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    refreshUser,
    forgotPassword,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
