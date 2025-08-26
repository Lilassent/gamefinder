import React, { useEffect, useState, useRef, useCallback } from 'react';
import './MainPage.css';
import favorite from './assets/favorite.png';
import favoriteFilled from './assets/favorite-filled.png';
import linuxIcon from './assets/Linux.png';
import windowsIcon from './assets/microsoft-windows.png';
import sonyIcon from './assets/Sony.png';
import xboxIcon from './assets/Xbox.png';
import appleIcon from './assets/apple.png';
import closeIcon from './assets/close.png';
import { CustomSortDropdown } from './CustomSortDropdown';
import GameDetails from './GameDetails';
import Header from './Header';
import { api } from './api';
import { useAuth } from './authContext';

const platformIcons: Record<number, string> = {
  1: windowsIcon,
  2: sonyIcon,
  3: xboxIcon,
  5: appleIcon,
  6: linuxIcon,
};

function MainPage() {
  const [games, setGames] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [selectedGame, setSelectedGame] = useState<any | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [genreList, setGenreList] = useState<{ id: number; name: string }[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [genreFilter, setGenreFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('relevance');
  const [page, setPage] = useState(1);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const { token } = useAuth();

  // ===== helpers =====
  const loadLikedIds = useCallback(async () => {
    try {
      const res = await api.get('/likes');
      const likedIds = (res.data || []).map((r: any) => r.rawg_id);
      setFavorites(likedIds);
      localStorage.setItem('favorites', JSON.stringify(likedIds));
    } catch {
      /* ignore */
    }
  }, []);

  // genres
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

  // initial favorites
  useEffect(() => {
    loadLikedIds();
  }, [loadLikedIds]);

  // refresh likes if changed elsewhere
  useEffect(() => {
    const handler = () => loadLikedIds();
    window.addEventListener('likes:changed', handler);
    window.addEventListener('focus', handler);
    document.addEventListener('visibilitychange', handler);
    return () => {
      window.removeEventListener('likes:changed', handler);
      window.removeEventListener('focus', handler);
      document.removeEventListener('visibilitychange', handler);
    };
  }, [loadLikedIds]);

  // primary fetch
  useEffect(() => {
    const fetchFilteredGames = async () => {
      try {
        let ordering = '';
        switch (sortBy) {
          case 'name':
            ordering = 'name';
            break;
          case 'released':
            ordering = '-released';
            break;
          case 'popularity':
            ordering = '-metacritic';
            break;
          default:
            ordering = '';
        }

        const params: Record<string, string | number | undefined> = {
          page_size: 12,
          page: 1,
          search: searchTerm || undefined,
          genres:
            genreFilter.length > 0
              ? genreList
                  .filter((g) => genreFilter.includes(g.name))
                  .map((g) => g.id)
                  .join(',')
              : undefined,
          platforms: platformFilter.length > 0 ? platformFilter.join(',') : undefined,
          ordering: ordering || undefined,
        };

        const response = await api.get('/games', { params });
        setGames(response.data.results || []);
        setTotalCount(response.data.count || 0);
        setPage(1);
      } catch (error) {
        console.error('Failed to fetch games:', error);
      }
    };

    fetchFilteredGames();
  }, [searchTerm, genreFilter, platformFilter, sortBy, genreList]);

  // pagination fetch
  useEffect(() => {
    if (page === 1) return;

    const fetchMoreGames = async () => {
      try {
        let ordering = '';
        switch (sortBy) {
          case 'name':
            ordering = 'name';
            break;
          case 'released':
            ordering = '-released';
            break;
          case 'popularity':
            ordering = '-metacritic';
            break;
          default:
            ordering = '';
        }

        const params: Record<string, string | number | undefined> = {
          page_size: 12,
          page,
          search: searchTerm || undefined,
          genres: genreFilter.length
            ? genreList
                .filter((g) => genreFilter.includes(g.name))
                .map((g) => g.id)
                .join(',')
            : undefined,
          platforms: platformFilter.length ? platformFilter.join(',') : undefined,
          ordering,
        };

        const response = await api.get('/games', { params });
        setGames((prev) => [...prev, ...(response.data.results || [])]);
      } catch (error) {
        console.error('Failed to fetch more games:', error);
      }
    };

    fetchMoreGames();
  }, [page, searchTerm, genreFilter, platformFilter, sortBy, genreList]);

  // infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setPage((prev) => prev + 1);
    });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, []);

  // like/unlike
  const toggleFavorite = useCallback(
    async (gameId: number) => {
      const liked = !favorites.includes(gameId);
      const updated = liked ? [...favorites, gameId] : favorites.filter((id) => id !== gameId);
      setFavorites(updated);
      localStorage.setItem('favorites', JSON.stringify(updated));

      const g = games.find((x) => x.id === gameId);

      try {
        if (liked && g) {
          const released = g.released && /^\d{4}-\d{2}-\d{2}$/.test(g.released) ? g.released : null;

          await api.post('/likes', {
            rawgId: g.id,
            title: g.name,
            slug: g.slug,
            imageUrl: g.background_image,
            genres: (g.genres || []).map((x: any) => x.name),
            platforms: (g.parent_platforms || []).map((p: any) => p.platform.name),
            released,
          });
        } else {
          await api.delete(`/likes/${gameId}`);
        }

        window.dispatchEvent(new CustomEvent('likes:changed'));
      } catch (e) {
        console.error('Sync like failed', e);
        setFavorites(favorites);
        localStorage.setItem('favorites', JSON.stringify(favorites));
      }
    },
    [favorites, games]
  );

  const stripReqPrefix = (s?: string | null) =>
    (s ?? '').replace(/^\s*(?:minimum|recommended)(?:\s*\(pc\))?\s*:\s*/i, '').trim();

  // modal
  const openModal = async (game: any) => {
    try {
      const [youtubeRes, detailRes] = await Promise.all([
        api.get('/youtube', {
          params: { q: `${game.name} trailer`, part: 'snippet', type: 'video', maxResults: 1 },
        }),
        api.get(`/games/${game.id}`),
      ]);

      const data = detailRes.data;
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

      const videoId = youtubeRes.data?.items?.[0]?.id?.videoId;
      setVideoUrl(videoId ? `https://www.youtube.com/embed/${videoId}` : null);
      setSelectedGame({ ...data, __requirements: requirements });
    } catch (error) {
      console.error('Modal data fetch error:', error);
      setVideoUrl(null);
      setSelectedGame(game);
    }
  };

  const closeModal = () => {
    setSelectedGame(null);
    setVideoUrl(null);
  };

  const clearAllFilters = () => {
    setGenreFilter([]);
    setPlatformFilter([]);
  };

  return (
    <>
      <Header
        totalCount={totalCount}
        onSearch={(q) => {
          setSearchTerm(q);
          setGames([]);
          setPage(1);
        }}
      />

      <div className="layout">
        <aside className="filters">
          <h2 className="section-title">Filters</h2>

          <div className="filter-section">
            <h4>Platforms</h4>
            {(showAllPlatforms
              ? [
                  ['1', 'PC'],
                  ['18', 'PlayStation'],
                  ['186', 'Xbox One'],
                  ['7', 'Nintendo Switch'],
                  ['4', 'IOS'],
                  ['21', 'Android'],
                  ['5', 'Apple Macintosh'],
                ]
              : [
                  ['1', 'PC'],
                  ['18', 'PlayStation'],
                  ['186', 'Xbox One'],
                ]
            ).map(([id, label]) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={platformFilter.includes(id)}
                  onChange={() =>
                    setPlatformFilter((prev) =>
                      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
                    )
                  }
                />
                <span>{label}</span>
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
          <div className="header-row">
            {searchTerm ? (
              <div className="active-filters-header">
                <h2>Search results:</h2>
                <p className="games-found">
                  <span className="games-found-label">Games found:</span>{' '}
                  <span className="games-found-number">{totalCount.toLocaleString()}</span>
                </p>
              </div>
            ) : genreFilter.length > 0 || platformFilter.length > 0 ? (
              <div className="active-filters-header">
                <h2>Games filtered by:</h2>
                <div className="active-filters-row">
                  <div className="active-filters">
                    {genreFilter.map((genre) => (
                      <span key={genre} className="filter-tag">
                        {genre}
                        <button
                          onClick={() => setGenreFilter((prev) => prev.filter((g) => g !== genre))}
                        >
                          <img src={closeIcon} alt="Remove" />
                        </button>
                      </span>
                    ))}
                    {platformFilter.map((platformId) => {
                      const platformLabel = {
                        '1': 'PC',
                        '18': 'PlayStation',
                        '186': 'Xbox One',
                        '7': 'Nintendo Switch',
                        '4': 'IOS',
                        '21': 'Android',
                        '5': 'Apple Macintosh',
                      }[platformId];
                      return (
                        <span key={platformId} className="filter-tag">
                          {platformLabel}
                          <button
                            onClick={() =>
                              setPlatformFilter((prev) => prev.filter((p) => p !== platformId))
                            }
                          >
                            <img src={closeIcon} alt="Remove" />
                          </button>
                        </span>
                      );
                    })}

                    <button type="button" className="clear-filters-btn" onClick={clearAllFilters}>
                      Clear all
                    </button>
                  </div>
                </div>

                <p className="games-found">
                  <span className="games-found-label">Games found:</span>{' '}
                  <span className="games-found-number">{totalCount.toLocaleString()}</span>
                </p>
              </div>
            ) : (
              <h1 className="section-title">All Games</h1>
            )}

            <div className="sort">
              <CustomSortDropdown value={sortBy} onChange={setSortBy} />
            </div>
          </div>

          <div className="game-grid">
            {games.map((game) => (
              <div key={game.id} className="game-card" onClick={() => openModal(game)}>
                <img src={game.background_image} alt={game.name} className="game-img" />
                <h3>{game.name}</h3>
                <p>{(game.genres || []).map((g: any) => g.name).join(', ')}</p>

                <div className="platform-icons">
                  {game.parent_platforms?.map((p: any) => {
                    const icon = platformIcons[p.platform.id];
                    return icon ? (
                      <img
                        key={p.platform.id}
                        src={icon}
                        alt={p.platform.name}
                        className="platform-icon"
                        title={p.platform.name}
                      />
                    ) : null;
                  })}
                </div>

                {token && (
                  <button
                    className={`favorite-button ${favorites.includes(game.id) ? 'liked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(game.id);
                    }}
                    aria-label={favorites.includes(game.id) ? 'Unlike' : 'Like'}
                    title={favorites.includes(game.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <div className="circle-bg" />
                    <img
                      src={favorites.includes(game.id) ? favoriteFilled : favorite}
                      alt=""
                      className="heart-icon"
                    />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div ref={loaderRef} style={{ height: '50px' }} />
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

export default MainPage;
