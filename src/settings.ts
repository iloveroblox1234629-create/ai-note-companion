import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type AINoteCompanionPlugin from "./main";
import type {
	AINoteCompanionSettings,
	InfographicType,
	ProviderPreset,
	SummaryDestination,
	SummaryDetailLevel
} from "./types";
import { buildProvider } from "./llm/LLMClient";
import { parseCustomHeaders } from "./llm/providers/OpenAICompatibleProvider";

export const DEFAULT_SETTINGS: AINoteCompanionSettings = {
	providerPreset: "openai-compatible",
	endpointUrl: "https://api.example.com/v1/chat/completions",
	apiKey: "",
	model: "gpt-4o-mini",
	requestFormat: "openai-chat",
	customHeadersJson: "",
	temperature: 0.3,
	maxOutputTokens: 1800,
	contextWindow: 12000,
	requestTimeoutSeconds: 60,
	retryCount: 1,
	chunkSize: 6000,
	chunkOverlap: 600,
	defaultOutputFolder: "AI Note Companion",
	defaultLanguageTone: "Clear, educational, and concise",
	summaryDetailLevel: "standard",
	summaryDestination: "modal",
	infographicDefaultType: "auto",
	enableSvgPreview: false,
	confirmBeforeSending: true,
	includeFrontmatter: true,
	includeEmbeddedTransclusions: false,
	includeLinkedNotes: false,
	acceptedPrivacyWarning: false,
	debugLogging: false
};

export function migrateSettings(data: unknown): AINoteCompanionSettings {
	const loaded = isRecord(data) ? data : {};
	const settings: AINoteCompanionSettings = {
		...DEFAULT_SETTINGS,
		...loaded
	};

	settings.providerPreset = normalizeProviderPreset(settings.providerPreset);
	settings.summaryDetailLevel = normalizeSummaryDetail(settings.summaryDetailLevel);
	settings.summaryDestination = normalizeSummaryDestination(settings.summaryDestination);
	settings.infographicDefaultType = normalizeInfographicType(settings.infographicDefaultType);
	settings.temperature = clampNumber(settings.temperature, 0, 2, DEFAULT_SETTINGS.temperature);
	settings.maxOutputTokens = clampInteger(settings.maxOutputTokens, 128, 32000, DEFAULT_SETTINGS.maxOutputTokens);
	settings.contextWindow = clampInteger(settings.contextWindow, 1000, 1000000, DEFAULT_SETTINGS.contextWindow);
	settings.requestTimeoutSeconds = clampInteger(settings.requestTimeoutSeconds, 5, 600, DEFAULT_SETTINGS.requestTimeoutSeconds);
	settings.retryCount = clampInteger(settings.retryCount, 0, 5, DEFAULT_SETTINGS.retryCount);
	settings.chunkSize = clampInteger(settings.chunkSize, 1000, 100000, DEFAULT_SETTINGS.chunkSize);
	settings.chunkOverlap = clampInteger(settings.chunkOverlap, 0, Math.floor(settings.chunkSize / 2), DEFAULT_SETTINGS.chunkOverlap);
	settings.defaultOutputFolder = nonEmptyString(settings.defaultOutputFolder, DEFAULT_SETTINGS.defaultOutputFolder);
	settings.defaultLanguageTone = nonEmptyString(settings.defaultLanguageTone, DEFAULT_SETTINGS.defaultLanguageTone);
	settings.endpointUrl = nonEmptyString(settings.endpointUrl, DEFAULT_SETTINGS.endpointUrl);
	settings.model = nonEmptyString(settings.model, DEFAULT_SETTINGS.model);
	settings.requestFormat = "openai-chat";
	settings.customHeadersJson = typeof settings.customHeadersJson === "string" ? settings.customHeadersJson : "";
	settings.apiKey = typeof settings.apiKey === "string" ? settings.apiKey : "";
	settings.enableSvgPreview = Boolean(settings.enableSvgPreview);
	settings.confirmBeforeSending = Boolean(settings.confirmBeforeSending);
	settings.includeFrontmatter = Boolean(settings.includeFrontmatter);
	settings.includeEmbeddedTransclusions = Boolean(settings.includeEmbeddedTransclusions);
	settings.includeLinkedNotes = Boolean(settings.includeLinkedNotes);
	settings.acceptedPrivacyWarning = Boolean(settings.acceptedPrivacyWarning);
	settings.debugLogging = Boolean(settings.debugLogging);

	return settings;
}

export class AINoteCompanionSettingTab extends PluginSettingTab {
	plugin: AINoteCompanionPlugin;

