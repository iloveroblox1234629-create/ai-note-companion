import { App, Notice, TFile, MarkdownView } from "obsidian";
import type { ActiveNoteContent, NoteReadOptions } from "../types";
import { buildLinkedNotesAppendix, expandEmbeddedTransclusions, getLinkedMarkdownFiles } from "./linkedNotes";

export async function readActiveNote(app: App, options: NoteReadOptions): Promise<ActiveNoteContent> {
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	const file = view?.file;

	if (!(file instanceof TFile) || file.extension !== "md") {
		new Notice("AI Note Companion: open a Markdown note first.");
		throw new Error("No active Markdown file.");
	}

	let content = await app.vault.read(file);
	if (!options.includeFrontmatter) {
		content = stripFrontmatter(content);
	}
	if (options.includeEmbeddedTransclusions) {
		content = await expandEmbeddedTransclusions(app, file, content);
	}

	const linkedFiles = options.includeLinkedNotes ? getLinkedMarkdownFiles(app, file) : [];
	if (linkedFiles.length > 0) {
		const appendix = await buildLinkedNotesAppendix(app, linkedFiles);
		content = `${content.trim()}\n\n${appendix}`;
	}

	return { file, content, linkedFiles };
}

export function stripFrontmatter(content: string): string {
	if (!content.startsWith("---")) {
		return content;
	}

	const lines = content.split(/\r?\n/);
	for (let index = 1; index < lines.length; index += 1) {
		if (lines[index]?.trim() === "---") {
			return lines.slice(index + 1).join("\n").replace(/^\n+/, "");
		}
	}

	return content;
}
