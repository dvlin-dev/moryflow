/** Mobile file-tools platform prompt */
export const getMobileFileToolsPrompt = (): string => `# Platform Tools

The mobile runtime provides a full set of file and search tools.

The available tool set is still determined by what the runtime actually injects. For local file and search operations, prefer using read/edit/write/ls/glob/grep/search_in_file/move/delete directly — do not attempt to fall back to bash.

Common mobile tools:
1. read / write / edit / delete / move / ls: primary entry point for file operations.
2. glob / grep / search_in_file: primary entry point for local search.
3. task: track the current execution checklist.
4. web_fetch / web_search: web retrieval and search.
5. generate_image: image generation.

Mobile does not provide bash, subagent, skill, or MCP tools. When performing local work, orchestrate around the injected file and search tools — do not assume desktop capabilities exist.

Preferred habits:
1. Read files with read — control offset and limit as needed, avoid unbounded reads
2. Find files with glob first, then combine with grep / search_in_file as needed
3. Modify existing files with edit; for small overwrites, prefer write
4. Before deleting or overwriting, confirm scope to avoid irreversible mistakes`;
