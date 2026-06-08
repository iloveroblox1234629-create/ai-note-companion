import type { LLMProvider, LLMRequest, LLMResponse, ProviderConfig } from "../../types";
import { sanitizeErrorMessage } from "../errors";

interface OpenAIMessage {
	role: "system" | "user";
	content: string;
}

interface OpenAIRequestBody {
	model: string;
	messages: OpenAIMessage[];
	temperature: number;
	max_tokens: number;
}

interface OpenAIResponseBody {
	choices?: Array<{
		message?: {
			content?: string;
		};
	}>;
	error?: {
		message?: string;
		type?: string;
		code?: string | number;
	};
}

export class OpenAICompatibleProvider implements LLMProvider {
	protected config: ProviderConfig;

	constructor(config: ProviderConfig) {
		this.config = config;
	}

	async complete(request: LLMRequest): Promise<LLMResponse> {
		this.validateConfig();
		return this.withRetries(() => this.execute(request));
	}

	async testConnection(): Promise<void> {
		await this.complete({
			systemPrompt: "You are a connection test. Reply with exactly: ok",
			userPrompt: "Reply with exactly: ok",
			model: this.config.model,
			temperature: 0,
			maxTokens: 8
		});
	}

	buildRequestBody(request: LLMRequest): OpenAIRequestBody {
		return {
			model: request.model,
			messages: [
				{ role: "system", content: request.systemPrompt },
				{ role: "user", content: request.userPrompt }
			],
			temperature: request.temperature,
			max_tokens: request.maxTokens
		};
	}

	protected async execute(request: LLMRequest): Promise<LLMResponse> {
		const controller = new AbortController();
		const timeoutId = window.setTimeout(() => controller.abort(), this.config.timeoutMs);
		const signal = combineAbortSignals(controller.signal, request.abortSignal);

		try {
			const response = await fetch(this.config.endpointUrl, {
				method: "POST",
				headers: this.buildHeaders(),
				body: JSON.stringify(this.buildRequestBody(request)),
				signal
			});

			if (response.status === 401 || response.status === 403) {
				throw new Error("Invalid API key or missing provider authorization.");
			}
			if (response.status === 408 || response.status === 504) {
				throw new Error("The AI request timed out. Try a shorter note, smaller output, or a longer timeout.");
			}
			if (response.status === 429) {
				throw new Error("The AI provider rate limited this request. Wait and try again.");
			}
			if (response.status < 200 || response.status >= 300) {
				throw new Error(this.providerError(response.status, await response.text()));
			}

			const json = await response.json() as OpenAIResponseBody;
			const content = json.choices?.[0]?.message?.content;
			if (!content || typeof content !== "string") {
				throw new Error("The AI provider returned an empty or unsupported response.");
			}
			return { content: content.trim(), raw: json };
		} catch (error) {
			if (isAbortError(error)) {
				throw new Error("The AI request was cancelled or timed out.");
			}
			if (error instanceof TypeError) {
				throw new Error("Network error while contacting the AI endpoint. Check the URL and connection.");
			}
			throw error;
		} finally {
			window.clearTimeout(timeoutId);
		}
	}

	protected buildHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...this.config.customHeaders
		};

		if (this.config.apiKey.trim().length > 0) {
			headers.Authorization = `Bearer ${this.config.apiKey}`;
		}

		return headers;
	}

	protected validateConfig(): void {
		if (!this.config.endpointUrl.trim()) {
			throw new Error("Missing endpoint URL. Add one in AI Note Companion settings.");
		}
		try {
			const url = new URL(this.config.endpointUrl);
			if (url.protocol !== "http:" && url.protocol !== "https:") {
				throw new Error("Invalid endpoint URL. Use an http or https URL.");
			}
		} catch {
			throw new Error("Invalid endpoint URL. Check the URL in AI Note Companion settings.");
		}
		if (this.config.preset !== "ollama" && this.config.apiKey.trim().length === 0) {
			throw new Error("Missing API key. Add one in AI Note Companion settings.");
		}
	}

	private providerError(status: number, body: string): string {
		try {
			const json = JSON.parse(body) as OpenAIResponseBody;
			const message = json.error?.message;
			if (message) {
				return `Provider error (${status}): ${sanitizeErrorMessage(message)}`;
			}
		} catch {
			// Fall back to sanitized text below.
		}
		const shortBody = sanitizeErrorMessage(body).slice(0, 240);
		return `Provider error (${status})${shortBody ? `: ${shortBody}` : "."}`;
	}

	private async withRetries(operation: () => Promise<LLMResponse>): Promise<LLMResponse> {
		let lastError: unknown;
		for (let attempt = 0; attempt <= this.config.retryCount; attempt += 1) {
			try {
				return await operation();
			} catch (error) {
				lastError = error;
				if (!isRetryableError(error) || attempt >= this.config.retryCount) {
					break;
				}
				await sleep(500 * (attempt + 1));
			}
		}
		throw lastError;
	}
}

export function parseCustomHeaders(value: string): Record<string, string> {
	if (!value.trim()) {
		return {};
	}

	const parsed = JSON.parse(value) as unknown;
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new Error("Custom headers must be a JSON object.");
	}

	const headers: Record<string, string> = {};
	for (const [key, raw] of Object.entries(parsed)) {
		if (typeof raw !== "string") {
			throw new Error("Custom header values must be strings.");
		}
		if (!ALLOWED_CUSTOM_HEADERS.has(key.toLowerCase())) {
			throw new Error(`Custom header is not allowed: ${key}`);
		}
		if (key.length > 64 || raw.length > 512) {
			throw new Error("Custom header names and values must be shorter.");
		}
		if (/[\r\n]/.test(key) || /[\r\n]/.test(raw)) {
			throw new Error("Custom headers cannot contain control characters.");
		}
		if (/^authorization$/i.test(key)) {
			continue;
		}
		if (!/^[A-Za-z0-9-]+$/.test(key)) {
			throw new Error(`Invalid custom header name: ${key}`);
		}
		headers[key] = raw;
	}
	return headers;
}

const ALLOWED_CUSTOM_HEADERS = new Set([
	"anthropic-version",
	"openai-organization",
	"openai-project",
	"x-api-version",
	"x-request-source",
	"x-title"
]);

function combineAbortSignals(primary: AbortSignal, secondary?: AbortSignal): AbortSignal {
	if (!secondary) {
		return primary;
	}
	if (secondary.aborted) {
		return secondary;
	}

	const controller = new AbortController();
	const abort = () => controller.abort();
	primary.addEventListener("abort", abort, { once: true });
	secondary.addEventListener("abort", abort, { once: true });
	return controller.signal;
}

function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}

function isRetryableError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}
	return /network|timeout|timed out|rate limited|429|cancelled/i.test(error.message);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
