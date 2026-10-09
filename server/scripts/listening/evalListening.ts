/**
 * Do the beings listen to the humans? Cuts stored meetings at moments a human has just spoken,
 * generates the next replies the way a live meeting would, and writes a report to read through
 * (see docs/listening-to-humans.md). The development loop: change a prompt, run this with
 * --replay on the previous report, read what changed.
 *
 * Three kinds of cut, from the letters corpus (npm run letters:corpus):
 *   - corpus:   right after a human's question that is already in the meeting;
 *   - inserted: after a being's turn, with a human line from listeningLines.ts added, rotated so
 *               ordinary, rude, off-topic and follow-up lines all appear;
 *   - control:  after a being's turn with no human nearby — nothing should change here, which is
 *               how a prompt change that alters the whole meeting shows up.
 * After a human, two replies are generated (the chair waits for two beings to reply); after a
 * control cut, one.
 *
 * Who replies is decided once per cut, by the server's own speaker selection (and, for the second
 * reply, the hand-off classifier on the first), and then kept: every sample and every replay asks
 * the same beings, so a difference between two runs comes from the prompts, not from routing.
 *
 * Each reply is checked mechanically and scored by a judge model (the letter model unless
 * --judge-model says otherwise): does it take up what the human said, does it start there, does it
 * stay in character, does it find its way back to the topic, does it repeat the reply before it.
 *
 *   npm run listening:eval -- [--tag letters | --ids 1160,1161] [--samples 2] [--parallel 4] [--label "v1"]
 *                             [--inserted 1] [--controls 1] [--seed 1]
 *                             [--prompts current|stored] [--judge-model anthropic/claude-sonnet-5-5] [--no-judge]
 *                             [--replay scripts/listening/reports/<earlier>.json]
 *
 * --prompts current (the default) rebuilds every stored meeting's topic and being prompts from
 * shared/prompts as they are now, so an edited prompt is what gets tested; stored keeps the prompts
 * the meeting was generated with. --replay keeps an earlier report's cuts, human lines and
 * speakers, generates the replies again, and shows the earlier run's numbers and replies alongside.
 *
 * Writes scripts/listening/reports/<time>.html and .json.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import type { Character, HumanMessage, Message, Topic } from "@shared/ModelTypes.js";
import type { StoredMeeting } from "@models/DBModels.js";
import { buildMeetingSystemPrompt } from "@shared/topicPrompt.js";
import { injectRandomAgendaPoint, RANDOM_AGENDA_POINT_PLACEHOLDER } from "@shared/agendaPointInjection.js";
import { CHARACTERS_FILE } from "@shared/prompts/characterSetupMetadata.js";
import { closeDb, initDb, meetingsCollection } from "@services/DbService.js";
import { getOpenAI, initOpenAI } from "@services/OpenAIService.js";
import { createConversationService } from "@services/ConversationService.js";
import { DialogGenerator } from "@logic/DialogGenerator.js";
import { getGlobalOptions } from "@logic/GlobalOptions.js";
import { SpeakerSelector } from "@logic/SpeakerSelector.js";
import { SpeakerTargetClassifier } from "@logic/SpeakerTargetClassifier.js";
import { annotateDirectedHandoff } from "@logic/directedHandoff.js";
import { LAST_SPEAKER, LISTENING_LINES, type ListeningLine } from "./listeningLines.js";

function arg(name: string, fallback: string): string {
    const index = process.argv.indexOf(`--${name}`);
    return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const TAG = arg("tag", "letters");
const IDS = arg("ids", "").split(",").filter(Boolean).map(Number);
const SAMPLES = Number(arg("samples", "2"));
const PARALLEL = Number(arg("parallel", "4"));
const LABEL = arg("label", "");
const INSERTED = Number(arg("inserted", "1"));
const CONTROLS = Number(arg("controls", "1"));
const SEED = Number(arg("seed", "1"));
const PROMPTS = arg("prompts", "current");
const JUDGE_MODEL = arg("judge-model", "");
const NO_JUDGE = process.argv.includes("--no-judge");
const REPLAY = arg("replay", "");
const PROMPTS_DIR = path.join(process.cwd(), "../shared/prompts");
const REPORTS_DIR = path.join(process.cwd(), "scripts/listening/reports");

/** Turns of conversation before the cut that the report and the judge show. */
const CONTEXT_TURNS = 6;

if (PROMPTS !== "current" && PROMPTS !== "stored") {
    console.error(`--prompts must be "current" or "stored", not "${PROMPTS}"`);
    process.exit(1);
}

