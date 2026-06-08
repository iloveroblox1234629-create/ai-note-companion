import * as DOMPurifyModule from "dompurify";

type SanitizeConfig = Record<string, unknown>;
type Sanitizer = {
	sanitize(value: string, config?: SanitizeConfig): string;
};
type DOMPurifyFactory = ((window: Window) => Sanitizer) & Partial<Sanitizer>;

export function sanitizeWithDOMPurify(value: string, config?: SanitizeConfig): string {
	const purifier = resolveDOMPurify();
	if (purifier?.sanitize) {
		return purifier.sanitize(value, config);
	}
	return fallbackSanitize(value);
}

function resolveDOMPurify(): Sanitizer | null {
	const candidate = DOMPurifyModule as unknown as DOMPurifyFactory & { default?: DOMPurifyFactory };
	if (typeof candidate.sanitize === "function") {
		return candidate as Sanitizer;
	}
	const maybeDefault = (candidate as { default?: DOMPurifyFactory }).default;
	const factory = typeof candidate === "function" ? candidate : maybeDefault;
	if (typeof factory === "function" && typeof window !== "undefined" && window.document) {
		return factory(window);
	}
	return null;
}

function fallbackSanitize(value: string): string {
	return value
		.replace(/<script\b[\s\S]*?<\/script>/gi, "")
		.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
		.replace(/<object\b[\s\S]*?<\/object>/gi, "")
		.replace(/<embed\b[\s\S]*?>/gi, "")
		.replace(/\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gis, "")
		.replace(/\s(?:href|src|xlink:href)\s*=\s*(['"])\s*(?:javascript:|data:)[\s\S]*?\1/gis, "");
}
