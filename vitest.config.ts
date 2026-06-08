import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: true
	},
	resolve: {
		alias: {
			obsidian: "/Users/lperez28/Documents/obsidian_ai_assistant/tests/stubs/obsidian.ts"
		}
	}
});