/** Deterministic, so the same seed picks the same cuts and lines. */
function rng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const random = rng(SEED);
function shuffled<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/* -------------------------------------------------------------------------- */
/* Prompts as they are now                                                    */
/* -------------------------------------------------------------------------- */

interface TopicsBundle { system: string; topics: Topic[] }
interface BeingsBundle { characters: Character[] }

const bundles = new Map<string, { topics: TopicsBundle; beings: BeingsBundle }>();

async function bundleFor(language: string) {
    if (!bundles.has(language)) {
        const read = async <T>(file: string) => JSON.parse(await readFile(path.join(PROMPTS_DIR, file), "utf8")) as T;
        bundles.set(language, {
            topics: await read<TopicsBundle>(`topics_${language}.json`),
            beings: await read<BeingsBundle>(`${CHARACTERS_FILE}_${language}.json`),
        });
    }
    return bundles.get(language)!;
}

const titleCase = (text: string) =>
    text.toLowerCase().split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

/**
 * The agenda point the stored chair prompt was given, read back from it using the words that
 * precede the placeholder in today's template, so the rebuilt chair opens the same point.
 */
function storedAgendaPoint(storedPrompt: string, template: string): number | undefined {
    const at = template.indexOf(RANDOM_AGENDA_POINT_PLACEHOLDER);
    if (at === -1) return undefined;
    const before = template.slice(Math.max(0, at - 24), at);
    const found = storedPrompt.indexOf(before);
    if (found === -1) return undefined;
    const digits = /^\d+/.exec(storedPrompt.slice(found + before.length));
    return digits ? Number(digits[0]) : undefined;
}

/**
 * The meeting with today's topic and being prompts, set up as the client and generateCorpus.ts
 * do it. Human panelists keep what they were given; a chair whose stored prompt names panelists
 * keeps its stored prompt, since the corpus has none and rebuilding that is not worth it here.
 */
async function withCurrentPrompts(meeting: StoredMeeting): Promise<StoredMeeting> {
    const { topics, beings } = await bundleFor(meeting.language);
    const copy = structuredClone(meeting);
    const topic = topics.topics.find((t) => t.id === meeting.topic.id);
    if (topic) {
        copy.topic.prompt = buildMeetingSystemPrompt(topics.system, topic.prompt, topic.agendaPoints, meeting.language);
    } else {
        console.warn(`  #${meeting._id}: topic "${meeting.topic.id}" not in today's prompts; keeping the stored one`);
    }
    const hasPanelists = meeting.characters.some((c) => c.id.startsWith("panelist"));
    copy.characters = meeting.characters.map((character, index) => {
        const fresh = beings.characters.find((c) => c.id === character.id);
        if (!fresh) return character;
        if (index > 0) return { ...character, prompt: fresh.prompt };
        if (hasPanelists) return character;
        const participants = meeting.characters.slice(1).map((c) => titleCase(c.name)).join(", ");
        const prompt = fresh.prompt.replace("[CHARACTERS]", participants).replace("[HUMANS]", "");
        return {
            ...character,
            prompt: injectRandomAgendaPoint(prompt, topic?.agendaPoints, storedAgendaPoint(character.prompt, fresh.prompt)),
        };
    });
    return copy;
}

/* -------------------------------------------------------------------------- */
/* Cuts                                                                       */
/* -------------------------------------------------------------------------- */

type CutKind = "corpus" | "inserted" | "control";

interface Cut {
    key: string;
    meetingId: number;
    kind: CutKind;
    /** The conversation is cut to this length; `added` follows. */
    at: number;
    /** Messages added after the cut: the inserted human message. */
    added: Message[];
    humanName: string | null;
    line: { kind: string; text: string } | null;
    /** Who gives each reply, fixed on the first sample and kept from then on. */
    speakers: string[];
}

const SPOKEN_TYPES = new Set(["message", "response", "human", "panelist"]);
const isBeingTurn = (m: Message | undefined, chairId: string) =>
    !!m && (m.type === "message" || m.type === "response") && m.speaker !== chairId && !m.speaker.startsWith("panelist");
const isHuman = (m: Message | undefined) => !!m && (m.type === "human" || (m.type === "panelist" && m.speaker.startsWith("panelist")));
const nameOf = (meeting: StoredMeeting, id: string | undefined) => meeting.characters.find((c) => c.id === id)?.name ?? id ?? "?";

/** As HumanInputHandler stores a human's words. */
function humanMessage(meeting: StoredMeeting, humanName: string, text: string, askParticular?: string): HumanMessage {
    return {
        id: "human-" + uuidv4(),
        type: "human",
        speaker: humanName,
        text: humanName + (meeting.language === "en" ? " said:\xa0" : " sa:\xa0") + text,
        ...(askParticular ? { askParticular } : {}),
    };
}

