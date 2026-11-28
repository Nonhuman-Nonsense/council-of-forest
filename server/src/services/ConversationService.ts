import { config } from "@root/src/config.js";
import {
    createChatCompletionClient,
    type ChatCompletionClient,
    type ChatCompletionRequest,
    type ChatMessage,
    type ChatReasoning,
} from "@services/ChatCompletions.js";
import { parseChatCompletionUsage } from "@services/UsageService.js";
import type { UsageMeasures } from "@shared/UsageTypes.js";

const INWORLD_BASE_URL = "https://api.inworld.ai/v1";
/**
 * Mistral's own API, for when the router serves a Mistral model differently from Mistral itself.
 * In November 2026 it did: through Inworld, `mistral/mistral-large-2512` started reasoning on every
 * call and ignored the effort setting, while Mistral still served it without reasoning.
 */
const MISTRAL_BASE_URL = "https://api.mistral.ai/v1";
const MISTRAL_DIRECT_PREFIX = "mistral-direct/";
type ConversationReasoning = ChatReasoning;

export interface ConversationCompletionParams {
    model: string;
    messages: ChatMessage[];
    maxCompletionTokens: number;
    temperature: number;
    stop?: string[];
    reasoning: ConversationReasoning;
    /**
     * Names a conversation that will be sent again soon with more on the end — a meeting's next
     * turn, a letter's draft after its plan — so its prompt is cached and read back cheaply
     * then. See {@link cacheRequestFields}. Leave it out for a one-off.
     */
    cacheKey?: string;
}

export interface ConversationCompletionResult {
    id: string | null;
    content: string | null;
    finishReason: string | null;
    /** Who served the completion and what it consumed, for the footprint meter. */
    usage?: {
        /** Who we called: "inworld" (router) or "mistral". */
        provider: string;
        /** As requested, e.g. "mistral/mistral-large-3". */
        model: string;
        measures: UsageMeasures;
    };
}

export interface ConversationService {
    createChatCompletion(params: ConversationCompletionParams): Promise<ConversationCompletionResult>;
}

export interface ResolvedConversationModel {
    provider: "inworld" | "mistral-direct";
    model: string;
}

let inworldClient: ChatCompletionClient | undefined;
let mistralClient: ChatCompletionClient | undefined;

function getMistralClient(): ChatCompletionClient {
    if (!config.MISTRAL_API_KEY) {
        throw new Error("A mistral-direct/ model needs MISTRAL_API_KEY in the server's environment");
    }
    if (!mistralClient) {
        mistralClient = createChatCompletionClient({
            baseURL: MISTRAL_BASE_URL,
            apiKey: config.MISTRAL_API_KEY,
            label: "Mistral",
        });
    }

    return mistralClient;
}

function getInworldClient(): ChatCompletionClient {
    if (!inworldClient) {
        inworldClient = createChatCompletionClient({
            baseURL: INWORLD_BASE_URL,
            apiKey: config.INWORLD_API_KEY,
            label: "Inworld router",
        });
    }

    return inworldClient;
}

function normalizeMessagesForInworldRouting(messages: ChatMessage[]): ChatMessage[] {
    if (messages.some((message) => message.role !== "system")) {
        return messages;
    }

    if (messages.length === 0) {
        return [{ role: "user", content: "Continue the conversation." }];
    }

    const normalizedMessages = [...messages];
    const lastMessage = normalizedMessages[normalizedMessages.length - 1];
    const userContent = typeof lastMessage.content === "string"
        ? lastMessage.content
        : "Continue the conversation.";
    normalizedMessages[normalizedMessages.length - 1] = {
        role: "user",
        content: userContent,
    };

    return normalizedMessages;
}

export function resolveConversationModel(model: string): ResolvedConversationModel {
    if (model.startsWith(MISTRAL_DIRECT_PREFIX)) {
        return {
            provider: "mistral-direct",
            model: model.slice(MISTRAL_DIRECT_PREFIX.length),
        };
    }

    return {
        provider: "inworld",
        model,
    };
}

export function buildInworldReasoningExtraBody(reasoning: ConversationReasoning): NonNullable<ChatCompletionRequest["extra_body"]> {
    if (reasoning === "none") {
        return {
            reasoning: {
                effort: "none",
                max_tokens: 0,
                exclude: true,
            },
        };
    }

    return {
        reasoning: {
            effort: reasoning,
        },
    };
}

