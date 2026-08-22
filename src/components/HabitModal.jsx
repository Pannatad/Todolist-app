import React, { useState } from 'react';
import { DEFAULT_SEED_DURATION_DAYS } from '../constants/habitSeeds';
import { toast } from '../ui/Toast';
import HabitModalForm from './HabitModalForm';
import { getInitialFormState, SCORE_MAX, TIME_OF_DAY_OPTIONS } from './habitModalUtils';

const HabitModal = ({ isOpen, onClose, onSave, habit = null }) => {
    const initialState = getInitialFormState(habit);

    const [name, setName] = useState(initialState.name);
    const [icon, setIcon] = useState(initialState.icon);
    const [type, setType] = useState(initialState.type);
    const [target, setTarget] = useState(initialState.target);
    const [frequency, setFrequency] = useState(initialState.frequency);
    const [scheduleDays, setScheduleDays] = useState(initialState.scheduleDays);
    const [timeOfDay, setTimeOfDay] = useState(initialState.timeOfDay);
    const [reminderTime, setReminderTime] = useState(initialState.reminderTime);
    const [color, setColor] = useState(initialState.color);
    const [isSeed, setIsSeed] = useState(initialState.isSeed);
    const [seedDurationDays, setSeedDurationDays] = useState(initialState.seedDurationDays);
    const [seedWhy, setSeedWhy] = useState(initialState.seedWhy);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    React.useEffect(() => {
        if (!isOpen) return;

        const nextState = getInitialFormState(habit);
        setName(nextState.name);
        setIcon(nextState.icon);
        setType(nextState.type);
        setTarget(nextState.target);
        setFrequency(nextState.frequency);
        setScheduleDays(nextState.scheduleDays);
        setTimeOfDay(nextState.timeOfDay);
        setReminderTime(nextState.reminderTime);
        setColor(nextState.color);
        setIsSeed(nextState.isSeed);
        setSeedDurationDays(nextState.seedDurationDays);
        setSeedWhy(nextState.seedWhy);
        setShowEmojiPicker(false);
    }, [habit, isOpen]);

    const handleTimeOfDayChange = (value) => {
        setTimeOfDay(value);
        if (value === 'anytime') {
            setReminderTime('');
            return;
        }
        const option = TIME_OF_DAY_OPTIONS.find((item) => item.value === value);
        if (option?.defaultTime && !reminderTime) {
            setReminderTime(option.defaultTime);
        }
    };

    const resetForm = () => {
        const nextState = getInitialFormState(null);
        setName(nextState.name);
        setIcon(nextState.icon);
        setType(nextState.type);
        setTarget(nextState.target);
        setFrequency(nextState.frequency);
        setScheduleDays(nextState.scheduleDays);
        setTimeOfDay(nextState.timeOfDay);
        setReminderTime(nextState.reminderTime);
        setColor(nextState.color);
        setIsSeed(nextState.isSeed);
        setSeedDurationDays(nextState.seedDurationDays);
        setSeedWhy(nextState.seedWhy);
        setShowEmojiPicker(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (frequency !== 'daily' && scheduleDays.length === 0) {
            toast('Select at least one day for a specific-days habit.', { tone: 'error' });
            return;
        }

        onSave({
            id: habit?.id,
            name: name.trim(),
            icon,
            type,
            target: type === 'check' || type === 'time' ? 1 : type === 'score' ? SCORE_MAX : parseInt(target, 10) || 1,
            frequency,
            schedule_days: frequency === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : scheduleDays,
            time_of_day: timeOfDay,
            reminder_time: reminderTime || null,
            color,
            is_seed: isSeed,
            seed_duration_days: isSeed ? seedDurationDays : null,
            seed_why: isSeed ? seedWhy.trim() : null,
            seed_started_at: isSeed
                ? (habit?.is_seed ? habit.seed_started_at : new Date().toISOString())
                : null,
            seed_stage: isSeed
                ? (habit?.is_seed ? habit.seed_stage || 'seed' : 'seed')
                : null,
        });

        resetForm();
        onClose();
    };

    const toggleDay = (day) => {
        if (scheduleDays.includes(day)) {
            setScheduleDays(scheduleDays.filter((d) => d !== day));
            return;
        }

        setScheduleDays([...scheduleDays, day].sort());
    };

    if (!isOpen) return null;
    return (
        <HabitModalForm
            color={color}
            frequency={frequency}
            habit={habit}
            handleSubmit={handleSubmit}
            handleTimeOfDayChange={handleTimeOfDayChange}
            icon={icon}
            isOpen={isOpen}
            isSeed={isSeed}
            name={name}
            onClose={onClose}
            reminderTime={reminderTime}
            scheduleDays={scheduleDays}
            seedDurationDays={seedDurationDays}
            seedWhy={seedWhy}
            setColor={setColor}
            setFrequency={setFrequency}
            setIcon={setIcon}
            setIsSeed={setIsSeed}
            setName={setName}
            setReminderTime={setReminderTime}
            setScheduleDays={setScheduleDays}
            setSeedDurationDays={setSeedDurationDays}
            setSeedWhy={setSeedWhy}
            setShowEmojiPicker={setShowEmojiPicker}
            setTarget={setTarget}
            setTimeOfDay={setTimeOfDay}
            setType={setType}
            showEmojiPicker={showEmojiPicker}
            target={target}
            timeOfDay={timeOfDay}
            toggleDay={toggleDay}
            type={type}
        />
    );
};

export default HabitModal;
