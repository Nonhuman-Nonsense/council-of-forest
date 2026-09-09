import { useState, useEffect, useRef, type RefObject } from "react";
import { useLocation } from "react-router";
import { log } from "@/logger";
import forestCharacters from "@shared/prompts/forest_characters.json";
import { CHAIR_ID } from "@/prompts/characterSetupBundles";
import { isMeetingPath } from "@/navigation";
import {
    characterAmbienceUrl,
    characterAudioSources,
    characterAudioUrl,
} from "@assets/characters/characterData";

//Beings whose loop can ever play: the chair, plus everyone given a volume in the manifest.
const loopedBeingIds = [
    CHAIR_ID,
    ...forestCharacters.filter((character) => character.audio).map((character) => character.id),
];

type AudioLoopOptions = {
    url: string;
    audioContext: RefObject<AudioContext | null>;
    /** Nothing is fetched until this turns true; it never goes back to false. */
    enabled?: boolean;
    /** Called once the loop is audible, for callers that want to fade it in. */
    onStarted?: (gain: GainNode, ctx: AudioContext) => void;
};

/**
 * Load a looping bed and wire it into the shared audio bus.
 *
 * The fetch runs in an effect rather than the render body, so React stays free to discard
 * and re-run a render, and it aborts on unmount — leaving the page mid-download used to
 * surface as an unhandled `TypeError: Failed to fetch`. Returns the gain node so callers
 * can fade the loop up and down.
 */
function useAudioLoop({ url, audioContext, enabled = true, onStarted }: AudioLoopOptions): RefObject<GainNode | null> {
    const gainNode = useRef<GainNode | null>(null);

    //Held in a ref so a caller's inline callback doesn't re-trigger the load.
    const onStartedRef = useRef(onStarted);
    useEffect(() => {
        onStartedRef.current = onStarted;
    });

    useEffect(() => {
        const ctx = audioContext.current;
        if (!ctx || !enabled) return;

        const controller = new AbortController();
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gainNode.current = gain;

        let source: AudioBufferSourceNode | null = null;

        void (async () => {
            const response = await fetch(url, { signal: controller.signal });
            const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
            if (controller.signal.aborted) return;

            source = ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            source.connect(gain);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            source.start();
            onStartedRef.current?.(gain, ctx);
        })().catch((err: unknown) => {
            //Unmounted mid-download: expected when navigating away, not a failure to report.
            if (controller.signal.aborted) return;
            log.event("ERROR", `Forest audio loop failed (${url})`, err);
        });

        return () => {
            controller.abort();
            source?.stop();
            source?.disconnect();
            gain.disconnect();
            gainNode.current = null;
        };
    }, [url, audioContext, enabled]);

    return gainNode;
}

type BeingAudioProps = {
    id: string;
    currentSpeakerId: string;
    volume: number;
    audioContext: RefObject<AudioContext | null>;
};

export function BeingAudio({ id, currentSpeakerId, volume, audioContext }: BeingAudioProps) {
    const [play, setPlay] = useState(false);

    // A being's loop is only ever audible while that being speaks, so nothing is fetched
    // until its first turn — and off a meeting nobody speaks, which is what keeps the
    // landing page down to the ambience bed instead of every loop in the forest.
    const [hasSpoken, setHasSpoken] = useState(false);

    useEffect(() => {
        setPlay(id === currentSpeakerId);
        if (id === currentSpeakerId) {
            setHasSpoken(true);
        }
    }, [id, currentSpeakerId]);

    const gainNode = useAudioLoop({
        url: characterAudioUrl(id),
        audioContext,
        enabled: hasSpoken,
    });

    useEffect(() => {
        const gain = gainNode.current;
        const ctx = audioContext.current;
        if (!gain || !ctx) return;
        if (play) {
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2);
        } else {
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
        }
    }, [play]);

    return null;
}

type AmbientAudioProps = {
    audioContext: RefObject<AudioContext | null>;
};

export function AmbientAudio({ audioContext }: AmbientAudioProps) {
    //Global ambience volume
    const onVolume = 0.05;

    useAudioLoop({
        url: characterAmbienceUrl,
        audioContext,
        onStarted: (gain, ctx) => gain.gain.linearRampToValueAtTime(onVolume, ctx.currentTime + 5),
    });

    return null;
}

/**
 * Warms the HTTP cache for every being loop while a meeting is open, so a being's first
 * turn doesn't wait on a cold fetch — a deep link into a running meeting never passes
 * through the character-select page that would otherwise have preloaded them.
 *
 * Preload only: nothing is decoded here, so resident AudioBuffers stay limited to the
 * beings that actually speak, and the landing page still loads the ambience bed alone.
 */
export function BeingAudioPreloader() {
    const location = useLocation();
    if (!isMeetingPath(location.pathname)) return null;

    return (
        <div style={{ display: "none", width: 0, height: 0, overflow: "hidden" }}>
            {loopedBeingIds.map((id) => (
                <audio key={id} preload="auto" muted>
                    {characterAudioSources(id).map((source) => (
                        <source key={source.src} src={source.src} type={source.type} />
                    ))}
                </audio>
            ))}
        </div>
    );
}
