import { Notice } from "obsidian";
import type AINoteCompanionPlugin from "../main";
import type { InfographicResult, InfographicType } from "../types";
import { buildProvider } from "../llm/LLMClient";
import { readActiveNote } from "../note/readActiveNote";
import { createInfographicNote } from "../output/createInfographicNote";
import {
	infographicNoteTitlePrompt,
	infographicSystemPrompt,
	mermaidPrompt,
	svgPrompt
} from "../prompts/infographicPrompt";
import { sanitizeSvg } from "../security/sanitizeSvg";
import { InfographicTypeModal } from "../ui/InfographicTypeModal";
import { ProgressModal } from "../ui/ResultModal";
import { appendAuditLog } from "../security/auditLog";

export async function createInfographicFromCurrentNote(plugin: AINoteCompanionPlugin): Promise<void> {
	const selectedType = await new InfographicTypeModal(plugin.app, plugin.settings.infographicDefaultType).openAndAwait();
	if (!selectedType) {
		return;
	}

	const progress = new ProgressModal(plugin.app);
	progress.open();

	try {
		plugin.checkEndpointAllowed();
		plugin.checkRateLimit();
		progress.setMessage("Reading note...");
		const note = await readActiveNote(plugin.app, plugin.noteReadOptions());
		if (note.content.trim().length === 0) {
			throw new Error("The active note is empty.");
		}

		const canSend = await plugin.confirmSend(note.file, note.linkedFiles.length);
		if (!canSend) {
			throw new Error("Request cancelled.");
		}

		const result = await runInfographicRequest(plugin, note.file.basename, note.content, selectedType, progress);
		await appendAuditLog(plugin, {
			requestType: "infographic",
			linkedNotesIncluded: note.linkedFiles.length > 0
		});
		progress.setMessage("Creating note...");
		const created = await createInfographicNote(plugin.app, plugin.settings.defaultOutputFolder, note.file, result, plugin.settings.model);
		progress.close();
		new Notice(`AI Note Companion: created ${created.path}.`);
	} catch (error) {
		progress.close();
		if (!/cancelled/i.test(plugin.toUserError(error))) {
			void appendAuditLog(plugin, {
				requestType: "error",
				linkedNotesIncluded: false,
				message: plugin.toUserError(error)
			});
			new Notice(`AI Note Companion: ${plugin.toUserError(error)}`);
		}
	}
}

async function runInfographicRequest(
	plugin: AINoteCompanionPlugin,
	noteTitle: string,
	content: string,
	type: InfographicType,
	progress: ProgressModal
): Promise<InfographicResult> {
	const provider = buildProvider(plugin.settings);
	const systemPrompt = infographicSystemPrompt(plugin.settings.defaultLanguageTone);

	progress.setMessage("Generating Mermaid diagram...");
	progress.throwIfCancelled();
	const mermaid = await provider.complete({
		systemPrompt,
		userPrompt: mermaidPrompt(noteTitle, content, type),
		model: plugin.settings.model,
		temperature: Math.min(plugin.settings.temperature, 0.4),
		maxTokens: plugin.settings.maxOutputTokens,
		abortSignal: progress.signal
	});

	let svg: string | undefined;
	if (plugin.settings.enableSvgPreview) {
		progress.setMessage("Generating SVG preview...");
		progress.throwIfCancelled();
		const svgResponse = await provider.complete({
			systemPrompt,
			userPrompt: svgPrompt(noteTitle, content, type),
			model: plugin.settings.model,
			temperature: Math.min(plugin.settings.temperature, 0.4),
			maxTokens: plugin.settings.maxOutputTokens,
			abortSignal: progress.signal
		});
		const sanitized = sanitizeSvg(svgResponse.content);
		if (plugin.settings.debugLogging && sanitized.removed.length > 0) {
			console.debug("AI Note Companion SVG sanitizer removed unsafe SVG features:", sanitized.removed);
		}
		svg = sanitized.svg;
	}

	progress.setMessage("Creating infographic description...");
	progress.throwIfCancelled();
	const titleDescription = await provider.complete({
		systemPrompt: "You write concise metadata for generated study aids.",
		userPrompt: infographicNoteTitlePrompt(noteTitle, mermaid.content),
		model: plugin.settings.model,
		temperature: 0.2,
		maxTokens: 180,
		abortSignal: progress.signal
	});
	const parsed = parseTitleDescription(titleDescription.content, noteTitle);

	return {
		title: parsed.title,
		description: parsed.description,
		mermaid: stripMarkdownFence(mermaid.content),
		svg,
		type
	};
}

function parseTitleDescription(content: string, fallbackTitle: string): { title: string; description: string } {
	const title = /^Title:\s*(.+)$/im.exec(content)?.[1]?.trim() || `${fallbackTitle} Infographic`;
	const description = /^Description:\s*(.+)$/im.exec(content)?.[1]?.trim() || "A visual study aid generated from the source note.";
	return { title, description };
}

function stripMarkdownFence(content: string): string {
	const match = /^```(?:mermaid)?\s*([\s\S]*?)\s*```$/i.exec(content.trim());
	return match ? match[1].trim() : content.trim();
}
