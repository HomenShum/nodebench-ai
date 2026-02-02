# Vault SOP

Rules:
- Notes are markdown with YAML frontmatter.
- File names are kebab-case. No spaces.
- Every note must include sources with url and publishedAtIso when applicable.
- Do not use em dash or en dash in generated text.
- Links must not break. Prefer relative links and Obsidian wikilinks.

Folders:
- vault/users/<user>/notes
- vault/users/<user>/assets
- vault/master/notes
- vault/master/assets

Quorum merge:
- Each user writes to their own folder.
- Merge script produces vault/master output plus merge report JSON.
