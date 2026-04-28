import React, { useEffect, useState, useMemo } from 'react';
import {
  collection, query, where, orderBy, limit as fbLimit, onSnapshot,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../firebaseConfig';
import { ACCENT_TOKENS } from '../resources/registry';
import { FORMS, getFormById, FALLBACK_CHAPTER_NAME_TO_SLUG } from './formsRegistry';
import './forms-library.css';

const sendFormInviteCallable = httpsCallable(functions, 'sendFormInvite');

function FormCard({ form, onSelect }) {
  const accent = ACCENT_TOKENS[form.accent] || ACCENT_TOKENS.magenta;
  return (
    <button
      type="button"
      className="resource-card"
      onClick={() => onSelect(form.id)}
    >
      <div
        className="resource-card__cover"
        style={{ background: accent.bg, color: accent.text }}
      >
        <span className="resource-card__number">{form.number}</span>
        <span className="resource-card__category">{form.category}</span>
      </div>
      <div className="resource-card__body">
        <h3 className="resource-card__title">{form.title}</h3>
        <p className="resource-card__summary">{form.summary}</p>
        <div className="resource-card__meta">
          <span>{form.estTime}</span>
          <span>Open →</span>
        </div>
      </div>
    </button>
  );
}

function buildPublicUrl(form, { chapterSlug, email }) {
  const params = new URLSearchParams();
  if (chapterSlug) params.set('chapter', chapterSlug);
  if (email) params.set('email', email);
  const qs = params.toString();
  // Always render the canonical production URL — directors copy & share these
  // and a localhost link is useless to a recipient.
  const base = 'https://www.goodneighbor.fund';
  return `${base}${form.publicPath}${qs ? `?${qs}` : ''}`;
}

function SendPanel({ form, userChapter, isSuperAdmin }) {
  const [recipient, setRecipient] = useState('');
  const [chapter, setChapter] = useState(userChapter || '');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'ok'|'err', text }

  // If the chapter director's chapter changes (only happens when isSuperAdmin
  // is false and user.chapter is set), keep the selector in sync.
  useEffect(() => {
    if (!isSuperAdmin && userChapter) setChapter(userChapter);
  }, [isSuperAdmin, userChapter]);

  async function handleSend(e) {
    e.preventDefault();
    setMsg(null);
    const trimmed = recipient.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setMsg({ type: 'err', text: 'Enter a valid email address.' });
      return;
    }
    if (!chapter) {
      setMsg({ type: 'err', text: 'Pick a chapter.' });
      return;
    }
    setSending(true);
    try {
      const { data } = await sendFormInviteCallable({
        formType: form.id,
        recipient: trimmed,
        chapter,
      });
      setMsg({
        type: 'ok',
        text: data?.cc
          ? `Sent to ${trimmed} (cc: ${data.cc}).`
          : `Sent to ${trimmed}.`,
      });
      setRecipient('');
    } catch (err) {
      console.error('sendFormInvite failed:', err);
      setMsg({
        type: 'err',
        text: err?.message ? `Failed: ${err.message}` : 'Failed to send.',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSend}>
      <p style={{ margin: '0 0 18px', fontSize: 14, color: 'var(--mb-ink)' }}>
        Email a one-click link to fill out this form. The chapter mailbox is cc'd
        automatically and a copy of the submission lands here when they finish.
      </p>
      <div className="forms-library__row">
        <div className="forms-library__field">
          <label htmlFor={`send-email-${form.id}`}>Recipient Email</label>
          <input
            id={`send-email-${form.id}`}
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="recipient@example.com"
            required
            disabled={sending}
          />
        </div>
        {isSuperAdmin && (
          <div className="forms-library__field" style={{ maxWidth: 240 }}>
            <label htmlFor={`send-chapter-${form.id}`}>Chapter</label>
            <select
              id={`send-chapter-${form.id}`}
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              disabled={sending}
            >
              <option value="">Select chapter</option>
              {Object.keys(FALLBACK_CHAPTER_NAME_TO_SLUG).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}
        <button
          type="submit"
          className="forms-library__btn"
          disabled={sending}
        >
          {sending ? 'Sending…' : 'Send Email'}
        </button>
      </div>
      {!isSuperAdmin && chapter && (
        <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--mb-ink-60)' }}>
          Sending as <strong>{chapter}</strong> chapter.
        </p>
      )}
      {msg && (
        <div className={`forms-library__msg forms-library__msg--${msg.type === 'ok' ? 'ok' : 'err'}`}>
          {msg.text}
        </div>
      )}
    </form>
  );
}

function CopyLinkPanel({ form, userChapter, isSuperAdmin }) {
  const [chapter, setChapter] = useState(userChapter || '');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin && userChapter) setChapter(userChapter);
  }, [isSuperAdmin, userChapter]);

  const chapterSlug = FALLBACK_CHAPTER_NAME_TO_SLUG[chapter] || '';
  const url = buildPublicUrl(form, { chapterSlug, email: email.trim() });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
  }

  return (
    <div>
      <p style={{ margin: '0 0 18px', fontSize: 14, color: 'var(--mb-ink)' }}>
        Build a shareable link with the chapter pre-filled. Drop it in Slack, a text,
        or anywhere else outside email.
      </p>
      <div className="forms-library__row" style={{ marginBottom: 18 }}>
        {isSuperAdmin && (
          <div className="forms-library__field" style={{ maxWidth: 240 }}>
            <label htmlFor={`copy-chapter-${form.id}`}>Chapter</label>
            <select
              id={`copy-chapter-${form.id}`}
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
            >
              <option value="">Select chapter</option>
              {Object.keys(FALLBACK_CHAPTER_NAME_TO_SLUG).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="forms-library__field">
          <label htmlFor={`copy-email-${form.id}`}>Pre-fill Email (optional)</label>
          <input
            id={`copy-email-${form.id}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="recipient@example.com"
          />
        </div>
      </div>
      <div className="forms-library__row">
        <div className="forms-library__link">{url}</div>
        <button type="button" className="forms-library__btn" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  );
}

function fmtDate(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
  try {
    return date.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function SubmissionsPanel({ form, userChapter, isSuperAdmin }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const constraints = [
      where('formType', '==', form.id),
      orderBy('submittedAt', 'desc'),
      fbLimit(100),
    ];
    if (!isSuperAdmin) {
      if (!userChapter) {
        setSubmissions([]);
        setLoading(false);
        return undefined;
      }
      constraints.unshift(where('chapter', '==', userChapter));
    }
    const q = query(collection(db, 'formLibrarySubmissions'), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('formLibrarySubmissions snapshot error:', err);
        setError(err.message || 'Failed to load submissions.');
        setLoading(false);
      },
    );
    return unsub;
  }, [form.id, userChapter, isSuperAdmin]);

  async function handleDownloadPdf(submission) {
    try {
      const [rendererMod, pdfMod] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./pdf/FormSubmissionPDF'),
      ]);
      const FormSubmissionPDF = pdfMod.default;
      const blob = await rendererMod.pdf(
        <FormSubmissionPDF submission={submission} formMeta={form} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filenameBase = (submission.name || submission.fullName || 'submission')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      a.download = `${form.id}-${filenameBase || 'submission'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert(`PDF error: ${err?.message || 'Unknown error'}`);
    }
  }

  if (loading) {
    return <div className="forms-library__empty">Loading submissions…</div>;
  }
  if (error) {
    return <div className="forms-library__msg forms-library__msg--err">{error}</div>;
  }
  if (submissions.length === 0) {
    return (
      <div className="forms-library__empty">
        No submissions yet. Submissions appear here as soon as someone completes the form.
      </div>
    );
  }

  return (
    <div className="forms-library__submissions">
      {submissions.map((s) => {
        const thumbUrl = s.headshotUrl || s.photoUrl;
        const displayName = s.name || s.fullName || s.email || 'Submission';
        const detail = s.formType === 'lp-onboarding'
          ? (s.bio || '').slice(0, 140) + ((s.bio || '').length > 140 ? '…' : '')
          : [s.addressCity, s.addressState].filter(Boolean).join(', ');
        return (
          <div key={s.id} className="forms-library__submission">
            {thumbUrl ? (
              <img src={thumbUrl} alt="" className="forms-library__submission-thumb" />
            ) : (
              <div className="forms-library__submission-thumb" aria-hidden="true" />
            )}
            <div className="forms-library__submission-body">
              <p className="forms-library__submission-name">{displayName}</p>
              <p className="forms-library__submission-meta">
                {s.email} · {s.chapter} · {fmtDate(s.submittedAt)}
              </p>
              {detail && <p className="forms-library__submission-detail">{detail}</p>}
            </div>
            <div className="forms-library__submission-actions">
              <button
                type="button"
                className="forms-library__btn forms-library__btn--ghost"
                onClick={() => handleDownloadPdf(s)}
              >
                ↓ PDF
              </button>
              {thumbUrl && (
                <a
                  href={thumbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="forms-library__btn forms-library__btn--ghost"
                  style={{ textDecoration: 'none', textAlign: 'center' }}
                >
                  Photo
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FormDetail({ form, userChapter, isSuperAdmin, onBack }) {
  const [activeTab, setActiveTab] = useState('send');
  const accent = ACCENT_TOKENS[form.accent] || ACCENT_TOKENS.magenta;

  return (
    <div className="forms-library__detail">
      <div className="resource-doc__toolbar">
        <button type="button" className="resource-doc__back" onClick={onBack}>
          ← Back to Forms Library
        </button>
        <a
          href={`${form.publicPath}${userChapter ? `?chapter=${FALLBACK_CHAPTER_NAME_TO_SLUG[userChapter] || ''}` : ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="resource-doc__pdf"
          style={{ textDecoration: 'none' }}
        >
          Preview Form ↗
        </a>
      </div>
      <div
        className="forms-library__cover"
        style={{ background: accent.bg, color: accent.text }}
      >
        <span className="forms-library__cover-number">{form.number}</span>
        <p className="forms-library__cover-eyebrow">{form.category}</p>
        <h2 className="forms-library__cover-title">{form.title}</h2>
        <p className="forms-library__cover-summary">{form.description}</p>
      </div>
      <div className="forms-library__tabs" role="tablist">
        {[
          { id: 'send', label: 'Send Email' },
          { id: 'copy', label: 'Copy Link' },
          { id: 'submissions', label: 'Submissions' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className="forms-library__tab"
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="forms-library__panel">
        {activeTab === 'send' && (
          <SendPanel form={form} userChapter={userChapter} isSuperAdmin={isSuperAdmin} />
        )}
        {activeTab === 'copy' && (
          <CopyLinkPanel form={form} userChapter={userChapter} isSuperAdmin={isSuperAdmin} />
        )}
        {activeTab === 'submissions' && (
          <SubmissionsPanel form={form} userChapter={userChapter} isSuperAdmin={isSuperAdmin} />
        )}
      </div>
    </div>
  );
}

export default function FormsLibrary({ user, isSuperAdmin }) {
  const [selectedId, setSelectedId] = useState(null);
  const userChapter = user?.chapter || '';
  const selected = useMemo(() => (selectedId ? getFormById(selectedId) : null), [selectedId]);

  if (selected) {
    return (
      <div className="resource-view">
        <FormDetail
          form={selected}
          userChapter={userChapter}
          isSuperAdmin={isSuperAdmin}
          onBack={() => setSelectedId(null)}
        />
      </div>
    );
  }

  return (
    <div className="resource-view">
      <section className="forms-library__heading">
        <p className="forms-library__eyebrow">Director Tools</p>
        <h2 className="forms-library__title">Forms Library</h2>
        <p className="forms-library__lede">
          Send a form to a Limited Partner or microgrant winner with one click.
          Submissions land here automatically — and a copy emails to your chapter inbox.
        </p>
        <div className="resource-grid">
          {FORMS.map((form) => (
            <FormCard key={form.id} form={form} onSelect={setSelectedId} />
          ))}
        </div>
      </section>
    </div>
  );
}