/** Cut points after a being's turn, at least `quiet` turns away from any human. */
function quietCutPoints(meeting: StoredMeeting, chairId: string, quiet: number): number[] {
    const conversation = meeting.conversation;
    const points: number[] = [];
    for (let at = 3; at < conversation.length; at++) {
        if (!isBeingTurn(conversation[at - 1], chairId)) continue;
        const near = conversation.slice(Math.max(0, at - quiet), Math.min(conversation.length, at + quiet));
        if (near.some(isHuman)) continue;
        points.push(at);
    }
    return points;
}

function planCuts(meeting: StoredMeeting, chairId: string, directedSpeakerRouting: boolean, lines: Record<string, ListeningLine[]>, used: Record<string, number>): Cut[] {
    const cuts: Cut[] = [];
    const conversation = meeting.conversation;
    const humanName = meeting.state?.humanName || "Visitor";

    conversation.forEach((message, index) => {
        if (!isHuman(message)) return;
        cuts.push({
            key: `${meeting._id}:corpus:${index + 1}`,
            meetingId: meeting._id,
            kind: "corpus",
            at: index + 1,
            added: [],
            humanName: message.type === "human" ? humanName : nameOf(meeting, message.speaker),
            line: { kind: (meeting as StoredMeeting & { devCorpus?: { visitorKind?: string } }).devCorpus?.visitorKind ?? "corpus", text: message.text ?? "" },
            speakers: [],
        });
    });

    const quiet = shuffled(quietCutPoints(meeting, chairId, 3));
    const pool = lines[meeting.language] ?? [];
    for (const at of quiet.slice(0, pool.length ? INSERTED : 0)) {
        const line = pool[used[meeting.language]++ % pool.length];
        const lastSpeaker = nameOf(meeting, conversation[at - 1].speaker);
        cuts.push({
            key: `${meeting._id}:inserted:${at}`,
            meetingId: meeting._id,
            kind: "inserted",
            at,
            added: [], // filled when the cut is first run: the classifier decides who was asked
            humanName,
            line: { kind: line.kind, text: line.text.replaceAll(LAST_SPEAKER, titleCase(lastSpeaker)) },
            speakers: [],
        });
    }

    // Controls measure the beings, so only where routing gives the floor to one of them.
    const taken = new Set(cuts.map((c) => c.at));
    const beingNext = (at: number) => meeting.characters[
        SpeakerSelector.calculateNextSpeaker(conversation.slice(0, at), meeting.characters, { directedSpeakerRouting, chairId })
    ]?.id !== chairId;
    for (const at of quiet.filter((a) => !taken.has(a) && beingNext(a)).slice(0, CONTROLS)) {
        cuts.push({ key: `${meeting._id}:control:${at}`, meetingId: meeting._id, kind: "control", at, added: [], humanName: null, line: null, speakers: [] });
    }
    return cuts;
}

/* -------------------------------------------------------------------------- */
/* Replies                                                                    */
/* -------------------------------------------------------------------------- */

type Severity = "fail" | "warn" | "note";
interface Flag { severity: Severity; text: string }

interface Judgement {
    engages: "direct" | "partial" | "ignores";
    opensWithTarget: boolean;
    inCharacter: "yes" | "weak" | "no";
    returnsToTopic: boolean;
    repeatsEarlier: boolean;
    note: string;
}

interface Reply {
    speakerId: string;
    speakerName: string;
    text: string;
    seconds: number;
    judge?: Judgement;
    judgeError?: string;
    flags: Flag[];
}

interface Sample { replies: Reply[]; error?: string }

interface CutResult extends Cut {
    language: string;
    topic: { id: string; title: string };
    members: Array<{ id: string; name: string }>;
    context: string;
    samples: Sample[];
}

interface Run {
    options: ReturnType<typeof getGlobalOptions>;
    dialogGenerator: DialogGenerator;
    classifier: SpeakerTargetClassifier;
    judge: (prompt: string) => Promise<string>;
}

/** How a turn reads in the report and to the judge: the stored text, which already names a human. */
function transcriptLine(meeting: StoredMeeting, message: Message): string {
    if (message.type === "human") return message.text;
    return `${nameOf(meeting, message.speaker)}: ${message.text}`;
}

function contextOf(meeting: StoredMeeting, conversation: Message[]): string {
    return conversation
        .filter((m) => SPOKEN_TYPES.has(m.type) && typeof m.text === "string" && m.text !== "")
        .slice(-CONTEXT_TURNS)
        .map((m) => transcriptLine(meeting, m))
        .join("\n\n");
}

