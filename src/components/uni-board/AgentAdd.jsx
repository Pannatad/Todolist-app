import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Check, Sparkles, X } from 'lucide-react';
import { BarButton, Sheet } from '../../ui';
import { toast } from '../../ui/Toast';
import { isScheduleKind } from './constants';
import { formatAgendaDate, formatTime } from './formatters';
import { KindTag } from './SectionHeading';
import { askUniAgent, draftToItemInput, getDraftProblems, getMissingQuestion } from './uniAgent';

const MAX_HISTORY = 12;
const EXAMPLE = 'e.g. Linear Algebra midterm Nov 12, 9 to 11am, room B201';

const draftWhen = (draft) => {
  if (!draft.date) return null;
  const date = new Date(`${draft.date}T${draft.time || '00:00'}`);
  const parts = [formatAgendaDate(date)];
  if (draft.time) parts.push(formatTime(date));
  if (isScheduleKind(draft.kind) && draft.duration) {
    const hours = draft.duration / 60;
    parts.push(draft.duration % 60 === 0 ? `${hours} hr` : `${draft.duration} min`);
  }
  return parts.join(' · ');
};

const problemText = (problems) => {
  if (problems.includes('date') && problems.includes('time')) return 'Needs a date and time';
  if (problems.includes('date')) return 'Needs a date';
  if (problems.includes('time')) return 'Needs a time';
  return 'Needs a title';
};

const DraftCard = ({ draft, onRemove }) => {
  const problems = getDraftProblems(draft);
  const when = draftWhen(draft);
  return (
    <li className={`uni-agent-draft${problems.length ? ' has-problem' : ''}`}>
      <span className="uni-board-item-copy">
        <strong>{draft.title}</strong>
        <span className="uni-board-item-meta">
          <KindTag kind={draft.kind} />
          <span className="uni-board-item-meta__text">{draft.subject || 'University'}</span>
        </span>
        <span className="uni-agent-draft__when">{when || (isScheduleKind(draft.kind) ? '' : 'No due date')}</span>
        {problems.length > 0 && <span className="uni-agent-draft__problem">{problemText(problems)}</span>}
        {draft.notes && <small>{draft.notes}</small>}
      </span>
      <button type="button" className="uni-agent-draft__remove" onClick={() => onRemove(draft.id)} aria-label={`Remove ${draft.title}`}>
        <X size={16} aria-hidden="true" />
      </button>
    </li>
  );
};

