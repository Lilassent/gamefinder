import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import GameCarousel from './GameCarousel';
import './AuthPages.css';
import googleIcon from './assets/google.png';
import lineIcon from './assets/Line.png';
import { auth, provider } from './firebase';
import { signInWithPopup } from 'firebase/auth';
import ForgotPasswordModal from './ForgotPasswordModal';
import { useAuth } from './authContext';
import { api } from './api';

type Errors = { email?: string; password?: string };

function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateEmail = (val: string): string | null => {
    const v = val.trim();
    if (!v) return 'Please enter an email address';
    if (!emailRe.test(v)) return 'Please enter a valid email address';
    return null;
  };

  const validatePassword = (val: string): string | null => {
    if (!val) return 'Please enter a password';
    if (val.length < 6) return 'Please enter a valid password';
    return null;
  };

  const validateForm = (): boolean => {
    const eEmail = validateEmail(email);
    const ePass = validatePassword(password);
    setErrors({ email: eEmail || undefined, password: ePass || undefined });
    return !eEmail && !ePass;
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const res = await api.post('/auth/google', { idToken });
      setAuth({ user: res.data.user, token: res.data.token });
      navigate('/');
    } catch (e) {
      console.error('Google login error:', e);
      alert('Google sign-in failed');
    }
  };

  const handleLogin = async () => {
    setTouched({ email: true, password: true });
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const res = await api.post('/login', { email, password });
      setAuth({ user: res.data.user, token: res.data.token });
      navigate('/');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.error || 'Login failed');
      } else {
        console.error(err);
        alert('Login failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="main-container login-page">
      <Link to="/" className="logo_auth">
        Game<span>Finder</span>
      </Link>

      <div className="left-panel">
        <div className="form-wrapper">
          <h2 className="auth-title">Welcome Back!</h2>

          <button className="google-button" onClick={handleGoogleLogin}>
            <img src={googleIcon} alt="Google" className="google-icon" />
            Log in with Google
          </button>

          <div className="divider">
            <img src={lineIcon} alt="line" className="divider-line" />
            <span>OR</span>
            <img src={lineIcon} alt="line" className="divider-line" />
          </div>

          {/* Email */}
          <div className="input-group">
            <input
              type="email"
              className={`auth-input ${touched.email && errors.email ? 'error' : ''}`}
              placeholder="Enter email address"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                setTouched((p) => ({ ...p, email: true }));
                const msg = validateEmail(e.currentTarget.value);
                setErrors((p) => ({ ...p, email: msg || undefined }));
              }}
            />
            {touched.email && errors.email && <div className="input-error">{errors.email}</div>}
          </div>

          {/* Password */}
          <div className="input-group">
            <input
              type="password"
              className={`auth-input ${touched.password && errors.password ? 'error' : ''}`}
              placeholder="Enter password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
              }}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                setTouched((p) => ({ ...p, password: true }));
                const msg = validatePassword(e.currentTarget.value);
                setErrors((p) => ({ ...p, password: msg || undefined }));
              }}
            />

            <div className="input-footer">
              {touched.password && errors.password && (
                <div className="input-error input-error--inline">{errors.password}</div>
              )}
              <button type="button" className="forgot" onClick={() => setIsForgotOpen(true)}>
                Forgot Password?
              </button>
            </div>
          </div>

          <button className="main-button" onClick={handleLogin} disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>

          <p className="login-redirect">
            Don’t have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>

      <div className="right-panel">
        <GameCarousel />
      </div>

      {isForgotOpen && <ForgotPasswordModal onClose={() => setIsForgotOpen(false)} />}
    </div>
  );
}

export default LoginPage;