function mechanicalFlags(reply: Reply, humanName: string | null): Flag[] {
    const flags: Flag[] = [];
    const text = reply.text;
    if (text === "") return [{ severity: "fail", text: "empty reply" }];
    if (/\*\*|^#+\s|^\s*[-*]\s/m.test(text)) flags.push({ severity: "warn", text: "markdown in the reply" });
    if (/^\s*\w[\w ]{0,20}:\s/.test(text)) flags.push({ severity: "warn", text: "starts with a speaker label" });
    if (/\b(said|sa):\s/i.test(text)) flags.push({ severity: "warn", text: 'imitates the "Name said:" form' });
    if (humanName && humanName !== "Visitor") {
        const at = text.toLowerCase().indexOf(humanName.toLowerCase());
        if (at !== -1 && at < 40) flags.push({ severity: "note", text: `opens by naming ${humanName}` });
        else if (at !== -1) flags.push({ severity: "note", text: `names ${humanName}` });
    }
    return flags;
}

const JUDGE_INSTRUCTION = `You review one turn of a staged council debate in which nonhuman beings of northern Sweden — a river, reindeer, lichen, a mountain, a wind turbine and others — argue about land use. Each being has a strong, deliberately stylised voice: some speak in fragments, sounds or a handful of words, some buzz or stammer. That is intended, not a fault. Humans from the audience sometimes speak to the council, and the project wants the beings to be very responsive to them: when a human has just spoken, the next beings should take up what the human actually said, in their own voice, before going on with their own concerns.

You get the being's character, the recent conversation, the TARGET the reply should respond to, any replies already given to it, and the REPLY. Judge only the REPLY.

Answer with JSON only, no other text:
{"engages": "direct" | "partial" | "ignores", "opensWithTarget": true | false, "inCharacter": "yes" | "weak" | "no", "returnsToTopic": true | false, "repeatsEarlier": true | false, "note": "..."}

- engages: "direct" — the reply clearly takes up the TARGET's actual point or question (for a provocation or an insult, it responds to it). "partial" — it nods to the TARGET (a name, a keyword, a single clause) but mostly says something else, or answers a question that was not asked. "ignores" — it does not respond to the TARGET.
- opensWithTarget: the response to the TARGET comes first, in the opening sentence or two, after any sound or tic the character always opens with.
- inCharacter: the voice, style and length fit the character.
- returnsToTopic: the reply connects to the meeting's subject (the land, the forest, the river, the agenda) rather than staying only with the TARGET. True when the TARGET is itself on that subject and the reply stays there.
- repeatsEarlier: the reply mostly repeats what a reply already given to the TARGET said. False when there is none.
- note: one short sentence, in English, on the most important thing about this reply.`;

function judgePrompt(meeting: StoredMeeting, cut: Cut, conversation: Message[], earlier: Reply[], reply: Reply): string {
    const character = meeting.characters.find((c) => c.id === reply.speakerId);
    const last = conversation[conversation.length - 1 - earlier.length];
    const target = cut.kind === "control"
        ? `the previous turn, by ${nameOf(meeting, last.speaker)}: «${last.text}»`
        : `the human ${cut.humanName}'s words: «${cut.line?.text.replace(/^.*?(said|sa):\s/u, "") ?? ""}»`;
    return [
        `CHARACTER: ${character?.name ?? reply.speakerName} — ${character?.description ?? ""}`,
        `MEETING TOPIC: ${meeting.topic.title}`,
        `RECENT CONVERSATION:\n${contextOf(meeting, conversation.slice(0, conversation.length - earlier.length))}`,
        `TARGET: ${target}`,
        `REPLIES ALREADY GIVEN TO IT:\n${earlier.length ? earlier.map((r) => `${r.speakerName}: ${r.text}`).join("\n\n") : "(none)"}`,
        `REPLY, by ${reply.speakerName}:\n${reply.text}`,
    ].join("\n\n");
}

function parseJudgement(raw: string): Judgement {
    const json = /\{[\s\S]*\}/.exec(raw);
    if (!json) throw new Error(`no JSON in judge answer: ${raw.slice(0, 160)}`);
    const parsed = JSON.parse(json[0]) as Partial<Judgement>;
    if (!["direct", "partial", "ignores"].includes(parsed.engages ?? "") || !["yes", "weak", "no"].includes(parsed.inCharacter ?? "")) {
        throw new Error(`unexpected judge answer: ${json[0].slice(0, 160)}`);
    }
    return {
        engages: parsed.engages!,
        opensWithTarget: parsed.opensWithTarget === true,
        inCharacter: parsed.inCharacter!,
        returnsToTopic: parsed.returnsToTopic === true,
        repeatsEarlier: parsed.repeatsEarlier === true,
        note: String(parsed.note ?? ""),
    };
}

/** Who speaks next, by the server's own rules. */
function nextSpeaker(run: Run, meeting: StoredMeeting): Character {
    const index = SpeakerSelector.calculateNextSpeaker(meeting.conversation, meeting.characters, {
        directedSpeakerRouting: run.options.directedSpeakerRouting,
        chairId: run.options.chairId,
    });
    return meeting.characters[index];
}

/**
 * One sample of a cut: the replies, generated in order on the cut conversation as a live meeting
 * would. On the first sample of a fresh cut it also settles what the cut leaves open — who the
 * human asked, and who replies.
 */
async function runSample(run: Run, base: StoredMeeting, cut: Cut): Promise<Sample> {
    const meeting = structuredClone(base);
    meeting.conversation = base.conversation.slice(0, cut.at);
    if (cut.humanName && cut.kind !== "control") meeting.state = { ...meeting.state, humanName: cut.humanName };

    if (cut.kind === "inserted" && cut.added.length === 0 && cut.line) {
        const askParticular = await run.classifier.inferTarget(meeting, { mode: "humanQuestion", text: cut.line.text, speakerId: cut.humanName! });
        cut.added = [humanMessage(meeting, cut.humanName!, cut.line.text, askParticular)];
    }
    meeting.conversation.push(...structuredClone(cut.added));

    const replyCount = cut.kind === "control" ? 1 : 2;
    const settling = cut.speakers.length === 0;
    const replies: Reply[] = [];
    try {
        for (let n = 0; n < replyCount; n++) {
            const speaker = settling ? nextSpeaker(run, meeting) : meeting.characters.find((c) => c.id === cut.speakers[n]);
            if (!speaker) throw new Error(`speaker ${cut.speakers[n]} is not in meeting #${meeting._id}`);
            if (settling) cut.speakers.push(speaker.id);

            const start = Date.now();
            const output = await run.dialogGenerator.generateResponse(speaker, meeting, meeting.characters.indexOf(speaker));
            const previous = meeting.conversation[meeting.conversation.length - 1];
            const message: Message = {
                id: output.id || uuidv4(),
                speaker: speaker.id,
                text: output.response,
                sentences: output.sentences || [],
                type: previous && "askParticular" in previous && previous.askParticular === speaker.id ? "response" : "message",
            };
            // Only routing needs the hand-off, and routing is only settled once.
            if (settling && n < replyCount - 1) await annotateDirectedHandoff(run.classifier, run.options, meeting, message);
            meeting.conversation.push(message);

            const reply: Reply = {
                speakerId: speaker.id,
                speakerName: speaker.name,
                text: output.response,
                seconds: Math.round((Date.now() - start) / 100) / 10,
                flags: [],
            };
            reply.flags = mechanicalFlags(reply, cut.humanName);
            replies.push(reply);
        }
    } catch (error) {
        // Unsettled: the next sample tries again from the start.
        if (settling) cut.speakers = [];
        return { replies, error: (error as Error).message };
    }

    if (!NO_JUDGE) {
        await Promise.all(replies.map(async (reply, n) => {
            try {
                const conversation = meeting.conversation.slice(0, meeting.conversation.length - (replies.length - n));
                reply.judge = parseJudgement(await run.judge(judgePrompt(meeting, cut, conversation, replies.slice(0, n), reply)));
            } catch (error) {
                reply.judgeError = (error as Error).message;
            }
        }));
    }
    return { replies };
}

/** Runs `work` over `items`, `PARALLEL` at a time, keeping the input order in the result. */
async function pooled<T, R>(items: T[], work: (item: T, index: number) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    await Promise.all(Array.from({ length: PARALLEL }, async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await work(items[index], index);
        }
    }));
    return results;
}

