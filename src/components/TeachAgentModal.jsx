import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Sheet } from '../ui';
import { useUserIntelligence } from '../context/UserIntelligenceContext';

const CATEGORY_CONFIG = {
    fact: {
        label: 'About Me',
        placeholder: 'I study computer science'
    },
    preference: {
        label: 'Preferences',
        placeholder: 'I work best in the morning'
    },
    pattern: {
        label: 'Patterns',
        placeholder: 'I exercise on weekdays'
    },
    reminder: {
        label: 'Reminders',
        placeholder: 'Remind me to take breaks'
    }
};

const TeachAgentModal = ({ isOpen, onClose }) => {
    const { intelligence, learnFact, updateIntelligence, deleteIntelligence, isLoading } = useUserIntelligence();

    const [newContent, setNewContent] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('fact');
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Group intelligence by category
    const groupedIntelligence = {
        fact: intelligence.filter(i => i.category === 'fact'),
        preference: intelligence.filter(i => i.category === 'preference'),
        pattern: intelligence.filter(i => i.category === 'pattern'),
        reminder: intelligence.filter(i => i.category === 'reminder')
    };

    const handleAdd = async () => {
        if (!newContent.trim()) return;

        setIsAdding(true);
        try {
            await learnFact(newContent.trim(), selectedCategory, 'explicit', 1.0);
            setNewContent('');
        } catch (error) {
            console.error('Error adding:', error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleStartEdit = (item) => {
        setEditingId(item.id);
        setEditContent(item.content);
    };

    const handleSaveEdit = async (id) => {
        if (!editContent.trim()) return;
        await updateIntelligence(id, { content: editContent.trim() });
        setEditingId(null);
        setEditContent('');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditContent('');
    };

    const handleDelete = async (id) => {
        await deleteIntelligence(id);
    };

    return (
        <Sheet open={isOpen} onClose={onClose} title="Teach the Agent" className="form-sheet">
            <div className="form-stack">
                <div className="form-group">
                    <div className="form-chips" role="group" aria-label="Kind">
                        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={selectedCategory === key}
                                onClick={() => setSelectedCategory(key)}
                                className={`form-chip${selectedCategory === key ? ' is-selected' : ''}`}
                            >
                                {config.label}
                            </button>
                        ))}
                    </div>
                    <div className="form-field">
                        <input
                            type="text"
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            placeholder={CATEGORY_CONFIG[selectedCategory].placeholder}
                            aria-label="Something to remember"
                        />
                        <button
                            type="button"
                            onClick={handleAdd}
                            disabled={!newContent.trim() || isAdding}
                            className="ui-text-button teach-agent__add"
                        >
                            Add
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <p className="form-note">Loading…</p>
                ) : intelligence.length === 0 ? (
                    <p className="form-note">Nothing yet. Add something above, or just chat with your agent.</p>
                ) : (
                    Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
                        const items = groupedIntelligence[category];
                        if (items.length === 0) return null;
                        return (
                            <React.Fragment key={category}>
                                <p className="form-section-label">{config.label}</p>
                                <div className="form-group">
                                    {items.map((item) => (
                                        <div key={item.id} className="form-field teach-agent__item">
                                            {editingId === item.id ? (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveEdit(item.id);
                                                            if (e.key === 'Escape') handleCancelEdit();
                                                        }}
                                                        aria-label="Edit memory"
                                                        autoFocus
                                                    />
                                                    <button type="button" className="ui-text-button teach-agent__add" onClick={() => handleSaveEdit(item.id)}>
                                                        Done
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button type="button" className="teach-agent__copy" onClick={() => handleStartEdit(item)}>
                                                        <span>{item.content}</span>
                                                        {item.source === 'inferred' && <small>Learned from chat</small>}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(item.id)}
                                                        className="form-remove"
                                                        aria-label={`Forget ${item.content}`}
                                                    >
                                                        <X size={13} strokeWidth={2.6} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </React.Fragment>
                        );
                    })
                )}
            </div>
        </Sheet>
    );
};

export default TeachAgentModal;
