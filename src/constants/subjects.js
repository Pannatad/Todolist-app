// Color palette for auto-assigning to subjects
export const SUBJECT_COLORS = [
    { color: '#3B82F6', bgColor: '#DBEAFE' }, // Blue
    { color: '#8B5CF6', bgColor: '#EDE9FE' }, // Purple
    { color: '#10B981', bgColor: '#D1FAE5' }, // Green
    { color: '#F59E0B', bgColor: '#FEF3C7' }, // Amber
    { color: '#EC4899', bgColor: '#FCE7F3' }, // Pink
    { color: '#6366F1', bgColor: '#E0E7FF' }, // Indigo
    { color: '#F97316', bgColor: '#FFEDD5' }, // Orange
    { color: '#14B8A6', bgColor: '#CCFBF1' }, // Teal
    { color: '#EF4444', bgColor: '#FEE2E2' }, // Red
    { color: '#84CC16', bgColor: '#ECFCCB' }, // Lime
    { color: '#06B6D4', bgColor: '#CFFAFE' }, // Cyan
    { color: '#F43F5E', bgColor: '#FFE4E6' }, // Rose
    { color: '#D946EF', bgColor: '#FAE8FF' }, // Fuchsia
    { color: '#0EA5E9', bgColor: '#E0F2FE' }, // Sky
];

const DEFAULT_GRAY = { color: '#6B7280', bgColor: '#F3F4F6' };

// Get color for a subject based on its name (consistent hash)
export const getColorForSubject = (subjectName) => {
    if (!subjectName) return DEFAULT_GRAY;

    // Simple hash function to consistently assign colors
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
        hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % SUBJECT_COLORS.length;
    return SUBJECT_COLORS[index];
};
