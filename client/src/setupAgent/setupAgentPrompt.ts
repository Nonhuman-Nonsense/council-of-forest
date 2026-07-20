import type { Topic, Character } from "@shared/ModelTypes";
import type { MeetingSetupPhase } from "@newMeeting/meetingSetup";
import type { AgentMode } from "@/settings/councilSettings";
import { buildEnPrompt } from "./setupAgentPromptEn";
import { buildSvPrompt } from "./setupAgentPromptSv";

export type SetupAgentTopic = Pick<Topic, "id" | "title" | "description">;
export type SetupAgentCharacter = Pick<Character, "id" | "name"> & { description?: string };

export type SetupAgentPromptParams = {
  topics: SetupAgentTopic[];
  characters: SetupAgentCharacter[];
  phase: MeetingSetupPhase;
  agentMode?: AgentMode;
  visitorName?: string;
  otherLanguageNames?: string[];
};

/** Add an entry here when adding a new language prompt file. */
const builders: Record<string, (params: SetupAgentPromptParams) => string> = {
  en: buildEnPrompt,
  sv: buildSvPrompt,
};

export function buildSetupAgentPrompt(params: SetupAgentPromptParams & { language: string }): string {
  const { language, ...rest } = params;
  return (builders[language] ?? buildEnPrompt)(rest);
}
