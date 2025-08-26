import React, { useState } from 'react';
import './ForgotPasswordModal.css';
import envelopeIcon from './assets/envelope.png';
import envelopeOpenIcon from './assets/envelopOpen.png';
import successIcon from './assets/success.png';
import { api } from './api';

type Props = {
  onClose: () => void;
  onSuccess?: (newEmail: string) => void;
};

type Step = 'verify' | 'new' | 'done';

type Errors = {
  currentEmail?: string;
  currentPassword?: string;
  newEmail?: string;
  common?: string;
};

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ChangeEmailModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<Step>('verify');

  // step 1 (verify current)
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  // step 2 (enter new)
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const [errors, setErrors] = useState<Errors>({});

  // validators
  const validateVerify = () => {
    const e: Errors = {};
    const em = currentEmail.trim();
    const pwd = currentPassword.trim();

    if (!em) e.currentEmail = 'Please enter your current email';
    else if (!emailRe.test(em)) e.currentEmail = 'Please enter a valid email address';

    if (!pwd) e.currentPassword = 'Please enter your password';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateNew = () => {
    const e: Errors = {};
    const em = newEmail.trim();

    if (!em) e.newEmail = 'Please enter a new email';
    else if (!emailRe.test(em)) e.newEmail = 'Please enter a valid email address';
    else if (em.toLowerCase() === currentEmail.trim().toLowerCase())
      e.newEmail = 'New email must be different';

    setErrors((prev) => ({ ...prev, ...e }));
    return Object.keys(e).length === 0;
  };

  // actions
  const verifyCurrent = async () => {
    if (!validateVerify()) return;

    try {
      setVerifying(true);
      setErrors({});

      await api.post('/account/email/verify-current', {
        email: currentEmail.trim(),
        password: currentPassword.trim(),
      });

      setStep('new');
    } catch (err: any) {
      const serverMsg: string | undefined = err?.response?.data?.error;
      const status = err?.response?.status;

      if (status === 401 || serverMsg?.toLowerCase().includes('invalid')) {
        setErrors((prev) => ({
          ...prev,
          currentPassword: 'Please enter a valid password',
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          common: serverMsg || 'Cannot verify right now',
        }));
      }
    } finally {
      setVerifying(false);
    }
  };

  const saveNewEmail = async () => {
    if (!validateNew()) return;

    try {
      setSaving(true);
      setErrors({});

      const em = newEmail.trim();
      await api.patch('/account', { email: em });

      setStep('done');
      onSuccess?.(em);

      setCurrentPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to update email';
      setErrors({ newEmail: msg });
    } finally {
      setSaving(false);
    }
  };

  const icon = step === 'verify' ? envelopeIcon : step === 'new' ? envelopeOpenIcon : successIcon;
  const alt = step === 'verify' ? 'Envelope' : step === 'new' ? 'Open envelope' : 'Success';

  return (
    <div
      className="fp-modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="fp-modal-content fp-large">
        <button className="fp-close-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <img src={icon} alt={alt} className="fp-modal-icon" />

        {/* STEP 1: verify current */}
        {step === 'verify' && (
          <>
            <h2 className="fp-modal-title">Change email</h2>
            <p className="fp-modal-subtitle">Enter your current email and password.</p>

            <div className="input-forgot">
              <input
                type="email"
                className={`auth-input ${errors.currentEmail ? 'error' : ''}`}
                placeholder="Current email"
                value={currentEmail}
                onChange={(e) => {
                  setCurrentEmail(e.target.value);
                  if (errors.currentEmail) setErrors((p) => ({ ...p, currentEmail: undefined }));
                  if (errors.common) setErrors((p) => ({ ...p, common: undefined }));
                }}
                onKeyDown={(e) => e.key === 'Enter' && verifyCurrent()}
                autoFocus
              />
              {errors.currentEmail && <div className="input-error">{errors.currentEmail}</div>}

              <input
                type="password"
                className={`auth-input ${errors.currentPassword ? 'error' : ''}`}
                placeholder="Password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (errors.currentPassword)
                    setErrors((p) => ({ ...p, currentPassword: undefined }));
                  if (errors.common) setErrors((p) => ({ ...p, common: undefined }));
                }}
                onKeyDown={(e) => e.key === 'Enter' && verifyCurrent()}
              />
              {errors.currentPassword && (
                <div className="input-error">{errors.currentPassword}</div>
              )}
            </div>

            {errors.common && <div className="fp-info">{errors.common}</div>}

            <button className="fp-main-button" onClick={verifyCurrent} disabled={verifying}>
              {verifying ? 'Checking…' : 'Continue'}
            </button>
          </>
        )}

        {/* STEP 2: new email */}
        {step === 'new' && (
          <>
            <h2 className="fp-modal-title">Enter new email</h2>
            <p className="fp-modal-subtitle">Type your new email below.</p>

            <div className="input-forgot">
              <input
                type="email"
                className={`auth-input ${errors.newEmail ? 'error' : ''}`}
                placeholder="New email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  if (errors.newEmail) setErrors((p) => ({ ...p, newEmail: undefined }));
                }}
                onKeyDown={(e) => e.key === 'Enter' && saveNewEmail()}
                autoFocus
              />
              {errors.newEmail && <div className="input-error">{errors.newEmail}</div>}
            </div>

            {errors.common && <div className="fp-info">{errors.common}</div>}

            <button className="fp-main-button" onClick={saveNewEmail} disabled={saving}>
              {saving ? 'Saving…' : 'Save email'}
            </button>
          </>
        )}

        {/* STEP 3: done */}
        {step === 'done' && (
          <>
            <h2 className="fp-modal-title">All done!</h2>
            <p className="fp-modal-subtitle">Your email has been changed successfully.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ChangeEmailModal;
