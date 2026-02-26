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

interface Option {
  value: string;
  label: string;
}

interface SitesFilterBarProps {
  searchInput: string;
  statusFilter: string;
  typeFilter: string;
  tierFilter: string;
  expiryFilter: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onSearchKeyDown: (e: React.KeyboardEvent) => void;
  onStatusFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onTierFilterChange: (value: string) => void;
  onExpiryFilterChange: (value: string) => void;
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

export function SitesFilterBar({
  searchInput,
  statusFilter,
  typeFilter,
  tierFilter,
  expiryFilter,
  onSearchInputChange,
  onSearch,
  onSearchKeyDown,
  onStatusFilterChange,
  onTypeFilterChange,
  onTierFilterChange,
  onExpiryFilterChange,
}: SitesFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex gap-2">
        <Input
          placeholder="搜索子域名、标题、邮箱..."
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          onKeyDown={onSearchKeyDown}
          className="w-64"
        />
        <Button variant="outline" size="icon" onClick={onSearch}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <FilterSelect
        value={statusFilter}
        onValueChange={onStatusFilterChange}
        options={STATUS_OPTIONS}
      />
      <FilterSelect value={typeFilter} onValueChange={onTypeFilterChange} options={TYPE_OPTIONS} />
      <FilterSelect value={tierFilter} onValueChange={onTierFilterChange} options={TIER_OPTIONS} />
      <FilterSelect
        value={expiryFilter}
        onValueChange={onExpiryFilterChange}
        options={EXPIRY_OPTIONS}
      />
    </div>
  );
}
