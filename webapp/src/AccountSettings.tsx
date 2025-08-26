import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import ChangePasswordModal from './ChangePasswordModal';
import ChangeNicknameModal from './ChangeNicknameModal';
import ChangeEmailModal from './ChangeEmailModal';
import { api } from './api';
import './AccountSettings.css';
import { useAuth } from './authContext';

type Profile = {
  id: number;
  nickname: string;
  email: string;
};

const AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [showPwdModal, setShowPwdModal] = useState(false);
  const [showNickModal, setShowNickModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const handleHeaderSearch = (query: string) => {
    const q = query.trim();
    if (!q) return;
    navigate(`/?q=${encodeURIComponent(q)}`);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/account/me');
        setProfile({ id: data.id, nickname: data.nickname, email: data.email });
      } catch (e: any) {
        setErr(e?.response?.data?.error || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/games', { params: { page_size: 1, page: 1 } });
        setTotalCount(Number(res?.data?.count ?? 0));
      } catch {
        setTotalCount(0);
      }
    })();
  }, []);

  return (
    <>
      <Header totalCount={totalCount} onSearch={handleHeaderSearch} />

      {loading ? (
        <div className="as-page">
          <h1 className="as-h1">Account Settings</h1>
          <div className="as-muted">Loading…</div>
        </div>
      ) : !profile ? (
        <div className="as-page">
          <h1 className="as-h1">Account Settings</h1>
          <div className="as-error">{err || 'Profile is unavailable'}</div>
        </div>
      ) : (
        <div className="as-page">
          <h1 className="as-h1">Account Settings</h1>

          <div className="as-row">
            <div className="as-col-left">Nickname</div>
            <div className="as-value">{profile.nickname}</div>
            <div className="as-actions">
              <button type="button" className="as-link" onClick={() => setShowNickModal(true)}>
                Change nickname
              </button>
            </div>
          </div>

          <div className="as-row">
            <div className="as-col-left">Email Address</div>
            <div className="as-value">{profile.email}</div>
            <div className="as-actions">
              <button type="button" className="as-link" onClick={() => setShowEmailModal(true)}>
                Change email
              </button>
            </div>
          </div>

          <div className="as-row">
            <div className="as-col-left">Password</div>
            <div className="as-actions">
              <button type="button" className="as-link" onClick={() => setShowPwdModal(true)}>
                Change password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showPwdModal && <ChangePasswordModal onClose={() => setShowPwdModal(false)} />}

      {showNickModal && (
        <ChangeNicknameModal
          onClose={() => setShowNickModal(false)}
          current={profile?.nickname}
          onSuccess={(newNick) => {
            setProfile((p) => (p ? { ...p, nickname: newNick } : p));
            updateUser({ nickname: newNick });
          }}
        />
      )}

      {showEmailModal && (
        <ChangeEmailModal
          onClose={() => setShowEmailModal(false)}
          onSuccess={(newEmail) => {
            setProfile((p) => (p ? { ...p, email: newEmail } : p));
            updateUser({ email: newEmail });
          }}
        />
      )}
    </>
  );
};

export default AccountSettings;
