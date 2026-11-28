import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createChatCompletionClient, type ChatCompletionRequest } from "@services/ChatCompletions.js";

vi.mock("@utils/Logger.js", () => ({
    Logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const request: ChatCompletionRequest = {
    model: "mistral/mistral-large-3",
    messages: [{ role: "user", content: "Hello" }],
    max_completion_tokens: 50,
    temperature: 0.7,
    extra_body: { reasoning: { effort: "none", max_tokens: 0, exclude: true } },
};

const reply = { id: "c1", choices: [{ message: { content: "Hi" }, finish_reason: "stop" }] };

function respond(status: number, headers: Record<string, string> = {}): Response {
    return new Response(status === 200 ? JSON.stringify(reply) : "nope", { status, headers });
}

describe("ChatCompletions client", () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = createChatCompletionClient({ baseURL: "https://router.test/v1/", apiKey: "key-1", label: "Test router" });

    /** Runs a call to completion, stepping fake time over every retry's wait. */
    async function settle<T>(promise: Promise<T>): Promise<{ value?: T; error?: unknown }> {
        const settled = promise.then((value) => ({ value }), (error: unknown) => ({ error }));
        await vi.advanceTimersByTimeAsync(120_000);
        return settled;
    }

    beforeEach(() => {
        vi.useFakeTimers();
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it("posts the request as it is to the endpoint, with the key as a bearer token", async () => {
        fetchMock.mockResolvedValue(respond(200));

        const { value } = await settle(client.complete(request));

        expect(value).toEqual(reply);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("https://router.test/v1/chat/completions");
        expect(init?.method).toBe("POST");
        expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer key-1");
        expect(JSON.parse(init?.body as string)).toEqual(request);
    });

    it.each<{ status: number; headers: Record<string, string>; attempts: number }>([
        { status: 500, headers: {}, attempts: 2 },
        { status: 503, headers: {}, attempts: 2 },
        { status: 429, headers: {}, attempts: 2 },
        { status: 409, headers: {}, attempts: 2 },
        { status: 408, headers: {}, attempts: 2 },
        { status: 400, headers: {}, attempts: 1 },
        { status: 401, headers: {}, attempts: 1 },
        { status: 400, headers: { "x-should-retry": "true" }, attempts: 2 },
        { status: 500, headers: { "x-should-retry": "false" }, attempts: 1 },
    ])("a $status with $headers is tried $attempts time(s)", async ({ status, headers, attempts }) => {
        fetchMock.mockResolvedValueOnce(respond(status, headers)).mockResolvedValue(respond(200));

        await settle(client.complete(request));

        expect(fetchMock).toHaveBeenCalledTimes(attempts);
    });

    it("gives up after three retries, with the status in the error", async () => {
        fetchMock.mockImplementation(async () => respond(502));

        const { error } = await settle(client.complete(request));

        expect(fetchMock).toHaveBeenCalledTimes(4);
        expect(error).toMatchObject({ status: 502, message: expect.stringContaining("Test router API Error: 502") });
    });

    it("retries an attempt that timed out", async () => {
        fetchMock
            .mockRejectedValueOnce(new DOMException("The operation was aborted due to timeout", "TimeoutError"))
            .mockResolvedValue(respond(200));

        const { value } = await settle(client.complete(request));

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(value).toEqual(reply);
    });
});
