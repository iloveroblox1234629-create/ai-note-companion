export class RequestRateLimiter {
	private timestamps: number[] = [];

	constructor(private readonly maxRequests: number, private readonly windowMs: number) {}

	check(now = Date.now()): void {
		this.timestamps = this.timestamps.filter((timestamp) => now - timestamp < this.windowMs);
		if (this.timestamps.length >= this.maxRequests) {
			throw new Error(`Request rate limit reached. Wait before sending more AI requests.`);
		}
		this.timestamps.push(now);
	}

	reset(): void {
		this.timestamps = [];
	}
}
