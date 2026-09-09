import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import MediaPreloader from '@main/MediaPreloader';
import { characterSetupEn } from '../../characterSetupTestData';

const [, firstCharacter, secondCharacter] = characterSetupEn.characters;

vi.mock('../../../src/utils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../src/utils')>();
    return {
        ...actual,
        useMobile: vi.fn(),
    };
});

import { useMobile } from '../../../src/utils';

describe('MediaPreloader', () => {
    beforeEach(() => {
        vi.mocked(useMobile).mockReturnValue(false);
    });

    it('renders empty container when list is empty', () => {
        const { container } = render(<MediaPreloader foodIds={[]} />);
        const div = container.firstChild as HTMLElement;
        expect(div.children).toHaveLength(0);
    });

    it('renders hidden video elements for provided food IDs', () => {
        const foodIds = [firstCharacter.id, secondCharacter.id];
        const { container } = render(<MediaPreloader foodIds={foodIds} />);

        const div = container.firstChild as HTMLElement;
        expect(div).toHaveStyle({ display: 'none', width: '0', height: '0' });

        const videos = div.querySelectorAll('video');
        expect(videos).toHaveLength(2);

        const firstVideo = videos[0];
        expect(firstVideo).toHaveAttribute('preload', 'auto');
        expect(firstVideo).toHaveProperty('muted', true);
        expect(firstVideo).toHaveProperty('playsInline', true);

        const sources = firstVideo.querySelectorAll('source');
        expect(sources).toHaveLength(2);
        expect(sources[0].getAttribute('src')).toContain(`${firstCharacter.id}-hevc-safari`);
        expect(sources[0]).toHaveAttribute('type', 'video/mp4; codecs="hvc1"');
        expect(sources[1].getAttribute('src')).toContain(`${firstCharacter.id}-vp9-chrome`);
        expect(sources[1]).toHaveAttribute('type', 'video/webm');
    });

    it('renders a hidden audio element per being with an ambient loop', () => {
        const { container } = render(
            <MediaPreloader foodIds={[firstCharacter.id, secondCharacter.id]} />,
        );
        const div = container.firstChild as HTMLElement;

        const audios = div.querySelectorAll('audio');
        expect(audios).toHaveLength(2);
        expect(audios[0]).toHaveAttribute('preload', 'auto');

        const sources = audios[0].querySelectorAll('source');
        expect(sources).toHaveLength(1);
        expect(sources[0].getAttribute('src')).toContain(`${firstCharacter.id}`);
        expect(sources[0]).toHaveAttribute('type', 'audio/ogg; codecs="opus"');
    });

    it('renders no audio element for a being that has no loop', () => {
        // `bird` is in the forest scene but ships no ambient loop.
        const { container } = render(<MediaPreloader foodIds={['bird']} />);
        const div = container.firstChild as HTMLElement;

        expect(div.querySelectorAll('video')).toHaveLength(1);
        expect(div.querySelectorAll('audio')).toHaveLength(0);
    });
});
