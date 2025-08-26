import React from 'react';
import './GameDetails.css';
import ExpandableText from './ExpandableText';

interface GameDetailsProps {
  description: string;
  platforms: string[];
  genres: string[];
  releaseDate: string;
  developer?: string;
  publisher?: string;
  ageRating?: string;
  seriesName?: string;
  tags: string[];
  website?: string;
  requirements?: {
    minimum?: string;
    recommended?: string;
    linux?: string;
    mac?: string;
    switch?: string;
  };
}

const GameDetails: React.FC<GameDetailsProps> = ({
  description,
  platforms,
  genres,
  releaseDate,
  developer,
  publisher,
  ageRating,
  seriesName,
  tags,
  website,
  requirements = {},
}) => {
  const uniq = (arr: string[] = []) => Array.from(new Set((arr || []).filter(Boolean)));

  const safeJoin = (arr: string[] = [], sep = ', ') =>
    uniq(arr).length ? uniq(arr).join(sep) : '—';

  const safeText = (val?: string, fallback = '—') => (val && val.trim() ? val : fallback);

  const displayWebsite = (() => {
    if (!website) return null;
    try {
      const u = new URL(website);
      const label = u.hostname.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname);
      return { href: website, label };
    } catch {
      return { href: website, label: website };
    }
  })();

  const requirementsOrder: Array<{
    key: keyof NonNullable<GameDetailsProps['requirements']>;
    label: string;
  }> = [
    { key: 'minimum', label: 'Minimum (PC)' },
    { key: 'recommended', label: 'Recommended (PC)' },
    { key: 'mac', label: 'macOS' },
    { key: 'linux', label: 'Linux' },
    { key: 'switch', label: 'Nintendo Switch' },
  ];

  const hasAnyRequirements = requirementsOrder.some((r) => {
    const v = requirements?.[r.key];
    return v && v.trim();
  });

  const renderRow = (label: string, value: React.ReactNode, show = true) =>
    show ? (
      <div className="row">
        <span className="label">{label}</span>
        <span className="value">{value}</span>
      </div>
    ) : null;

  return (
    <div className="game-details">
      <div className="details-grid">
        {renderRow(
          'About:',
          <ExpandableText text={safeText(description, 'No description available.')} max={150} />,
          true
        )}

        {renderRow('Platforms:', safeJoin(platforms), uniq(platforms).length > 0)}
        {renderRow('Genre:', safeJoin(genres), uniq(genres).length > 0)}
        {renderRow('Release date:', safeText(releaseDate, 'Unknown'), true)}
        {renderRow('Developer:', safeText(developer, 'Unknown'), true)}
        {renderRow('Publisher:', safeText(publisher, 'Unknown'), true)}
        {renderRow('Age rating:', safeText(ageRating, 'Not rated'), true)}

        {renderRow('Other games in the series:', seriesName!, !!seriesName)}

        {renderRow('Tags:', safeJoin(tags), uniq(tags).length > 0)}

        {displayWebsite &&
          renderRow(
            'Website:',
            <a href={displayWebsite.href} target="_blank" rel="noopener noreferrer">
              {displayWebsite.label}
            </a>,
            true
          )}

        {/* System requirements */}
        {hasAnyRequirements && (
          <>
            {renderRow('System requirements:', <span />)}

            {requirementsOrder.map(({ key, label }) => {
              const val = requirements?.[key];
              if (!val || !val.trim()) return null;
              return renderRow(`${label}:`, <ExpandableText text={val} max={300} />, true);
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default GameDetails;
