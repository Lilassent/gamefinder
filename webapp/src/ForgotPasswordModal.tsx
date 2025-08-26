import React, { useEffect, useState } from 'react';
import './ForgotPasswordModal.css';
import envelopeIcon from './assets/envelope.png';
import envelopeOpenIcon from './assets/envelopOpen.png';
import keyIcon from './assets/key.png';
import successIcon from './assets/success.png';
import { api } from './api';

type Props = {
  onClose: () => void;
  onSuccess?: (email: string) => void;
};

type Step = 'email' | 'code' | 'reset' | 'done';
type Errors = { email?: string; code?: string; password?: string };

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPasswordModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<Step>('email');

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  // validators
  const validateEmail = (): boolean => {
    const e: Errors = {};
    if (!email.trim()) e.email = 'Please enter an email address';
    else if (!emailRe.test(email.trim())) e.email = 'Please enter a valid email address';
    setErrors((prev) => ({ ...prev, ...e, code: prev.code, password: prev.password }));
    return Object.keys(e).length === 0;
  };

  const validateCode = (): boolean => {
    const e: Errors = {};
    if (!/^\d{4}$/.test(code.trim())) e.code = 'Enter the 4-digit code';
    setErrors((prev) => ({ ...prev, ...e, email: prev.email, password: prev.password }));
    return Object.keys(e).length === 0;
  };

  const validatePassword = (): boolean => {
    const e: Errors = {};
    const pwd = password.trim();
    if (!pwd) e.password = 'Enter a new password';
    else if (pwd.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors((prev) => ({ ...prev, ...e, email: prev.email, code: prev.code }));
    return Object.keys(e).length === 0;
  };

  // actions
  const sendCode = async () => {
    setMessage(null);
    if (!validateEmail()) return;

    try {
      setSending(true);
      const res = await api.post('/auth/forgot', { email: email.trim() });
      const t = Number(res?.data?.expiresIn ?? 60);
      setResendIn(Math.max(0, Math.min(t, 600)));
      setStep('code');
    } catch (err: any) {
      setMessage(
        err?.response?.data?.error ||
          "We couldn't send the email right now. You can enter the code if you have it or resend."
      );
      setStep('code');
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    setMessage(null);
    if (!validateCode()) return;

    try {
      setVerifying(true);
      const res = await api.post('/auth/forgot/verify', {
        email: email.trim(),
        code: code.trim(),
      });
      const token = res.data?.resetToken as string | undefined;
      if (!token) throw new Error('No reset token');

      setResetToken(token);
      setMessage(null);
      setStep('reset');
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        code: err?.response?.data?.error || 'Invalid or expired code',
      }));
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0) return;
    if (!validateEmail()) return;

    try {
      setSending(true);
      const res = await api.post('/auth/forgot', { email: email.trim() });
      const t = Number(res?.data?.expiresIn ?? 60);
      setResendIn(Math.max(0, Math.min(t, 600)));
      setMessage('Code has been re-sent');
    } catch (err: any) {
      setMessage(err?.response?.data?.error || 'Resend failed');
    } finally {
      setSending(false);
    }
  };

  const submitNewPassword = async () => {
    setMessage(null);
    if (!validatePassword()) return;
    if (!resetToken) {
      setMessage('Verification token missing. Please verify the code again.');
      setStep('code');
      return;
    }

    try {
      setResetting(true);
      await api.post('/auth/reset', { resetToken, newPassword: password.trim() });
      setStep('done');
      onSuccess?.(email.trim());
      setPassword('');
      setCode('');
      setResetToken(null);
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        password: err?.response?.data?.error || 'Reset failed, try again',
      }));
    } finally {
      setResetting(false);
    }
  };

  const currentIcon =
    step === 'email'
      ? envelopeIcon
      : step === 'code'
        ? envelopeOpenIcon
        : step === 'reset'
          ? keyIcon
          : successIcon;

  const currentAlt =
    step === 'email'
      ? 'Envelope'
      : step === 'code'
        ? 'Open envelope'
        : step === 'reset'
          ? 'Key'
          : 'Success';

  return (
    <div
      className="fp-modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="fp-modal-content fp-large">
        <button className="fp-close-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <img src={currentIcon} alt={currentAlt} className="fp-modal-icon" />

        {/* STEP: email */}
        {step === 'email' && (
          <>
            <h2 className="fp-modal-title">Forgot the password?</h2>
            <p className="fp-modal-subtitle">Enter your email for instructions</p>

            <div className="input-forgot">
              <input
                type="email"
                className={`auth-input ${errors.email ? 'error' : ''}`}
                placeholder="Enter email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                onBlur={validateEmail}
                onKeyDown={(e) => e.key === 'Enter' && sendCode()}
              />
              {errors.email && <div className="input-error">{errors.email}</div>}
            </div>

            {message && <div className="fp-info">{message}</div>}

            <button className="fp-main-button" onClick={sendCode} disabled={sending}>
              {sending ? 'Sending…' : 'Send 4-digit code'}
            </button>
          </>
        )}

        {/* STEP: code */}
        {step === 'code' && (
          <>
            <h2 className="fp-modal-title">Enter your code</h2>
            <p className="fp-modal-subtitle">We sent a code to {email}</p>

            <div className="input-forgot">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                className={`auth-input ${errors.code ? 'error' : ''}`}
                placeholder="Enter your code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D+/g, '').slice(0, 4))}
                onBlur={validateCode}
                onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
              />
              {errors.code && <div className="input-error">{errors.code}</div>}
            </div>

            {message && <div className="fp-info">{message}</div>}

            <button className="fp-main-button" onClick={verifyCode} disabled={verifying}>
              {verifying ? 'Checking…' : 'Continue'}
            </button>

            <div className="fp-help">
              Didn’t receive the email?{' '}
              {resendIn > 0 ? (
                <span>Resend in {resendIn}s</span>
              ) : (
                <button type="button" className="fp-linklike" onClick={resend} disabled={sending}>
                  Click to resend
                </button>
              )}
            </div>
          </>
        )}

        {/* STEP: reset password */}
        {step === 'reset' && (
          <>
            <h2 className="fp-modal-title">Set new password</h2>
            <p className="fp-modal-subtitle">Code verified. Create new password below.</p>

            <div className="input-forgot">
              <input
                type="password"
                className={`auth-input ${errors.password ? 'error' : ''}`}
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                onBlur={validatePassword}
                onKeyDown={(e) => e.key === 'Enter' && submitNewPassword()}
              />
              {errors.password && <div className="input-error">{errors.password}</div>}
            </div>

            {message && <div className="fp-info">{message}</div>}

            <button className="fp-main-button" onClick={submitNewPassword} disabled={resetting}>
              {resetting ? 'Saving…' : 'Set new password'}
            </button>
          </>
        )}

        {/* STEP: done */}
        {step === 'done' && (
          <>
            <h2 className="fp-modal-title">All done!</h2>
            <p className="fp-modal-subtitle">Your password has been reset successfully.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
