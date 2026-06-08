import { App, TFile } from "obsidian";

export function getLinkedMarkdownFiles(app: App, sourceFile: TFile): TFile[] {
	const resolved = app.metadataCache.resolvedLinks[sourceFile.path] ?? {};
	const files: TFile[] = [];

	for (const linkedPath of Object.keys(resolved)) {
		const file = app.vault.getAbstractFileByPath(linkedPath);
		if (file instanceof TFile && file.extension === "md" && file.path !== sourceFile.path) {
			files.push(file);
		}
	}

	return files.sort((a, b) => a.path.localeCompare(b.path));
}

export async function buildLinkedNotesAppendix(app: App, files: TFile[]): Promise<string> {
	if (files.length === 0) {
		return "";
	}

	const sections: string[] = [];
	for (const file of files) {
		const content = await app.vault.read(file);
		sections.push([
			`# Linked note: ${file.basename}`,
			`Source path: ${file.path}`,
			content.trim()
		].join("\n\n"));
	}

	return [
		"---",
		"# Additional linked notes included by user setting",
		...sections
	].join("\n\n");
}

export async function expandEmbeddedTransclusions(app: App, sourceFile: TFile, content: string): Promise<string> {
	const embedPattern = /!\[\[([^\]#|]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
	const replacements = new Map<string, string>();
	let match: RegExpExecArray | null;

	while ((match = embedPattern.exec(content)) !== null) {
		const rawTarget = match[1]?.trim();
		if (!rawTarget || replacements.has(match[0])) {
			continue;
		}

		const linkedFile = app.metadataCache.getFirstLinkpathDest(rawTarget, sourceFile.path);
		if (linkedFile instanceof TFile && linkedFile.extension === "md") {
			const linkedContent = await app.vault.read(linkedFile);
			replacements.set(match[0], [
				`> Embedded note: [[${linkedFile.basename}]]`,
				linkedContent.trim()
			].join("\n\n"));
		}
	}

	let expanded = content;
	for (const [token, replacement] of replacements) {
		expanded = expanded.split(token).join(replacement);
	}
	return expanded;
}
