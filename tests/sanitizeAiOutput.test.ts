import { describe, expect, it } from "vitest";
import { fencedMarkdownFallback, sanitizeAiMarkdown, scanAiOutput } from "../src/security/sanitizeAiOutput";

describe("sanitizeAiOutput", () => {
	it("scans suspicious active content", () => {
		const scan = scanAiOutput('Hello <script>alert(1)</script> <img src=x onerror="bad">');
		expect(scan.safe).toBe(false);
		expect(scan.warnings).toContain("script tag");
		expect(scan.warnings).toContain("event handler attribute");
	});

	it("sanitizes script tags from markdown/html", () => {
		const sanitized = sanitizeAiMarkdown("Safe\n<script>alert(1)</script>");
		expect(sanitized).toContain("Safe");
		expect(sanitized).not.toContain("script");
	});

	it("wraps unsafe fallback in fenced markdown", () => {
		expect(fencedMarkdownFallback("hello")).toBe("```markdown\nhello\n```");
	});
});
