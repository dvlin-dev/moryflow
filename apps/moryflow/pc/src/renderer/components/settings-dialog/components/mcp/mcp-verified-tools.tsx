type McpVerifiedToolsProps = {
  toolNames: string[];
};

export const McpVerifiedTools = ({ toolNames }: McpVerifiedToolsProps) => {
  if (toolNames.length === 0) return null;

  return (
    <div className="space-y-3 pt-4">
      <p className="text-xs font-medium text-muted-foreground">Verified tools ({toolNames.length})</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {toolNames.map((name) => (
          <div key={name} className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
            <div className="size-1.5 shrink-0 rounded-full bg-success" />
            <span className="truncate font-mono text-xs">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
