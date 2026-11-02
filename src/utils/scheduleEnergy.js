// What a schedule block's color means: how the activity leaves you feeling.
// The level is stored as the block's `color`, so no extra column is needed.
// Blocks saved with any other color (from the old free palette) show as unrated gray.
export const SCHEDULE_ENERGY = [
    { id: 'fulfilling', label: 'Fulfilling', description: 'Gives you energy', color: '#22c55e' },
    { id: 'neutral', label: 'Neutral', description: 'Not too draining, not too fulfilling', color: '#eab308' },
    { id: 'draining', label: 'Draining', description: 'Takes energy out of you', color: '#ef4444' }
];

export const DEFAULT_ENERGY_COLOR = SCHEDULE_ENERGY[1].color;
export const UNRATED_ENERGY_COLOR = '#8e8e93';

export const scheduleEnergyOf = (color) => (
    SCHEDULE_ENERGY.find((level) => level.color === String(color || '').toLowerCase()) || null
);

// Color to draw a block with: its energy color, or gray when it has none.
export const scheduleEnergyColor = (color) => scheduleEnergyOf(color)?.color || UNRATED_ENERGY_COLOR;

export const scheduleEnergyLabel = (color) => scheduleEnergyOf(color)?.label || 'Not rated';
