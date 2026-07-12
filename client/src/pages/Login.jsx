import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const result = mode === 'login'
      ? await login(email, password)
      : await register(name, email, password);

    if (result.success) navigate('/dashboard');
    else setError(result.message);
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>MeetSpace</h1>
        <p className="subtitle">{mode === 'login' ? 'Welcome back' : 'Create your account'}</p>

        {mode === 'signup' && (
          <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>

       <p className="switch-mode">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <span onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
          {mode === 'login' ? 'Sign up' : 'Log in'}
          </span>
          </p>
      </form>
    </div>
  );
}
