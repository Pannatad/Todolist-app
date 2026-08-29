import { useEffect, useState } from 'react';
import { ExternalLink, Globe2, Link2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Sheet } from '../../ui';
import { toast } from '../../ui/Toast';
import { confirmAction } from '../../utils/confirm';
import { useLinks } from '../../context/LinksContext';
import { getLinkDraftError, getLinkHostname } from './linkUtils';

const emptyDraft = () => ({
  title: '',
  url: '',
  category: '',
  description: '',
});

const LinkEditorSheet = ({ link, isOpen, onClose }) => {
  const { addLink, updateLink, deleteLink } = useLinks();
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(link ? {
      title: link.title,
      url: link.url,
      category: link.category,
      description: link.description,
    } : emptyDraft());
    setError('');
  }, [link, isOpen]);

  const setField = (key, value) => {
    setError('');
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const validationError = getLinkDraftError(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      if (link) await updateLink(link.id, draft);
      else await addLink(draft);
      onClose();
    } catch (saveError) {
      const message = saveError?.message || 'Could not save this link.';
      setError(message);
      toast(message, { tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!link || !confirmAction(`Delete “${link.title}”? This cannot be undone.`)) return;
    setIsSaving(true);
    try {
      await deleteLink(link.id);
      onClose();
    } catch (deleteError) {
      const message = deleteError?.message || 'Could not delete this link.';
      setError(message);
      toast(message, { tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title={link ? 'Edit link' : 'Add link'}
      description="Keep a university site, tool, or reference one click away."
      className="uni-board-link-sheet"
    >
      <form className="uni-board-sheet-form" onSubmit={submit}>
        {error && <p className="uni-board-inline-error" role="alert">{error}</p>}
        <label>
          <span>Name</span>
          <input className="uni-board-input" autoFocus value={draft.title} onChange={(event) => setField('title', event.target.value)} placeholder="Course portal" required />
        </label>
        <label>
          <span>Website URL</span>
          <input className="uni-board-input" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" value={draft.url} onChange={(event) => setField('url', event.target.value)} placeholder="portal.example.edu" required />
        </label>
        <div className="uni-board-form-grid">
          <label>
            <span>Category</span>
            <input className="uni-board-input" value={draft.category} onChange={(event) => setField('category', event.target.value)} placeholder="Coursework" />
          </label>
          <div className="uni-board-link-sheet__hint" aria-live="polite">
            <Globe2 size={16} aria-hidden="true" />
            <span>{getLinkHostname(draft.url) || 'The website will open in a new tab.'}</span>
          </div>
        </div>
        <label>
          <span>Note <em>(optional)</em></span>
          <textarea className="uni-board-input uni-board-textarea" rows="4" value={draft.description} onChange={(event) => setField('description', event.target.value)} placeholder="What this link is for" />
        </label>
        <div className="uni-board-sheet-actions">
          <button type="submit" className="uni-board-primary-button" disabled={isSaving}>
            <Link2 size={16} aria-hidden="true" />
            <span>{isSaving ? 'Saving…' : link ? 'Save changes' : 'Add link'}</span>
          </button>
          {link && <button type="button" className="uni-board-danger-button" onClick={remove} disabled={isSaving}><Trash2 size={16} aria-hidden="true" /> Delete</button>}
        </div>
      </form>
    </Sheet>
  );
};

const Links = () => {
  const { links, isLoading, loadError, refreshLinks } = useLinks();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);

  const openNewLink = () => {
    setEditingLink(null);
    setIsEditorOpen(true);
  };

  const openEditLink = (link) => {
    setEditingLink(link);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingLink(null);
  };

  const retry = async () => {
    try {
      await refreshLinks();
    } catch (error) {
      toast(error?.message || 'Could not refresh links.', { tone: 'error' });
    }
  };

  return (
    <>
      <section className="uni-board-section uni-board-links" aria-labelledby="uni-board-links-title">
        <div className="uni-board-section-heading uni-board-links__heading">
          <div>
            <p className="uni-board-kicker">Quick access</p>
            <h2 id="uni-board-links-title">Links</h2>
          </div>
          <div className="uni-board-links__heading-actions">
            <span className="uni-board-count" aria-label={`${links.length} saved links`}>{links.length}</span>
            <Link2 size={19} aria-hidden="true" className="uni-board-section-icon" />
            <button type="button" className="uni-board-primary-button uni-board-links__add" onClick={openNewLink}>
              <Plus size={16} aria-hidden="true" />
              <span>Add link</span>
            </button>
          </div>
        </div>

        {loadError && (
          <div className="uni-board-links__error" role="alert">
            <span>Links could not be loaded.</span>
            <button type="button" onClick={retry}><RefreshCw size={15} aria-hidden="true" /> Retry</button>
          </div>
        )}

        {isLoading ? <div className="uni-board-skeleton-list" aria-label="Loading links">{[1, 2].map((row) => <span key={row} className="uni-board-skeleton-row" />)}</div> : links.length > 0 ? (
          <div className="uni-board-link-list">
            {links.map((link) => (
              <article key={link.id} className="uni-board-link-row">
                <a className="uni-board-link-row__open" href={link.url} target="_blank" rel="noreferrer">
                  <span className="uni-board-link-row__marker" aria-hidden="true"><Globe2 size={17} /></span>
                  <span className="uni-board-item-copy">
                    <strong>{link.title}</strong>
                    <span>{link.category ? `${link.category} · ` : ''}{getLinkHostname(link.url)}</span>
                    {link.description && <small>{link.description}</small>}
                  </span>
                  <ExternalLink size={17} aria-hidden="true" className="uni-board-link-row__external" />
                </a>
                <button type="button" className="uni-board-link-row__edit" onClick={() => openEditLink(link)} aria-label={`Edit ${link.title}`}>
                  <Pencil size={16} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="uni-board-links__empty">
            <p>No saved links yet.</p>
            <span>Add the portals and references you use most for university.</span>
          </div>
        )}
      </section>

      <LinkEditorSheet link={editingLink} isOpen={isEditorOpen} onClose={closeEditor} />
    </>
  );
};

export default Links;
