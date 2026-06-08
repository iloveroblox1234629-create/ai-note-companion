import { Notice, Plugin, TFile } from "obsidian";
import { explainCurrentNote } from "./commands/explainCommand";
import { createInfographicFromCurrentNote } from "./commands/infographicCommand";
import { summarizeCurrentNote } from "./commands/summarizeCommand";
import { sanitizeErrorMessage } from "./llm/LLMClient";
import { AINoteCompanionSettingTab, DEFAULT_SETTINGS, migrateSettings } from "./settings";
import type { AINoteCompanionSettings, NoteReadOptions } from "./types";
import { CommandPaletteModal } from "./ui/CommandPaletteModal";
import { ConfirmSendModal } from "./ui/ConfirmSendModal";

export default class AINoteCompanionPlugin extends Plugin {
	settings!: AINoteCompanionSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addRibbonIcon("sparkles", "AI Note Companion", () => {
			this.openActionModal();
		});

		this.addCommand({
			id: "open-ai-note-companion",
			name: "AI Note Companion: Open command modal",
			callback: () => this.openActionModal()
		});

		this.addCommand({
			id: "explain-current-note",
			name: "AI Note Companion: Explain current note",
			callback: () => {
				void this.wrapCommand(() => explainCurrentNote(this));
			}
		});

		this.addCommand({
			id: "summarize-current-note",
			name: "AI Note Companion: Summarize current note",
			callback: () => {
				void this.wrapCommand(() => summarizeCurrentNote(this));
			}
		});

		this.addCommand({
			id: "create-infographic-current-note",
			name: "AI Note Companion: Create infographic from current note",
			callback: () => {
				void this.wrapCommand(() => createInfographicFromCurrentNote(this));
			}
		});

		this.addSettingTab(new AINoteCompanionSettingTab(this.app, this));
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		this.settings = migrateSettings(await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	noteReadOptions(): NoteReadOptions {
		return {
			includeFrontmatter: this.settings.includeFrontmatter,
			includeEmbeddedTransclusions: this.settings.includeEmbeddedTransclusions,
			includeLinkedNotes: this.settings.includeLinkedNotes
		};
	}

	async confirmSend(file: TFile, linkedCount: number): Promise<boolean> {
		const shouldShow = this.settings.confirmBeforeSending || !this.settings.acceptedPrivacyWarning || linkedCount > 0;
		if (!shouldShow) {
			return true;
		}

		const modal = new ConfirmSendModal(this.app, {
			fileName: file.path,
			linkedCount,
			requireEveryTime: this.settings.confirmBeforeSending
		});
		const result = await modal.openAndAwait();
		if (result.accepted && result.rememberAccepted && !this.settings.confirmBeforeSending && linkedCount === 0) {
			this.settings.acceptedPrivacyWarning = true;
			await this.saveSettings();
		}
		return result.accepted;
	}

	toUserError(error: unknown): string {
		if (error instanceof Error) {
			return sanitizeErrorMessage(error.message);
		}
		if (typeof error === "string") {
			return sanitizeErrorMessage(error);
		}
		return "Something went wrong. Check settings and try again.";
	}

	debug(message: string, metadata?: Record<string, unknown>): void {
		if (!this.settings.debugLogging) {
			return;
		}
		console.debug(`AI Note Companion: ${message}`, metadata ?? {});
	}

	private openActionModal(): void {
		new CommandPaletteModal(this.app, [
			{
				label: "Explain current note",
				description: "Create a learner-friendly explanation from the entire active Markdown file.",
				run: () => this.wrapCommand(() => explainCurrentNote(this))
			},
			{
				label: "Summarize current note",
				description: "Create a structured whole-note summary.",
				run: () => this.wrapCommand(() => summarizeCurrentNote(this))
			},
			{
				label: "Create infographic",
				description: "Generate a Mermaid study aid and optional sanitized SVG preview.",
				run: () => this.wrapCommand(() => createInfographicFromCurrentNote(this))
			}
		]).open();
	}

	private async wrapCommand(action: () => Promise<void>): Promise<void> {
		try {
			await action();
		} catch (error) {
			new Notice(`AI Note Companion: ${this.toUserError(error)}`);
		}
	}
}

export { DEFAULT_SETTINGS };
