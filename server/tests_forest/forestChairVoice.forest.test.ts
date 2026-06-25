import { describe, it, expect } from "vitest";
import { getChairAgentVoice, getChairMeetingVoice } from "@logic/characterSetupBundle.js";
import { getGlobalOptions } from "@logic/GlobalOptions.js";

describe("Forest chair voice (split preset)", () => {
    const options = getGlobalOptions();

    it("uses split strategy with per-language agent voices", () => {
        expect(options.chairRealtime.strategy).toBe("split");
        expect(options.chairRealtime.languages.sv?.agentVoice?.voice).toBe("Ashley");
        expect(options.chairRealtime.languages.en?.agentVoice?.voice).toBe("Ashley");
    });

    it("keeps Swedish council TTS on ElevenLabs river while agent uses Inworld", () => {
        const meeting = getChairMeetingVoice("sv");
        const agent = getChairAgentVoice("sv", options);

        expect(meeting.voiceProvider).toBe("elevenlabs");
        expect(meeting.voice).toBe("flHkNRp1BlvT73UL6gyz");
        expect(agent.voiceProvider).toBe("inworld");
        expect(agent.voice).toBe("Ashley");
        expect(agent.voiceLocale).toBe("sv");
    });

    it("uses Inworld Ashley for both English meeting and agent", () => {
        const meeting = getChairMeetingVoice("en");
        const agent = getChairAgentVoice("en", options);

        expect(meeting.voiceProvider).toBe("inworld");
        expect(meeting.voice).toBe("Ashley");
        expect(agent).toMatchObject({
            voice: "Ashley",
            voiceProvider: "inworld",
        });
    });
});
