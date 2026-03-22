/*
 * Shared crypto adapter helpers live here when they are truly provider-agnostic.
 *
 * Keep this file deliberately small. If logic starts needing provider-specific
 * branching, move it back into the relevant adapter instead of growing a generic
 * abstraction layer.
 */

/* Provider live symbols usually normalize by trimming, uppercasing, and removing internal spaces. */
export function normalizeCompactProviderSymbol(value, pattern) {
    const compact = `${value ?? ''}`
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '');

    if (!pattern.test(compact))
        return '';

    return compact;
}

/* Search normalization strips formatting noise so providers can compare ids, labels, and pairs consistently. */
export function normalizeProviderSearchQuery(value) {
    return `${value ?? ''}`
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}
