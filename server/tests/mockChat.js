import { vi } from 'vitest';

/**
 * The fake model behind test meetings: called with each `/chat/completions` request body,
 * resolving to the endpoint's reply. Replace its implementation, or pass your own to
 * {@link useChatMock}, to script what the council says.
 */
export const mockChat = vi.fn().mockResolvedValue({
    choices: [{ message: { content: 'Invitation text' } }],
});

/**
 * A conversation service that hands every request to `complete` as a plain request body — the
 * model, messages and limits as the meeting asked for them, without any provider's routing.
 */
export const createMockConversationService = (complete = mockChat) => ({
    createChatCompletion: async ({
        messages,
        model,
        maxCompletionTokens,
        temperature,
        reasoning,
        stop,
    }) => {
        const request = {
            messages,
            model,
            max_completion_tokens: maxCompletionTokens,
            temperature,
            stop,
        };
        if (reasoning && reasoning !== 'none') {
            request.reasoning_effort = reasoning;
        }
        const completion = await complete(request);

        return {
            id: completion.id ?? null,
            content: completion.choices?.[0]?.message?.content ?? null,
            finishReason: completion.choices?.[0]?.finish_reason ?? 'stop',
        };
    },
});

/** Makes `complete` the model behind this manager's meeting. */
export const useChatMock = (manager, complete) => {
    manager.services.conversationService = createMockConversationService(complete);
    return complete;
};
