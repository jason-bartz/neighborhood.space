import { useState } from 'react';
import { CHAPTER_NAMES, getDonationLinks } from '../../data/chapterConfig';

export default function ChapterDonationChooser({ renderTrigger, accent = 'ink' }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return renderTrigger(() => setOpen(true));
  }

  const accentVar = accent === 'aqua' ? 'var(--mb-aqua-deep)' : 'var(--mb-ink)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '14px 16px',
        background: 'var(--mb-paper-deep)',
        border: '1px solid var(--mb-ink)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <span className="mb-eyebrow" style={{ color: accentVar }}>
          Choose your chapter
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mb-eyebrow"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--mb-ink-60)',
            cursor: 'pointer',
            padding: 0,
            font: 'inherit',
            textDecoration: 'underline',
          }}
        >
          Cancel
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {CHAPTER_NAMES.map((name) => {
          const links = getDonationLinks(name);
          const url = links?.oneTimeUrl;
          if (!url) return null;
          return (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-btn mb-btn-ink"
              style={{
                fontSize: 12,
                padding: '10px 12px',
                textAlign: 'center',
                justifyContent: 'center',
              }}
            >
              {name}
            </a>
          );
        })}
      </div>
    </div>
  );
}
