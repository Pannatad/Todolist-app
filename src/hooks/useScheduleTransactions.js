import { useCallback, useRef, useState } from 'react';

const itemId = (item) => item?.id;

export const useScheduleTransactions = ({
    addScheduleItem,
    updateScheduleItem,
    deleteScheduleItem,
    restoreScheduleItem
}) => {
    const historyRef = useRef([]);
    const [historyVersion, setHistoryVersion] = useState(0);
    const [isRunning, setIsRunning] = useState(false);

    const executeStep = useCallback(async (step, references = new Map()) => {
        if (step.type === 'create') {
            const parentItemId = step.payload.parentClientKey
                ? references.get(step.payload.parentClientKey)
                : step.payload.parentItemId;
            const created = await addScheduleItem({
                ...step.payload,
                parentItemId,
                clientKey: undefined,
                parentClientKey: undefined
            });
            const createdId = itemId(created);
            if (!createdId) throw new Error('The new schedule item did not return an id.');
            if (step.payload.clientKey) references.set(step.payload.clientKey, createdId);
            return { type: 'delete', id: createdId, item: created };
        }

        if (step.type === 'update') {
            await updateScheduleItem(step.id, step.updates);
            return { type: 'update', id: step.id, updates: step.before };
        }

        if (step.type === 'delete') {
            if (!step.item) throw new Error('A schedule snapshot is required for undo.');
            await deleteScheduleItem(step.item.id, step.options);
            if (step.options?.occurrenceDate) {
                return {
                    type: 'update',
                    id: step.item.id,
                    updates: {
                        recurrenceExceptions: step.item.recurrenceExceptions
                            || step.item.recurrence_exceptions
                            || []
                    }
                };
            }
            return { type: 'restore', item: step.item };
        }

        if (step.type === 'restore') {
            const restored = await restoreScheduleItem(step.item);
            return { type: 'delete', id: itemId(restored) || step.item.id, item: restored || step.item };
        }

        throw new Error(`Unsupported schedule transaction step: ${step.type}`);
    }, [addScheduleItem, deleteScheduleItem, restoreScheduleItem, updateScheduleItem]);

    const rollback = useCallback(async (inverseSteps) => {
        for (const step of inverseSteps) {
            try {
                if (step.type === 'delete') await deleteScheduleItem(step.id);
                if (step.type === 'update') await updateScheduleItem(step.id, step.updates);
                if (step.type === 'restore') await restoreScheduleItem(step.item);
            } catch (error) {
                console.error('Schedule rollback step failed:', error);
            }
        }
    }, [deleteScheduleItem, restoreScheduleItem, updateScheduleItem]);

    const runBatch = useCallback(async (steps, label = 'Schedule change') => {
        if (!steps.length) return [];
        setIsRunning(true);
        const references = new Map();
        const inverseSteps = [];
        try {
            for (const step of steps) {
                const inverse = await executeStep(step, references);
                inverseSteps.unshift(inverse);
            }
            historyRef.current = [...historyRef.current, { label, steps: inverseSteps }];
            setHistoryVersion((value) => value + 1);
            return inverseSteps;
        } catch (error) {
            await rollback(inverseSteps);
            throw error;
        } finally {
            setIsRunning(false);
        }
    }, [executeStep, rollback]);

    const undo = useCallback(async () => {
        const batch = historyRef.current.at(-1);
        if (!batch) return false;
        setIsRunning(true);
        const redoSteps = [];
        try {
            const references = new Map();
            for (const step of batch.steps) {
                const redo = await executeStep(step, references);
                redoSteps.unshift(redo);
            }
            historyRef.current = historyRef.current.slice(0, -1);
            setHistoryVersion((value) => value + 1);
            return true;
        } catch (error) {
            await rollback(redoSteps);
            throw error;
        } finally {
            setIsRunning(false);
        }
    }, [executeStep, rollback]);

    const current = historyRef.current.at(-1);
    return {
        runBatch,
        undo,
        canUndo: Boolean(current),
        undoLabel: current?.label || '',
        isRunning,
        historyVersion
    };
};
