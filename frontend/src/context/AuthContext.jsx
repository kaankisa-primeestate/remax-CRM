import { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

function loadStoredUser() {
  try {
    const raw = localStorage.getItem('remax_crm_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser);

  const login = useCallback(async (email, password) => {
    const { accessToken, user: loggedInUser } = await authApi.login(email, password);
    localStorage.setItem('remax_crm_token', accessToken);
    localStorage.setItem('remax_crm_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('remax_crm_token');
    localStorage.removeItem('remax_crm_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isBroker: user?.role === 'broker' }}>
      {children}
    </AuthContext.Provider>
  );
}

// Kullanım: const { user, login, logout, isBroker } = useAuth();
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalıdır');
  return ctx;
}
