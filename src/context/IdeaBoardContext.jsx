import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const IdeaBoardContext = createContext();

const STORAGE_KEY = 'demon-idea-board-v1';
export const IDEA_COLOR_OPTIONS = ['slate', 'sky', 'teal', 'emerald', 'amber', 'orange', 'rose', 'pink', 'violet', 'cyan'];

const createIdeaNode = (overrides = {}) => ({
    id: crypto.randomUUID(),
    title: 'Untitled idea',
    details: '',
    parentId: null,
    color: 'slate',
    completed: false,
    focused: false,
    x: 40,
    y: 48,
    createdAt: new Date().toISOString(),
    ...overrides
});

const createDefaultBoard = () => ({
    id: null,
    user_id: null,
    nodes: [
        createIdeaNode({
            title: 'Interesting article',
            details: 'Capture the main point, then branch into follow-up thoughts.',
            color: 'amber',
            x: 48,
            y: 72
        }),
        createIdeaNode({
            title: 'Try a small experiment',
            details: 'Turn one idea into a tiny action you can test this week.',
            parentId: null,
            color: 'teal',
            x: 332,
            y: 72
        }),
        createIdeaNode({
            title: 'Possible next step',
            details: 'Use subideas to break the thought into examples, questions, or plans.',
            parentId: null,
            color: 'violet',
            x: 332,
            y: 276
        })
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
});

const normalizeIdeaNode = (node, index = 0) => ({
    id: node?.id || crypto.randomUUID(),
    title: typeof node?.title === 'string' && node.title.trim() ? node.title : 'Untitled idea',
    details: typeof node?.details === 'string' ? node.details : '',
    parentId: node?.parentId || null,
    color: IDEA_COLOR_OPTIONS.includes(node?.color) ? node.color : 'slate',
    completed: node?.completed === true,
    focused: node?.focused === true,
    x: Number.isFinite(node?.x) ? node.x : 40 + (index % 3) * 284,
    y: Number.isFinite(node?.y) ? node.y : 56 + Math.floor(index / 3) * 196,
    createdAt: node?.createdAt || new Date().toISOString()
});

const normalizeBoardRecord = (record) => {
    const fallback = createDefaultBoard();
    const rawNodes = Array.isArray(record?.nodes) ? record.nodes : fallback.nodes;

    return {
        id: record?.id || null,
        user_id: record?.user_id || null,
        nodes: rawNodes.map((node, index) => normalizeIdeaNode(node, index)),
        created_at: record?.created_at || fallback.created_at,
        updated_at: record?.updated_at || new Date().toISOString()
    };
};

const readLocalBoard = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            return createDefaultBoard();
        }

        return normalizeBoardRecord(JSON.parse(saved));
    } catch (error) {
        console.error('Failed to read idea board from local storage:', error);
        return createDefaultBoard();
    }
};

const collectDescendantIds = (nodes, rootId) => {
    const ids = new Set([rootId]);
    let foundMore = true;

    while (foundMore) {
        foundMore = false;
        nodes.forEach((node) => {
            if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
                ids.add(node.id);
                foundMore = true;
            }
        });
    }

    return ids;
};

export const useIdeaBoard = () => useContext(IdeaBoardContext);

