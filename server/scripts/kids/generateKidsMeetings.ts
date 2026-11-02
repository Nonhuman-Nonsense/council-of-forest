/**
 * Kids mode — generates one text-only meeting per audience of children and language, to read how
 * the council speaks to children with today's prompts: the audience instructions in
 * beings_<lang>.json and the young agenda points in topics_<lang>.json.
 *
 * Runs the real MeetingManager, like letters/generateCorpus.ts, against an in-memory Mongo, with
 * audio off. Each meeting stops when the chair would ask to extend it, so no letter is written.
 * Transcripts are written to docs/kids-mode/.
 *
 *   npx cross-env NODE_ENV=production npx tsx scripts/kids/generateKidsMeetings.ts \
 *     [--levels young,older] [--langs en,sv] [--run run3]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Socket } from "socket.io";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { CharacterSetupData, ChildAudience, Message, Topic } from "@shared/ModelTypes.js";
import type { StoredMeeting } from "@models/DBModels.js";
import { buildMeetingSystemPrompt } from "@shared/topicPrompt.js";
import { injectRandomAgendaPoint } from "@shared/agendaPointInjection.js";
import { closeDb, initDb, insertMeeting } from "@services/DbService.js";
import { initOpenAI } from "@services/OpenAIService.js";
import { MeetingManager } from "@logic/MeetingManager.js";
import { getGlobalOptions } from "@logic/GlobalOptions.js";
import { randomUUID } from "node:crypto";

const PROMPTS_DIR = path.join(process.cwd(), "../shared/prompts");
const OUT_DIR = path.join(process.cwd(), "../docs/kids-mode");
const MEETING_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_MS = 500;

function arg(name: string, fallback: string): string {
    const index = process.argv.indexOf(`--${name}`);
    return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const LEVELS = arg("levels", "young,older").split(",") as Level[];
const LANGUAGES = arg("langs", "en,sv").split(",") as Language[];
const RUN = arg("run", "sample");

/* -------------------------------------------------------------------------- */
/* Samples                                                                    */
/* -------------------------------------------------------------------------- */

type Level = ChildAudience;
type Language = "en" | "sv";

interface Sample {
    level: Level;
    language: Language;
    topicId: string;
    memberIds: string[];
    humanName: string;
    question: string;
    questionAfter: number;
    /** Overrides for this audience; everything else is production settings. */
    conversationMaxLength: number;
}

const MEMBERS = ["reindeer", "treeharvester", "bumblebee", "mountain"];

const QUESTIONS: Record<Language, Record<Level, { name: string; text: string }>> = {
    en: {
        young: { name: "Elsa", text: "Why do you cut down the trees where the reindeer live?" },
        older: { name: "Noah", text: "If cutting down the whole forest is so bad, why doesn't the government just ban it?" },
    },
    sv: {
        young: { name: "Elsa", text: "Varför hugger ni ner träden där renarna bor?" },
        older: { name: "Noah", text: "Om det är så dåligt att hugga ner hela skogen, varför förbjuder inte regeringen det bara?" },
    },
};

function sampleFor(level: Level, language: Language): Sample {
    const question = QUESTIONS[language][level];
    return {
        level,
        language,
        topicId: "forestry",
        memberIds: MEMBERS,
        humanName: question.name,
        question: question.text,
        questionAfter: 4,
        conversationMaxLength: level === "young" ? 8 : 10,
    };
}

/* -------------------------------------------------------------------------- */
/* Setup, as the client does it (client/src/newMeeting/meetingSetup.ts)       */
/* -------------------------------------------------------------------------- */

interface TopicsBundle { system: string; topics: Topic[] }
type BeingsBundle = Pick<CharacterSetupData, "characters" | "audiences">;

const titleCase = (text: string) =>
    text.toLowerCase().split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

function buildMeetingDoc(sample: Sample, topics: TopicsBundle, beings: BeingsBundle): Omit<StoredMeeting, "_id"> {
    const audience = beings.audiences?.[sample.level];
    if (!audience) throw new Error(`beings_${sample.language}.json has no instructions for ${sample.level}`);
    const topic = structuredClone(topics.topics.find((t) => t.id === sample.topicId)!);
    const agendaPoints = sample.level === "young" ? topic.youngAgendaPoints ?? topic.agendaPoints : topic.agendaPoints;
    topic.agendaPoints = agendaPoints;
    topic.prompt = buildMeetingSystemPrompt(topics.system, topic.prompt, agendaPoints, sample.language);

    const ids = [beings.characters[0].id, ...sample.memberIds];
    const characters = ids.map((id) => structuredClone(beings.characters.find((c) => c.id === id)!));
    const participants = characters.slice(1).map((c) => titleCase(c.name)).join(", ");
    characters[0].prompt = injectRandomAgendaPoint(
        characters[0].prompt.replace("[CHARACTERS]", participants).replace("[HUMANS]", "").replace("[SINGLE_AGENDA_POINT]", ""),
        agendaPoints,
    ) + `\n\n${audience.chair}`;
    // As client/src/newMeeting/meetingSetup.ts does: last in every prompt.
    for (const character of characters) {
        character.prompt = `${character.prompt}\n\n--\n\n${audience.everyone}`;
    }

    return {
        topic,
        characters,
        language: sample.language,
        audio: [],
        conversation: [],
        liveKey: randomUUID(),
        date: new Date().toISOString(),
        state: { alreadyInvited: false, humanName: sample.humanName },
        maximumPlayedIndex: 0,
        conversationExtraSlots: 0,
        meetingComplete: false,
        audience: sample.level,
    } as Omit<StoredMeeting, "_id">;
}

