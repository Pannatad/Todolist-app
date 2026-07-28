/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { createTemplatesRepo } from '../data/templatesRepo';
import { normalizeTemplateRecord, sanitizeMagicTemplateBlocks, TEMPLATE_SCHEMA_VERSION } from '../services/magicSchedule';

const ScheduleTemplateContext = createContext();

export const useScheduleTemplates = () => {
    const context = useContext(ScheduleTemplateContext);
    if (!context) {
        throw new Error('useScheduleTemplates must be used within ScheduleTemplateProvider');
    }
    return context;
};

export const ScheduleTemplateProvider = ({ children }) => {
    const { user } = useAuth();
    const userId = user?.id;
    const repo = useMemo(() => createTemplatesRepo(userId ? { id: userId } : null), [userId]);
    const [templates, setTemplates] = useState([]);

    useEffect(() => {
        let cancelled = false;
        repo.list()
            .then((data) => { if (!cancelled) setTemplates(data.map(normalizeTemplateRecord)); })
            .catch((error) => console.error('Failed to load schedule templates:', error));
        return () => { cancelled = true; };
    }, [repo]);

    const saveTemplate = useCallback(async ({ id, name, blocks }) => {
        const cleanName = String(name || '').trim();
        const cleanBlocks = sanitizeMagicTemplateBlocks(blocks);
        if (!cleanName) throw new Error('Template needs a name.');
        if (!cleanBlocks.length) throw new Error('Template needs at least one block with a HH:MM start time.');

        const existing = templates.find((template) => (
            (id && String(template.id) === String(id))
            || template.name.toLowerCase() === cleanName.toLowerCase()
        ));
        if (existing) {
            const updates = {
                name: cleanName,
                blocks: cleanBlocks,
                schemaVersion: TEMPLATE_SCHEMA_VERSION,
                version: Number(existing.version || 1) + 1
            };
            const updated = normalizeTemplateRecord(await repo.update(existing.id, updates));
            setTemplates((prev) => prev.map((template) => template.id === existing.id ? updated : template));
            return updated;
        }

        const created = normalizeTemplateRecord(await repo.create({
            id: userId ? undefined : crypto.randomUUID(),
            name: cleanName,
            blocks: cleanBlocks,
            schemaVersion: TEMPLATE_SCHEMA_VERSION,
            version: 1,
            created_at: new Date().toISOString()
        }));
        setTemplates((prev) => [...prev, created]);
        return created;
    }, [repo, templates, userId]);

    const deleteTemplate = useCallback(async (id) => {
        await repo.remove(id);
        setTemplates((prev) => prev.filter((template) => template.id !== id));
    }, [repo]);

    const value = useMemo(() => ({ templates, saveTemplate, deleteTemplate }), [templates, saveTemplate, deleteTemplate]);

    return (
        <ScheduleTemplateContext.Provider value={value}>
            {children}
        </ScheduleTemplateContext.Provider>
    );
};

export default ScheduleTemplateContext;