export const IdeaBoardProvider = ({ children }) => {
    const { user } = useAuth();
    const [board, setBoard] = useState(() => readLocalBoard());
    const [loading, setLoading] = useState(false);
    const saveCounterRef = useRef(0);

    const persistLocalBoard = useCallback((nextBoard) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBoard));
        } catch (error) {
            console.error('Failed to save idea board locally:', error);
        }
    }, []);

    const persistBoardToSupabase = useCallback(async (nextBoard) => {
        if (!user || !supabase) {
            return nextBoard;
        }

        const requestId = ++saveCounterRef.current;
        const payload = {
            user_id: user.id,
            nodes: nextBoard.nodes,
            updated_at: nextBoard.updated_at
        };

        if (nextBoard.id) {
            payload.id = nextBoard.id;
        }

        const { data, error } = await supabase
            .from('idea_boards')
            .upsert(payload, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) {
            console.error('Error saving idea board to Supabase:', error);
            return nextBoard;
        }

        const normalized = normalizeBoardRecord(data);
        if (requestId === saveCounterRef.current) {
            setBoard(normalized);
            persistLocalBoard(normalized);
        }

        return normalized;
    }, [persistLocalBoard, user]);

    useEffect(() => {
        persistLocalBoard(board);
    }, [board, persistLocalBoard]);

    useEffect(() => {
        let cancelled = false;

        const loadBoard = async () => {
            if (!user || !supabase) {
                setBoard(readLocalBoard());
                setLoading(false);
                return;
            }

            setLoading(true);

            const guestBoard = readLocalBoard();
            const { data, error } = await supabase
                .from('idea_boards')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (cancelled) {
                return;
            }

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading idea board:', error);
                setBoard(guestBoard);
                setLoading(false);
                return;
            }

            if (data) {
                setBoard(normalizeBoardRecord(data));
                setLoading(false);
                return;
            }

            const starterBoard = normalizeBoardRecord({
                ...guestBoard,
                id: null,
                user_id: user.id
            });

            setBoard(starterBoard);
            setLoading(false);

            if (guestBoard.nodes.length > 0) {
                await persistBoardToSupabase(starterBoard);
            }
        };

        loadBoard();

        return () => {
            cancelled = true;
        };
    }, [persistBoardToSupabase, user]);

    useEffect(() => {
        if (!user || !supabase) {
            return undefined;
        }

        const channel = supabase
            .channel(`idea-board-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'idea_boards',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    if (payload.eventType === 'DELETE') {
                        const fallback = createDefaultBoard();
                        setBoard(fallback);
                        persistLocalBoard(fallback);
                        return;
                    }

                    if (payload.new) {
                        const nextBoard = normalizeBoardRecord(payload.new);
                        setBoard(nextBoard);
                        persistLocalBoard(nextBoard);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [persistLocalBoard, user]);

    const applyBoardChange = useCallback(async (updater) => {
        let nextBoard;

        setBoard((previousBoard) => {
            const draft = normalizeBoardRecord(previousBoard);
            const updatedBoard = typeof updater === 'function' ? updater(draft) : updater;
            nextBoard = normalizeBoardRecord({
                ...updatedBoard,
                updated_at: new Date().toISOString()
            });
            return nextBoard;
        });

        if (!nextBoard) {
            return null;
        }

        persistLocalBoard(nextBoard);
        await persistBoardToSupabase(nextBoard);
        return nextBoard;
    }, [persistBoardToSupabase, persistLocalBoard]);

    const addIdea = useCallback(async (overrides = {}) => {
        let createdIdea = null;

        await applyBoardChange((currentBoard) => {
            const column = currentBoard.nodes.length % 3;
            const row = Math.floor(currentBoard.nodes.length / 3);

            createdIdea = createIdeaNode({
                title: 'New idea',
                x: 48 + column * 284,
                y: 72 + row * 196,
                ...overrides
            });

            return {
                ...currentBoard,
                user_id: user?.id || currentBoard.user_id,
                nodes: [...currentBoard.nodes, createdIdea]
            };
        });

        return createdIdea;
    }, [applyBoardChange, user]);

    const addChildIdea = useCallback(async (parentId, overrides = {}) => {
        let createdIdea = null;

        await applyBoardChange((currentBoard) => {
            const parent = currentBoard.nodes.find((node) => node.id === parentId);
            if (!parent) {
                return currentBoard;
            }

            const siblingCount = currentBoard.nodes.filter((node) => node.parentId === parentId).length;
            createdIdea = createIdeaNode({
                title: 'Subidea',
                parentId,
                color: parent.color || 'slate',
                x: parent.x + 284,
                y: parent.y + siblingCount * 180,
                ...overrides
            });

            return {
                ...currentBoard,
                user_id: user?.id || currentBoard.user_id,
                nodes: [...currentBoard.nodes, createdIdea]
            };
        });

        return createdIdea;
    }, [applyBoardChange, user]);

    const updateIdea = useCallback(async (ideaId, updates) => {
        await applyBoardChange((currentBoard) => ({
            ...currentBoard,
            nodes: currentBoard.nodes.map((node) => (
                node.id === ideaId
                    ? {
                        ...node,
                        ...updates
                    }
                    : node
            ))
        }));
    }, [applyBoardChange]);

    const deleteIdea = useCallback(async (ideaId) => {
        await applyBoardChange((currentBoard) => {
            const idsToRemove = collectDescendantIds(currentBoard.nodes, ideaId);

            return {
                ...currentBoard,
                nodes: currentBoard.nodes.filter((node) => !idsToRemove.has(node.id))
            };
        });
    }, [applyBoardChange]);

    const setIdeaColor = useCallback(async (ideaId, color) => {
        if (!IDEA_COLOR_OPTIONS.includes(color)) {
            return;
        }

        await applyBoardChange((currentBoard) => {
            const idsToUpdate = collectDescendantIds(currentBoard.nodes, ideaId);

            return {
                ...currentBoard,
                nodes: currentBoard.nodes.map((node) => (
                    idsToUpdate.has(node.id)
                        ? { ...node, color }
                        : node
                ))
            };
        });
    }, [applyBoardChange]);

    const linkIdea = useCallback(async (childId, parentId) => {
        if (!childId || !parentId || childId === parentId) {
            return;
        }

        await applyBoardChange((currentBoard) => {
            const descendants = collectDescendantIds(currentBoard.nodes, childId);

            if (descendants.has(parentId)) {
                return currentBoard;
            }

            const parent = currentBoard.nodes.find((node) => node.id === parentId);

            return {
                ...currentBoard,
                nodes: currentBoard.nodes.map((node) => (
                    descendants.has(node.id)
                        ? {
                            ...node,
                            parentId: node.id === childId ? parentId : node.parentId,
                            color: parent?.color || node.color
                        }
                        : node
                ))
            };
        });
    }, [applyBoardChange]);

    const unlinkIdea = useCallback(async (ideaId) => {
        await updateIdea(ideaId, { parentId: null });
    }, [updateIdea]);

    const value = {
        board,
        nodes: board.nodes,
        loading,
        addIdea,
        addChildIdea,
        updateIdea,
        setIdeaColor,
        deleteIdea,
        linkIdea,
        unlinkIdea
    };

    return (
        <IdeaBoardContext.Provider value={value}>
            {children}
        </IdeaBoardContext.Provider>
    );
};
