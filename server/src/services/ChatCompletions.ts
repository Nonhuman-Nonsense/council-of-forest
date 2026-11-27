import { OUTBOUND_HTTP_TIMEOUT_MS, UpstreamHttpError, upstreamHttpError, withNetworkRetry } from "@utils/NetworkUtils.js";

/**
 * A client for the `/chat/completions` endpoint that the Inworld router and Mistral's own API both
 * speak. It is the part of the OpenAI SDK we used, and no more: one non-streaming POST, retried
 * and timed out the way that SDK did it.
 */

export type ChatRole = "system" | "user" | "assistant";

/** A piece of a message's content. Anthropic's `cache_control` rides on one; see cacheRequestFields. */
export interface ChatContentPart {
    type: "text";
    text: string;
    cache_control?: { type: "ephemeral" };
}

export interface ChatMessage {
    role: ChatRole;
    content: string | ChatContentPart[];
}

export type ChatReasoning = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

/** The request body, in the endpoint's own field names. */
export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    max_completion_tokens: number;
    temperature: number;
    stop?: string[];
    prompt_cache_key?: string;
    reasoning_effort?: ChatReasoning;
    /**
     * The Inworld router's reasoning switch, sent as a field named `extra_body`. The router reads it
     * there; the OpenAI SDK we used before sent it the same way, as it passes unknown fields through.
     */
    extra_body?: {
        reasoning: {
            effort: ChatReasoning;
            max_tokens?: number;
            exclude?: boolean;
        };
    };
    /** Anthropic's own thinking switch; the router passes it through as it is. */
    thinking?: { type: "between_tools" };
}

export interface ChatCompletionResponse {
    id?: string | null;
    choices?: Array<{
        message?: {
            /** Mistral's reasoning models answer in chunks: a thinking one, then text. */
            content?: string | null | Array<{ type: string; text?: string }>;
        };
        finish_reason?: string | null;
    }>;
    usage?: unknown;
}

export interface ChatCompletionClient {
    complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
}

/** Each call is tried this many more times, as the OpenAI SDK's `maxRetries: 3` did. */
const CHAT_RETRIES = 3;

/**
 * Statuses worth another attempt, the OpenAI SDK's set: a timeout, a lock conflict, a rate limit
 * and any server error. Wider than {@link UpstreamHttpError}'s default, which surfaces a generic
 * 500 at once: a meeting turn is worth another try, where a voice chunk would be degraded instead.
 */
function isRetryableChatStatus(status: number): boolean {
    return status === 408 || status === 409 || status === 429 || status >= 500;
}

class ChatHttpError extends UpstreamHttpError {
    /** The endpoint's own `x-should-retry` verdict, which overrides the status when it sends one. */
    constructor(base: UpstreamHttpError, private readonly shouldRetryHeader: string | null) {
        super(base.status, base.message, base.retryAfterMs);
        this.name = "ChatHttpError";
    }

    override get retryable(): boolean {
        if (this.shouldRetryHeader === "true") return true;
        if (this.shouldRetryHeader === "false") return false;
        return isRetryableChatStatus(this.status);
    }
}

export function createChatCompletionClient({ baseURL, apiKey, label }: {
    baseURL: string;
    apiKey: string;
    /** Names the API in errors and retry logs, e.g. "Inworld router". */
    label: string;
}): ChatCompletionClient {
    const url = `${baseURL.replace(/\/$/, "")}/chat/completions`;

    return {
        complete: (request) => withNetworkRetry(async () => {
            let response: Response;
            try {
                response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    body: JSON.stringify(request),
                    signal: AbortSignal.timeout(OUTBOUND_HTTP_TIMEOUT_MS),
                });
            } catch (error) {
                // A timed-out attempt is retried, as the SDK retried it; ETIMEDOUT is what
                // withNetworkRetry recognises.
                if (error instanceof Error && error.name === "TimeoutError") {
                    throw Object.assign(new Error(`${label} timed out after ${OUTBOUND_HTTP_TIMEOUT_MS}ms`), { code: "ETIMEDOUT", cause: error });
                }
                throw error;
            }

            if (!response.ok) {
                const shouldRetry = response.headers.get("x-should-retry");
                throw new ChatHttpError(await upstreamHttpError(response, label), shouldRetry);
            }
            return (await response.json()) as ChatCompletionResponse;
        }, label, CHAT_RETRIES),
    };
}
