import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import Forest from '@forest/Forest';
import { log } from '@/logger';

// Mock utils to avoid layout issues
vi.mock('@/utils', () => ({
    dvh: 'px',
    minWindowHeight: 600,
    filename: (id: string) => id,
    useMobile: () => false,
    useDocumentVisibility: () => true
}));

// Mock fetch for audio files
global.fetch = vi.fn() as unknown as typeof fetch;

const resolvesToAudio = () =>
    Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });

describe('Forest Audio Logic', () => {
    // Loose Web Audio API mocks; typed `any` per this repo's test-mock convention.
    let mockAudioContext: any;
    let mockGainNode: any;
    let mockBufferSource: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(global.fetch).mockImplementation(resolvesToAudio as never);

        // Fix: Mock HTMLMediaElement methods (play/pause) to support FoodAnimation
        window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
        window.HTMLMediaElement.prototype.pause = vi.fn();

        // Setup AudioContext Mocks
        mockGainNode = {
            connect: vi.fn(),
            disconnect: vi.fn(),
            gain: {
                setValueAtTime: vi.fn(),
                linearRampToValueAtTime: vi.fn(),
                value: 0
            }
        };

        mockBufferSource = {
            buffer: null,
            loop: false,
            connect: vi.fn(),
            disconnect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn()
        };

        mockAudioContext = {
            createGain: vi.fn(() => mockGainNode),
            createBufferSource: vi.fn(() => mockBufferSource),
            decodeAudioData: vi.fn(() => Promise.resolve({})),
            currentTime: 0,
            destination: {},
            state: 'running',
            resume: vi.fn(),
            suspend: vi.fn()
        };

        // Wrap in a ref-like object because usage in Forest is audioContext.current
        // BUT wait, is passed as a prop "audioContext" which is a REF in Main.jsx?
        // Let's check Forest.jsx.
        // function Forest({ ..., audioContext }) ...
        // Inside: audioContext.current.createGain()
        // So yes, we pass a ref object { current: mockCtx }
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('AmbientAudio initializes and loads ambience on mount', async () => {
        const audioContextRef = { current: mockAudioContext };

        render(<Forest currentSpeakerId="" isPaused={false} audioContext={audioContextRef} />);

        // AmbientAudio is rendered unconditionally
        await waitFor(() => {
            expect(mockAudioContext.createGain).toHaveBeenCalled();
            expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
        });

        // Verify connection to destination
        expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);

        // Verify fetch of ambience
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('ambience.mp3'),
            expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );

        // Verify start
        await waitFor(() => {
            expect(mockBufferSource.start).toHaveBeenCalled();
        });
    });

    it('BeingAudio loads and plays for active speaker', async () => {
        const audioContextRef = { current: mockAudioContext };
        const speakerId = 'river';

        // Initial render with valid speaker
        render(<Forest currentSpeakerId={speakerId} isPaused={false} audioContext={audioContextRef} />);

        // Wait for connection
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`${speakerId}.mp3`),
                expect.objectContaining({ signal: expect.any(AbortSignal) }),
            );
        });

        // Check gain ramp up
        // BeingAudio: useEffect [currentSpeakerId] -> setPlay(true) -> useEffect [play] -> linearRampToValueAtTime(volume)
        await waitFor(() => {
            expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
                expect.any(Number), // volume
                expect.any(Number)  // time
            );
        });
    });

    it('BeingAudio ramps down (fades out) when speaker changes', async () => {
        const audioContextRef = { current: mockAudioContext };
        const speakerId = 'river';

        const { rerender } = render(<Forest currentSpeakerId={speakerId} isPaused={false} audioContext={audioContextRef} />);

        // Wait for start
        await waitFor(() => {
            expect(mockBufferSource.start).toHaveBeenCalled();
        });

        // Clear previous calls to focus on fade out
        mockGainNode.gain.linearRampToValueAtTime.mockClear();

        // Change speaker to null (or someone else)
        rerender(<Forest currentSpeakerId="" isPaused={false} audioContext={audioContextRef} />);

        await waitFor(() => {
            // Should ramp to 0
            expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
                0,
                expect.any(Number)
            );
        });
    });

    it('reports a failed loop load instead of leaving the rejection unhandled', async () => {
        const logSpy = vi.spyOn(log, 'event').mockImplementation(() => undefined);
        vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));

        render(<Forest currentSpeakerId="" isPaused={false} audioContext={{ current: mockAudioContext }} />);

        await waitFor(() => {
            expect(logSpy).toHaveBeenCalledWith('ERROR', expect.any(String), expect.any(TypeError));
        });
    });

    it('aborts an in-flight loop load when unmounted', async () => {
        const signals: AbortSignal[] = [];
        vi.mocked(global.fetch).mockImplementation(((_url: string, init: RequestInit) => {
            signals.push(init.signal as AbortSignal);
            return new Promise(() => undefined);
        }) as never);

        const { unmount } = render(
            <Forest currentSpeakerId="" isPaused={false} audioContext={{ current: mockAudioContext }} />,
        );

        await waitFor(() => expect(signals.length).toBeGreaterThan(0));
        expect(signals.some((s) => s.aborted)).toBe(false);

        unmount();

        expect(signals.every((s) => s.aborted)).toBe(true);
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

        const { unmount } = render(
            <Forest currentSpeakerId="" isPaused={false} audioContext={{ current: mockAudioContext }} />,
        );
        await waitFor(() => expect(signals.length).toBeGreaterThan(0));

        unmount();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(logSpy).not.toHaveBeenCalledWith('ERROR', expect.any(String), expect.anything());
    });
});
