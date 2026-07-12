import { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;

  const persist = (data) => {
    setUser(data.user || user);
    setAccessToken(data.accessToken);
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  };

  // Silently refresh the access token using the stored refresh token
  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');
    const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
    persist({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
    return res.data.accessToken;
  };

  // Attach the current token to every request, and auto-retry once on 401/403
  useEffect(() => {
    const reqInterceptor = axios.interceptors.request.use((config) => {
      if (accessTokenRef.current && config.headers && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${accessTokenRef.current}`;
      }
      return config;
    });

    const resInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error.config;
        const status = error.response?.status;
        const isAuthRoute = original?.url?.includes('/api/auth/login') || original?.url?.includes('/api/auth/register');

        if ((status === 401 || status === 403) && !original._retry && !isAuthRoute && localStorage.getItem('refreshToken')) {
          original._retry = true;
          try {
            const newToken = await refreshAccessToken();
            original.headers.Authorization = `Bearer ${newToken}`;
            return axios(original);
          } catch {
            setUser(null);
            setAccessToken(null);
            localStorage.clear();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(reqInterceptor);
      axios.interceptors.response.eject(resInterceptor);
    };
  }, []);

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
