// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  RANDOM_AGENDA_POINT_PLACEHOLDER,
  RANDOM_AGENDA_POINT_FALLBACK,
  injectRandomAgendaPoint,
  pickAgendaPoint,
} from "@shared/agendaPointInjection";
import { capabilitiesFor } from "@/settings/capabilities";
import topicsEn from "@shared/prompts/topics_en.json";
import topicsSv from "@shared/prompts/topics_sv.json";

describe("agendaPointInjection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("pickAgendaPoint", () => {
    it("returns 1 when count is below 1", () => {
      expect(pickAgendaPoint(0)).toBe(1);
      expect(pickAgendaPoint(-3)).toBe(1);
    });

    it("returns a value within 1..count", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.999);
      expect(pickAgendaPoint(5)).toBe(5);

      vi.spyOn(Math, "random").mockReturnValue(0);
      expect(pickAgendaPoint(5)).toBe(1);
    });
  });

  describe("injectRandomAgendaPoint", () => {
    it("leaves the prompt unchanged when the placeholder is absent", () => {
      const prompt = "Moderate today's discussion.";
      expect(injectRandomAgendaPoint(prompt, ["One", "Two"])).toBe(prompt);
      expect(injectRandomAgendaPoint(prompt)).toBe(prompt);
    });

    it("replaces with a random index when agenda points are provided", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.4);
      const result = injectRandomAgendaPoint(
        `Open with ${RANDOM_AGENDA_POINT_PLACEHOLDER}.`,
        ["a", "b", "c", "d", "e"],
      );
      expect(result).toBe("Open with 3.");
    });

    it.each([
      { pinned: 5, expected: "Open with 5." },
      { pinned: 0, expected: "Open with 3." },
      { pinned: 6, expected: "Open with 3." },
    ])("uses a pinned point only when it is on the agenda (pinned $pinned)", ({ pinned, expected }) => {
      vi.spyOn(Math, "random").mockReturnValue(0.4);
      const result = injectRandomAgendaPoint(
        `Open with ${RANDOM_AGENDA_POINT_PLACEHOLDER}.`,
        ["a", "b", "c", "d", "e"],
        pinned,
      );
      expect(result).toBe(expected);
    });

    it("replaces with the fallback sentence when agenda points are missing", () => {
      const result = injectRandomAgendaPoint(`Step: ${RANDOM_AGENDA_POINT_PLACEHOLDER}`);
      expect(result).toBe(`Step: ${RANDOM_AGENDA_POINT_FALLBACK}`);
    });

    it("replaces with the fallback sentence when agenda points are empty", () => {
      const result = injectRandomAgendaPoint(`Step: ${RANDOM_AGENDA_POINT_PLACEHOLDER}`, []);
      expect(result).toBe(`Step: ${RANDOM_AGENDA_POINT_FALLBACK}`);
    });
  });
});

// TEMPORARY (mining screening, Oct 2026): remove with the presenter's pinnedAgendaPoints.
describe("presenter's pinned mining agenda point", () => {
  it.each([
    ["en", topicsEn],
    ["sv", topicsSv],
  ])("is the uranium point (%s)", (_lang, bundle) => {
    const point = capabilitiesFor("presenter").pinnedAgendaPoints.mining!;
    const mining = bundle.topics.find((topic) => topic.id === "mining");
    expect(mining?.agendaPoints?.[point - 1]).toMatch(/uran/i);
  });
});
