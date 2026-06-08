import type { MarkdownChunk } from "../types";

export interface ChunkMarkdownOptions {
	title: string;
	maxChunkSize: number;
	overlap: number;
}

interface Section {
	headingPath: string[];
	content: string;
}

export function chunkMarkdown(markdown: string, options: ChunkMarkdownOptions): MarkdownChunk[] {
	const maxChunkSize = Math.max(1000, Math.round(options.maxChunkSize));
	const overlap = Math.max(0, Math.min(Math.round(options.overlap), Math.floor(maxChunkSize / 2)));
	const sections = splitByHeadings(markdown);
	const chunks: Omit<MarkdownChunk, "index" | "total">[] = [];

	for (const section of sections) {
		if (section.content.length <= maxChunkSize) {
			chunks.push({
				title: options.title,
				headingPath: section.headingPath,
				content: section.content.trim()
			});
			continue;
		}

		for (const part of splitLargeSection(section, maxChunkSize, overlap)) {
			chunks.push({
				title: options.title,
				headingPath: section.headingPath,
				content: part.trim()
			});
		}
	}

	const filtered = chunks.filter((chunk) => chunk.content.length > 0);
	return filtered.map((chunk, index) => ({
		...chunk,
		index: index + 1,
		total: filtered.length
	}));
}

function splitByHeadings(markdown: string): Section[] {
	const lines = markdown.split(/\r?\n/);
	const sections: Section[] = [];
	const headingStack: string[] = [];
	let buffer: string[] = [];
	let currentPath: string[] = [];

	const flush = () => {
		const content = buffer.join("\n").trim();
		if (content.length > 0) {
			sections.push({
				headingPath: [...currentPath],
				content
			});
		}
		buffer = [];
	};

	for (const line of lines) {
		const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
		if (match) {
			flush();
			const level = match[1].length;
			headingStack.splice(level - 1);
			headingStack[level - 1] = match[2].trim();
			currentPath = headingStack.filter(Boolean);
			buffer.push(line);
		} else {
			buffer.push(line);
		}
	}

	flush();

	if (sections.length === 0 && markdown.trim().length > 0) {
		return [{ headingPath: [], content: markdown.trim() }];
	}

	return mergeSmallSections(sections);
}

function mergeSmallSections(sections: Section[]): Section[] {
	const merged: Section[] = [];
	for (const section of sections) {
		const previous = merged[merged.length - 1];
		if (previous && previous.content.length + section.content.length < 1400 && sameHeadingRoot(previous.headingPath, section.headingPath)) {
			previous.content = `${previous.content}\n\n${section.content}`;
			previous.headingPath = section.headingPath.length > previous.headingPath.length ? section.headingPath : previous.headingPath;
		} else {
			merged.push({ headingPath: [...section.headingPath], content: section.content });
		}
	}
	return merged;
}

function sameHeadingRoot(a: string[], b: string[]): boolean {
	return a.length === 0 || b.length === 0 || a[0] === b[0];
}

function splitLargeSection(section: Section, maxChunkSize: number, overlap: number): string[] {
	const paragraphParts = splitByParagraphs(section.content, maxChunkSize);
	const chunks: string[] = [];

	for (const part of paragraphParts) {
		if (part.length <= maxChunkSize) {
			chunks.push(part);
			continue;
		}
		chunks.push(...splitByCharacters(part, maxChunkSize, overlap));
	}

	if (overlap === 0 || chunks.length <= 1) {
		return chunks;
	}

	return chunks.map((chunk, index) => {
		if (index === 0) {
			return chunk;
		}
		const prefix = chunks[index - 1].slice(-overlap);
		return `${contextHeading(section.headingPath)}Previous context:\n${prefix}\n\nCurrent chunk:\n${chunk}`;
	});
}

function splitByParagraphs(content: string, maxChunkSize: number): string[] {
	const paragraphs = content.split(/\n{2,}/);
	const chunks: string[] = [];
	let current = "";

	for (const paragraph of paragraphs) {
		const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
		if (candidate.length <= maxChunkSize || current.length === 0) {
			current = candidate;
		} else {
			chunks.push(current);
			current = paragraph;
		}
	}

	if (current.trim().length > 0) {
		chunks.push(current);
	}

	return chunks;
}

function splitByCharacters(content: string, maxChunkSize: number, overlap: number): string[] {
	const chunks: string[] = [];
	let start = 0;
	while (start < content.length) {
		const end = Math.min(content.length, start + maxChunkSize);
		chunks.push(content.slice(start, end));
		if (end >= content.length) {
			break;
		}
		start = Math.max(end - overlap, start + 1);
	}
	return chunks;
}

function contextHeading(headingPath: string[]): string {
	if (headingPath.length === 0) {
		return "";
	}
	return `Heading context: ${headingPath.join(" > ")}\n\n`;
}

export function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}
