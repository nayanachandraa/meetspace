import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'));
  const [loading, setLoading] = useState(false);

  const persist = (data) => {
    setUser(data.user);
    setAccessToken(data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      persist(res.data);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, { name, email, password });
      persist(res.data);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try { await axios.post(`${API_URL}/api/auth/logout`, { refreshToken }); } catch {}
    setUser(null);
    setAccessToken(null);
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
