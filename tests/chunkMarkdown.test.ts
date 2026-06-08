import { describe, expect, it } from "vitest";
import { chunkMarkdown, estimateTokens } from "../src/note/chunkMarkdown";

describe("chunkMarkdown", () => {
	it("prefers heading boundaries and preserves heading context", () => {
		const chunks = chunkMarkdown("# One\n\nAlpha\n\n## Two\n\nBeta\n\n# Three\n\nGamma", {
			title: "Test Note",
			maxChunkSize: 1000,
			overlap: 0
		});

		expect(chunks).toHaveLength(2);
		expect(chunks[0].headingPath).toEqual(["One", "Two"]);
		expect(chunks[0].content).toContain("# One");
		expect(chunks[0].content).toContain("## Two");
		expect(chunks[1].headingPath).toEqual(["Three"]);
		expect(chunks[1].index).toBe(2);
		expect(chunks[1].total).toBe(2);
	});

	it("falls back to character chunks with overlap for long paragraphs", () => {
		const content = "a".repeat(2200);
		const chunks = chunkMarkdown(content, {
			title: "Long",
			maxChunkSize: 1000,
			overlap: 100
		});

		expect(chunks.length).toBeGreaterThan(1);
		expect(chunks[1].content).toContain("Previous context:");
		expect(chunks.every((chunk) => chunk.title === "Long")).toBe(true);
	});

	it("estimates tokens with a conservative character heuristic", () => {
		expect(estimateTokens("12345678")).toBe(2);
		expect(estimateTokens("123456789")).toBe(3);
	});
});
