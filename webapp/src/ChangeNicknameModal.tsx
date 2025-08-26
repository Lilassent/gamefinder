import React, { useState } from 'react';
import './ForgotPasswordModal.css';
import personIcon from './assets/person.png';
import successIcon from './assets/success.png';
import { api } from './api';
import { useAuth } from './authContext';

type Props = {
  onClose: () => void;
  current?: string | null;
  onSuccess?: (newNickname: string) => void;
};

type Step = 'form' | 'done';

const ChangeNicknameModal: React.FC<Props> = ({ onClose, current, onSuccess }) => {
  const { updateUser } = useAuth();
  const [step, setStep] = useState<Step>('form');
  const [nickname, setNickname] = useState<string>(current ?? '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (value: string) => {
    const v = value.trim();
    if (!v) return 'Nickname cannot be empty';
    if (v.length > 50) return 'Nickname is too long';
    return null;
  };

  const submit = async () => {
    const err = validate(nickname);
    if (err) {
      setError(err);
      return;
    }

    try {
      setSending(true);
      setError(null);
      const newNick = nickname.trim();

      await api.patch('/account', { nickname: newNick });

      updateUser({ nickname: newNick });

      setStep('done');
      onSuccess?.(newNick);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Update failed');
    } finally {
      setSending(false);
    }
  };

  const icon = step === 'form' ? personIcon : successIcon;
  const alt = step === 'form' ? 'Person' : 'Success';

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
            <h2 className="fp-modal-title">Change nickname</h2>
            <p className="fp-modal-subtitle">Enter your new nickname</p>

            <div className="input-forgot">
              <input
                className={`auth-input ${error ? 'error' : ''}`}
                placeholder="New nickname"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                maxLength={50}
                autoFocus
              />
              {error && <div className="input-error">{error}</div>}
            </div>

            <button className="fp-main-button" onClick={submit} disabled={sending}>
              {sending ? 'Saving…' : 'Submit'}
            </button>
          </>
        )}

        {step === 'done' && (
          <>
            <h2 className="fp-modal-title">All done!</h2>
            <p className="fp-modal-subtitle">Your nickname has been changed successfully.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ChangeNicknameModal;
