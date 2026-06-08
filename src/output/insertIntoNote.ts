import { App, TFile } from "obsidian";

export async function insertBelowCurrentNote(app: App, file: TFile, content: string, heading: string): Promise<void> {
	const current = await app.vault.read(file);
	const block = [
		"",
		"---",
		"",
		`## ${heading}`,
		"",
		content.trim(),
		""
	].join("\n");
	await app.vault.modify(file, `${current.replace(/\s*$/, "")}\n${block}`);
}
