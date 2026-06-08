import { App, TFile } from "obsidian";
import { safeGeneratedContent } from "./createResultNote";

export async function insertBelowCurrentNote(app: App, file: TFile, content: string, heading: string): Promise<void> {
	const current = await app.vault.read(file);
	const block = [
		"",
		"---",
		"",
		`## ${heading}`,
		"",
		safeGeneratedContent(content).trim(),
		""
	].join("\n");
	await app.vault.modify(file, `${current.replace(/\s*$/, "")}\n${block}`);
}
