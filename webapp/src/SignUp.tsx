import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import GameCarousel from './GameCarousel';
import './AuthPages.css';
import googleIcon from './assets/google.png';
import lineIcon from './assets/Line.png';
import { auth, provider } from './firebase';
import { signInWithPopup } from 'firebase/auth';
import { useAuth } from './authContext';
import { api } from './api';

type Errors = { nickname?: string; email?: string; password?: string };

function SignUpPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = (): boolean => {
    const e: Errors = {};

    if (!nickname.trim()) e.nickname = 'Please enter a nickname';
    else if (nickname.trim().length < 2) e.nickname = 'Nickname is too short';

    if (!email.trim()) e.email = 'Please enter an email address';
    else if (!emailRe.test(email.trim())) e.email = 'Please enter a valid email address';

    if (!password) e.password = 'Please enter a password';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGoogleSignUp = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const res = await api.post('/auth/google', { idToken });

      setAuth({ user: res.data.user, token: res.data.token });
      navigate('/');
    } catch (e) {
      console.error('Google sign-in error:', e);
      const msg = axios.isAxiosError(e) ? e.response?.data?.error : null;
      alert(msg || 'Google sign-in failed');
    }
  };

  const handleSignup = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      const res = await api.post('/signup', { nickname, email, password });

      setAuth({ user: res.data.user, token: res.data.token });

      navigate('/');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.error || 'Signup failed');
      } else {
        console.error(err);
        alert('Signup failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="main-container signup-page">
      <Link to="/" className="logo_auth">
        Game<span>Finder</span>
      </Link>

      <div className="left-panel">
        <div className="form-wrapper">
          <h2 className="auth-title">Welcome!</h2>

          <button className="google-button" onClick={handleGoogleSignUp}>
            <img src={googleIcon} alt="Google" className="google-icon" />
            Sign up with Google
          </button>

          <div className="divider">
            <img src={lineIcon} alt="line" className="divider-line" />
            <span>OR</span>
            <img src={lineIcon} alt="line" className="divider-line" />
          </div>

          {/* Nickname */}
          <div className="input-group">
            <input
              type="text"
              className={`auth-input ${errors.nickname ? 'error' : ''}`}
              placeholder="Enter your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onBlur={validate}
            />
            {errors.nickname && <div className="input-error">{errors.nickname}</div>}
          </div>

          {/* Email */}
          <div className="input-group">
            <input
              type="email"
              className={`auth-input ${errors.email ? 'error' : ''}`}
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={validate}
            />
            {errors.email && <div className="input-error">{errors.email}</div>}
          </div>

          {/* Password */}
          <div className="input-group">
            <input
              type="password"
              className={`auth-input ${errors.password ? 'error' : ''}`}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={validate}
            />
            {errors.password && <div className="input-error">{errors.password}</div>}
          </div>

          <button className="main-button" onClick={handleSignup} disabled={submitting}>
            {submitting ? 'Signing up…' : 'Sign up'}
          </button>

          <p className="login-redirect">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>

      <div className="right-panel">
        <GameCarousel />
      </div>
    </div>
  );
}

export default SignUpPage;