/* -------------------------------------------------------------------------- */
/* Summary                                                                    */
/* -------------------------------------------------------------------------- */

interface GroupStats {
    replies: number;
    judged: number;
    direct: number;
    partial: number;
    ignores: number;
    opens: number;
    inCharacter: number;
    returns: number;
    repeats: number;
    chars: number;
}

/** "after a human · reply 1", "after a human · reply 2", "control". */
function groupOf(kind: CutKind, n: number): string {
    return kind === "control" ? "control (no human)" : `after a human · reply ${n + 1}`;
}

function summarise(results: CutResult[], key: (r: CutResult, reply: Reply, n: number) => string | null): Map<string, GroupStats> {
    const groups = new Map<string, GroupStats>();
    for (const r of results) for (const s of r.samples) s.replies.forEach((reply, n) => {
        const k = key(r, reply, n);
        if (k === null) return;
        const g = groups.get(k) ?? { replies: 0, judged: 0, direct: 0, partial: 0, ignores: 0, opens: 0, inCharacter: 0, returns: 0, repeats: 0, chars: 0 };
        g.replies++;
        g.chars += reply.text.length;
        if (reply.judge) {
            g.judged++;
            g[reply.judge.engages]++;
            if (reply.judge.opensWithTarget) g.opens++;
            if (reply.judge.inCharacter === "yes") g.inCharacter++;
            if (reply.judge.returnsToTopic) g.returns++;
            if (reply.judge.repeatsEarlier) g.repeats++;
        }
        groups.set(k, g);
    });
    return groups;
}

