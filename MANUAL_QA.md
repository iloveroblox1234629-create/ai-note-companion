# AI Note Companion Manual QA Checklist

Run these checks in a test vault before publishing.

## Core Obsidian Flows

- [ ] No active file: each command shows a clear Notice and does not crash.
- [ ] Active non-Markdown file: each command refuses to run with a clear Notice.
- [ ] Empty Markdown note: each command reports that the note is empty.
- [ ] Normal Markdown note: explanation opens in a result modal.
- [ ] Normal Markdown note: summary honors the configured destination.
- [ ] Normal Markdown note: infographic creates a new note in the configured folder.
- [ ] Generated notes link back to the source note.
- [ ] Generated filenames avoid collisions by appending a number.

## Long Notes

- [ ] Very long note is chunked.
- [ ] Progress shows reading, chunking, sending chunk X of Y, and final synthesis.
- [ ] Cancel stops the request and leaves no partial generated note.

## Provider Errors

- [ ] Invalid API key shows a recoverable error without printing the key.
- [ ] Invalid endpoint shows a recoverable endpoint error.
- [ ] Slow endpoint/timeout shows timeout guidance.
- [ ] Rate limit response shows retry guidance.

## Privacy

- [ ] First AI request shows the privacy warning.
- [ ] Confirmation-every-time setting shows the warning for every request.
- [ ] API key is absent from notices, console output, generated notes, and errors.
- [ ] Linked notes off by default.
- [ ] Linked notes on warns that additional files will be sent.
- [ ] Changing endpoint URL forces a fresh privacy confirmation.
- [ ] Changing frontmatter or linked-note inclusion forces a fresh privacy confirmation.
- [ ] Reset privacy acknowledgements forces the next request to confirm again.
- [ ] Audit log copy/clear works and contains no note text.

## Theme Compatibility

- [ ] Light theme: settings, modals, buttons, and result content use native colors.
- [ ] Dark theme: settings, modals, buttons, and result content use native colors.
- [ ] Popular community theme: controls remain readable and responsive.
- [ ] Narrow pane/window: modal buttons wrap and content scrolls without overlap.

## Infographics

- [ ] Mermaid infographic note renders a valid diagram in Obsidian preview.
- [ ] Mind map request produces Mermaid mindmap syntax.
- [ ] Timeline request produces Mermaid timeline syntax when note is chronological.
- [ ] SVG preview enabled embeds sanitized SVG.
- [ ] SVG preview is stored as fenced `svg` code instead of raw rendered SVG.
- [ ] SVG sanitizer rejects markup with scripts, event handlers, foreignObject, or missing title/desc.

## Security Hardening

- [ ] Custom endpoint is blocked until explicitly allowed in settings.
- [ ] Forbidden custom headers such as Cookie, Referer, and User-Agent are rejected.
- [ ] Four rapid requests trigger the rate limit.
- [ ] AI response containing `<script>` is rendered as fenced Markdown unless the advanced bypass is enabled.
- [ ] Prompt-injection warning is present in README.