/**
 * Asks the provider to cache the prompt. Each provider wants it differently, and without it the
 * whole conversation is billed at the full input price on every turn:
 *
 * - Mistral caches only requests that carry a `prompt_cache_key`. Probed through
 *   the Inworld router (October 2026): none of a repeated prompt cached without one, nearly
 *   all of it with one.
 * - Anthropic caches only up to a `cache_control` breakpoint. It goes on the last message
 *   before the final one, which is the one-off instruction or reply cue: the next request
 *   reads everything up to there from the cache, even when its own ending differs.
 *
 * Google models cache on their own; the extra field does them no harm.
 */
export function cacheRequestFields(
    model: string,
    messages: ChatMessage[],
    cacheKey: string | undefined,
): { messages: ChatMessage[]; prompt_cache_key?: string } {
    if (!cacheKey) return { messages };
    if (!model.startsWith("anthropic/") || messages.length < 2) return { messages, prompt_cache_key: cacheKey };

    // Our messages are plain strings; anything else is sent as it is.
    const index = messages.length - 2;
    const content = messages[index].content;
    if (typeof content !== "string" || content.length === 0) return { messages, prompt_cache_key: cacheKey };

    const marked = [...messages];
    marked[index] = {
        ...messages[index],
        content: [{ type: "text", text: content, cache_control: { type: "ephemeral" } }],
    };
    return { messages: marked, prompt_cache_key: cacheKey };
}

/**
 * Models that think unless told otherwise, and are told otherwise only with Anthropic's
 * `thinking: {type: "between_tools"}`: sending nothing leaves adaptive thinking on, and
 * `{type: "disabled"}` is a 400. Probed through the Inworld router (November 2026): with nothing
 * sent, a council turn on Sonnet 5.5 spent 399 of its 400 tokens thinking and said nothing.
 */
const THINKING_OFF_BETWEEN_TOOLS = new Set(["anthropic/claude-sonnet-5-5"]);

const USAGE_PROVIDER: Record<ResolvedConversationModel["provider"], string> = {
    "inworld": "inworld",
    "mistral-direct": "mistral",
};

/** Who a configured model is billed to, and under what name: the footprint meter's key for it. */
export function usageIdentityFor(configuredModel: string): { provider: string; model: string } {
    const resolved = resolveConversationModel(configuredModel);
    return { provider: USAGE_PROVIDER[resolved.provider], model: resolved.model };
}

/** The reply's text: a plain string, or the text chunks of a reply that also carries its thinking. */
function completionText(content: string | null | undefined | Array<{ type: string; text?: string }>): string | null {
    if (!Array.isArray(content)) return content ?? null;
    return content.filter((chunk) => chunk.type === "text").map((chunk) => chunk.text ?? "").join("");
}

async function requestChatCompletion(
    client: ChatCompletionClient,
    params: ConversationCompletionParams,
    model: string,
    provider: ResolvedConversationModel["provider"],
): Promise<ConversationCompletionResult> {
    const request: ChatCompletionRequest = {
        model,
        ...cacheRequestFields(model, params.messages, params.cacheKey),
        max_completion_tokens: params.maxCompletionTokens,
        temperature: params.temperature,
        stop: params.stop,
    };

    if (provider === "inworld" && params.reasoning === "none" && THINKING_OFF_BETWEEN_TOOLS.has(model)) {
        request.thinking = { type: "between_tools" };
    } else if (provider === "inworld" && params.reasoning !== "none") {
        request.extra_body = buildInworldReasoningExtraBody(params.reasoning);
    } else if (params.reasoning !== "none") {
        request.reasoning_effort = params.reasoning;
    }

    const completion = await client.complete(request);

    return {
        id: completion.id ?? null,
        content: completionText(completion.choices?.[0]?.message?.content),
        finishReason: completion.choices?.[0]?.finish_reason ?? "stop",
        usage: {
            provider: USAGE_PROVIDER[provider],
            model,
            measures: parseChatCompletionUsage(completion.usage),
        },
    };
}

export function createConversationService(
    getInworld: () => ChatCompletionClient = getInworldClient,
    getMistral: () => ChatCompletionClient = getMistralClient,
): ConversationService {
    return {
        async createChatCompletion(params: ConversationCompletionParams): Promise<ConversationCompletionResult> {
            const resolvedModel = resolveConversationModel(params.model);

            if (resolvedModel.provider === "mistral-direct") {
                return requestChatCompletion(getMistral(), params, resolvedModel.model, resolvedModel.provider);
            }

            return requestChatCompletion(getInworld(), {
                ...params,
                messages: normalizeMessagesForInworldRouting(params.messages),
            }, resolvedModel.model, resolvedModel.provider);
        }
    };
}
