import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import FoodAnimation from '@council/FoodAnimation';

vi.mock('lottie-web', () => ({
    default: {
        loadAnimation: vi.fn(() => ({
            play: vi.fn(),
            stop: vi.fn(),
            destroy: vi.fn()
        }))
    }
}));

describe('FoodAnimation Compatibility', () => {
    it('accepts Forest-specific props without crashing', () => {
        const { container } = render(
            <FoodAnimation
                character={{ id: "river" }}
                isPaused={false}
                currentSpeakerId=""
                styles={{}}
            />
        );
        expect(container).toBeInTheDocument();
    });

    it('handles legacy Foods props gracefully (ignores emotion)', () => {
        // Legacy callers may still pass an extra `emotion` field; assigned to a
        // variable (not an inline literal) so TS's excess-property check doesn't
        // fight the very thing this test verifies — that it's silently ignored.
        const legacyCharacter = { id: "river", emotion: "happy" };
        const { container } = render(
            <FoodAnimation
                character={legacyCharacter}
                isPaused={false}
                currentSpeakerId=""
                styles={{}}
            />
        );
        expect(container).toBeInTheDocument();
    });
});
