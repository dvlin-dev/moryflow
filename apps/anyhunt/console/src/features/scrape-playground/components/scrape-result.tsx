/**
 * [PROPS]: data
 * [EMITS]: none
 * [POS]: Scrape 结果展示组件（容器编排层）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useState } from 'react';
import { Dialog, DialogContent } from '@moryflow/ui';
import { isScrapeError, type ScrapeResponse } from '@/features/playground-shared';
import { ScrapeErrorCard, ScrapeSummaryCard, ScrapeTimingCard } from './scrape-result-cards';
import { ScrapeResultContentTabs } from './scrape-result-content-tabs';
import { buildScrapeResultViewModel } from './scrape-result-view-model';

interface ScrapeResultProps {
  data: ScrapeResponse;
}

export function ScrapeResult({ data }: ScrapeResultProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  if (isScrapeError(data)) {
    return <ScrapeErrorCard error={data.error} />;
  }

  const viewModel = buildScrapeResultViewModel(data);

  const renderPreviewDialog = () => {
    if (!viewModel.hasScreenshot || !viewModel.screenshotSrc) {
      return null;
    }

    return (
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-auto">
          <img src={viewModel.screenshotSrc} alt="Screenshot Preview" className="w-full h-auto" />
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      <div className="space-y-4">
        <ScrapeSummaryCard data={data} />

        <ScrapeResultContentTabs
          data={data}
          viewModel={viewModel}
          onPreviewOpen={() => setPreviewOpen(true)}
        />

        {data.timings && <ScrapeTimingCard timings={data.timings} />}
      </div>

      {renderPreviewDialog()}
    </>
  );
}
