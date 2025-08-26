import React, { useState } from 'react';

const ExpandableText: React.FC<{ text: string; max?: number }> = ({ text, max = 150 }) => {
  const [open, setOpen] = useState(false);

  if (!text) return <span>—</span>;

  const isLong = text.length > max;
  const shown = open || !isLong ? text : text.slice(0, max).trimEnd() + '…';

  return (
    <>
      <span>{shown}</span>
      {isLong && (
        <button
          type="button"
          className="expand-toggle"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </>
  );
};

export default ExpandableText;
