import type { AINoteCompanionSettings, LLMProvider, ProviderConfig } from "../types";
import { CustomProvider } from "./providers/CustomProvider";
import { OpenAICompatibleProvider, parseCustomHeaders } from "./providers/OpenAICompatibleProvider";
export { sanitizeErrorMessage } from "./errors";

export function buildProvider(settings: AINoteCompanionSettings): LLMProvider {
	const config: ProviderConfig = {
		preset: settings.providerPreset,
		endpointUrl: settings.endpointUrl,
		apiKey: settings.apiKey,
		model: settings.model,
		timeoutMs: settings.requestTimeoutSeconds * 1000,
		retryCount: settings.retryCount,
		customHeaders: parseCustomHeaders(settings.customHeadersJson),
		debugLogging: settings.debugLogging
	};

	if (settings.providerPreset === "custom") {
		return new CustomProvider(config);
	}

	return new OpenAICompatibleProvider(config);
}
