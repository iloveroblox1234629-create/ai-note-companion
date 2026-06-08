import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "../src/security/sanitizeSvg";

describe("sanitizeSvg", () => {
	it("strips scripts, event handlers, external hrefs, and foreignObject", () => {
		const result = sanitizeSvg(`
			<svg xmlns="http://www.w3.org/2000/svg" onclick="alert(1)">
				<title>Title</title>
				<desc>Description</desc>
				<script>alert(1)</script>
				<foreignObject><div>bad</div></foreignObject>
				<a href="https://example.com"><text>bad</text></a>
				<rect width="10" height="10" />
			</svg>
		`);

		expect(result.svg).not.toContain("<script");
		expect(result.svg).not.toContain("onclick");
		expect(result.svg).not.toContain("foreignObject");
		expect(result.svg).not.toContain("https://example.com");
		expect(result.removed).toContain("script");
		expect(result.removed).toContain("event handlers");
	});

	it("rejects svg without accessible metadata", () => {
		expect(() => sanitizeSvg("<svg><rect /></svg>")).toThrow(/title/);
	});

	it("rejects non-svg responses", () => {
		expect(() => sanitizeSvg("not svg")).toThrow(/<svg>/);
	});
});
