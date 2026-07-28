export const DRAG_START_THRESHOLD_PX = 6;

export const hasExceededDragThreshold = (
    originX,
    originY,
    clientX,
    clientY,
    threshold = DRAG_START_THRESHOLD_PX
) => Math.hypot(clientX - originX, clientY - originY) >= threshold;
