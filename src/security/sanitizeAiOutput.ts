import { sanitizeWithDOMPurify } from "./dompurify";

export interface AiOutputScanResult {
	safe: boolean;
	warnings: string[];
	blockedReason?: string;
}

const SUSPICIOUS_PATTERNS: Array<[RegExp, string]> = [
	[/<script\b/i, "script tag"],
	[/\son[a-z]+\s*=/i, "event handler attribute"],
	[/<iframe\b|<object\b|<embed\b/i, "embedded active content"],
	[/javascript:/i, "javascript URL"],
	[/\b(?:curl|wget|powershell|osascript|bash|zsh|cmd\.exe)\b/i, "command-like output"],
	[/\b(?:api[_-]?key|secret|password|token)\s*[:=]/i, "secret-like output"]
];

export function scanAiOutput(markdown: string): AiOutputScanResult {
	const warnings = SUSPICIOUS_PATTERNS
		.filter(([pattern]) => pattern.test(markdown))
		.map(([, label]) => label);

	return {
		safe: warnings.length === 0,
		warnings,
		blockedReason: warnings.length > 0 ? `Suspicious AI output detected: ${warnings.join(", ")}.` : undefined
	};
}

export function sanitizeAiMarkdown(markdown: string): string {
	return sanitizeWithDOMPurify(markdown, {
		USE_PROFILES: { html: true },
		FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button", "textarea", "select", "option"],
		FORBID_ATTR: ["style", "srcset"],
		ALLOW_DATA_ATTR: false,
		RETURN_TRUSTED_TYPE: false
	});
}

export function fencedMarkdownFallback(markdown: string): string {
	return ["```markdown", markdown.replace(/```/g, "'''"), "```"].join("\n");
}
