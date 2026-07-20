const STRUCTURED_RENDER_HINTS = new Set([
    'overview',
    'schedule',
    'tasks',
    'habits',
    'projects'
]);

export const resolveChatRenderMode = (renderHint) => (
    STRUCTURED_RENDER_HINTS.has(renderHint) ? renderHint : 'plain'
);

export { STRUCTURED_RENDER_HINTS };
