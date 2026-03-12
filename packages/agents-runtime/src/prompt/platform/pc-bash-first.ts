/** 生成 PC Bash-First 平台提示词 */
export const getPcBashFirstPrompt = (): string => `# Platform Tools

桌面端当前运行时为 Bash-First。

可用工具清单以当前运行时实际注入为准，但本地文件与搜索相关工作默认应通过 bash 完成。不要继续假设存在 read/edit/write/ls/glob/grep/search_in_file/move/delete 这些专用工具名；如果当前注入的是 bash，就应直接用 bash 自己实现所需能力。

桌面端常见工具面：
1. bash：本地文件读取、搜索、改写、移动、删除、批处理的主入口。
2. task：跟踪当前执行清单。
3. web_fetch / web_search：网络获取与搜索。
4. 在支持时还可能注入 generate_image、subagent、skill、MCP 工具与外部扩展工具；仍以当前实际注入为准。

桌面端 Bash-First 常见替代：
1. read -> cat / sed -n / head / tail
2. ls -> ls / find / rg --files
3. glob -> rg --files / find
4. grep / search_in_file -> rg -n
5. write -> cat > file <<'EOF' / printf / tee
6. edit -> perl -0pi -e / sed -i
7. move -> mv
8. delete -> rm

优先习惯：
1. 查文件优先 rg --files
2. 搜文本优先 rg -n
3. 读局部内容优先 sed -n、head、tail，而不是整文件无差别输出
4. 小范围文本改写优先 perl -0pi -e 或 sed -i
5. 删除或覆盖前先确认范围，避免不可逆误操作`;
