import { App, Modal } from "obsidian";

export interface CommandPaletteAction {
	label: string;
	description: string;
	run: () => Promise<void>;
}

export class CommandPaletteModal extends Modal {
	private actions: CommandPaletteAction[];

	constructor(app: App, actions: CommandPaletteAction[]) {
		super(app);
		this.actions = actions;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("ai-note-companion");
		contentEl.createEl("h2", { text: "AI Note Companion" });

		const list = contentEl.createDiv({ cls: "ai-note-companion-action-list" });
		for (const action of this.actions) {
			const button = list.createEl("button", { cls: "ai-note-companion-action-button" });
			button.createSpan({ cls: "ai-note-companion-action-title", text: action.label });
			button.createSpan({ cls: "ai-note-companion-muted", text: action.description });
			button.addEventListener("click", () => {
				this.close();
				void action.run();
			});
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
