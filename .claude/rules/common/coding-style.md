# Common Coding Standards

Source: Peaks curated baseline; everything-claude-code reference: https://github.com/affaan-m/everything-claude-code
Scope: project-local standards for peaks-rd, peaks-qa, and peaks-solo workflow preflight.
- Prefer simple, readable code over clever abstractions.
- Keep functions focused and files cohesive.
- Keep each source code file at or below 500 lines; split oversized files into smaller focused modules or components.
- Use immutable updates unless a language-specific convention explicitly favors mutation.
- Validate user input, external data, file paths, and configuration at system boundaries.
- Preserve existing project conventions when they are stricter than this baseline.
