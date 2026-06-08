import { describe, expect, it } from "vitest";
import { endpointConsentKey, endpointRequiresCustomWarning } from "../src/security/endpoints";

describe("endpoint safety helpers", () => {
	it("allows approved hosts", () => {
		expect(endpointRequiresCustomWarning("https://api.openai.com/v1/chat/completions")).toBe(false);
		expect(endpointRequiresCustomWarning("http://localhost:11434/v1/chat/completions")).toBe(false);
	});

	it("warns for custom hosts and builds stable consent keys", () => {
		expect(endpointRequiresCustomWarning("https://example.com/v1/chat/completions")).toBe(true);
		expect(endpointConsentKey("https://example.com/v1/chat/completions")).toBe("https://example.com");
	});
});
