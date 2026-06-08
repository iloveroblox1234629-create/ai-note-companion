import { Notice } from "obsidian";
import type AINoteCompanionPlugin from "../main";
import type { GeneratedResult, MarkdownChunk, ProgressReporter } from "../types";
import { buildProvider } from "../llm/LLMClient";
import { chunkMarkdown, estimateTokens } from "../note/chunkMarkdown";
import { readActiveNote } from "../note/readActiveNote";
import { createResultNote } from "../output/createResultNote";
import { insertBelowCurrentNote } from "../output/insertIntoNote";
import {
	summaryChunkPrompt,
	summarySynthesisPrompt,
	summarySystemPrompt,
	summaryUserPrompt
} from "../prompts/summarizePrompt";
import { ResultModal, ProgressModal } from "../ui/ResultModal";

export async function summarizeCurrentNote(plugin: AINoteCompanionPlugin): Promise<void> {
	const progress = new ProgressModal(plugin.app);
	progress.open();

	try {
		progress.setMessage("Reading note...");
		const note = await readActiveNote(plugin.app, plugin.noteReadOptions());
		if (note.content.trim().length === 0) {
			throw new Error("The active note is empty.");
		}

		const canSend = await plugin.confirmSend(note.file, note.linkedFiles.length);
		if (!canSend) {
			throw new Error("Request cancelled.");
		}

		const content = await runSummaryRequest(plugin, note.file.basename, note.content, progress);
		const result: GeneratedResult = {
			mode: "summary",
			title: `${note.file.basename} - Summary`,
			sourceFile: note.file,
			content,
			model: plugin.settings.model
		};

		progress.setMessage("Creating output...");
		if (plugin.settings.summaryDestination === "append") {
			await insertBelowCurrentNote(plugin.app, note.file, content, "AI Note Companion Summary");
			progress.close();
			new Notice("AI Note Companion: appended summary to current note.");
			return;
		}

		if (plugin.settings.summaryDestination === "new-note") {
			const created = await createResultNote(plugin.app, plugin.settings.defaultOutputFolder, result);
			progress.close();
			new Notice(`AI Note Companion: created ${created.path}.`);
			return;
		}

		progress.close();
		new ResultModal(plugin.app, {
			plugin,
			result,
			onRegenerate: () => summarizeCurrentNote(plugin)
		}).open();
	} catch (error) {
		progress.close();
		if (!/cancelled/i.test(plugin.toUserError(error))) {
			new Notice(`AI Note Companion: ${plugin.toUserError(error)}`);
		}
	}
}

async function runSummaryRequest(
	plugin: AINoteCompanionPlugin,
	noteTitle: string,
	content: string,
	progress: ProgressReporter
): Promise<string> {
	const provider = buildProvider(plugin.settings);
	const systemPrompt = summarySystemPrompt(plugin.settings.defaultLanguageTone);
	const shouldChunk = content.length > plugin.settings.chunkSize || estimateTokens(content) + plugin.settings.maxOutputTokens > plugin.settings.contextWindow;

	if (!shouldChunk) {
		progress.setMessage("Sending note to AI...");
		progress.throwIfCancelled();
		const response = await provider.complete({
			systemPrompt,
			userPrompt: summaryUserPrompt(noteTitle, content, plugin.settings.summaryDetailLevel),
			model: plugin.settings.model,
			temperature: plugin.settings.temperature,
			maxTokens: plugin.settings.maxOutputTokens,
			abortSignal: progress.signal
		});
		return response.content;
	}

	progress.setMessage("Chunking note...");
	const chunks = chunkMarkdown(content, {
		title: noteTitle,
		maxChunkSize: plugin.settings.chunkSize,
		overlap: plugin.settings.chunkOverlap
	});

	const summaries: string[] = [];
	for (const chunk of chunks) {
		progress.setMessage(`Sending chunk ${chunk.index} of ${chunk.total}...`);
		progress.throwIfCancelled();
		summaries.push(await summarizeChunk(plugin, provider, systemPrompt, chunk, progress));
	}

	progress.setMessage("Synthesizing final result...");
	progress.throwIfCancelled();
	const final = await provider.complete({
		systemPrompt,
		userPrompt: summarySynthesisPrompt(noteTitle, plugin.settings.summaryDetailLevel, summaries),
		model: plugin.settings.model,
		temperature: plugin.settings.temperature,
		maxTokens: plugin.settings.maxOutputTokens,
		abortSignal: progress.signal
	});
	return final.content;
}

async function summarizeChunk(
	plugin: AINoteCompanionPlugin,
	provider: ReturnType<typeof buildProvider>,
	systemPrompt: string,
	chunk: MarkdownChunk,
	progress: ProgressReporter
): Promise<string> {
	const response = await provider.complete({
		systemPrompt,
		userPrompt: summaryChunkPrompt(chunk, plugin.settings.summaryDetailLevel),
		model: plugin.settings.model,
		temperature: plugin.settings.temperature,
		maxTokens: Math.min(plugin.settings.maxOutputTokens, 1200),
		abortSignal: progress.signal
	});
	return response.content;
}
