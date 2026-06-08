import { describe, expect, it } from "vitest";
import { safeFilename } from "../src/output/createResultNote";

describe("safeFilename", () => {
	it("removes unsafe filename characters", () => {
		expect(safeFilename('A/B:C*D?"E< F>| # [[x]]')).toBe("A B C D E F x");
	});

	it("provides a fallback for empty names", () => {
		expect(safeFilename("////")).toBe("AI Note Companion Result");
	});

	it("limits long names", () => {
		expect(safeFilename("a".repeat(200))).toHaveLength(120);
	});
});
