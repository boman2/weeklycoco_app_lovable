import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

const SearchBar = ({ placeholder = '상품명 또는 상품번호 검색', onSearch, className }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    setQuery('');
    onSearch?.('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'relative flex items-center overflow-hidden rounded-2xl bg-muted transition-all',
        isFocused && 'ring-2 ring-primary/30',
        className
      )}
    >
      <Search className="ml-4 h-5 w-5 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="flex-1 bg-transparent px-3 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="mr-2 rounded-full p-1.5 text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
};

export default SearchBar;
