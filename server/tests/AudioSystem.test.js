import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioSystem } from '@root/src/logic/AudioSystem.js';
import { MockFactory } from './factories/MockFactory.ts';

vi.mock('music-metadata', () => ({
    parseBuffer: vi.fn().mockResolvedValue({
        format: { duration: 1 }
    })
}));

vi.mock('@root/src/utils/Logger.js', () => ({
    Logger: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        reportAndCrashClient: vi.fn()
    }
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

/** What Inworld's TTS endpoint answers: audio, with no word timings. */
const inworldReply = () => ({
    ok: true,
    json: async () => ({ audioContent: Buffer.from('audio').toString('base64') }),
    text: async () => '',
});

describe('AudioSystem', () => {
    let audioSystem;
    let mockBroadcaster;
    let mockServices;

    const meeting = () => MockFactory.createStoredMeeting({ _id: 123 });
    const serverOptions = (overrides = {}) => MockFactory.createServerOptions(overrides);

    beforeEach(() => {
        vi.clearAllMocks();

        mockBroadcaster = {
            broadcastAudioUpdate: vi.fn(),
            broadcastError: vi.fn()
        };

        process.env.INWORLD_API_KEY = 'mock-api-key';
        mockFetch.mockReset();
        mockFetch.mockResolvedValue(inworldReply());

        mockServices = {
            audioCollection: {
                findOne: vi.fn(),
                updateOne: vi.fn()
            },
            meetingsCollection: {
                updateOne: vi.fn()
            },
        };

        audioSystem = new AudioSystem(mockBroadcaster, mockServices);
    });

    it('should generate audio and broadcast update', async () => {
        const message = { id: 'msg1', text: 'Hello', sentences: ['Hello'] };
        const speaker = { id: 'char1', voice: 'Dennis', voiceProvider: 'inworld' };
        const environment = 'production';

        await audioSystem.generateAudio(
            message,
            speaker,
            'en',
            serverOptions({ defaultAudioSpeed: 1 }),
            meeting(),
            environment
        );

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockBroadcaster.broadcastAudioUpdate).toHaveBeenCalledWith(expect.objectContaining({
            id: 'msg1',
            sentences: [
                expect.objectContaining({
                    text: 'Hello',
                    start: 0,
                    end: 1
                })
            ]
        }));
    });

    it('should skip audio generation if configured', async () => {
        const message = { id: 'msg1', text: 'Hello' };
        const speaker = { id: 'char1', voice: 'Dennis', voiceProvider: 'inworld' };

        await audioSystem.generateAudio(
            message,
            speaker,
            'en',
            serverOptions({ skipAudio: true }),
            meeting(),
            'production'
        );

        expect(mockFetch).not.toHaveBeenCalled();
        expect(mockBroadcaster.broadcastAudioUpdate).not.toHaveBeenCalled();
    });

    it('should broadcast skipped type if message is skipped', async () => {
        const message = { id: 'msg1', type: 'skipped', text: '' };

        await audioSystem.generateAudio(message, {}, 'en', serverOptions(), meeting(), 'production');

        expect(mockBroadcaster.broadcastAudioUpdate).toHaveBeenCalledWith({
            id: 'msg1',
            type: 'skipped'
        });
    });

    it('should retry on specific network errors (terminated)', async () => {
        const message = { id: 'msgRetry', text: 'Retry me', sentences: ['Retry me'] };
        const speaker = { id: 'char1', voice: 'Dennis', voiceProvider: 'inworld' };

        mockFetch.mockRejectedValueOnce(new Error('terminated'));

        await audioSystem.generateAudio(
            message,
            speaker,
            'en',
            serverOptions({ defaultAudioSpeed: 1 }),
            meeting(),
            'production'
        );

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockBroadcaster.broadcastAudioUpdate).toHaveBeenCalledWith(expect.objectContaining({
            id: 'msgRetry'
        }));
    });

    it('should suppress stale side effects after cancelPendingWork', async () => {
        const message = { id: 'msg-stale', text: 'Hello later', sentences: ['Hello later'] };
        const speaker = { id: 'char1', voice: 'Dennis', voiceProvider: 'inworld' };

        let resolveFetch;
        mockFetch.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveFetch = resolve;
                })
        );

        const generationPromise = audioSystem.generateAudio(
            message,
            speaker,
            'en',
            serverOptions({ defaultAudioSpeed: 1 }),
            meeting(),
            'production'
        );

        await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
        audioSystem.cancelPendingWork();
        resolveFetch(inworldReply());

        await generationPromise;

        expect(mockBroadcaster.broadcastAudioUpdate).not.toHaveBeenCalled();
        expect(mockServices.audioCollection.updateOne).not.toHaveBeenCalled();
        expect(mockServices.meetingsCollection.updateOne).not.toHaveBeenCalled();
    });

    it('should suppress skipped broadcasts for stale generations', async () => {
        audioSystem.cancelPendingWork();

        await audioSystem.generateAudio(
            { id: 'msg-skipped', type: 'skipped', text: '' },
            {},
            'en',
            serverOptions(),
            meeting(),
            'production',
            false,
            0
        );

        expect(mockBroadcaster.broadcastAudioUpdate).not.toHaveBeenCalled();
    });
});
