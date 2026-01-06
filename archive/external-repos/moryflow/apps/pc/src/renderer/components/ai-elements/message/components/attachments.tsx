"use client";

import { useState } from "react";
import { PaperclipIcon, XIcon } from "lucide-react";

import { Badge } from "@moryflow/ui/components/badge";
import { Button } from "@moryflow/ui/components/button";
import { ScrollArea } from "@moryflow/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@moryflow/ui/components/tooltip";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type {
  MessageAttachmentProps,
  MessageAttachmentsProps,
} from "@moryflow/ui/ai/message";

export function MessageAttachment({
  data,
  className,
  onRemove,
  ...props
}: MessageAttachmentProps) {
  const { t } = useTranslation("chat");
  const filename = data.filename || "";
  const mediaType =
    data.mediaType?.startsWith("image/") && data.url ? "image" : "file";
  const isImage = mediaType === "image";
  const attachmentLabel = filename || (isImage ? "Image" : "Attachment");
  const metadata = (data.providerMetadata as Record<string, any> | undefined)?.moryflow;
  const contextUsed = Boolean(metadata?.usedAsContext);
  const contextPreview = metadata?.preview as string | undefined;
  const contextTruncated = Boolean(metadata?.previewTruncated);
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className={cn("flex w-24 flex-col gap-1", className)} {...props}>
      <div className="group relative size-24 overflow-hidden rounded-lg">
        {isImage ? (
          <>
            <img
              alt={filename || "attachment"}
              className="size-full object-cover"
              height={100}
              src={data.url}
              width={100}
            />
            {onRemove && (
              <Button
                aria-label="Remove attachment"
                className="absolute top-2 right-2 size-6 rounded-full bg-background/80 p-0 opacity-0 backdrop-blur-xs transition-opacity duration-fast hover:bg-background group-hover:opacity-100 [&>svg]:size-3"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove();
                }}
                type="button"
                variant="ghost"
              >
                <XIcon />
                <span className="sr-only">Remove</span>
              </Button>
            )}
          </>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex size-full shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <PaperclipIcon className="size-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{attachmentLabel}</p>
              </TooltipContent>
            </Tooltip>
            {onRemove && (
              <Button
                aria-label="Remove attachment"
                className="absolute top-2 right-2 size-6 rounded-full bg-background/80 p-0 opacity-0 transition-opacity hover:bg-background group-hover:opacity-100 [&>svg]:size-3"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove();
                }}
                type="button"
                variant="ghost"
              >
                <XIcon />
                <span className="sr-only">Remove</span>
              </Button>
            )}
          </>
        )}
        {contextUsed && (
          <Badge className="pointer-events-none absolute left-2 top-2 bg-emerald-600/90 text-[10px] text-white shadow">
            {t("contextInjected")}
          </Badge>
        )}
      </div>
      {contextUsed && contextPreview && (
        <div className="w-60 max-w-xs">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-full justify-start text-xs text-muted-foreground transition-colors duration-fast hover:text-foreground"
            type="button"
            onClick={() => setPreviewOpen((prev) => !prev)}
          >
            {previewOpen ? t("collapseInjection") : t("viewInjection")}
          </Button>
          {previewOpen && (
            <div className="mt-1 rounded-xl border border-border-muted/80 bg-background/95 p-2 text-xs shadow-float">
              <ScrollArea className="max-h-48 text-xs">
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground">
                  {contextPreview}
                </pre>
              </ScrollArea>
              {contextTruncated && (
                <p className="mt-1 text-[10px] text-muted-foreground">{t("contentTruncated")}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MessageAttachments({
  children,
  className,
  ...props
}: MessageAttachmentsProps) {
  if (!children) {
    return null;
  }

  return (
    <div
      className={cn(
        "ml-auto flex w-fit flex-wrap items-start gap-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