const AgentAdd = ({ addTask, addScheduleItem, subjects = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [turns, setTurns] = useState([]);
  const [history, setHistory] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const endRef = useRef(null);

  const problemCount = drafts.filter((draft) => getDraftProblems(draft).length > 0).length;
  const canApprove = drafts.length > 0 && problemCount === 0 && !isThinking && !isSaving;

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
  }, [turns, drafts, isThinking]);

  const reset = () => {
    setTurns([]);
    setHistory([]);
    setDrafts([]);
    setInput('');
    setError('');
  };

  const close = () => {
    if (isSaving) return;
    setIsOpen(false);
  };

  const send = async (event) => {
    event?.preventDefault();
    const message = input.trim();
    if (!message || isThinking || isSaving) return;

    setError('');
    setInput('');
    setTurns((current) => [...current, { role: 'user', text: message }]);
    setIsThinking(true);
    try {
      const result = await askUniAgent({ message, drafts, history, subjects });
      setDrafts(result.items);
      const question = getMissingQuestion(result.items);
      const reply = question && !result.reply.includes('?') ? `${result.reply} ${question}` : result.reply;
      setTurns((current) => [...current, { role: 'agent', text: reply }]);
      setHistory((current) => [
        ...current,
        { role: 'user', parts: [{ text: result.userText }] },
        { role: 'model', parts: [{ text: result.raw }] },
      ].slice(-MAX_HISTORY));
    } catch (sendError) {
      setTurns((current) => current.slice(0, -1));
      setInput(message);
      setError(sendError?.message || 'The agent could not answer. Try again.');
    } finally {
      setIsThinking(false);
      inputRef.current?.focus();
    }
  };

  const removeDraft = (id) => setDrafts((current) => current.filter((draft) => draft.id !== id));

  const approve = async () => {
    if (!canApprove) return;
    setIsSaving(true);
    setError('');
    const failed = [];
    for (const draft of drafts) {
      try {
        const item = draftToItemInput(draft);
        const result = item.source === 'schedule' ? await addScheduleItem(item.payload) : await addTask(item.payload);
        if (!result) throw new Error('Not saved');
      } catch {
        failed.push(draft);
      }
    }
    setIsSaving(false);

    const savedCount = drafts.length - failed.length;
    if (failed.length) {
      setDrafts(failed);
      setError(`${failed.length} ${failed.length === 1 ? 'entry' : 'entries'} could not be saved. Try again.`);
      if (savedCount) toast(`Added ${savedCount} ${savedCount === 1 ? 'entry' : 'entries'}.`);
      return;
    }
    toast(`Added ${savedCount} ${savedCount === 1 ? 'entry' : 'entries'}.`);
    reset();
    setIsOpen(false);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) send(event);
  };

  return (
    <>
      <BarButton icon={Sparkles} label="Add with agent" onClick={() => setIsOpen(true)} />

      <Sheet
        open={isOpen}
        onClose={close}
        title="Add with agent"
        className="uni-agent-sheet"
        actions={turns.length > 0 ? (
          <button type="button" className="ui-text-button" onClick={reset} disabled={isThinking || isSaving}>Start over</button>
        ) : null}
      >
        <div className="uni-agent">
          {turns.length === 0 && (
            <p className="uni-agent__intro">Tell me what to add. I&rsquo;ll draft the entries, you check them, and nothing is saved until you approve.</p>
          )}

          <div className="uni-agent__thread" aria-live="polite">
            {turns.map((turn, index) => (
              <p key={index} className={`uni-agent__bubble is-${turn.role}`}>{turn.text}</p>
            ))}
            {isThinking && <p className="uni-agent__bubble is-agent is-thinking">Drafting…</p>}
          </div>

          {drafts.length > 0 && (
            <section className="uni-agent__drafts" aria-label="Draft entries">
              <div className="uni-agent__drafts-head">
                <span>{drafts.length === 1 ? '1 entry to add' : `${drafts.length} entries to add`}</span>
                {problemCount > 0 && <span className="uni-agent__drafts-warning">Fix {problemCount} before adding</span>}
              </div>
              <ul className="ui-group uni-agent__draft-list">
                {drafts.map((draft) => <DraftCard key={draft.id} draft={draft} onRemove={removeDraft} />)}
              </ul>
            </section>
          )}

          {error && <p className="uni-board-inline-error" role="alert">{error}</p>}
          <div ref={endRef} />

          <div className="uni-agent__footer">
            {drafts.length > 0 && (
              <button type="button" className="uni-board-primary-button uni-agent__approve" onClick={approve} disabled={!canApprove}>
                <Check size={17} aria-hidden="true" />
                <span>{isSaving ? 'Adding…' : `Looks good, add ${drafts.length === 1 ? 'it' : `all ${drafts.length}`}`}</span>
              </button>
            )}
            <form className="uni-agent__composer" onSubmit={send}>
              <label className="uni-board-visually-hidden" htmlFor="uni-agent-input">Message the agent</label>
              <textarea
                id="uni-agent-input"
                ref={inputRef}
                className="uni-board-input uni-agent__input"
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder={drafts.length ? 'Tell me what to fix' : EXAMPLE}
                disabled={isSaving}
              />
              <button type="submit" className="uni-agent__send" disabled={!input.trim() || isThinking || isSaving} aria-label="Send">
                <ArrowUp size={18} strokeWidth={2.6} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </Sheet>
    </>
  );
};

export default AgentAdd;
