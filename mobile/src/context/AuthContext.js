import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Uygulama açıldığında daha önce giriş yapılmış mı diye kontrol eder
  useEffect(() => {
    AsyncStorage.getItem('remax_crm_user').then((raw) => {
      if (raw) setUser(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (email, password) => {
    const { accessToken, user: loggedInUser } = await authApi.login(email, password);
    await AsyncStorage.setItem('remax_crm_token', accessToken);
    await AsyncStorage.setItem('remax_crm_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('remax_crm_token');
    await AsyncStorage.removeItem('remax_crm_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isBroker: user?.role === 'broker' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalıdır');
  return ctx;
}
