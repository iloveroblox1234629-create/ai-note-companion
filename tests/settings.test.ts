import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, migrateSettings } from "../src/settings";

describe("settings migration", () => {
	it("fills defaults for empty data", () => {
		expect(migrateSettings(undefined)).toEqual(DEFAULT_SETTINGS);
	});

	it("normalizes invalid values", () => {
		const migrated = migrateSettings({
			providerPreset: "bad",
			summaryDetailLevel: "verbose",
			temperature: 10,
			chunkOverlap: 999999,
			chunkSize: 2000
		});

		expect(migrated.providerPreset).toBe(DEFAULT_SETTINGS.providerPreset);
		expect(migrated.summaryDetailLevel).toBe(DEFAULT_SETTINGS.summaryDetailLevel);
		expect(migrated.temperature).toBe(2);
		expect(migrated.chunkOverlap).toBeLessThanOrEqual(1000);
	});
});
