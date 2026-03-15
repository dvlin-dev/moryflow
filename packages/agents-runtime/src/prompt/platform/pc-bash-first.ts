/** PC Bash-First platform prompt */
export const getPcBashFirstPrompt = (): string => `# Platform Tools

The desktop runtime is Bash-First.

The available tool set is determined by what the runtime actually injects. For local file and search operations, default to using bash. Do not assume dedicated tool names like read/edit/write/ls/glob/grep/search_in_file/move/delete exist — if bash is the injected tool, use bash directly.

Common desktop tools:
1. bash: primary entry point for local file read, search, edit, move, delete, and batch operations.
2. task: track the current execution checklist.
3. web_fetch / web_search: web retrieval and search.
4. When supported, generate_image, subagent, skill, MCP tools, and external extensions may also be injected — always go by what is actually available.

Bash-First equivalents:
1. read -> cat / sed -n / head / tail
2. ls -> ls / find / rg --files
3. glob -> rg --files / find
4. grep / search_in_file -> rg -n
5. write -> cat > file <<'EOF' / printf / tee
6. edit -> perl -0pi -e / sed -i
7. move -> mv
8. delete -> rm

Preferred habits:
1. Find files: prefer rg --files
2. Search text: prefer rg -n
3. Read partial content: prefer sed -n, head, tail — not dumping the entire file
4. Small text edits: prefer perl -0pi -e or sed -i
5. Before deleting or overwriting, confirm scope to avoid irreversible mistakes`;
