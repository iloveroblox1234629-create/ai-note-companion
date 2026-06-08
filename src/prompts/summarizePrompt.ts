import type { MarkdownChunk, SummaryDetailLevel } from "../types";

export function summarySystemPrompt(tone: string): string {
	return [
		"You create accurate summaries of a user's note.",
		"Use only the provided content. Distinguish explicit facts from inferred action items or open questions.",
		"Do not invent missing context.",
		`Default language and tone: ${tone}.`
	].join("\n");
}

export function summaryUserPrompt(noteTitle: string, content: string, detail: SummaryDetailLevel): string {
	return [
		`Note title: ${noteTitle}`,
		`Summary length: ${detail}`,
		"",
		"Summarize the entire note using these exact sections:",
		"",
		"## Executive summary",
		"## Key takeaways",
		"## Important terms",
		"## Action items",
		"## Open questions",
		"",
		"For action items and open questions, include only items present or strongly implied by the note. If none are present, write \"None identified.\"",
		"",
		"Full note content:",
		"",
		content
	].join("\n");
}

export function summaryChunkPrompt(chunk: MarkdownChunk, detail: SummaryDetailLevel): string {
	return [
		`Note title: ${chunk.title}`,
		`Chunk ${chunk.index} of ${chunk.total}`,
		`Summary length target: ${detail}`,
		chunk.headingPath.length > 0 ? `Heading context: ${chunk.headingPath.join(" > ")}` : "Heading context: root",
		"",
		"Summarize this chunk for later whole-note synthesis. Preserve explicit facts, terms, action items, and open questions. Mark inferred items as inferred.",
		"",
		chunk.content
	].join("\n");
}

export function summarySynthesisPrompt(noteTitle: string, detail: SummaryDetailLevel, summaries: string[]): string {
	return [
		`Note title: ${noteTitle}`,
		`Summary length: ${detail}`,
		"",
		"The following chunk summaries cover the whole note. Synthesize one summary using these exact sections:",
		"",
		"## Executive summary",
		"## Key takeaways",
		"## Important terms",
		"## Action items",
		"## Open questions",
		"",
		"If action items or open questions are absent, write \"None identified.\"",
		"",
		summaries.map((summary, index) => `### Chunk summary ${index + 1}\n${summary}`).join("\n\n")
	].join("\n");
}