/* -------------------------------------------------------------------------- */
/* Running                                                                    */
/* -------------------------------------------------------------------------- */

const spoken = (conversation: Message[]) => conversation.filter((m) => typeof m.text === "string" && m.text !== "").length;
const last = (conversation: Message[]) => conversation[conversation.length - 1];

async function waitFor(manager: MeetingManager, done: (conversation: Message[]) => boolean, what: string, deadline: number) {
    while (!done(manager.meeting?.conversation ?? [])) {
        if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
}

function silentSocket(id: string): Socket {
    return { id, emit: () => true, on: () => undefined } as unknown as Socket;
}

function transcript(sample: Sample, meeting: StoredMeeting): string {
    const names = new Map(meeting.characters.map((c) => [c.id, c.name]));
    const turns = meeting.conversation
        .filter((m) => typeof m.text === "string" && m.text !== "")
        .map((m) => {
            const name = (m.speaker && names.get(m.speaker)) ?? (m.type === "human" ? sample.humanName : m.speaker);
            return `**${name}** (${m.text!.length} chars)\n\n${m.text!.trim()}`;
        });
    const lengths = meeting.conversation.filter((m) => m.text && m.type !== "human").map((m) => m.text!.length);
    const average = Math.round(lengths.reduce((a, b) => a + b, 0) / Math.max(lengths.length, 1));
    return `# Kids mode sample — ${RUN}, ${sample.level} (${sample.language})

Topic: ${sample.topicId} · Members: ${sample.memberIds.join(", ")} · Child: ${sample.humanName}, after ${sample.questionAfter} turns
Agenda: ${sample.level === "young" ? "kids' agenda points" : "the adult agenda points"} · ${turns.length} turns, ${average} characters on average

---

${turns.join("\n\n---\n\n")}
`;
}

async function runMeeting(sample: Sample, topics: TopicsBundle, beings: BeingsBundle) {
    const label = `${sample.level}-${sample.language}`;
    const doc = buildMeetingDoc(sample, topics, beings);
    const { insertedId: meetingId } = await insertMeeting(doc);
    console.log(`▶ ${label}: #${meetingId} ${sample.topicId} [${sample.memberIds.join(", ")}]`);

    const options = { ...getGlobalOptions(), skipAudio: true, conversationMaxLength: sample.conversationMaxLength };
    const manager = new MeetingManager(silentSocket(`kids-${meetingId}`), "prototype", options);
    const deadline = Date.now() + MEETING_TIMEOUT_MS;
    try {
        await manager.initializeStart({ meetingId, liveKey: doc.liveKey });
        await waitFor(manager, (c) => spoken(c) >= sample.questionAfter || last(c)?.type === "query_extension", "the child's moment", deadline);
        if (last(manager.meeting!.conversation)?.type !== "query_extension") {
            await manager.handleEvent("raise_hand", { index: manager.meeting!.conversation.length, humanName: sample.humanName });
            await waitFor(manager, (c) => last(c)?.type === "awaiting_human_question", "the chair's invitation", deadline);
            await manager.handleEvent("submit_human_message", { text: sample.question });
        }
        await waitFor(manager, (c) => last(c)?.type === "query_extension", "the end of the meeting", deadline);
        const file = path.join(OUT_DIR, `${RUN}-${label}.md`);
        await writeFile(file, transcript(sample, manager.meeting!));
        console.log(`✔ ${label}: ${spoken(manager.meeting!.conversation)} turns → ${file}`);
    } finally {
        await manager.destroy("cancel");
    }
}

async function main() {
    const mongod = await MongoMemoryServer.create({ instance: { ip: "127.0.0.1", args: ["--nounixsocket"] } });
    await initDb(mongod.getUri(), "kids_sample");
    initOpenAI();
    await mkdir(OUT_DIR, { recursive: true });

    const bundles = Object.fromEntries(await Promise.all(LANGUAGES.map(async (language) => [language, {
        topics: JSON.parse(await readFile(path.join(PROMPTS_DIR, `topics_${language}.json`), "utf8")) as TopicsBundle,
        beings: JSON.parse(await readFile(path.join(PROMPTS_DIR, `beings_${language}.json`), "utf8")) as BeingsBundle,
    }] as const)));
    const samples = LANGUAGES.flatMap((language) => LEVELS.map((level) => sampleFor(level, language)));
    console.log(`Generating ${samples.length} meetings with ${getGlobalOptions().conversationModel}.\n`);

    let failed = false;
    await Promise.all(samples.map((sample) => runMeeting(sample, bundles[sample.language].topics, bundles[sample.language].beings).catch((error) => {
        failed = true;
        console.error(`✘ ${sample.level}-${sample.language}: ${(error as Error).message}`);
    })));

    await closeDb();
    await mongod.stop();
    process.exit(failed ? 1 : 0);
}

await main();
