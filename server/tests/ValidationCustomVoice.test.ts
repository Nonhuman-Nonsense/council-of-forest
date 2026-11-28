import { describe, it, expect } from 'vitest';
import { CreateMeetingSchema } from '../src/models/ValidationSchemas.js';
import { MockFactory } from './factories/MockFactory.js';

const topic = MockFactory.createTopic({
    id: 't1',
    title: 'T',
    description: 'D',
    prompt: 'P'
});

describe('ValidationSchemas voice providers (CreateMeeting)', () => {
    it.each([
        { voice: 'custom-cloned-voice-id-123', voiceProvider: 'inworld', accepted: true },
        { voice: 'JBFqnCBsd6RMkjVDRZzb', voiceProvider: 'elevenlabs', accepted: true },
        { voice: 'alloy', voiceProvider: 'openai', accepted: false },
        { voice: 'Ashley', voiceProvider: undefined, accepted: false },
    ])('a $voiceProvider voice is accepted: $accepted', ({ voice, voiceProvider, accepted }) => {
        const character = MockFactory.createCharacter({ id: 'char1', name: 'Test Char', voice });
        const payload = MockFactory.createCreateMeetingBody({
            topic,
            characters: [{ ...character, voiceProvider } as never],
        });

        expect(CreateMeetingSchema.safeParse(payload).success).toBe(accepted);
    });
});
