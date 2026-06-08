import type { TFile } from "obsidian";

export type ProviderPreset =
	| "openai-compatible"
	| "ollama"
	| "anthropic-compatible"
	| "custom";

export type SummaryDetailLevel = "brief" | "standard" | "detailed";

export type SummaryDestination = "modal" | "append" | "new-note";

export type InfographicType =
	| "auto"
	| "mind-map"
	| "flowchart"
	| "timeline"
	| "comparison-table"
	| "process-diagram"
	| "concept-map";

export interface AINoteCompanionSettings {
	providerPreset: ProviderPreset;
	endpointUrl: string;
	apiKey: string;
	model: string;
	requestFormat: "openai-chat";
	customHeadersJson: string;
	temperature: number;
	maxOutputTokens: number;
	contextWindow: number;
	requestTimeoutSeconds: number;
	retryCount: number;
	chunkSize: number;
	chunkOverlap: number;
	defaultOutputFolder: string;
	defaultLanguageTone: string;
	summaryDetailLevel: SummaryDetailLevel;
	summaryDestination: SummaryDestination;
	infographicDefaultType: InfographicType;
	enableSvgPreview: boolean;
	confirmBeforeSending: boolean;
	includeFrontmatter: boolean;
	includeEmbeddedTransclusions: boolean;
	includeLinkedNotes: boolean;
	acceptedPrivacyWarning: boolean;
	debugLogging: boolean;
}

export interface NoteReadOptions {
	includeFrontmatter: boolean;
	includeEmbeddedTransclusions: boolean;
	includeLinkedNotes: boolean;
}

export interface ActiveNoteContent {
	file: TFile;
	content: string;
	linkedFiles: TFile[];
}

export interface MarkdownChunk {
	index: number;
	total: number;
	title: string;
	headingPath: string[];
	content: string;
}

export interface LLMRequest {
	systemPrompt: string;
	userPrompt: string;
	model: string;
	temperature: number;
	maxTokens: number;
	abortSignal?: AbortSignal;
}

export interface LLMResponse {
	content: string;
	raw?: unknown;
}

export interface LLMProvider {
	complete(request: LLMRequest): Promise<LLMResponse>;
	testConnection(): Promise<void>;
}

export interface ProviderConfig {
	preset: ProviderPreset;
	endpointUrl: string;
	apiKey: string;
	model: string;
	timeoutMs: number;
	retryCount: number;
	customHeaders: Record<string, string>;
	debugLogging: boolean;
}

export interface GeneratedResult {
	mode: "explanation" | "summary" | "infographic";
	title: string;
	sourceFile: TFile;
	content: string;
	model: string;
}

export interface InfographicResult {
	title: string;
	description: string;
	mermaid: string;
	svg?: string;
	type: InfographicType;
}

export interface ProgressReporter {
	setMessage(message: string): void;
	throwIfCancelled(): void;
	get signal(): AbortSignal;
}