	constructor(app: App, plugin: AINoteCompanionPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("ai-note-companion");
		containerEl.createEl("h2", { text: "AI Note Companion" });

		new Setting(containerEl)
			.setName("Provider preset")
			.setDesc("Choose the request style and defaults for your AI endpoint.")
			.addDropdown((dropdown) => dropdown
				.addOption("openai-compatible", "OpenAI-compatible")
				.addOption("ollama", "Ollama/local OpenAI-compatible")
				.addOption("anthropic-compatible", "Anthropic-compatible")
				.addOption("custom", "Custom HTTP endpoint")
				.setValue(this.plugin.settings.providerPreset)
				.onChange(async (value) => {
					this.plugin.settings.providerPreset = value as ProviderPreset;
					if (value === "ollama" && this.plugin.settings.endpointUrl === DEFAULT_SETTINGS.endpointUrl) {
						this.plugin.settings.endpointUrl = "http://localhost:11434/v1/chat/completions";
						this.plugin.settings.model = "llama3.1";
					}
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName("Endpoint URL")
			.setDesc("OpenAI-compatible chat completions endpoint.")
			.addText((text) => text
				.setPlaceholder("https://api.example.com/v1/chat/completions")
				.setValue(this.plugin.settings.endpointUrl)
				.onChange(async (value) => {
					this.plugin.settings.endpointUrl = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("API key")
			.setDesc("Stored in Obsidian plugin data. It is never logged by this plugin.")
			.addText((text) => {
				text.inputEl.type = "password";
				text.setPlaceholder("sk-...")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					});
			})
			.addButton((button) => button
				.setButtonText("Test connection")
				.onClick(async () => {
					button.setDisabled(true);
					button.setButtonText("Testing...");
					try {
						const provider = buildProvider(this.plugin.settings);
						await provider.testConnection();
						new Notice("AI Note Companion: connection succeeded.");
					} catch (error) {
						new Notice(`AI Note Companion: ${this.plugin.toUserError(error)}`);
					} finally {
						button.setDisabled(false);
						button.setButtonText("Test connection");
					}
				}));

		new Setting(containerEl)
			.setName("Model name")
			.setDesc("Free text model identifier sent to your provider.")
			.addText((text) => text
				.setPlaceholder("gpt-4o-mini")
				.setValue(this.plugin.settings.model)
				.onChange(async (value) => {
					this.plugin.settings.model = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Custom headers")
			.setDesc("Optional JSON object of extra headers. Authorization is managed by the API key field.")
			.addTextArea((text) => {
				text.inputEl.addClass("ai-note-companion-settings-textarea");
				text.setPlaceholder("{\"HTTP-Referer\":\"https://example.com\"}")
					.setValue(this.plugin.settings.customHeadersJson)
					.onChange(async (value) => {
						this.plugin.settings.customHeadersJson = value;
						try {
							parseCustomHeaders(value);
							text.inputEl.removeClass("ai-note-companion-input-error");
						} catch {
							text.inputEl.addClass("ai-note-companion-input-error");
						}
						await this.plugin.saveSettings();
					});
			});

		containerEl.createEl("h3", { text: "Advanced" });

		this.addNumberSetting("Temperature", "Creativity from 0 to 2.", this.plugin.settings.temperature, 0, 2, 0.1, async (value) => {
			this.plugin.settings.temperature = value;
			await this.plugin.saveSettings();
		});

		this.addNumberSetting("Max output tokens", "Maximum response size requested from the provider.", this.plugin.settings.maxOutputTokens, 128, 32000, 128, async (value) => {
			this.plugin.settings.maxOutputTokens = Math.round(value);
			await this.plugin.saveSettings();
		});

		this.addNumberSetting("Context window estimate", "Approximate model context window in tokens.", this.plugin.settings.contextWindow, 1000, 1000000, 1000, async (value) => {
			this.plugin.settings.contextWindow = Math.round(value);
			await this.plugin.saveSettings();
		});

		this.addNumberSetting("Request timeout seconds", "Cancel slow requests after this many seconds.", this.plugin.settings.requestTimeoutSeconds, 5, 600, 5, async (value) => {
			this.plugin.settings.requestTimeoutSeconds = Math.round(value);
			await this.plugin.saveSettings();
		});

		this.addNumberSetting("Retry count", "Retry transient failures this many times.", this.plugin.settings.retryCount, 0, 5, 1, async (value) => {
			this.plugin.settings.retryCount = Math.round(value);
			await this.plugin.saveSettings();
		});

		this.addNumberSetting("Chunk size", "Approximate characters per chunk before map-reduce is used.", this.plugin.settings.chunkSize, 1000, 100000, 500, async (value) => {
			this.plugin.settings.chunkSize = Math.round(value);
			await this.plugin.saveSettings();
		});

		this.addNumberSetting("Chunk overlap", "Characters of context repeated between long chunks.", this.plugin.settings.chunkOverlap, 0, Math.floor(this.plugin.settings.chunkSize / 2), 100, async (value) => {
			this.plugin.settings.chunkOverlap = Math.round(value);
			await this.plugin.saveSettings();
		});

		new Setting(containerEl)
			.setName("Default output folder")
			.setDesc("Generated notes are created here when a command creates a new note.")
			.addText((text) => text
				.setPlaceholder("AI Note Companion")
				.setValue(this.plugin.settings.defaultOutputFolder)
				.onChange(async (value) => {
					this.plugin.settings.defaultOutputFolder = value.trim() || DEFAULT_SETTINGS.defaultOutputFolder;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Default language/tone")
			.setDesc("Tone instruction appended to explain, summarize, and infographic prompts.")
			.addText((text) => text
				.setPlaceholder("Clear, educational, and concise")
				.setValue(this.plugin.settings.defaultLanguageTone)
				.onChange(async (value) => {
					this.plugin.settings.defaultLanguageTone = value.trim() || DEFAULT_SETTINGS.defaultLanguageTone;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Summary detail level")
			.addDropdown((dropdown) => dropdown
				.addOption("brief", "Brief")
				.addOption("standard", "Standard")
				.addOption("detailed", "Detailed")
				.setValue(this.plugin.settings.summaryDetailLevel)
				.onChange(async (value) => {
					this.plugin.settings.summaryDetailLevel = value as SummaryDetailLevel;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Summary output destination")
			.addDropdown((dropdown) => dropdown
				.addOption("modal", "Show in modal")
				.addOption("append", "Append to current note")
				.addOption("new-note", "Create new note")
				.setValue(this.plugin.settings.summaryDestination)
				.onChange(async (value) => {
					this.plugin.settings.summaryDestination = value as SummaryDestination;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Infographic default type")
			.addDropdown((dropdown) => dropdown
				.addOption("auto", "Auto-detect best type")
				.addOption("mind-map", "Mind map")
				.addOption("flowchart", "Flowchart")
				.addOption("timeline", "Timeline")
				.addOption("comparison-table", "Comparison table")
				.addOption("process-diagram", "Process diagram")
				.addOption("concept-map", "Concept map")
				.setValue(this.plugin.settings.infographicDefaultType)
				.onChange(async (value) => {
					this.plugin.settings.infographicDefaultType = value as InfographicType;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Generate sanitized SVG preview")
			.setDesc("Also ask the model for SVG markup, sanitize it, and embed it in the infographic note.")
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.enableSvgPreview)
				.onChange(async (value) => {
					this.plugin.settings.enableSvgPreview = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl("h3", { text: "Privacy" });

		new Setting(containerEl)
			.setName("Confirm before sending note content to AI")
			.setDesc("When enabled, every request asks for confirmation before sending content.")
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.confirmBeforeSending)
				.onChange(async (value) => {
					this.plugin.settings.confirmBeforeSending = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Include frontmatter")
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.includeFrontmatter)
				.onChange(async (value) => {
					this.plugin.settings.includeFrontmatter = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Include embedded transclusions")
			.setDesc("Resolve simple ![[note]] embeds into request content.")
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.includeEmbeddedTransclusions)
				.onChange(async (value) => {
					this.plugin.settings.includeEmbeddedTransclusions = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Include linked notes")
			.setDesc("Default off. If enabled, linked Markdown files may also be sent after confirmation.")
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.includeLinkedNotes)
				.onChange(async (value) => {
					this.plugin.settings.includeLinkedNotes = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Debug logging")
			.setDesc("Logs sanitized operational metadata only. Note content and API keys are never logged.")
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.debugLogging)
				.onChange(async (value) => {
					this.plugin.settings.debugLogging = value;
					await this.plugin.saveSettings();
				}));
	}

	private addNumberSetting(
		name: string,
		desc: string,
		value: number,
		min: number,
		max: number,
		step: number,
		onChange: (value: number) => Promise<void>
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addText((text) => {
				text.inputEl.type = "number";
				text.inputEl.min = String(min);
				text.inputEl.max = String(max);
				text.inputEl.step = String(step);
				text.setValue(String(value))
					.onChange(async (raw) => {
						const parsed = Number(raw);
						if (!Number.isFinite(parsed)) {
							text.inputEl.addClass("ai-note-companion-input-error");
							return;
						}
						text.inputEl.removeClass("ai-note-companion-input-error");
						await onChange(clampNumber(parsed, min, max, value));
					});
			});
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return fallback;
	}
	return Math.min(max, Math.max(min, value));
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
	return Math.round(clampNumber(value, min, max, fallback));
}

function nonEmptyString(value: unknown, fallback: string): string {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function normalizeProviderPreset(value: unknown): ProviderPreset {
	if (value === "openai-compatible" || value === "ollama" || value === "anthropic-compatible" || value === "custom") {
		return value;
	}
	return DEFAULT_SETTINGS.providerPreset;
}

function normalizeSummaryDetail(value: unknown): SummaryDetailLevel {
	if (value === "brief" || value === "standard" || value === "detailed") {
		return value;
	}
	return DEFAULT_SETTINGS.summaryDetailLevel;
}

function normalizeSummaryDestination(value: unknown): SummaryDestination {
	if (value === "modal" || value === "append" || value === "new-note") {
		return value;
	}
	return DEFAULT_SETTINGS.summaryDestination;
}

function normalizeInfographicType(value: unknown): InfographicType {
	if (
		value === "auto" ||
		value === "mind-map" ||
		value === "flowchart" ||
		value === "timeline" ||
		value === "comparison-table" ||
		value === "process-diagram" ||
		value === "concept-map"
	) {
		return value;
	}
	return DEFAULT_SETTINGS.infographicDefaultType;
}
