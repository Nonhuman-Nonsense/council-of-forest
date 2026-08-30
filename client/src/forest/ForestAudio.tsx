import { useState, useEffect, useRef, type RefObject } from "react";
import { log } from "@/logger";
import {
    characterAmbienceUrl,
    characterMp3Url,
} from "@assets/characters/characterData";

type AudioLoopOptions = {
    url: string;
    audioContext: RefObject<AudioContext | null>;
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
function useAudioLoop({ url, audioContext, onStarted }: AudioLoopOptions): RefObject<GainNode | null> {
    const gainNode = useRef<GainNode | null>(null);

    //Held in a ref so a caller's inline callback doesn't re-trigger the load.
    const onStartedRef = useRef(onStarted);
    useEffect(() => {
        onStartedRef.current = onStarted;
    });

    useEffect(() => {
        const ctx = audioContext.current;
        if (!ctx) return;

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
    }, [url, audioContext]);

    return gainNode;
}

type BeingAudioProps = {
    id: string;
    currentSpeakerId: string;
    volume: number;
    audioContext: RefObject<AudioContext | null>;
};

export function BeingAudio({ id, currentSpeakerId, volume, audioContext }: BeingAudioProps) {
    const gainNode = useAudioLoop({ url: characterMp3Url(id), audioContext });

    const [play, setPlay] = useState(false);

    useEffect(() => {
        setPlay(id === currentSpeakerId);
    }, [id, currentSpeakerId]);

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
