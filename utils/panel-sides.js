/*
 * Panel side constants live in one tiny shared module so settings loading,
 * ticker normalization, and UI code can all rely on the same source of truth
 * without creating import cycles.
 */
export const LEFT_PANEL_SIDE = 'left';
export const RIGHT_PANEL_SIDE = 'right';
