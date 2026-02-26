/**
 * 用户筛选条
 */
import { TIER_OPTIONS } from '@/constants/tier'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const TIER_FILTER_OPTIONS = [{ value: 'all', label: '全部等级' }, ...TIER_OPTIONS]

const DELETED_FILTER_OPTIONS = [
  { value: 'all', label: '全部用户' },
  { value: 'active', label: '活跃用户' },
  { value: 'deleted', label: '已删除用户' },
]

interface UsersFilterBarProps {
  selectedTier: string
  deletedFilter: string
  onTierChange: (value: string) => void
  onDeletedFilterChange: (value: string) => void
}

export function UsersFilterBar({
  selectedTier,
  deletedFilter,
  onTierChange,
  onDeletedFilterChange,
}: UsersFilterBarProps) {
  return (
    <div className="flex gap-2">
      <Select value={selectedTier} onValueChange={onTierChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="选择等级" />
        </SelectTrigger>
        <SelectContent>
          {TIER_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={deletedFilter} onValueChange={onDeletedFilterChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="用户状态" />
        </SelectTrigger>
        <SelectContent>
          {DELETED_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