const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "–");

const COLUMNS: Array<[string, (g: GroupStats) => string]> = [
    ["replies", (g) => String(g.replies)],
    ["takes it up", (g) => pct(g.direct, g.judged)],
    ["partly", (g) => pct(g.partial, g.judged)],
    ["ignores", (g) => pct(g.ignores, g.judged)],
    ["starts there", (g) => pct(g.opens, g.judged)],
    ["back to topic", (g) => pct(g.returns, g.judged)],
    ["in character", (g) => pct(g.inCharacter, g.judged)],
    ["repeats", (g) => pct(g.repeats, g.judged)],
    ["avg chars", (g) => String(g.replies ? Math.round(g.chars / g.replies) : 0)],
];

const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function statsTable(title: string, now: Map<string, GroupStats>, before?: Map<string, GroupStats>): string {
    const keys = [...new Set([...now.keys(), ...(before?.keys() ?? [])])].sort();
    const cell = (k: string, f: (g: GroupStats) => string) => {
        const a = now.get(k);
        const b = before?.get(k);
        const value = a ? f(a) : "–";
        return before ? `<td>${esc(value)}<span class="was">${b ? esc(f(b)) : "–"}</span></td>` : `<td>${esc(value)}</td>`;
    };
    return `<h3>${esc(title)}</h3><table class="stats-table"><tr><th></th>${COLUMNS.map(([c]) => `<th>${c}</th>`).join("")}</tr>${keys.map((k) => `<tr><td class="k">${esc(k)}</td>${COLUMNS.map(([, f]) => cell(k, f)).join("")}</tr>`).join("")}</table>`;
}

/* -------------------------------------------------------------------------- */
/* Report                                                                     */
/* -------------------------------------------------------------------------- */

const ENGAGE_LABEL: Record<Judgement["engages"], string> = { direct: "takes it up", partial: "partly", ignores: "ignores" };

function renderReply(reply: Reply): string {
    const j = reply.judge;
    const verdict = j
        ? `<div class="verdict ${j.engages}"><b>${ENGAGE_LABEL[j.engages]}</b>${j.opensWithTarget ? " · starts there" : ""}${j.returnsToTopic ? " · back to topic" : ""} · in character: ${j.inCharacter}${j.repeatsEarlier ? " · <b>repeats</b>" : ""}<br>${esc(j.note)}</div>`
        : reply.judgeError ? `<div class="verdict ignores">judge failed: ${esc(reply.judgeError)}</div>` : "";
    return `<div class="reply"><div class="who">${esc(reply.speakerName)} <span class="dim">${reply.text.length} chars · ${reply.seconds} s</span></div><div class="text">${esc(reply.text)}</div>${reply.flags.length ? `<ul class="flags">${reply.flags.map((f) => `<li class="${f.severity}">${esc(f.text)}</li>`).join("")}</ul>` : ""}${verdict}</div>`;
}

