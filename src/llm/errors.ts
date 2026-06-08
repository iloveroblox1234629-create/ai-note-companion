export function sanitizeErrorMessage(message: string): string {
	return message
		.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
		.replace(/sk-[A-Za-z0-9._-]+/gi, "[redacted-api-key]")
		.replace(/api[_-]?key["':=\s]+[A-Za-z0-9._-]+/gi, "api key [redacted]");
}
