import { describe, it, expect, vi, beforeEach } from "vitest";
import { MeetingLifecycleHandler } from "@logic/MeetingLifecycleHandler.js";
import type { IMeetingManager } from "@interfaces/MeetingInterfaces.js";

describe("MeetingLifecycleHandler prompts (forest / Swedish)", () => {
    let mockManager: IMeetingManager;
    let handler: MeetingLifecycleHandler;

    beforeEach(() => {
        mockManager = {
            meeting: {
                _id: 123,
                language: "sv",
                characters: [{ id: "mock-char", name: "Mock Char" }],
                conversation: [{ type: "query_extension" }],
                state: {},
            },
            environment: "test",
            socket: { emit: vi.fn(), on: vi.fn() },
            services: {
                meetingsCollection: {
                    updateOne: vi.fn(),
                    findOne: vi.fn().mockResolvedValue(null),
                },
                getOpenAI: vi.fn().mockReturnValue({ apiKey: "mock-key" }),
            },
            serverOptions: {
                concludeMeetingPrompt: {
                    en: "Closing",
                    sv: "Avslutande replik",
                },
                concludeMeetingLength: 50,
                summarizeMeetingPrompt: {
                    en: "Summarize [DATE]",
                    sv: "Sammanfatta [DATE]",
                },
                summarizeMeetingLength: 5,
                transcribeModel: "whisper-1",
                transcribePrompt: {
                    en: "Transcribe",
                    sv: "Transkribera",
                },
            },
            dialogGenerator: {
                chairInterjection: vi.fn()
                    .mockResolvedValueOnce({ response: "Tack för samtalet.", id: "close_1" }),
                generateDocument: vi.fn()
                    .mockResolvedValueOnce({ response: "Summary text", id: "msg_456" }),
            },
            audioSystem: {
                generateAudio: vi.fn(),
                queueAudioGeneration: vi.fn(),
                waitForIdle: vi.fn().mockResolvedValue(undefined),
            },
            broadcaster: {
                broadcastConversationUpdate: vi.fn(),
                broadcastError: vi.fn(),
            },
        } as unknown as IMeetingManager;

        handler = new MeetingLifecycleHandler(mockManager);
    });

    it("calls chairInterjection with Swedish conclude then generateDocument with Swedish summarize prompt", async () => {
        await handler.handleConcludeMeeting({ date: "2024-01-01" });

        const chairCalls = (mockManager.dialogGenerator.chairInterjection as ReturnType<typeof vi.fn>).mock.calls;
        const summaryCalls = (mockManager.dialogGenerator.generateDocument as ReturnType<typeof vi.fn>).mock.calls;
        expect(chairCalls).toHaveLength(1);
        expect(chairCalls[0][0]).toBe("Avslutande replik");
        expect(summaryCalls).toHaveLength(1);
        expect(summaryCalls[0][0]).toContain("Sammanfatta");
        expect(summaryCalls[0][0]).toContain("2024-01-01");
    });
});
