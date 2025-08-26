import React, { useState } from 'react';
import './ForgotPasswordModal.css';
import keyIcon from './assets/key.png';
import successIcon from './assets/success.png';
import { api } from './api';

type Props = {
  onClose: () => void;
  onSuccess?: () => void;
};

type Step = 'form' | 'done';

type Errors = {
  current?: string;
  next?: string;
  common?: string;
};

const MIN_LEN = 6;

const ChangePasswordModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<Step>('form');

  const [currentPwd, setCurrentPwd] = useState('');
  const [nextPwd, setNextPwd] = useState('');

  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const validate = (): boolean => {
    const e: Errors = {};
    if (!currentPwd.trim()) e.current = 'Enter your current password';
    if (!nextPwd.trim()) e.next = 'Enter a new password';
    else if (nextPwd.trim().length < MIN_LEN)
      e.next = `Password must be at least ${MIN_LEN} characters`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    try {
      setSending(true);
      setErrors({});
      await api.patch('/account/password', {
        currentPassword: currentPwd.trim(),
        newPassword: nextPwd.trim(),
      });

      setStep('done');
      setCurrentPwd('');
      setNextPwd('');
    } catch (err: any) {
      const data = err?.response?.data || {};
      const msg: string = data.error || 'Password update failed';
      const code: string | undefined = data.code;

      if (code === 'CURRENT_INCORRECT' || /current password is incorrect/i.test(msg)) {
        setErrors({ current: 'Current password is incorrect' });
      } else if (code === 'CURRENT_REQUIRED') {
        setErrors({ current: 'Current password is required' });
      } else if (code === 'NEW_WEAK') {
        setErrors({ next: 'Password must be at least 6 characters' });
      } else if (code === 'NO_LOCAL_PASSWORD') {
        setErrors({ common: msg });
      } else {
        setErrors({ common: msg });
      }
    } finally {
      setSending(false);
    }
  };

  const icon = step === 'form' ? keyIcon : successIcon;
  const alt = step === 'form' ? 'Key' : 'Success';

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

        {step === 'form' && (
          <>
            <h2 className="fp-modal-title">Change password</h2>
            <p className="fp-modal-subtitle">Enter your current and new password below.</p>

            <div className="input-forgot">
              <input
                type="password"
                className={`auth-input ${errors.current ? 'error' : ''}`}
                placeholder="Current password"
                value={currentPwd}
                onChange={(e) => {
                  setCurrentPwd(e.target.value);
                  if (errors.current) setErrors((p) => ({ ...p, current: undefined }));
                }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                autoFocus
              />
              {errors.current && <div className="input-error">{errors.current}</div>}

              <input
                type="password"
                className={`auth-input ${errors.next ? 'error' : ''}`}
                placeholder="New password"
                value={nextPwd}
                onChange={(e) => {
                  setNextPwd(e.target.value);
                  if (errors.next) setErrors((p) => ({ ...p, next: undefined }));
                }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
              {errors.next && <div className="input-error">{errors.next}</div>}
            </div>

            {errors.common && <div className="fp-info">{errors.common}</div>}

            <button className="fp-main-button" onClick={submit} disabled={sending}>
              {sending ? 'Saving…' : 'Submit'}
            </button>
          </>
        )}

        {step === 'done' && (
          <>
            <h2 className="fp-modal-title">All done!</h2>
            <p className="fp-modal-subtitle">Your password has been changed successfully.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordModal;
