/**
 * What a human says to the council, for testing whether the beings listen (evalListening.ts):
 * the letters corpus's questions, plus lines that only make sense right after a particular being
 * has spoken. Those are the sharpest test — a reply can only get them right by listening to what
 * was just said. `[LAST_SPEAKER]` is replaced with the name of the being who spoke last.
 */
import { HUMAN_QUESTIONS, type HumanLine } from "../letters/humanLines.js";

export const LAST_SPEAKER = "[LAST_SPEAKER]";

export interface ListeningLine {
    kind: HumanLine["kind"] | "follow-up" | "disagree";
    language: "en" | "sv";
    text: string;
}

const FOLLOW_UPS: ListeningLine[] = [
    { kind: "follow-up", language: "en", text: `${LAST_SPEAKER}, what do you mean by that? Can you say it more simply?` },
    { kind: "follow-up", language: "en", text: `Wait, ${LAST_SPEAKER}, is that really true? Where does that number come from?` },
    { kind: "disagree", language: "en", text: `I don't agree with ${LAST_SPEAKER} at all. People here need to make a living too.` },
    { kind: "off-topic", language: "en", text: "What is your favourite season, and why?" },
    { kind: "follow-up", language: "sv", text: `${LAST_SPEAKER}, vad menar du med det? Kan du säga det enklare?` },
    { kind: "disagree", language: "sv", text: `Jag håller inte alls med ${LAST_SPEAKER}. Folk här måste också kunna leva.` },
    { kind: "off-topic", language: "sv", text: "Vilken årstid tycker ni bäst om, och varför?" },
];

export const LISTENING_LINES: ListeningLine[] = [...HUMAN_QUESTIONS, ...FOLLOW_UPS];
