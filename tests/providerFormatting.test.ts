import { describe, expect, it } from "vitest";
import { OpenAICompatibleProvider, parseCustomHeaders } from "../src/llm/providers/OpenAICompatibleProvider";
import type { ProviderConfig } from "../src/types";

const config: ProviderConfig = {
	preset: "openai-compatible",
	endpointUrl: "https://api.example.com/v1/chat/completions",
	apiKey: "sk-test",
	model: "test-model",
	timeoutMs: 1000,
	retryCount: 0,
	customHeaders: {},
	debugLogging: false
};

describe("OpenAICompatibleProvider", () => {
	it("formats chat completions requests", () => {
		const provider = new OpenAICompatibleProvider(config);
		const body = provider.buildRequestBody({
			systemPrompt: "system",
			userPrompt: "user",
			model: "model-a",
			temperature: 0.2,
			maxTokens: 256
		});

		expect(body).toEqual({
			model: "model-a",
			messages: [
				{ role: "system", content: "system" },
				{ role: "user", content: "user" }
			],
			temperature: 0.2,
			max_tokens: 256
		});
	});

	it("parses custom headers and ignores authorization override", () => {
		expect(parseCustomHeaders('{"X-Test":"yes","Authorization":"Bearer nope"}')).toEqual({
			"X-Test": "yes"
		});
	});

	it("rejects non-string custom header values", () => {
		expect(() => parseCustomHeaders('{"X-Test":1}')).toThrow(/strings/);
	});
});
