import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { sitesListMethods } from '../methods';
import { useSitesListStore } from '../store';

interface Option {
  value: string;
  label: string;
}

const STATUS_OPTIONS: Option[] = [
  { value: 'all', label: '全部状态' },
  { value: 'ACTIVE', label: '活跃' },
  { value: 'OFFLINE', label: '下线' },
];

const TYPE_OPTIONS: Option[] = [
  { value: 'all', label: '全部类型' },
  { value: 'MARKDOWN', label: 'Markdown' },
  { value: 'GENERATED', label: 'AI 生成' },
];

const TIER_OPTIONS: Option[] = [
  { value: 'all', label: '全部等级' },
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
];

const EXPIRY_OPTIONS: Option[] = [
  { value: 'all', label: '全部' },
  { value: 'expiring', label: '即将过期' },
  { value: 'expired', label: '已过期' },
];

interface FilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
}

function FilterSelect({ value, onValueChange, options }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function handleSearchInputKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
  if (event.key === 'Enter') {
    sitesListMethods.applySitesSearch();
  }
}

export function SitesFilterBar() {
  const searchInput = useSitesListStore((state) => state.searchInput);
  const statusFilter = useSitesListStore((state) => state.statusFilter);
  const typeFilter = useSitesListStore((state) => state.typeFilter);
  const tierFilter = useSitesListStore((state) => state.tierFilter);
  const expiryFilter = useSitesListStore((state) => state.expiryFilter);
  const setSearchInput = useSitesListStore((state) => state.setSearchInput);

  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex gap-2">
        <Input
          placeholder="搜索子域名、标题、邮箱..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={handleSearchInputKeyDown}
          className="w-64"
        />
        <Button variant="outline" size="icon" onClick={sitesListMethods.applySitesSearch}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <FilterSelect
        value={statusFilter}
        onValueChange={sitesListMethods.setSitesStatusFilter}
        options={STATUS_OPTIONS}
      />
      <FilterSelect
        value={typeFilter}
        onValueChange={sitesListMethods.setSitesTypeFilter}
        options={TYPE_OPTIONS}
      />
      <FilterSelect
        value={tierFilter}
        onValueChange={sitesListMethods.setSitesTierFilter}
        options={TIER_OPTIONS}
      />
      <FilterSelect
        value={expiryFilter}
        onValueChange={sitesListMethods.setSitesExpiryFilter}
        options={EXPIRY_OPTIONS}
      />
    </div>
  );
}
