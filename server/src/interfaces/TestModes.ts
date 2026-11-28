/**
 * Defines the available testing modes for the application.
 * - MOCK: Basic unit tests with simulated services (Fastest, No Cost).
 * - FAST: Integration tests against the real conversation model, audio skipped (Fast, Low Cost).
 * - FULL: Full system tests against the real conversation model and voices (Slow, Higher Cost).
 */

export const TEST_MODES = {
    MOCK: 'mock',
    FAST: 'fast',
    FULL: 'full',
} as const;