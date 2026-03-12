/** 生成 Mobile 文件工具平台提示词 */
export const getMobileFileToolsPrompt = (): string => `# Platform Tools

移动端当前提供完整文件与搜索工具。

可用工具清单仍以当前运行时实际注入为准，但本地文件与搜索相关工作默认应优先直接使用 read/edit/write/ls/glob/grep/search_in_file/move/delete，而不是尝试用 bash 兜底。

移动端常见工具面：
1. read / write / edit / delete / move / ls：文件操作主入口。
2. glob / grep / search_in_file：本地搜索主入口。
3. task：跟踪当前执行清单。
4. web_fetch / web_search：网络获取与搜索。
5. generate_image：图片生成。

移动端不提供 bash、subagent、skill、MCP 工具。执行本地工作时应围绕当前已注入的文件与搜索工具编排，而不是假设桌面端能力存在。

优先习惯：
1. 读文件先用 read，按需控制 offset 与 limit，避免无边界读取
2. 搜文件先用 glob，再按需结合 grep / search_in_file
3. 修改已有文件优先 edit，小范围覆盖优先 write
4. 删除或覆盖前先确认范围，避免不可逆误操作`;
