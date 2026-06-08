export interface SanitizedSvg {
	svg: string;
	removed: string[];
}

const DANGEROUS_TAGS = [
	"script",
	"foreignObject",
	"iframe",
	"object",
	"embed",
	"link",
	"meta"
];

const EVENT_HANDLER_PATTERN = /\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gis;
const EXTERNAL_HREF_PATTERN = /\s+(?:xlink:)?href\s*=\s*(['"])\s*(?:https?:|data:|javascript:)[\s\S]*?\1/gis;
const REMOTE_STYLE_IMPORT_PATTERN = /@import\s+(?:url\()?['"]?https?:[\s\S]*?;?/gi;
const JAVASCRIPT_URL_PATTERN = /url\(\s*['"]?\s*javascript:[\s\S]*?\)/gi;

export function sanitizeSvg(input: string): SanitizedSvg {
	const trimmed = stripCodeFence(input).trim();
	const removed: string[] = [];

	if (!/^<svg[\s>]/i.test(trimmed)) {
		throw new Error("SVG response did not start with an <svg> element.");
	}

	let svg = trimmed;

	for (const tag of DANGEROUS_TAGS) {
		const blockPattern = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi");
		const selfClosingPattern = new RegExp(`<${tag}\\b[\\s\\S]*?\\/?>`, "gi");
		if (blockPattern.test(svg) || selfClosingPattern.test(svg)) {
			removed.push(tag);
			svg = svg.replace(blockPattern, "").replace(selfClosingPattern, "");
		}
	}

	if (EVENT_HANDLER_PATTERN.test(svg)) {
		removed.push("event handlers");
		svg = svg.replace(EVENT_HANDLER_PATTERN, "");
	}
	if (EXTERNAL_HREF_PATTERN.test(svg)) {
		removed.push("external hrefs");
		svg = svg.replace(EXTERNAL_HREF_PATTERN, "");
	}
	if (REMOTE_STYLE_IMPORT_PATTERN.test(svg)) {
		removed.push("remote style imports");
		svg = svg.replace(REMOTE_STYLE_IMPORT_PATTERN, "");
	}
	if (JAVASCRIPT_URL_PATTERN.test(svg)) {
		removed.push("javascript urls");
		svg = svg.replace(JAVASCRIPT_URL_PATTERN, "none");
	}

	if (!/<title[\s>]/i.test(svg) || !/<desc[\s>]/i.test(svg)) {
		throw new Error("SVG must include accessible <title> and <desc> elements.");
	}
	if (/<script\b|<foreignObject\b|\son[a-z]+\s*=|javascript:|@import\s+url\(\s*['"]?https?:/i.test(svg)) {
		throw new Error("SVG sanitization rejected unsafe markup.");
	}

	return {
		svg,
		removed: Array.from(new Set(removed))
	};
}

function stripCodeFence(input: string): string {
	const match = /^```(?:svg|xml)?\s*([\s\S]*?)\s*```$/i.exec(input.trim());
	return match ? match[1] : input;
}
