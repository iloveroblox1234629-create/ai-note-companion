import { App, normalizePath, TFile } from "obsidian";
import type { GeneratedResult } from "../types";
import { fencedMarkdownFallback, sanitizeAiMarkdown, scanAiOutput } from "../security/sanitizeAiOutput";

export async function createResultNote(app: App, folderPath: string, result: GeneratedResult): Promise<TFile> {
	await ensureFolder(app, folderPath);
	const suffix = result.mode === "explanation" ? "Explanation" : result.mode === "summary" ? "Summary" : "Infographic";
	const baseName = safeFilename(`${result.sourceFile.basename} - ${suffix}`);
	const path = await uniqueMarkdownPath(app, normalizePath(`${folderPath}/${baseName}.md`));
	const body = buildGeneratedNote(result);
	return app.vault.create(path, body);
}

export async function ensureFolder(app: App, folderPath: string): Promise<void> {
	const clean = normalizePath(folderPath.trim() || "AI Note Companion");
	if (app.vault.getAbstractFileByPath(clean)) {
		return;
	}
	await app.vault.createFolder(clean);
}

export async function uniqueMarkdownPath(app: App, desiredPath: string): Promise<string> {
	const clean = normalizePath(desiredPath);
	if (!app.vault.getAbstractFileByPath(clean)) {
		return clean;
	}

	const withoutExtension = clean.replace(/\.md$/i, "");
	for (let index = 2; index < 1000; index += 1) {
		const candidate = `${withoutExtension} ${index}.md`;
		if (!app.vault.getAbstractFileByPath(candidate)) {
			return candidate;
		}
	}

	throw new Error("Could not find an available filename.");
}

export function buildGeneratedNote(result: GeneratedResult): string {
	const generatedDate = new Date().toISOString();
	return [
		"---",
		`source: "${escapeYamlString(result.sourceFile.path)}"`,
		`generated: "${generatedDate}"`,
		`mode: "${result.mode}"`,
		`model: "${escapeYamlString(result.model)}"`,
		"---",
		"",
		`# ${result.title}`,
		"",
		`Source: [[${result.sourceFile.basename}]]`,
		"",
		safeGeneratedContent(result.content).trim(),
		""
	].join("\n");
}

export function safeGeneratedContent(content: string): string {
	const scan = scanAiOutput(content);
	if (!scan.safe) {
		return [
			"> AI Note Companion rendered this result as fenced Markdown because suspicious active content was detected.",
			"",
			fencedMarkdownFallback(content)
		].join("\n");
	}
	return sanitizeAiMarkdown(content);
}

export function safeFilename(name: string): string {
	const normalized = name
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[\\/:*?"<>|#^[\]]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/^\.+/, "")
		.slice(0, 120)
		.trim();

	return normalized || "AI Note Companion Result";
}

function escapeYamlString(value: string): string {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "\\r")
		.replace(/\t/g, "\\t")
		.replace(/[\u0000-\u001f\u007f]/g, "");
}
