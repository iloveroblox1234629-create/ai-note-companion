import { App, Modal } from "obsidian";
import type { InfographicType } from "../types";
import { infographicLabel } from "../prompts/infographicPrompt";

const TYPES: InfographicType[] = [
	"auto",
	"mind-map",
	"flowchart",
	"timeline",
	"comparison-table",
	"process-diagram",
	"concept-map"
];

export class InfographicTypeModal extends Modal {
	private defaultType: InfographicType;
	private resolvePromise?: (value: InfographicType | null) => void;

	constructor(app: App, defaultType: InfographicType) {
		super(app);
		this.defaultType = defaultType;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("ai-note-companion");
		contentEl.createEl("h2", { text: "Choose infographic type" });
		const grid = contentEl.createDiv({ cls: "ai-note-companion-choice-grid" });

		for (const type of TYPES) {
			const button = grid.createEl("button", {
				text: infographicLabel(type),
				cls: type === this.defaultType ? "is-selected" : ""
			});
			button.addEventListener("click", () => this.finish(type));
		}

		const cancel = contentEl.createEl("button", { text: "Cancel" });
		cancel.addEventListener("click", () => this.finish(null));
	}

	onClose(): void {
		this.contentEl.empty();
		if (this.resolvePromise) {
			this.resolvePromise(null);
			this.resolvePromise = undefined;
		}
	}

	openAndAwait(): Promise<InfographicType | null> {
		return new Promise((resolve) => {
			this.resolvePromise = resolve;
			this.open();
		});
	}

	private finish(value: InfographicType | null): void {
		const resolve = this.resolvePromise;
		this.resolvePromise = undefined;
		this.close();
		resolve?.(value);
	}
}
