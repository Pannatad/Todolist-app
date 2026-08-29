/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { createLinksRepo } from '../data/linksRepo';
import { getLinkDraftError, normalizeLinkRecord, normalizeLinkUrl } from '../components/uni-board/linkUtils';

const LinksContext = createContext();

const createLinkId = () => (
  globalThis.crypto?.randomUUID?.() || `link-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

const cleanLinkInput = (input = {}) => {
  const error = getLinkDraftError(input);
  if (error) throw new Error(error);

  return {
    title: String(input.title).trim(),
    url: normalizeLinkUrl(input.url),
    category: String(input.category || '').trim(),
    description: String(input.description || '').trim(),
  };
};

export const useLinks = () => {
  const context = useContext(LinksContext);
  if (!context) throw new Error('useLinks must be used within LinksProvider');
  return context;
};

export const LinksProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const linksRepo = useMemo(() => createLinksRepo(userId ? { id: userId } : null), [userId]);
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const refreshLinks = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await linksRepo.list();
      const normalized = data.map(normalizeLinkRecord).filter((link) => link.title && link.url);
      setLinks(normalized);
      return normalized;
    } catch (error) {
      setLoadError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [linksRepo]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    linksRepo.list()
      .then((data) => {
        if (cancelled) return;
        setLinks(data.map(normalizeLinkRecord).filter((link) => link.title && link.url));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [linksRepo]);

  useEffect(() => {
    if (!user || !supabase) return undefined;

    const channel = supabase
      .channel(`uni-board-links-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'uni_board_links', filter: `user_id=eq.${user.id}` },
        () => { refreshLinks().catch(() => {}); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refreshLinks, user]);

  const addLink = useCallback(async (input) => {
    const clean = cleanLinkInput(input);
    const optimistic = normalizeLinkRecord({
      ...clean,
      id: userId ? `pending-${Date.now()}` : createLinkId(),
      created_at: new Date().toISOString(),
    });
    setLinks((current) => [optimistic, ...current]);

    try {
      const created = normalizeLinkRecord(await linksRepo.create({
        ...clean,
        id: userId ? undefined : optimistic.id,
        created_at: optimistic.created_at,
      }));
      setLinks((current) => current.map((link) => link.id === optimistic.id ? created : link));
      return created;
    } catch (error) {
      setLinks((current) => current.filter((link) => link.id !== optimistic.id));
      throw error;
    }
  }, [linksRepo, userId]);

  const updateLink = useCallback(async (id, input) => {
    const clean = cleanLinkInput(input);
    const existing = links.find((link) => link.id === id);
    if (!existing) return null;
    const optimistic = normalizeLinkRecord({ ...existing, ...clean, updated_at: new Date().toISOString() });
    setLinks((current) => current.map((link) => link.id === id ? optimistic : link));

    try {
      const updated = normalizeLinkRecord(await linksRepo.update(id, { ...clean, updated_at: optimistic.updated_at }));
      setLinks((current) => current.map((link) => link.id === id ? updated : link));
      return updated;
    } catch (error) {
      setLinks((current) => current.map((link) => link.id === id ? existing : link));
      throw error;
    }
  }, [links, linksRepo]);

  const deleteLink = useCallback(async (id) => {
    const existing = links.find((link) => link.id === id);
    if (!existing) return null;
    setLinks((current) => current.filter((link) => link.id !== id));

    try {
      await linksRepo.remove(id);
      return existing;
    } catch (error) {
      setLinks((current) => [...current, existing]);
      throw error;
    }
  }, [links, linksRepo]);

  const value = useMemo(() => ({
    links,
    isLoading,
    loadError,
    refreshLinks,
    addLink,
    updateLink,
    deleteLink,
  }), [addLink, deleteLink, isLoading, links, loadError, refreshLinks, updateLink]);

  return <LinksContext.Provider value={value}>{children}</LinksContext.Provider>;
};

export default LinksContext;
