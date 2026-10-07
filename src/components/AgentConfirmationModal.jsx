import React, { useState, useEffect } from 'react';
import { Loader2, ListTodo, Calendar, Target, Navigation, BarChart3, MessageCircle, Info } from 'lucide-react';
import { Sheet } from '../ui';
import RichTextRenderer from './RichTextRenderer';

// Icon mapping for different action types
const ACTION_ICONS = {
    add_task: ListTodo,
    add_schedule: Calendar,
    set_goal: Target,
    navigate: Navigation,
    analyze: BarChart3,
    info_response: Info,
    clarify: MessageCircle,
};

const AgentConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    onClarifyResponse,
    onEditPrompt,
    onNavigate,
    actionPlan,
    isExecuting = false,
    originalPrompt = ''
}) => {
    const [clarifyInput, setClarifyInput] = useState('');
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [editedPrompt, setEditedPrompt] = useState('');

    // Initialize edited prompt when modal opens
    useEffect(() => {
        if (isOpen && originalPrompt) {
            // Keep the draft in sync with the opening action without changing the modal flow.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setEditedPrompt(originalPrompt);
            setIsEditingPrompt(false);
        }
    }, [isOpen, originalPrompt]);

    const { actions = [], summary = '' } = actionPlan || {};

    // Check special modes
    const clarifyAction = actions.find(a => a.type === 'clarify');
    const isClarifyMode = !!clarifyAction;

    const infoAction = actions.find(a => a.type === 'info_response');
    const isInfoMode = !!infoAction && actions.length === 1;

    const handleClarifySubmit = () => {
        if (!clarifyInput.trim() || !onClarifyResponse) return;
        onClarifyResponse(clarifyInput.trim());
        setClarifyInput('');
    };

    const handleSuggestionClick = (suggestion) => {
        if (!onClarifyResponse) return;
        onClarifyResponse(suggestion);
    };

    const handleEditPromptSubmit = () => {
        if (!editedPrompt.trim() || !onEditPrompt) return;
        onEditPrompt(editedPrompt.trim());
        setIsEditingPrompt(false);
    };

    const handleNavigateToTab = (tabName) => {
        if (onNavigate) {
            onNavigate(tabName);
        }
        onClose();
    };

    const title = isClarifyMode
        ? 'One Question'
        : isInfoMode
            ? 'Answer'
            : isEditingPrompt
                ? 'Edit Request'
                : 'Confirm';
    const tabLabel = infoAction?.params?.suggestedTab
        ? infoAction.params.suggestedTab.charAt(0).toUpperCase() + infoAction.params.suggestedTab.slice(1)
        : '';

    return (
        <Sheet
            open={isOpen && Boolean(actionPlan)}
            onClose={() => { if (!isExecuting) onClose(); }}
            title={title}
            description={!isEditingPrompt && !isInfoMode && summary ? summary : undefined}
            className="form-sheet agent-plan-sheet"
        >
            <div className="form-stack">
                {isEditingPrompt ? (
                    <>
                        <div className="form-group">
                            <label className="form-field form-field--stacked">
                                <span className="sr-only">Request</span>
                                <textarea
                                    value={editedPrompt}
                                    onChange={(e) => setEditedPrompt(e.target.value)}
                                    rows={4}
                                    placeholder="Request"
                                    autoFocus
                                />
                            </label>
                        </div>
                        <button
                            type="button"
                            onClick={handleEditPromptSubmit}
                            disabled={!editedPrompt.trim()}
                            className="ui-button ui-button--accent form-submit"
                        >
                            Send
                        </button>
                        <button type="button" className="ui-text-button agent-plan__secondary" onClick={() => setIsEditingPrompt(false)}>
                            Cancel
                        </button>
                    </>
                ) : isClarifyMode ? (
                    <>
                        <p className="agent-plan__question">
                            {clarifyAction.params?.question || 'Could you add a little more detail?'}
                        </p>
                        {clarifyAction.params?.suggestions?.length > 0 && (
                            <div className="form-group">
                                {clarifyAction.params.suggestions.map((suggestion, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="form-field form-option"
                                    >
                                        <span className="form-goal">{suggestion}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="form-group">
                            <div className="form-field">
                                <input
                                    type="text"
                                    value={clarifyInput}
                                    onChange={(e) => setClarifyInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleClarifySubmit()}
                                    placeholder="Reply"
                                    aria-label="Reply"
                                />
                                <button
                                    type="button"
                                    onClick={handleClarifySubmit}
                                    disabled={!clarifyInput.trim()}
                                    className="ui-text-button agent-plan__send"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </>
                ) : isInfoMode ? (
                    <>
                        <div className="agent-plan__answer">
                            <RichTextRenderer text={infoAction.params?.message || 'Nothing to show yet.'} />
                        </div>
                        {tabLabel && (
                            <div className="form-group">
                                <button
                                    type="button"
                                    onClick={() => handleNavigateToTab(infoAction.params.suggestedTab)}
                                    className="form-field form-option form-option--tinted"
                                >
                                    Open {tabLabel}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="form-group">
                            {actions.map((action, index) => {
                                const Icon = ACTION_ICONS[action.type] || ListTodo;
                                const detail = action.params?.title || action.params?.tabName || action.params?.goalText || action.params?.message;
                                return (
                                    <div key={index} className="form-field agent-plan__action">
                                        <span className="agent-plan__icon" aria-hidden="true"><Icon size={16} /></span>
                                        <span className="agent-plan__copy">
                                            <span>{action.explanation || action.type}</span>
                                            {detail && <small>{detail}</small>}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={() => onConfirm()}
                            disabled={isExecuting}
                            className="ui-button ui-button--accent form-submit"
                        >
                            {isExecuting ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Working…</> : 'Confirm'}
                        </button>
                        {onEditPrompt && (
                            <button
                                type="button"
                                className="ui-text-button agent-plan__secondary"
                                disabled={isExecuting}
                                onClick={() => setIsEditingPrompt(true)}
                            >
                                Edit Request
                            </button>
                        )}
                    </>
                )}
            </div>
        </Sheet>
    );
};

export default AgentConfirmationModal;
