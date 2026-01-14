/**
 * [POS]: User topics page - manage published topics
 */
import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { TopicList } from '@/features/digest';

export const Route = createFileRoute('/my-topics')({
  component: MyTopicsPage,
  head: () => ({
    meta: [
      { title: 'My Topics - Aiget Dev' },
      { name: 'description', content: 'Manage your published topics' },
    ],
  }),
});

function MyTopicsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Topics</h1>
          <p className="text-muted-foreground">Manage your published topics</p>
        </div>

        <TopicList />
      </div>
    </DashboardLayout>
  );
}
