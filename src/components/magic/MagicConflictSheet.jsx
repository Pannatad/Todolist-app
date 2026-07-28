import { useMemo, useState } from 'react';
import { ArrowRight, Bot, Check, ShieldAlert } from 'lucide-react';
import { Sheet } from '../../ui';
import {
    autoFitTemplateItems,
    removeConflictingProposals
} from '../../services/magicSchedule';

const formatTime = (value) => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const PREVIEW_START_MINUTES = 6 * 60;
const PREVIEW_END_MINUTES = 22 * 60;
const PREVIEW_RANGE = PREVIEW_END_MINUTES - PREVIEW_START_MINUTES;
const proposalGeometry = (proposal) => {
    const start = new Date(proposal.startTime);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const duration = Number(proposal.duration || 60);
    const visibleStart = Math.max(PREVIEW_START_MINUTES, startMinutes);
    const visibleEnd = Math.min(PREVIEW_END_MINUTES, startMinutes + duration);
    if (Number.isNaN(start.getTime()) || visibleEnd <= visibleStart) return null;
    return {
        left: ((visibleStart - PREVIEW_START_MINUTES) / PREVIEW_RANGE) * 100,
        width: ((visibleEnd - visibleStart) / PREVIEW_RANGE) * 100,
        end: new Date(start.getTime() + duration * 60000)
    };
};

