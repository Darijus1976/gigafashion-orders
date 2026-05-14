import { Search, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  dateFilter?: string
  onDateChange?: (date: string) => void
}

export function SearchBar({ 
  searchQuery, 
  onSearchChange, 
  dateFilter, 
  onDateChange 
}: SearchBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      {onDateChange && (
        <div className="flex gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => onDateChange(e.target.value)}
              className="pl-10 w-40"
            />
          </div>
          {dateFilter && (
            <Button 
              variant="outline" 
              onClick={() => onDateChange('')}
            >
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
