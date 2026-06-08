import { App, TFile } from "obsidian";
import type { InfographicResult } from "../types";
import { ensureFolder, safeFilename, uniqueMarkdownPath } from "./createResultNote";

export async function createInfographicNote(
	app: App,
	folderPath: string,
	sourceFile: TFile,
	result: InfographicResult,
	model: string
): Promise<TFile> {
	await ensureFolder(app, folderPath);
	const path = await uniqueMarkdownPath(app, `${folderPath}/${safeFilename(`${sourceFile.basename} - Infographic`)}.md`);
	const body = buildInfographicNote(sourceFile, result, model);
	return app.vault.create(path, body);
}

export function buildInfographicNote(sourceFile: TFile, result: InfographicResult, model: string): string {
	const generatedDate = new Date().toISOString();
	const mermaidBlock = ["```mermaid", result.mermaid.trim(), "```"].join("\n");
	const svgBlock = result.svg ? [
		"",
		"## SVG preview",
		"",
		"> SVG preview is sanitized and stored as fenced code for safety.",
		"",
		"```svg",
		result.svg.trim().replace(/```/g, "'''"),
		"```"
	].join("\n") : "";

	return [
		"---",
		`source: "${sourceFile.path.replace(/"/g, '\\"')}"`,
		`generated: "${generatedDate}"`,
		'mode: "infographic"',
		`model: "${model.replace(/"/g, '\\"')}"`,
		`infographic_type: "${result.type}"`,
		"---",
		"",
		`# ${result.title}`,
		"",
		`Source: [[${sourceFile.basename}]]`,
		"",
		result.description.trim(),
		"",
		"## Diagram",
		"",
		mermaidBlock,
		svgBlock,
		""
	].join("\n");
}
