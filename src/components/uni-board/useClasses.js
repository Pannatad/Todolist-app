import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createClassesRepo } from '../../data/classesRepo';
import { discoverClasses } from './classItems';

export function useClasses(scheduleItems, scheduleLoading, updateScheduleItem, refreshData) {
  const { user } = useAuth();
  const owner = user?.id || 'guest';
  const repo = useMemo(() => createClassesRepo(user?.id ? { id: user.id } : null), [user?.id]);
  const [state, setState] = useState({ owner: null, classes: [], announcements: [], error: null });
  const mutating = useRef(false);
  const generation = useRef(0);
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const link = useEffectEvent((item, classId) => updateScheduleItem(item.id, { classId }));
  useEffect(() => {
    if (scheduleLoading || mutating.current) return;
    const started = generation.current;
    let cancelled = false;
    async function load() {
      try {
        await discoverClasses(scheduleItems, repo, (item, id) => link(item, id), () => !cancelled && started === generation.current);
        const [classes, announcements] = await Promise.all([repo.listClasses(), repo.listAnnouncements()]);
        if (!cancelled && started === generation.current) setState({ owner, classes, announcements, error: null });
      } catch (error) {
        if (!cancelled && started === generation.current) setState((current) => ({ ...(current.owner === owner ? current : { classes: [], announcements: [] }), owner, error }));
      }
    }
    load();
    return () => { cancelled = true; };
  }, [repo, owner, scheduleItems, scheduleLoading, revision]);

  const addClass = async (name) => {
    const course = await repo.ensureClass(name);
    setState((current) => current.owner !== owner ? current : {
      ...current, classes: [...current.classes.filter((item) => item.id !== course.id), course],
    });
    return course;
  };
  const saveAnnouncement = async (classId, input, id) => {
    const saved = await repo.saveAnnouncement(classId, input, id);
    setState((current) => current.owner !== owner ? current : {
      ...current, announcements: [...current.announcements.filter((item) => item.id !== saved.id), saved],
    });
    return saved;
  };
  const deleteAnnouncement = async (id) => {
    await repo.deleteAnnouncement(id);
    setState((current) => current.owner !== owner ? current : {
      ...current, announcements: current.announcements.filter((item) => item.id !== id),
    });
  };
  const mutateClass = async (action) => {
    if (mutating.current) throw new Error('Please wait for the current class change.');
    mutating.current = true;
    generation.current += 1;
    try {
      const result = await action();
      // Refresh shared tasks and sessions before allowing automatic class discovery.
      await refreshData();
      return result;
    } finally {
      mutating.current = false;
      retry();
    }
  };
  const renameClass = (id, name) => mutateClass(async () => {
    const course = await repo.renameClass(id, name);
    setState((current) => current.owner !== owner ? current : {
      ...current, classes: current.classes.map((item) => item.id === id ? course : item),
    });
    return course;
  });
  const deleteClass = (id) => mutateClass(async () => {
    await repo.deleteClass(id);
    setState((current) => current.owner !== owner ? current : {
      ...current, classes: current.classes.filter((item) => item.id !== id),
      announcements: current.announcements.filter((item) => item.class_id !== id),
    });
  });
  const current = state.owner === owner;
  return {
    owner,
    classes: current ? [...state.classes].sort((a, b) => a.name.localeCompare(b.name)) : [],
    announcements: current ? state.announcements : [],
    error: current ? state.error : null,
    isLoading: !current || scheduleLoading,
    retry, addClass, renameClass, deleteClass, saveAnnouncement, deleteAnnouncement,
  };
}
