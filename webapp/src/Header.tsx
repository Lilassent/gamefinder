import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './authContext';
import searchIcon from './assets/search.png';
import closeIcon from './assets/close.png';
import './MainPage.css';

type HeaderProps = {
  totalCount: number;
  onSearch: (query: string) => void;
};

export default function Header({ totalCount, onSearch }: HeaderProps) {
  const navigate = useNavigate();
  const { user, token, setAuth } = useAuth();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = () => onSearch(query.trim());

  const clearSearch = () => {
    setQuery('');
    onSearch('');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleLogout = () => {
    setAuth({ user: null, token: null });
    navigate('/', { replace: true });
  };

  const avatarLetter = user?.nickname?.[0]?.toUpperCase() ?? 'U';

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button type="button" className="logo reset-btn" onClick={() => navigate('/')}>
          Game<span>Finder</span>
        </button>

        <div className={`search-form ${query ? 'has-clear' : ''}`}>
          <input
            ref={inputRef}
            className="search-form_txt"
            type="text"
            placeholder={`Search ${totalCount.toLocaleString()} games`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runSearch();
              } else if (e.key === 'Escape' && query) {
                clearSearch();
              }
            }}
          />

          <button
            className="search-form_btn"
            type="button"
            onClick={runSearch}
            aria-label="Search"
            title="Search"
          >
            <img src={searchIcon} alt="" className="search-icon" />
          </button>

          {query && (
            <button
              className="search-clear-btn"
              type="button"
              aria-label="Clear search"
              title="Clear"
              onClick={clearSearch}
            >
              <img src={closeIcon} width={16} height={16} alt="" />
            </button>
          )}
        </div>

        <div className="auth-links">
          {token && user ? (
            <>
              <div className="user-avatar" title={user.nickname} aria-label="User avatar">
                {avatarLetter}
              </div>
              <button
                type="button"
                className="wishlist-btn reset-btn"
                onClick={() => navigate('/wishlist')}
              >
                Wishlist
              </button>
              <button
                type="button"
                className="logout-btn reset-btn"
                title="Logout"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/signup" className="reset-btn link-like">
                Sign up
              </Link>
              <Link to="/login" className="reset-btn link-like">
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
