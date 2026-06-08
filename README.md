# AI Note Companion

AI Note Companion is an Obsidian community plugin that sends the entire active Markdown note to a configurable AI endpoint for explanations, summaries, and visual study aids.

## Features

- Explain the current note with learner-focused sections: big picture, key concepts, step-by-step explanation, definitions, confusions, and review questions.
- Summarize the current note with executive summary, key takeaways, terms, action items, and open questions.
- Create infographic notes with Mermaid diagrams and optional sanitized SVG previews.
- Chunk long notes and synthesize a whole-note result when content exceeds the configured context estimate.
- Configure OpenAI-compatible, Ollama/local, Anthropic-compatible, or custom HTTP endpoints.
- Use scoped Obsidian CSS variables so modals and settings respect installed light and dark themes.

## Installation

1. Build the plugin:

   ```bash
   npm install
   npm run build
   ```

2. Copy `manifest.json`, `main.js`, and `styles.css` into an Obsidian vault plugin folder:

   ```text
   <vault>/.obsidian/plugins/ai-note-companion/
   ```

3. Reload Obsidian and enable **AI Note Companion** under **Settings -> Community plugins**.

## Setup

Open **Settings -> AI Note Companion** and configure:

- Provider preset
- Endpoint URL, for example `https://api.example.com/v1/chat/completions`
- API key
- Model name
- Advanced request settings such as temperature, timeout, context window, chunk size, and output folder

Use **Test connection** to verify the endpoint before sending note content.

## Privacy

AI Note Companion reads the full active Markdown file with Obsidian vault APIs. It sends note content only after the configured confirmation flow.

- API keys are stored through Obsidian plugin data storage.
- API keys are never logged or written to generated notes.
- Note content is not logged by default.
- Linked notes are off by default. If enabled, the confirmation modal warns that additional files will be sent.
- Frontmatter, embedded transclusions, and linked notes are controlled by privacy settings.

## Commands

- **AI Note Companion: Explain current note**
- **AI Note Companion: Summarize current note**
- **AI Note Companion: Create infographic from current note**
- **AI Note Companion: Open command modal**

The ribbon sparkles icon opens the plugin command modal.

## Infographics

Infographic notes are created in the configured output folder, defaulting to `AI Note Companion`.

Supported requested types:

- Auto-detect best type
- Mind map
- Flowchart
- Timeline
- Comparison table
- Process diagram
- Concept map

Mermaid is preferred because it is portable and theme-friendly. Optional SVG previews are sanitized before rendering or saving. Unsafe SVG content is rejected.

## Screenshots

Screenshots will vary by Obsidian theme.

- Settings tab placeholder
- Result modal placeholder
- Infographic note placeholder

## Troubleshooting

- **No active file:** Open a Markdown note before running a command.
- **Missing API key:** Add an API key, unless using a local endpoint that does not require one.
- **Invalid endpoint:** Use a full `http` or `https` chat completions URL.
- **Timeout:** Increase the request timeout or reduce chunk size/output tokens.
- **Long note:** The plugin chunks automatically, but very large notes may require a larger timeout.
- **SVG rejected:** Disable SVG preview or inspect the provider output for scripts, event handlers, remote links, or missing accessibility metadata.

## Development

```bash
npm run dev
npm run build
npm run test
```

The plugin follows the current Obsidian sample plugin convention: TypeScript source in `src/`, esbuild output to root `main.js`, root `manifest.json`, and root `styles.css`.

## Security Notes

This plugin does not add telemetry. Debug logging is disabled by default and logs only sanitized operational metadata. It never logs API keys or note content.
