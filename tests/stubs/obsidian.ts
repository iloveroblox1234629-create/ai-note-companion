export class Notice {
	message: string;

	constructor(message: string) {
		this.message = message;
	}
}

export class TFile {
	path: string;
	basename: string;
	extension: string;

	constructor(path: string) {
		this.path = path;
		const name = path.split("/").pop() ?? path;
		this.extension = name.includes(".") ? name.split(".").pop() ?? "" : "";
		this.basename = name.replace(/\.[^.]+$/, "");
	}
}

export class MarkdownView {
	file: TFile | null = null;
}

export class Modal {
	app: App;
	contentEl: HTMLElement;

	constructor(app: App) {
		this.app = app;
		this.contentEl = document.createElement("div");
	}

	open(): void {
		this.onOpen();
	}

	close(): void {
		this.onClose();
	}

	onOpen(): void {}
	onClose(): void {}
}

export class Plugin {
	app: App;

	constructor(app: App) {
		this.app = app;
	}
}

export class PluginSettingTab {
	app: App;
	plugin: Plugin;
	containerEl: HTMLElement;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = document.createElement("div");
	}
}

export class Setting {
	constructor(public containerEl: HTMLElement) {}
	setName(): this { return this; }
	setDesc(): this { return this; }
	addDropdown(): this { return this; }
	addText(): this { return this; }
	addTextArea(): this { return this; }
	addButton(): this { return this; }
	addToggle(): this { return this; }
}

export class App {}

export const MarkdownRenderer = {
	render: async () => {}
};

export function normalizePath(path: string): string {
	return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
}