const FinalTimelinePreview = ({ proposals, label, warning }) => (
    <section className="magic-final-timeline" aria-label={`${label} timeline preview`}>
        <div className="magic-final-timeline__heading">
            <div>
                <strong>Final template placement</strong>
                <span>{label}</span>
            </div>
            <span>{proposals.length} block{proposals.length === 1 ? '' : 's'}</span>
        </div>
        {warning && <div className="magic-final-timeline__warning"><ShieldAlert size={15} /> {warning}</div>}
        <div className="magic-final-timeline__scale" aria-hidden="true">
            {[6, 10, 14, 18, 22].map((hour) => <span key={hour}>{String(hour).padStart(2, '0')}:00</span>)}
        </div>
        <div className="magic-final-timeline__rows">
            {proposals.slice(0, 10).map((proposal) => {
                const geometry = proposalGeometry(proposal);
                if (!geometry) return null;
                return (
                    <div key={proposal.clientKey} className="magic-final-timeline__row">
                        <div className="magic-final-timeline__name">
                            <span style={{ backgroundColor: proposal.color || '#6366f1' }} />
                            <strong>{proposal.title}</strong>
                        </div>
                        <div className="magic-final-timeline__track">
                            <span
                                className="magic-final-timeline__block"
                                style={{
                                    left: `${geometry.left}%`,
                                    width: `${Math.max(geometry.width, 1.5)}%`,
                                    '--preview-color': proposal.color || '#6366f1'
                                }}
                                title={`${formatTime(proposal.startTime)} – ${formatTime(geometry.end)}`}
                            >
                                {geometry.width >= 12 && <strong>{formatTime(proposal.startTime)}</strong>}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
        {proposals.length > 10 && <span className="magic-final-timeline__more">+{proposals.length - 10} more linked blocks</span>}
        {!proposals.length && <div className="magic-final-timeline__empty">No template blocks will be added with this choice.</div>}
    </section>
);

const MagicConflictSheet = ({
    open,
    onClose,
    template,
    proposals = [],
    conflicts = [],
    autoFitProposals = [],
    autoFitConflicts = [],
    onConfirm,
    onCustomMerge,
    busy
}) => {
    const [resolution, setResolution] = useState('skip');
    const [customRequest, setCustomRequest] = useState('');
    const hasTaskConflict = conflicts.some((conflict) => conflict.existing.source === 'task');
    const finalProposals = useMemo(() => {
        if (!conflicts.length || resolution === 'replace') return proposals;
        if (resolution === 'skip') return removeConflictingProposals(proposals, conflicts);
        if (resolution === 'auto_fit') {
            return autoFitProposals.length
                ? autoFitProposals
                : autoFitTemplateItems(proposals, conflicts);
        }
        return proposals;
    }, [autoFitProposals, conflicts, proposals, resolution]);
    const resolutionLabel = {
        skip: 'Keep existing · overlapping template blocks are removed',
        replace: 'Replace schedule conflicts · template times stay fixed',
        auto_fit: 'Auto-fit · moved to the next available time',
        custom: 'Custom merge · the assistant will prepare another preview'
    }[resolution];
    const autoFitBlocked = resolution === 'auto_fit' && autoFitConflicts.length > 0;
    const conflictSummary = useMemo(() => (
        conflicts.reduce((summary, conflict) => {
            summary[conflict.dateKey] = (summary[conflict.dateKey] || 0) + 1;
            return summary;
        }, {})
    ), [conflicts]);

    const resetReview = () => {
        setResolution('skip');
        setCustomRequest('');
    };

    const closeReview = () => {
        resetReview();
        onClose();
    };

    const confirmReview = () => {
        const selectedResolution = resolution;
        const request = customRequest;
        resetReview();
        if (selectedResolution === 'custom') {
            onCustomMerge(request);
            return;
        }
        onConfirm(selectedResolution);
    };

    return (
        <Sheet
            open={open}
            onClose={closeReview}
            title={conflicts.length ? 'Review schedule conflicts' : 'Review template application'}
            description={`“${template?.name || 'Template'}” will add ${proposals.length} schedule block${proposals.length === 1 ? '' : 's'}.`}
            className="magic-conflict-sheet"
        >
            <div className="magic-review">
                <div className="magic-review__summary">
                    <span><Check size={16} /> One confirmed, undoable change</span>
                    {conflicts.length > 0 && <span className="is-warning"><ShieldAlert size={16} /> {conflicts.length} overlap{conflicts.length === 1 ? '' : 's'}</span>}
                </div>

                {conflicts.length > 0 && (
                    <>
                        <div className="magic-conflict-list">
                            {conflicts.slice(0, 8).map((conflict) => (
                                <div key={conflict.id}>
                                    <span>{conflict.dateKey}</span>
                                    <strong>{conflict.proposed.item.title} · {formatTime(conflict.proposed.start)}</strong>
                                    <ArrowRight size={13} />
                                    <span>{conflict.existing.item.title} · {formatTime(conflict.existing.item.displayTime || conflict.existing.item.startTime || conflict.existing.item.start_time || conflict.existing.item.deadline)}</span>
                                </div>
                            ))}
                        </div>
                        <fieldset className="magic-resolution-options">
                            <legend>How should conflicts be handled?</legend>
                            <label>
                                <input type="radio" name="resolution" value="skip" checked={resolution === 'skip'} onChange={(event) => setResolution(event.target.value)} />
                                <span><strong>Keep existing</strong><small>Skip only the proposed blocks that overlap.</small></span>
                            </label>
                            <label className={hasTaskConflict ? 'is-disabled' : ''}>
                                <input type="radio" name="resolution" value="replace" disabled={hasTaskConflict} checked={resolution === 'replace'} onChange={(event) => setResolution(event.target.value)} />
                                <span><strong>Replace schedule conflicts</strong><small>{hasTaskConflict ? 'Timed tasks are protected and cannot be replaced here.' : 'Remove the conflicting schedule events.'}</small></span>
                            </label>
                            <label>
                                <input type="radio" name="resolution" value="auto_fit" checked={resolution === 'auto_fit'} onChange={(event) => setResolution(event.target.value)} />
                                <span><strong>AI auto-fit</strong><small>Move proposed blocks to the next available time.</small></span>
                            </label>
                            <label>
                                <input type="radio" name="resolution" value="custom" checked={resolution === 'custom'} onChange={(event) => setResolution(event.target.value)} />
                                <span><strong>Describe a custom merge</strong><small>Send your rule to the schedule assistant.</small></span>
                            </label>
                        </fieldset>
                    </>
                )}

                {resolution === 'custom' && conflicts.length > 0 && (
                    <div className="magic-custom-merge">
                        <Bot size={17} />
                        <textarea
                            value={customRequest}
                            onChange={(event) => setCustomRequest(event.target.value)}
                            placeholder="Example: keep my workout, shorten deep work to 90 minutes, and fit lunch after it."
                            rows={3}
                        />
                    </div>
                )}

                {resolution !== 'custom' && (
                    <FinalTimelinePreview
                        proposals={finalProposals}
                        label={resolutionLabel}
                        warning={autoFitBlocked
                            ? `${autoFitConflicts.length} conflict${autoFitConflicts.length === 1 ? '' : 's'} could not be fitted safely. Choose another option.`
                            : ''}
                    />
                )}
                {resolution === 'custom' && (
                    <div className="magic-final-timeline__empty">
                        Your merge instruction will go to the schedule assistant. It must return a new change preview before anything is applied.
                    </div>
                )}

                <div className="magic-review__footer">
                    {Object.keys(conflictSummary).length > 0 && <span>{Object.keys(conflictSummary).length} affected day{Object.keys(conflictSummary).length === 1 ? '' : 's'}</span>}
                    <button type="button" className="magic-secondary-button" onClick={closeReview}>Cancel</button>
                    <button
                        type="button"
                        className="magic-primary-button"
                        disabled={busy || autoFitBlocked || (resolution === 'custom' && !customRequest.trim())}
                        onClick={confirmReview}
                    >
                        {busy ? 'Applying…' : conflicts.length ? 'Resolve & apply' : 'Confirm application'}
                    </button>
                </div>
            </div>
        </Sheet>
    );
};

export default MagicConflictSheet;
