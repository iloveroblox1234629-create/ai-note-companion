import { Notice } from "obsidian";
import type AINoteCompanionPlugin from "../main";
import type { GeneratedResult, MarkdownChunk, ProgressReporter } from "../types";
import { buildProvider } from "../llm/LLMClient";
import { chunkMarkdown, estimateTokens } from "../note/chunkMarkdown";
import { readActiveNote } from "../note/readActiveNote";
import {
	explanationChunkPrompt,
	explanationSynthesisPrompt,
	explanationSystemPrompt,
	explanationUserPrompt
} from "../prompts/explainPrompt";
import { ResultModal, ProgressModal } from "../ui/ResultModal";

export async function explainCurrentNote(plugin: AINoteCompanionPlugin): Promise<void> {
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

		const content = await runExplainRequest(plugin, note.file.basename, note.content, progress);
		const result: GeneratedResult = {
			mode: "explanation",
			title: `${note.file.basename} - Explanation`,
			sourceFile: note.file,
			content,
			model: plugin.settings.model
		};

		progress.close();
		new ResultModal(plugin.app, {
			plugin,
			result,
			onRegenerate: () => explainCurrentNote(plugin)
		}).open();
	} catch (error) {
		progress.close();
		if (!/cancelled/i.test(plugin.toUserError(error))) {
			new Notice(`AI Note Companion: ${plugin.toUserError(error)}`);
		}
	}
}

async function runExplainRequest(
	plugin: AINoteCompanionPlugin,
	noteTitle: string,
	content: string,
	progress: ProgressReporter
): Promise<string> {
	const provider = buildProvider(plugin.settings);
	const systemPrompt = explanationSystemPrompt(plugin.settings.defaultLanguageTone);
	const shouldChunk = content.length > plugin.settings.chunkSize || estimateTokens(content) + plugin.settings.maxOutputTokens > plugin.settings.contextWindow;

	if (!shouldChunk) {
		progress.setMessage("Sending note to AI...");
		progress.throwIfCancelled();
		const response = await provider.complete({
			systemPrompt,
			userPrompt: explanationUserPrompt(noteTitle, content),
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

	const analyses: string[] = [];
	for (const chunk of chunks) {
		progress.setMessage(`Sending chunk ${chunk.index} of ${chunk.total}...`);
		progress.throwIfCancelled();
		analyses.push(await analyzeChunk(plugin, provider, systemPrompt, chunk, progress));
	}

	progress.setMessage("Synthesizing final result...");
	progress.throwIfCancelled();
	const final = await provider.complete({
		systemPrompt,
		userPrompt: explanationSynthesisPrompt(noteTitle, analyses),
		model: plugin.settings.model,
		temperature: plugin.settings.temperature,
		maxTokens: plugin.settings.maxOutputTokens,
		abortSignal: progress.signal
	});
	return final.content;
}

async function analyzeChunk(
	plugin: AINoteCompanionPlugin,
	provider: ReturnType<typeof buildProvider>,
	systemPrompt: string,
	chunk: MarkdownChunk,
	progress: ProgressReporter
): Promise<string> {
	const response = await provider.complete({
		systemPrompt,
		userPrompt: explanationChunkPrompt(chunk),
		model: plugin.settings.model,
		temperature: plugin.settings.temperature,
		maxTokens: Math.min(plugin.settings.maxOutputTokens, 1400),
		abortSignal: progress.signal
	});
	return response.content;
}
