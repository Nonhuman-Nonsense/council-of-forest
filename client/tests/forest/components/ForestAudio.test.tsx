import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { AmbientAudio, BeingAudio } from '@forest/ForestAudio';
import { log } from '@/logger';

global.fetch = vi.fn() as unknown as typeof fetch;

const resolvesToAudio = () =>
    Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });

describe('Forest audio loops', () => {
    // Loose Web Audio API mocks; typed `any` per this repo's test-mock convention.
    let mockAudioContext: any;
    let mockGainNode: any;
    let mockBufferSource: any;
    let audioContext: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(global.fetch).mockImplementation(resolvesToAudio as never);

        mockGainNode = {
            connect: vi.fn(),
            disconnect: vi.fn(),
            gain: {
                setValueAtTime: vi.fn(),
                linearRampToValueAtTime: vi.fn(),
                value: 0,
            },
        };

        mockBufferSource = {
            buffer: null,
            loop: false,
            connect: vi.fn(),
            disconnect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
        };

        mockAudioContext = {
            createGain: vi.fn(() => mockGainNode),
            createBufferSource: vi.fn(() => mockBufferSource),
            decodeAudioData: vi.fn(() => Promise.resolve({})),
            currentTime: 0,
            destination: {},
            state: 'running',
            resume: vi.fn(),
            suspend: vi.fn(),
        };

        // The components take the shared bus as a ref, the way Main owns it.
        audioContext = { current: mockAudioContext };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('AmbientAudio loads the ambience bed and starts it looping', async () => {
        render(<AmbientAudio audioContext={audioContext} />);

        await waitFor(() => expect(mockBufferSource.start).toHaveBeenCalled());

        expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('ambience.mp3'),
            expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
        expect(mockBufferSource.loop).toBe(true);
    });

    it('BeingAudio fades in for the active speaker', async () => {
        render(
            <BeingAudio id="river" volume={0.15} currentSpeakerId="river" audioContext={audioContext} />,
        );

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('river.mp3'),
                expect.objectContaining({ signal: expect.any(AbortSignal) }),
            );
        });

        await waitFor(() => {
            expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
                0.15,
                expect.any(Number),
            );
        });
    });

    it('BeingAudio fades out once it stops being the speaker', async () => {
        const { rerender } = render(
            <BeingAudio id="river" volume={0.15} currentSpeakerId="river" audioContext={audioContext} />,
        );
        await waitFor(() => expect(mockBufferSource.start).toHaveBeenCalled());
        mockGainNode.gain.linearRampToValueAtTime.mockClear();

        rerender(
            <BeingAudio id="river" volume={0.15} currentSpeakerId="" audioContext={audioContext} />,
        );

        await waitFor(() => {
            expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
                0,
                expect.any(Number),
            );
        });
    });

    it('reports a failed load instead of leaving the rejection unhandled', async () => {
        const logSpy = vi.spyOn(log, 'event').mockImplementation(() => undefined);
        vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));

        render(<AmbientAudio audioContext={audioContext} />);

        await waitFor(() => {
            expect(logSpy).toHaveBeenCalledWith('ERROR', expect.any(String), expect.any(TypeError));
        });
    });

    it('aborts an in-flight load when unmounted', async () => {
        const signals: AbortSignal[] = [];
        vi.mocked(global.fetch).mockImplementation(((_url: string, init: RequestInit) => {
            signals.push(init.signal as AbortSignal);
            return new Promise(() => undefined);
        }) as never);

        const { unmount } = render(<AmbientAudio audioContext={audioContext} />);

        await waitFor(() => expect(signals).toHaveLength(1));
        expect(signals[0].aborted).toBe(false);

        unmount();

        expect(signals[0].aborted).toBe(true);
    });

    it('does not report a load aborted by unmount as a failure', async () => {
        const logSpy = vi.spyOn(log, 'event').mockImplementation(() => undefined);
        const signals: AbortSignal[] = [];
        vi.mocked(global.fetch).mockImplementation(((_url: string, init: RequestInit) =>
            new Promise((_resolve, reject) => {
                const signal = init.signal as AbortSignal;
                signals.push(signal);
                signal.addEventListener('abort', () =>
                    reject(new DOMException('Aborted', 'AbortError')));
            })) as never);

        const { unmount } = render(<AmbientAudio audioContext={audioContext} />);
        await waitFor(() => expect(signals).toHaveLength(1));

        unmount();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(logSpy).not.toHaveBeenCalledWith('ERROR', expect.any(String), expect.anything());
    });
});
