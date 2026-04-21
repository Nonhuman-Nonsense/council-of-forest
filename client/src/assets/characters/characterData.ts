import { filename as toAssetBasename } from "@/utils";

const riverHevcGlob = import.meta.glob("/src/assets/characters/river-hevc-safari.mp4", {
    eager: true,
    import: "default",
}) as Record<string, string>;

const riverVp9Glob = import.meta.glob("/src/assets/characters/river-vp9-chrome.webm", {
    eager: true,
    import: "default",
}) as Record<string, string>;

const largeHevcGlob = import.meta.glob("/src/assets/characters/large/*-hevc-safari.mp4", {
    eager: true,
    import: "default",
}) as Record<string, string>;

const largeVp9Glob = import.meta.glob("/src/assets/characters/large/*-vp9-chrome.webm", {
    eager: true,
    import: "default",
}) as Record<string, string>;

const smallHevcGlob = import.meta.glob("/src/assets/characters/small/*-hevc-safari.mp4", {
    eager: true,
    import: "default",
}) as Record<string, string>;

const smallVp9Glob = import.meta.glob("/src/assets/characters/small/*-vp9-chrome.webm", {
    eager: true,
    import: "default",
}) as Record<string, string>;

const largePlainWebmGlob = import.meta.glob("/src/assets/characters/large/*.webm", {
    eager: true,
    import: "default",
}) as Record<string, string>;

const smallPlainWebmGlob = import.meta.glob("/src/assets/characters/small/*.webm", {
    eager: true,
    import: "default",
}) as Record<string, string>;

const imageAvifGlob = import.meta.glob("/src/assets/characters/images/*.avif", {
    eager: true,
    import: "default",
}) as Record<string, string>;

const iconWebpGlob = import.meta.glob("/src/assets/characters/icons/*.webp", {
    eager: true,
    import: "default",
}) as Record<string, string>;

const audioMp3Glob = import.meta.glob("/src/assets/characters/audio/*.mp3", {
    eager: true,
    import: "default",
}) as Record<string, string>;

const ambienceGlob = import.meta.glob("/src/assets/characters/ambience.mp3", {
    eager: true,
    import: "default",
}) as Record<string, string>;

function firstUrl(modules: Record<string, string>, label: string): string {
    const v = Object.values(modules)[0];
    if (!v) throw new Error(`Missing bundled asset: ${label}`);
    return v;
}

function mapDirCodec(
    paths: Record<string, string>,
    subdir: "large" | "small",
    kind: "hevc" | "vp9",
): Record<string, string> {
    const re =
        kind === "hevc"
            ? new RegExp(`/characters/${subdir}/([^/]+)-hevc-safari\\.mp4$`)
            : new RegExp(`/characters/${subdir}/([^/]+)-vp9-chrome\\.webm$`);
    const out: Record<string, string> = {};
    for (const [p, url] of Object.entries(paths)) {
        const norm = p.replace(/\\/g, "/");
        const m = norm.match(re);
        if (m) out[m[1]] = url;
    }
    return out;
}

function mapPlainWebm(paths: Record<string, string>, subdir: "large" | "small"): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [p, url] of Object.entries(paths)) {
        const normalized = p.replace(/\\/g, "/");
        if (!normalized.includes(`/characters/${subdir}/`)) continue;
        const base = normalized.split("/").pop() ?? "";
        if (base.includes("-vp9-chrome") || base.includes("-hevc-safari")) continue;
        const m = base.match(/^(.+)\.webm$/);
        if (m) out[m[1]] = url;
    }
    return out;
}

function mapImages(paths: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [p, url] of Object.entries(paths)) {
        const normalized = p.replace(/\\/g, "/");
        const m = normalized.match(/\/images\/([^/]+)\.avif$/);
        if (m) out[m[1]] = url;
    }
    return out;
}

function mapIcons(paths: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [p, url] of Object.entries(paths)) {
        const normalized = p.replace(/\\/g, "/");
        const m = normalized.match(/\/icons\/([^/]+)\.webp$/);
        if (m) out[m[1]] = url;
    }
    return out;
}