function renderReport(results: CutResult[], meta: Record<string, string>, earlier?: CutResult[]): string {
    const byGroup = (rs: CutResult[]) => summarise(rs, (r, _reply, n) => groupOf(r.kind, n));
    const byLine = (rs: CutResult[]) => summarise(rs, (r, _reply, n) => (r.kind === "control" || n > 0 ? null : r.line?.kind ?? "?"));
    const byBeing = (rs: CutResult[]) => summarise(rs, (r, reply, n) => (r.kind === "control" || n > 0 ? null : reply.speakerName));
    const earlierByKey = new Map((earlier ?? []).map((r) => [r.key, r]));

    const summary = `
<section class="summary">
  ${statsTable("All replies", byGroup(results), earlier && byGroup(earlier))}
  ${statsTable("First reply to a human, by what the human said", byLine(results), earlier && byLine(earlier))}
  ${statsTable("First reply to a human, by being", byBeing(results), earlier && byBeing(earlier))}
  ${earlier ? `<p class="dim">Each cell: this run, then <span class="was">the earlier run</span>.</p>` : ""}
</section>`;

    const cards = results.map((r) => {
        const before = earlierByKey.get(r.key);
        const human = r.kind !== "control" && r.line;
        return `
<article class="${r.kind}">
  <header>
    <h2>#${r.meetingId} · ${esc(r.topic.title)} · ${r.language} · <span class="kind">${r.kind}</span>${human ? ` · ${esc(r.line!.kind)}` : ""}</h2>
    <div class="dim">${r.members.map((m) => esc(m.name)).join(", ")} · cut at turn ${r.at}</div>
  </header>
  <details><summary>Before the cut</summary><pre>${esc(r.context)}</pre></details>
  ${human ? `<p class="human"><b>${esc(r.humanName ?? "The human")}:</b> ${esc(r.line!.text.replace(/^.*?(said|sa):\s/u, ""))}${r.added[0] && "askParticular" in r.added[0] && r.added[0].askParticular ? ` <span class="dim">(asked ${esc(r.added[0].askParticular)})</span>` : ""}</p>` : ""}
  ${r.samples.map((s, i) => `<div class="sample">${r.samples.length > 1 ? `<div class="dim">sample ${i + 1}</div>` : ""}${s.replies.map(renderReply).join("")}${s.error ? `<pre class="error">${esc(s.error)}</pre>` : ""}</div>`).join("")}
  ${before ? `<details class="earlier"><summary>Earlier run</summary>${before.samples.map((s) => `<div class="sample">${s.replies.map(renderReply).join("")}</div>`).join("")}</details>` : ""}
</article>`;
    }).join("");

    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Listening evaluation ${esc(meta.time)}</title>
<style>
:root{--bg:#f7f6f2;--card:#fff;--ink:#1e1e1c;--dim:#6b6a65;--line:#e3e1da;--fail:#b3261e;--warn:#8a5a00;--note:#4a5b6b;--ok:#2f6b3a;--accent:#2f5d50}
@media (prefers-color-scheme:dark){:root{--bg:#171816;--card:#20221f;--ink:#e8e6df;--dim:#9a988f;--line:#33352f;--fail:#f2847b;--warn:#e0b25b;--note:#9fb3c4;--ok:#8fd19e;--accent:#8cc5b0}}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
main{max-width:960px;margin:0 auto;padding:24px 16px 80px}
h1{font-size:22px;margin:0 0 4px} h2{font-size:16px;margin:0} h3{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:var(--dim);margin:16px 0 6px}
.dim{color:var(--dim);font-size:13px}
.summary{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:4px 16px 16px;margin:16px 0 24px;overflow-x:auto}
table{border-collapse:collapse;font-size:13px;width:100%}th{font-weight:600;text-align:right;color:var(--dim);padding:2px 6px;white-space:nowrap}td{text-align:right;padding:2px 6px;white-space:nowrap}td.k{text-align:left}
.was{display:block;color:var(--dim);font-size:11px}
article{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;margin:0 0 16px}
article.control{border-style:dashed}.kind{text-transform:uppercase;font-size:12px;letter-spacing:.04em;color:var(--accent)}
.human{border-left:3px solid var(--accent);padding-left:12px}
.sample{margin-top:10px}.reply{border-top:1px solid var(--line);padding:8px 0}.who{font-weight:600}.text{white-space:pre-wrap}
.verdict{font-size:13px;margin-top:4px}.verdict.direct b{color:var(--ok)}.verdict.partial b{color:var(--warn)}.verdict.ignores b,.verdict.ignores{color:var(--fail)}
.flags{list-style:none;padding:0;margin:4px 0;font-size:13px}.flags li.fail{color:var(--fail)}.flags li.warn{color:var(--warn)}.flags li.note{color:var(--note)}
pre{white-space:pre-wrap;font-size:12px;background:var(--bg);padding:8px;border-radius:6px}pre.error{color:var(--fail)}
details{margin-top:8px}summary{cursor:pointer;color:var(--dim);font-size:13px}details.earlier{opacity:.8}
</style></head><body><main>
<h1>Listening evaluation${meta.label ? ` — ${esc(meta.label)}` : ""}</h1>
<div class="dim">${esc(meta.time)} · ${esc(meta.model)} · git ${esc(meta.git)} · ${esc(meta.source)}</div>
${summary}
${cards}
</main></body></html>`;
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
    await initDb();
    initOpenAI();
    const options = getGlobalOptions();
    const conversationService = createConversationService(getOpenAI);
    const judgeModel = JUDGE_MODEL || options.letterModel;
    const run: Run = {
        options,
        dialogGenerator: new DialogGenerator({ conversationService, meetingsCollection }, options),
        classifier: new SpeakerTargetClassifier(options),
        judge: async (prompt) => {
            const completion = await conversationService.createChatCompletion({
                model: judgeModel,
                reasoning: "low",
                temperature: 1,
                maxCompletionTokens: 2000,
                messages: [{ role: "system", content: JUDGE_INSTRUCTION }, { role: "user", content: prompt }],
            });
            return completion.content ?? "";
        },
    };

    const earlier = REPLAY ? (JSON.parse(await readFile(REPLAY, "utf8")) as { results: CutResult[] }).results : undefined;
    const ids = earlier ? [...new Set(earlier.map((r) => r.meetingId))] : IDS;
    const query = ids.length ? { _id: { $in: ids } } : { "devCorpus.tag": TAG };
    const stored = await meetingsCollection.find(query).sort({ _id: 1 }).toArray();
    if (stored.length === 0) {
        console.error(`No meetings found for ${ids.length ? `ids ${ids.join(",")}` : `tag "${TAG}"`}. Run npm run letters:corpus first.`);
        process.exit(1);
    }
    const meetings = new Map(await Promise.all(stored.map(async (m) => [m._id, PROMPTS === "current" ? await withCurrentPrompts(m) : m] as const)));

    let cuts: Cut[];
    if (earlier) {
        // The earlier cuts as they were: same human lines, same speakers.
        cuts = earlier.filter((r) => meetings.has(r.meetingId)).map(({ key, meetingId, kind, at, added, humanName, line, speakers }) =>
            ({ key, meetingId, kind, at, added, humanName, line, speakers }));
    } else {
        const lines: Record<string, ListeningLine[]> = {
            en: shuffled(LISTENING_LINES.filter((l) => l.language === "en")),
            sv: shuffled(LISTENING_LINES.filter((l) => l.language === "sv")),
        };
        const used: Record<string, number> = { en: 0, sv: 0 };
        cuts = stored.flatMap((m) => planCuts(m, options.chairId, options.directedSpeakerRouting, lines, used));
    }

    const kinds = (k: CutKind) => cuts.filter((c) => c.kind === k).length;
    console.log(`${cuts.length} cuts in ${meetings.size} meetings (${kinds("corpus")} corpus, ${kinds("inserted")} inserted, ${kinds("control")} control) × ${SAMPLES} samples`);
    console.log(`council: ${options.conversationModel} · judge: ${NO_JUDGE ? "off" : judgeModel} · prompts: ${PROMPTS} · ${PARALLEL} at a time\n`);

    const results = await pooled(cuts, async (cut): Promise<CutResult> => {
        const meeting = meetings.get(cut.meetingId)!;
        const samples: Sample[] = [];
        for (let i = 0; i < SAMPLES; i++) samples.push(await runSample(run, meeting, cut));
        const first = samples[0]?.replies ?? [];
        console.log(`${samples.some((s) => s.error) ? "✘" : "✔"} ${cut.key}${cut.line ? ` (${cut.line.kind})` : ""} → ${first.map((r) => `${r.speakerName}${r.judge ? ` [${r.judge.engages}]` : ""}`).join(", ")}`);
        return {
            ...cut,
            language: meeting.language,
            topic: { id: meeting.topic.id, title: meeting.topic.title },
            members: meeting.characters.map(({ id, name }) => ({ id, name })),
            context: contextOf(meeting, meeting.conversation.slice(0, cut.at)),
            samples,
        };
    });

    let git = "unknown";
    try {
        git = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim()
            + (execSync("git status --porcelain -- ../shared/prompts src/logic global-options.json", { encoding: "utf8" }).trim() ? " + uncommitted changes" : "");
    } catch { /* not a git checkout */ }

    const time = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const meta = {
        time: new Date().toLocaleString("sv-SE"),
        label: LABEL,
        model: `council: ${options.conversationModel} · judge: ${NO_JUDGE ? "off" : judgeModel} · prompts: ${PROMPTS} · ${SAMPLES} samples`,
        git,
        source: (IDS.length ? `meetings ${IDS.join(", ")}` : `tag "${TAG}"`) + (REPLAY ? ` · replaying ${path.basename(REPLAY)}` : ` · seed ${SEED}`),
    };
    await mkdir(REPORTS_DIR, { recursive: true });
    const base = path.join(REPORTS_DIR, `${time}${LABEL ? `-${LABEL.replace(/[^\w-]+/g, "-")}` : ""}`);
    await writeFile(`${base}.html`, renderReport(results, meta, earlier));
    await writeFile(`${base}.json`, JSON.stringify({ meta, results }, null, 2));
    console.log(`\nReport: ${base}.html`);

    await closeDb();
    process.exit(0);
}

await main();
