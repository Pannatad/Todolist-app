/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { createIdeasRepo } from '../data/ideasRepo';

const IdeaBoardContext = createContext();

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
    const userId = user?.id;
    const ideasRepo = useMemo(() => createIdeasRepo(userId ? { id: userId } : null), [userId]);
    const [board, setBoard] = useState(() => createDefaultBoard());
    const [loading, setLoading] = useState(false);
    const saveCounterRef = useRef(0);

    const persistBoardToSupabase = useCallback(async (nextBoard) => {
        const requestId = ++saveCounterRef.current;
        try {
            const data = nextBoard.id
                ? await ideasRepo.update(nextBoard.id, nextBoard)
                : await ideasRepo.create(nextBoard);
            const normalized = normalizeBoardRecord(data);
            if (requestId === saveCounterRef.current) {
                setBoard(normalized);
                await ideasRepo.writeGuest(normalized);
            }
            return normalized;
        } catch (error) {
            console.error('Error saving idea board to Supabase:', error);
            return nextBoard;
        }
    }, [ideasRepo]);

    useEffect(() => {
        let cancelled = false;

        const loadBoard = async () => {
            if (!user || !supabase) {
                setBoard(normalizeBoardRecord(await ideasRepo.list(createDefaultBoard)));
                setLoading(false);
                return;
            }

            setLoading(true);

            const guestBoard = normalizeBoardRecord(await ideasRepo.readGuest(createDefaultBoard));
            let data = null;
            let error = null;
            try { data = await ideasRepo.list(); } catch (loadError) { error = loadError; }

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
    }, [ideasRepo, persistBoardToSupabase, user]);

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
                        ideasRepo.writeGuest(fallback);
                        return;
                    }

                    if (payload.new) {
                        const nextBoard = normalizeBoardRecord(payload.new);
                        setBoard(nextBoard);
                        ideasRepo.writeGuest(nextBoard);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [ideasRepo, user]);

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

        await persistBoardToSupabase(nextBoard);
        return nextBoard;
    }, [persistBoardToSupabase]);

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
