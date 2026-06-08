import { describe, expect, it } from "vitest";
import { RequestRateLimiter } from "../src/security/rateLimit";

describe("RequestRateLimiter", () => {
	it("blocks requests over the configured window", () => {
		const limiter = new RequestRateLimiter(2, 1000);
		limiter.check(1000);
		limiter.check(1200);
		expect(() => limiter.check(1300)).toThrow(/rate limit/);
		limiter.check(2301);
	});
});
