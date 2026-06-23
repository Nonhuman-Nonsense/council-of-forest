import { describe, it, expect } from "vitest";
import { createSceneAudioContext } from "@/audio/sceneAudio";

describe("sceneAudio", () => {
  it("createSceneAudioContext returns an AudioContext", () => {
    const ctx = createSceneAudioContext();
    expect(ctx).toBeInstanceOf(window.AudioContext);
    void ctx.close();
  });

  it("createSceneAudioContext throws when Web Audio is unavailable", () => {
    const original = window.AudioContext;
    // @ts-expect-error test shim
    window.AudioContext = undefined;
    // @ts-expect-error test shim
    window.webkitAudioContext = undefined;

    expect(() => createSceneAudioContext()).toThrow(
      "Web Audio API is not available in this environment",
    );

    window.AudioContext = original;
  });
});
