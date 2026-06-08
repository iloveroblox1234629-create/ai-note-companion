import { App, MarkdownRenderer, Modal, Notice, TFile } from "obsidian";
import type AINoteCompanionPlugin from "../main";
import type { GeneratedResult } from "../types";
import { createResultNote } from "../output/createResultNote";
import { insertBelowCurrentNote } from "../output/insertIntoNote";

export interface ResultModalOptions {
	plugin: AINoteCompanionPlugin;
	result: GeneratedResult;
	onRegenerate: () => Promise<void>;
}

export class ResultModal extends Modal {
	private plugin: AINoteCompanionPlugin;
	private result: GeneratedResult;
	private onRegenerateCallback: () => Promise<void>;
	private buttons: HTMLButtonElement[] = [];
	private contentContainer?: HTMLElement;

	constructor(app: App, options: ResultModalOptions) {
		super(app);
		this.plugin = options.plugin;
		this.result = options.result;
		this.onRegenerateCallback = options.onRegenerate;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("ai-note-companion");
		contentEl.createEl("h2", { text: this.result.title });

		const buttonRow = contentEl.createDiv({ cls: "ai-note-companion-button-row" });
		this.addButton(buttonRow, "Copy", () => this.copyToClipboard());
		this.addButton(buttonRow, "Insert below current note", () => this.insertBelow());
		this.addButton(buttonRow, "Create new note", () => this.createNote());
		this.addButton(buttonRow, "Regenerate", () => this.regenerate());

		this.contentContainer = contentEl.createDiv({ cls: "ai-note-companion-result" });
		void this.renderMarkdown();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private addButton(parent: HTMLElement, text: string, handler: () => Promise<void>): void {
		const button = parent.createEl("button", { text });
		button.addEventListener("click", () => {
			void this.withDisabledButtons(handler);
		});
		this.buttons.push(button);
	}

	private async renderMarkdown(): Promise<void> {
		if (!this.contentContainer) {
			return;
		}
		this.contentContainer.empty();
		await MarkdownRenderer.render(this.app, this.result.content, this.contentContainer, this.result.sourceFile.path, this.plugin);
	}

	private async copyToClipboard(): Promise<void> {
		await navigator.clipboard.writeText(this.result.content);
		new Notice("AI Note Companion: copied result.");
	}

	private async insertBelow(): Promise<void> {
		await insertBelowCurrentNote(this.app, this.result.sourceFile, this.result.content, this.result.title);
		new Notice("AI Note Companion: inserted result below the current note.");
	}

	private async createNote(): Promise<void> {
		const file = await createResultNote(this.app, this.plugin.settings.defaultOutputFolder, this.result);
		new Notice(`AI Note Companion: created ${file.path}.`);
	}

	private async regenerate(): Promise<void> {
		this.close();
		await this.onRegenerateCallback();
	}

	private async withDisabledButtons(handler: () => Promise<void>): Promise<void> {
		this.setButtonsDisabled(true);
		try {
			await handler();
		} catch (error) {
			new Notice(`AI Note Companion: ${this.plugin.toUserError(error)}`);
		} finally {
			this.setButtonsDisabled(false);
		}
	}

	private setButtonsDisabled(disabled: boolean): void {
		for (const button of this.buttons) {
			button.disabled = disabled;
		}
	}
}

export class ProgressModal extends Modal {
	private messageEl?: HTMLElement;
	private cancelButton?: HTMLButtonElement;
	private abortController = new AbortController();
	private cancelled = false;

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("ai-note-companion");
		contentEl.createEl("h2", { text: "AI Note Companion" });
		this.messageEl = contentEl.createEl("p", { text: "Preparing..." });
		const progress = contentEl.createDiv({ cls: "ai-note-companion-progress" });
		progress.createDiv();
		this.cancelButton = contentEl.createEl("button", { text: "Cancel" });
		this.cancelButton.addEventListener("click", () => {
			this.cancelled = true;
			this.abortController.abort();
			this.setMessage("Cancelling...");
			this.cancelButton?.setAttribute("disabled", "true");
		});
	}

	setMessage(message: string): void {
		this.messageEl?.setText(message);
	}

	throwIfCancelled(): void {
		if (this.cancelled || this.abortController.signal.aborted) {
			throw new Error("Request cancelled.");
		}
	}

	get signal(): AbortSignal {
		return this.abortController.signal;
	}
}
