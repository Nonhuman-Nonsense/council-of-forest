// @vitest-environment node
import { describe, it, expect } from "vitest";
import beingsEn from "@shared/prompts/beings_en.json";
import {
  CHAIR_CHARACTER_INDEX,
  CHARACTERS_FILE,
  chairIdFromCharacters,
} from "@shared/prompts/characterSetupMetadata";

describe("characterSetupMetadata", () => {
  it("exports the characters file key", () => {
    expect(CHARACTERS_FILE).toBe("beings");
  });

  it("derives chair id from the default character bundle", () => {
    expect(chairIdFromCharacters(beingsEn.characters)).toBe("river");
    expect(beingsEn.characters[CHAIR_CHARACTER_INDEX].id).toBe("river");
  });
});
