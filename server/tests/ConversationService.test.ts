import { describe, expect, it, vi } from "vitest";

import {
    createConversationService,
    resolveConversationModel,
    type ConversationCompletionParams,
} from "@services/ConversationService.js";

function createMockClient(response: {
    id?: string;
    content?: string | null;
    finishReason?: string | null;
    usage?: unknown;
} = {}) {
    const create = vi.fn().mockResolvedValue({
        id: response.id ?? "mock-id",
        choices: [
            {
                message: { content: response.content ?? "mock-content" },
                finish_reason: response.finishReason ?? "stop",
            },
        ],
        usage: response.usage,
    });

    return { client: { complete: create }, create };
}

function createParams(model: string): ConversationCompletionParams {
    return {
        model,
        messages: [{ role: "user", content: "Hello there" }],
        maxCompletionTokens: 123,
        temperature: 0.7,
        reasoning: "none",
        stop: ["\n---"],
    };
}

describe("ConversationService", () => {
    it("routes provider/model ids through the Inworld client unchanged", async () => {
        const inworld = createMockClient({ id: "inworld-id", content: "inworld-response" });
        const mistral = createMockClient();

        const service = createConversationService(() => inworld.client, () => mistral.client);

        const result = await service.createChatCompletion(createParams("anthropic/claude-opus-4-6"));

        expect(result).toMatchObject({
            id: "inworld-id",
            content: "inworld-response",
            finishReason: "stop",
        });
        expect(inworld.create).toHaveBeenCalledWith(expect.objectContaining({
            model: "anthropic/claude-opus-4-6",
            messages: [{ role: "user", content: "Hello there" }],
            max_completion_tokens: 123,
            temperature: 0.7,
            stop: ["\n---"],
        }));
        expect(inworld.create.mock.calls[0][0]).not.toHaveProperty("extra_body");
        expect(mistral.create).not.toHaveBeenCalled();
    });

    it.each([
        { model: "mistral/mistral-large-3", provider: "inworld", reportedModel: "mistral/mistral-large-3" },
        { model: "mistral-direct/mistral-large-4-0", provider: "mistral", reportedModel: "mistral-large-4-0" },
    ])("reports token usage for $model", async ({ model, provider, reportedModel }) => {
        const usage = { prompt_tokens: 9, completion_tokens: 12, prompt_tokens_details: { cached_tokens: 0 } };
        const inworld = createMockClient({ usage });
        const mistral = createMockClient({ usage });
        const service = createConversationService(() => inworld.client, () => mistral.client);

        const result = await service.createChatCompletion(createParams(model));

        expect(result.usage).toEqual({
            provider,
            model: reportedModel,
            measures: { input_tokens: 9, output_tokens: 12 },
        });
    });

    describe("mistral-direct", () => {
        function setup(content: unknown = "mistral-response") {
            const inworld = createMockClient();
            const mistral = createMockClient();
            mistral.create.mockResolvedValue({ id: "mistral-id", choices: [{ message: { content }, finish_reason: "stop" }] });
            const service = createConversationService(() => inworld.client, () => mistral.client);
            return { service, inworld, mistral };
        }

        it("calls Mistral's own API with the prefix stripped, never the router", async () => {
            const { service, inworld, mistral } = setup();

            const result = await service.createChatCompletion(createParams("mistral-direct/mistral-large-2512"));

            expect(result).toMatchObject({ id: "mistral-id", content: "mistral-response" });
            expect(mistral.create).toHaveBeenCalledWith(expect.objectContaining({
                model: "mistral-large-2512",
                max_completion_tokens: 123,
                stop: ["\n---"],
            }));
            expect(inworld.create).not.toHaveBeenCalled();
        });

        it.each([
            { reasoning: "none" as const, sent: undefined },
            { reasoning: "low" as const, sent: "low" },
        ])("sends reasoning $reasoning as Mistral's reasoning_effort ($sent)", async ({ reasoning, sent }) => {
            const { service, mistral } = setup();

            await service.createChatCompletion({ ...createParams("mistral-direct/mistral-large-4-0"), reasoning });

            const request = mistral.create.mock.calls[0][0];
            expect(request.reasoning_effort).toBe(sent);
            expect(request).not.toHaveProperty("extra_body");
        });

        it("keeps only the text of a reply that also carries its thinking", async () => {
            const { service } = setup([
                { type: "thinking", thinking: [{ type: "text", text: "Mull it over." }] },
                { type: "text", text: "Stone remembers." },
            ]);

            const result = await service.createChatCompletion(createParams("mistral-direct/mistral-large-4-0"));

            expect(result.content).toBe("Stone remembers.");
        });
    });

    describe("prompt caching", () => {
        const stack = [
            { role: "system" as const, content: "Topic and being" },
            { role: "user" as const, content: "Earlier turn" },
            { role: "system" as const, content: "Instruction" },
        ];
        const cachedStack = [
            stack[0],
            { role: "user", content: [{ type: "text", text: "Earlier turn", cache_control: { type: "ephemeral" } }] },
            stack[2],
        ];

        it.each([
            { name: "Mistral with a key", model: "mistral/mistral-large-3", cacheKey: "meeting-7", key: "meeting-7", messages: stack },
            { name: "Anthropic with a key", model: "anthropic/claude-sonnet-5-5", cacheKey: "meeting-7", key: "meeting-7", messages: cachedStack },
            { name: "Mistral without a key", model: "mistral/mistral-large-3", cacheKey: undefined, key: undefined, messages: stack },
            { name: "Anthropic without a key", model: "anthropic/claude-sonnet-5-5", cacheKey: undefined, key: undefined, messages: stack },
        ])("asks $name to cache what the next request resends", async ({ model, cacheKey, key, messages }) => {
            const inworld = createMockClient();
            const service = createConversationService(() => inworld.client);

            await service.createChatCompletion({ ...createParams(model), messages: stack, cacheKey });

            const sent = inworld.create.mock.calls[0][0];
            expect(sent.messages).toEqual(messages);
            expect(sent.prompt_cache_key).toBe(key);
        });
    });

    it("omits reasoning params when conversation reasoning is none", async () => {
        const inworld = createMockClient({ id: "inworld-id", content: "inworld-response" });
        const service = createConversationService(() => inworld.client);

        await service.createChatCompletion(createParams("mistral/mistral-large-3"));

        expect(inworld.create).toHaveBeenCalledWith(expect.objectContaining({
            model: "mistral/mistral-large-3",
        }));
        expect(inworld.create.mock.calls[0][0]).not.toHaveProperty("extra_body");
        expect(inworld.create.mock.calls[0][0]).not.toHaveProperty("thinking");
    });

    it("turns thinking off for a model that only stops thinking when told to", async () => {
        const inworld = createMockClient();
        const service = createConversationService(() => inworld.client);

        await service.createChatCompletion(createParams("anthropic/claude-sonnet-5-5"));

        expect(inworld.create.mock.calls[0][0]).toMatchObject({ thinking: { type: "between_tools" } });
        expect(inworld.create.mock.calls[0][0]).not.toHaveProperty("extra_body");
    });

    it("converts an all-system first-turn stack into a valid routed request", async () => {
        const inworld = createMockClient({ id: "inworld-id", content: "inworld-response" });
        const service = createConversationService(() => inworld.client);

        await service.createChatCompletion({
            model: "anthropic/claude-opus-4-6",
            messages: [
                { role: "system", content: "You are Water in the council." },
                { role: "system", content: "Water: " },
            ],
            maxCompletionTokens: 123,
            temperature: 0.7,
            reasoning: "none",
            stop: ["\n---"],
        });

        expect(inworld.create).toHaveBeenCalledWith(expect.objectContaining({
            messages: [
                { role: "system", content: "You are Water in the council." },
                { role: "user", content: "Water: " },
            ],
        }));
        expect(inworld.create.mock.calls[0][0]).not.toHaveProperty("extra_body");
    });

    it("passes non-none reasoning to Inworld via extra_body", async () => {
        const inworld = createMockClient({ id: "inworld-id", content: "inworld-response" });
        const service = createConversationService(() => inworld.client);

        await service.createChatCompletion({
            ...createParams("google-ai-studio/gemini-2.5-flash"),
            reasoning: "low",
        });

        expect(inworld.create).toHaveBeenCalledWith(expect.objectContaining({
            model: "google-ai-studio/gemini-2.5-flash",
            extra_body: {
                reasoning: {
                    effort: "low",
                },
            },
        }));
    });

    it("defaults the finish reason to stop when the provider omits it", async () => {
        const inworld = createMockClient();
        inworld.create.mockResolvedValue({ id: "inworld-id", choices: [{ message: { content: "inworld-response" } }] });
        const service = createConversationService(() => inworld.client);

        const result = await service.createChatCompletion(createParams("mistral/mistral-large-3"));

        expect(result.finishReason).toBe("stop");
    });

    it("classifies regular provider/model ids as Inworld-routed", () => {
        expect(resolveConversationModel("mistral/mistral-small-3-2")).toEqual({
            provider: "inworld",
            model: "mistral/mistral-small-3-2",
        });
    });
});