function mapAudio(paths: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [p, url] of Object.entries(paths)) {
        const normalized = p.replace(/\\/g, "/");
        const m = normalized.match(/\/audio\/([^/]+)\.mp3$/);
        if (m) out[m[1]] = url;
    }
    return out;
}

const riverHevcUrl = firstUrl(riverHevcGlob, "river-hevc-safari.mp4");
const riverVp9Url = firstUrl(riverVp9Glob, "river-vp9-chrome.webm");

const largeHevcById = mapDirCodec(largeHevcGlob, "large", "hevc");
const largeVp9ById = mapDirCodec(largeVp9Glob, "large", "vp9");
const smallHevcById = mapDirCodec(smallHevcGlob, "small", "hevc");
const smallVp9ById = mapDirCodec(smallVp9Glob, "small", "vp9");

const largePlainWebmById = mapPlainWebm(largePlainWebmGlob, "large");
const smallPlainWebmById = mapPlainWebm(smallPlainWebmGlob, "small");

export const characterImageAvifByBasename = mapImages(imageAvifGlob);
export const characterIconWebpByBasename = mapIcons(iconWebpGlob);
const characterMp3ByBasename = mapAudio(audioMp3Glob);

export const characterAmbienceUrl = firstUrl(ambienceGlob, "ambience.mp3");

/** HEVC + VP9 URLs for transparent characters; river uses root files, others use large/ or small/. */
export function characterTransparentVideoUrls(
    characterId: string,
    isMobile: boolean,
): { hevc: string; vp9: string } {
    if (characterId === "river") {
        return { hevc: riverHevcUrl, vp9: riverVp9Url };
    }
    const fn = toAssetBasename(characterId);
    const hevcMap = isMobile ? smallHevcById : largeHevcById;
    const vp9Map = isMobile ? smallVp9ById : largeVp9ById;
    const hevc = hevcMap[fn];
    const vp9 = vp9Map[fn];
    if (!hevc || !vp9) {
        const folder = isMobile ? "small" : "large";
        throw new Error(
            `Missing transparent video pair for "${characterId}" (expected src/assets/characters/${folder}/${fn}-hevc-safari.mp4 and …-vp9-chrome.webm)`,
        );
    }
    return { hevc, vp9 };
}

/** Single WebM for non-transparent / legacy `type !== "transparent"` animations. */
export function characterOpaqueVideoUrl(characterId: string, isMobile: boolean): string {
    const fn = toAssetBasename(characterId);
    const map = isMobile ? smallPlainWebmById : largePlainWebmById;
    const url = map[fn];
    if (!url) {
        const folder = isMobile ? "small" : "large";
        throw new Error(
            `Missing opaque video for "${characterId}" (expected src/assets/characters/${folder}/${fn}.webm)`,
        );
    }
    return url;
}

export function characterImageAvifUrl(characterId: string): string {
    const fn = toAssetBasename(characterId);
    const url = characterImageAvifByBasename[fn];
    if (!url) {
        throw new Error(`Missing character image for "${characterId}" (expected src/assets/characters/images/${fn}.avif)`);
    }
    return url;
}

/** Selection / UI icons (`add`, `panelist`, and one per character id). */
export function characterIconWebpUrl(iconBasename: string): string {
    const fn = toAssetBasename(iconBasename);
    const url = characterIconWebpByBasename[fn];
    if (!url) {
        throw new Error(`Missing character icon for "${iconBasename}" (expected src/assets/characters/icons/${fn}.webp)`);
    }
    return url;
}

export function characterMp3Url(characterId: string): string {
    const fn = toAssetBasename(characterId);
    const url = characterMp3ByBasename[fn];
    if (!url) {
        throw new Error(`Missing character audio for "${characterId}" (expected src/assets/characters/audio/${fn}.mp3)`);
    }
    return url;
}
