import { App, Modal, Setting } from "obsidian";

export interface ConfirmSendDetails {
	fileName: string;
	linkedCount: number;
	requireEveryTime: boolean;
}

export class ConfirmSendModal extends Modal {
	private details: ConfirmSendDetails;
	private resolvePromise?: (value: boolean) => void;
	private rememberAccepted = true;

	constructor(app: App, details: ConfirmSendDetails) {
		super(app);
		this.details = details;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("ai-note-companion");
		contentEl.createEl("h2", { text: "Send note content to AI?" });
		contentEl.createEl("p", {
			text: "This will send the contents of the current note to your configured AI endpoint."
		});

		if (this.details.linkedCount > 0) {
			contentEl.createEl("p", {
				cls: "ai-note-companion-warning",
				text: `${this.details.linkedCount} linked note${this.details.linkedCount === 1 ? "" : "s"} will also be sent because linked notes are enabled.`
			});
		}

		contentEl.createEl("p", {
			cls: "ai-note-companion-muted",
			text: `Current note: ${this.details.fileName}`
		});

		if (!this.details.requireEveryTime) {
			new Setting(contentEl)
				.setName("Remember this choice")
				.setDesc("Skip the first-request warning next time unless confirmation is required in settings.")
				.addToggle((toggle) => toggle
					.setValue(this.rememberAccepted)
					.onChange((value) => {
						this.rememberAccepted = value;
					}));
		}

		const buttonRow = contentEl.createDiv({ cls: "ai-note-companion-button-row" });
		const cancelButton = buttonRow.createEl("button", { text: "Cancel" });
		cancelButton.addEventListener("click", () => this.finish(false));
		const sendButton = buttonRow.createEl("button", {
			text: "Send to AI",
			cls: "mod-cta"
		});
		sendButton.addEventListener("click", () => this.finish(true));
	}

	onClose(): void {
		this.contentEl.empty();
		if (this.resolvePromise) {
			this.resolvePromise(false);
			this.resolvePromise = undefined;
		}
	}

	openAndAwait(): Promise<{ accepted: boolean; rememberAccepted: boolean }> {
		return new Promise((resolve) => {
			this.resolvePromise = (accepted) => resolve({ accepted, rememberAccepted: this.rememberAccepted });
			this.open();
		});
	}

	private finish(value: boolean): void {
		const resolve = this.resolvePromise;
		this.resolvePromise = undefined;
		this.close();
		resolve?.(value);
	}
}
