import React, { useEffect, useMemo, useState } from 'react';
import './MainPage.css';
import { useNavigate } from 'react-router-dom';
import favoriteFilled from './assets/favorite-filled.png';
import linuxIcon from './assets/Linux.png';
import windowsIcon from './assets/microsoft-windows.png';
import sonyIcon from './assets/Sony.png';
import xboxIcon from './assets/Xbox.png';
import appleIcon from './assets/apple.png';
import GameDetails from './GameDetails';
import { api } from './api';
import { useAuth } from './authContext';
import Header from './Header';

type LikedGame = {
  id: number;
  rawg_id: number;
  title: string;
  slug?: string;
  image_url?: string;
  genres?: string[];
  platforms?: string[];
  released?: string | null;
};

const platformIcons: Record<string, string> = {
  windows: windowsIcon,
  playstation: sonyIcon,
  xbox: xboxIcon,
  mac: appleIcon,
  linux: linuxIcon,
};

const PLATFORM_OPTIONS = [
  { key: 'windows', label: 'PC' },
  { key: 'playstation', label: 'PlayStation' },
  { key: 'xbox', label: 'Xbox' },
  { key: 'nintendo', label: 'Nintendo Switch' },
  { key: 'ios', label: 'IOS' },
  { key: 'android', label: 'Android' },
  { key: 'mac', label: 'Apple Macintosh' },
  { key: 'linux', label: 'Linux' },
];

function WishlistPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [games, setGames] = useState<LikedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<any | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [localSearch, setLocalSearch] = useState('');

  const nickname = user?.nickname ?? 'Nickname';

  const [genreList, setGenreList] = useState<{ id: number; name: string }[]>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [genreFilter, setGenreFilter] = useState<string[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);

  // fetch genres
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await api.get('/genres');
        setGenreList(response.data.results || []);
      } catch (error) {
        console.error('Failed to fetch genres:', error);
      }
    };
    fetchGenres();
  }, []);

  // fetch wishlist
  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    const fetchWishlist = async () => {
      try {
        const res = await api.get('/likes');
        setGames(res.data || []);
      } catch (e) {
        console.error('Failed to load wishlist', e);
        if ((e as any)?.response?.status === 401) navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchWishlist();
  }, [token, navigate]);

  // search/filter locally
  const visibleGames = useMemo(() => {
    let list = [...games];

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          (g.genres || []).some((gn) => gn.toLowerCase().includes(q))
      );
    }

    // genre filter
    if (genreFilter.length) {
      list = list.filter((g) => (g.genres || []).some((gn) => genreFilter.includes(gn)));
    }

    // platform filter
    if (platformFilter.length) {
      list = list.filter((g) => {
        const names = (g.platforms || []).map((p) => p.toLowerCase());
        return platformFilter.some((pk) => names.some((n) => n.includes(pk)));
      });
    }

    return list;
  }, [games, search, genreFilter, platformFilter]);

  const handleSearch = () => setSearch(localSearch);

  const stripReqPrefix = (s?: string | null) =>
    (s ?? '').replace(/^\s*(?:minimum|recommended)(?:\s*\(pc\))?\s*:\s*/i, '').trim();

  // open modal with RAWG details + requirements
  const openModal = async (g: LikedGame) => {
    try {
      const [yt, details] = await Promise.all([
        api.get('/youtube', {
          params: { q: `${g.title} trailer`, part: 'snippet', type: 'video', maxResults: 1 },
        }),
        api.get(`/games/${g.rawg_id}`),
      ]);

      const data = details.data;

      const getReq = (slug: string) => {
        const item = data.platforms?.find((p: any) => p.platform?.slug === slug);
        return item?.requirements || item?.requirements_en || item?.requirements_ru || null;
      };

      const joinReq = (req: any) =>
        req
          ? [
              req.minimum && stripReqPrefix(req.minimum),
              req.recommended && stripReqPrefix(req.recommended),
            ]
              .filter(Boolean)
              .join('\n')
          : undefined;

      const pcReq = getReq('pc');
      const linuxReq = getReq('linux');
      const macReq = getReq('macos') || getReq('mac');
      const switchReq = getReq('nintendo-switch');

      const requirements = {
        minimum: stripReqPrefix(pcReq?.minimum),
        recommended: stripReqPrefix(pcReq?.recommended),
        linux: joinReq(linuxReq),
        mac: joinReq(macReq),
        switch: joinReq(switchReq),
      };

      const videoId = yt.data?.items?.[0]?.id?.videoId;
      setVideoUrl(videoId ? `https://www.youtube.com/embed/${videoId}` : null);
      setSelectedGame({ ...data, __requirements: requirements });
    } catch (err) {
      console.error('Modal load error:', err);
      setSelectedGame({
        name: g.title,
        description_raw: 'No description available.',
        platforms: (g.platforms || []).map((p) => ({ platform: { name: p } })),
        genres: (g.genres || []).map((name) => ({ name })),
        released: g.released || 'Unknown',
        __requirements: undefined,
      });
      setVideoUrl(null);
    }
  };

  const closeModal = () => {
    setSelectedGame(null);
    setVideoUrl(null);
  };

  const unlike = async (rawgId: number) => {
    try {
      await api.delete(`/likes/${rawgId}`);
      setGames((prev) => prev.filter((g) => g.rawg_id !== rawgId));
      window.dispatchEvent(new CustomEvent('likes:changed'));
    } catch (e) {
      console.error('Unlike failed', e);
      alert('Failed to remove from wishlist');
    }
  };

  const gotoAccount = () => navigate('/account');

  return (
    <>
      <Header
        totalCount={games.length}
        onSearch={(q) => {
          setLocalSearch(q);
          setSearch(q);
        }}
      />

      <div className="layout">
        <aside className="filters">
          <h2 className="section-title">Filters</h2>

          <div className="filter-section">
            <h4>Platforms</h4>
            {(showAllPlatforms ? PLATFORM_OPTIONS : PLATFORM_OPTIONS.slice(0, 3)).map((p) => (
              <label key={p.key}>
                <input
                  type="checkbox"
                  checked={platformFilter.includes(p.key)}
                  onChange={() =>
                    setPlatformFilter((prev) =>
                      prev.includes(p.key) ? prev.filter((k) => k !== p.key) : [...prev, p.key]
                    )
                  }
                />
                <span>{p.label}</span>
              </label>
            ))}
            <button
              className="show-all-button"
              onClick={() => setShowAllPlatforms(!showAllPlatforms)}
            >
              {showAllPlatforms ? 'Show less' : 'Show all'}
            </button>
          </div>

          <div className="filter-section">
            <h4>Genres</h4>
            {(showAllGenres ? genreList : genreList.slice(0, 4)).map((g) => (
              <label key={g.id}>
                <input
                  type="checkbox"
                  checked={genreFilter.includes(g.name)}
                  onChange={() =>
                    setGenreFilter((prev) =>
                      prev.includes(g.name) ? prev.filter((gf) => gf !== g.name) : [...prev, g.name]
                    )
                  }
                />
                <span>{g.name}</span>
              </label>
            ))}
            {genreList.length > 4 && (
              <button className="show-all-button" onClick={() => setShowAllGenres(!showAllGenres)}>
                {showAllGenres ? 'Show less' : 'Show all'}
              </button>
            )}
          </div>
        </aside>

        <section className="main-content">
          <div className="header-row header-row--align-center">
            <h1 className="section-title section-title--tight">Wishlist of {nickname}</h1>

            <div className="header-actions">
              <button type="button" className="account-btn" onClick={gotoAccount}>
                Account Settings
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-muted">Loading…</p>
          ) : visibleGames.length === 0 ? (
            <p className="text-muted">Your wishlist is empty.</p>
          ) : (
            <div className="game-grid">
              {visibleGames.map((g) => (
                <div key={g.rawg_id} className="game-card" onClick={() => openModal(g)}>
                  <img src={g.image_url || '/placeholder.jpg'} alt={g.title} className="game-img" />
                  <h3>{g.title}</h3>
                  <p>{(g.genres || []).join(', ')}</p>

                  <div className="platform-icons">
                    {(g.platforms || []).map((p) => {
                      const key = p.toLowerCase();
                      const icon = key.includes('windows')
                        ? platformIcons.windows
                        : key.includes('playstation')
                          ? platformIcons.playstation
                          : key.includes('xbox')
                            ? platformIcons.xbox
                            : key.includes('mac') || key.includes('apple')
                              ? platformIcons.mac
                              : key.includes('linux')
                                ? platformIcons.linux
                                : undefined;

                      return icon ? (
                        <img key={p} src={icon} alt={p} className="platform-icon" title={p} />
                      ) : null;
                    })}
                  </div>

                  <button
                    className="favorite-button liked"
                    onClick={(e) => {
                      e.stopPropagation();
                      unlike(g.rawg_id);
                    }}
                    title="Remove from wishlist"
                  >
                    <div className="circle-bg" />
                    <img src={favoriteFilled} alt="favorite" className="heart-icon" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedGame && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            {videoUrl ? (
              <iframe
                width="100%"
                height="500"
                src={videoUrl}
                title="YouTube trailer"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <p>No trailer found</p>
            )}

            <h2>{selectedGame.name}</h2>
            <GameDetails
              description={selectedGame.description_raw || 'No description available.'}
              platforms={selectedGame.platforms?.map((p: any) => p.platform.name) || []}
              genres={selectedGame.genres?.map((g: any) => g.name) || []}
              releaseDate={selectedGame.released || 'Unknown'}
              developer={selectedGame.developers?.map((d: any) => d.name).join(', ')}
              publisher={selectedGame.publishers?.map((p: any) => p.name).join(', ')}
              ageRating={selectedGame.esrb_rating?.name || 'Not rated'}
              seriesName={selectedGame.series?.name}
              tags={selectedGame.tags?.slice(0, 10).map((t: any) => t.name) || []}
              requirements={selectedGame.__requirements}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default WishlistPage;
