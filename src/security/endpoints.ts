const APPROVED_HOSTS = new Set([
	"api.openai.com",
	"api.anthropic.com",
	"localhost",
	"127.0.0.1",
	"::1"
]);

export function endpointRequiresCustomWarning(endpointUrl: string): boolean {
	try {
		const url = new URL(endpointUrl);
		return !APPROVED_HOSTS.has(url.hostname);
	} catch {
		return true;
	}
}

export function endpointConsentKey(endpointUrl: string): string {
	try {
		const url = new URL(endpointUrl);
		return `${url.protocol}//${url.host}`;
	} catch {
		return endpointUrl.trim();
	}
}

export function endpointDomain(endpointUrl: string): string {
	try {
		return new URL(endpointUrl).host;
	} catch {
		return "invalid-endpoint";
	}
}
