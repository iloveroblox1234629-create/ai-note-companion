# AI Note Companion - Published Explanation

The full HTML explanation is available in:

[ai-note-companion-explanation.html](./ai-note-companion-explanation.html)

This Markdown file publishes the same explanation in a repository-friendly format.

## Purpose

AI Note Companion is a TypeScript Obsidian plugin that helps a user work with the entire active Markdown note. It can explain the note as a tutor, summarize it into structured sections, and create visual study aids as Mermaid diagrams with optional sanitized SVG previews.

## Core Workflows

### Explain Current Note

The command reads the full active Markdown file through Obsidian vault APIs and asks the configured model for a learner-focused explanation. The response is organized into big picture, key concepts, step-by-step explanation, definitions, potential confusions, and questions to test understanding.

### Summarize Current Note

The summary command uses the full file and produces an executive summary, bullet takeaways, important terms, action items, and open questions. The user can choose brief, standard, or detailed output and can show the result in a modal, append it to the current note, or create a generated note.

### Create Infographic

The infographic command prompts the user for a diagram type, generates Mermaid code, and creates a new Markdown note containing the diagram, metadata, a backlink to the source, and an optional sanitized SVG preview when enabled.

## Architecture

The source code is split into focused modules under `src/`. The main plugin class registers commands, the ribbon icon, and the settings tab. Command modules own the user workflows. Note modules handle reading, frontmatter stripping, embed expansion, linked-note gathering, and Markdown chunking. Output modules create generated notes safely. Prompt modules keep model instructions separate from command orchestration. Provider modules isolate HTTP request formatting so additional AI backends can be added without rewriting commands.

```text
src/
  main.ts
  settings.ts
  types.ts
  llm/
  commands/
  note/
  ui/
  output/
  prompts/
  security/
```

## Long Note Handling

The plugin estimates when a note is too large for the configured context window. When needed, it splits Markdown by headings first, paragraphs second, and character ranges as a final fallback. Each chunk keeps note title, chunk number, total chunk count, and heading context. Explain and summary commands then perform map-reduce: each chunk is analyzed first, and a final synthesis request merges those partial results into one whole-note answer.

## Settings and Providers

The settings tab exposes provider preset, endpoint URL, API key, model name, custom headers, request parameters, output folder, summary detail level, infographic type, privacy toggles, and debug logging. The default request format is OpenAI-compatible chat completions. A clean `LLMProvider` interface supports future adapters.

```ts
interface LLMProvider {
  complete(request: LLMRequest): Promise<LLMResponse>;
  testConnection(): Promise<void>;
}
```

## Privacy and Safety

The plugin shows a privacy warning before sending note content. API keys are stored through Obsidian plugin data storage and are never written to generated notes, notices, or logs. Debug logging is off by default and only logs sanitized operational metadata. Linked notes are disabled by default and trigger an explicit warning when enabled.

AI output is treated as untrusted model output. Markdown/HTML responses are scanned and sanitized before rendering or file creation, and suspicious responses fall back to fenced Markdown. SVG output is sanitized with DOMPurify plus extra defensive checks, then stored as fenced `svg` code rather than rendered raw. SVGs must include accessible title and description elements or they are rejected.

Privacy acknowledgements are tied to endpoint and privacy-impacting settings. Changing endpoint, frontmatter inclusion, embed inclusion, or linked-note inclusion forces a fresh confirmation. A lightweight audit log records timestamp, endpoint domain, request type, and linked-note usage without note contents.

## Theme Compatibility

Plugin UI styles are scoped under `.ai-note-companion` and rely on Obsidian CSS variables for background, text, borders, radius, interactive controls, and fonts. This keeps modals, settings, buttons, and result views consistent with installed light, dark, and community themes.

## Generated Output

Generated notes default to the `AI Note Companion` folder. The plugin creates the folder when missing, derives safe filenames from the source note title, avoids collisions by appending a number, and writes frontmatter with source path, generated timestamp, mode, and model. Each generated note links back to the source note.

## Build and Test Status

The implementation was validated with:

```bash
npm run build
npm run test
```

The passing tests cover Markdown chunking, provider request formatting, settings defaults and migration, SVG sanitization, and safe filename generation.
