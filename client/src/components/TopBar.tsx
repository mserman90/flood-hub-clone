import { useState, useRef, useEffect } from 'react';
import { Search, HelpCircle, Settings, Bell, X, Loader2 } from 'lucide-react';
import type { GDACSAlertLevel } from '@/hooks/useAlertFeeds';
import { useGeocoding, type GeocodingResult } from '@/hooks/useGeocoding';

interface TopBarProps {
  alertCount?: number;
  highestAlertLevel?: GDACSAlertLevel | null;
  onAlertClick?: () => void;
  onPlaceSelect?: (result: GeocodingResult) => void;
}

const BADGE_COLORS: Record<GDACSAlertLevel, string> = {
  Red: '#D32F2F',
  Orange: '#F57C00',
  Green: '#388E3C',
};

export function TopBar({ alertCount = 0, highestAlertLevel, onAlertClick, onPlaceSelect }: TopBarProps) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const { results, isLoading, clear } = useGeocoding(query);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShowDropdown(results.length > 0 || (isLoading && query.length >= 2));
  }, [results, isLoading, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(result: GeocodingResult) {
    setQuery(result.display_name.split(',')[0]);
    setShowDropdown(false);
    clear();
    onPlaceSelect?.(result);
  }

  function handleClear() {
    setQuery('');
    setShowDropdown(false);
    clear();
    inputRef.current?.focus();
  }

  return (
    <header className="top-bar">
      {/* Logo */}
      <div className="top-bar-logo">
        <div className="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
              fill="#4285F4"
            />
          </svg>
        </div>
        <span className="logo-text">Flood Hub</span>
      </div>

      {/* Search bar */}
      <div className="top-bar-search-wrapper" ref={dropdownRef}>
        <div className="top-bar-search">
          <Search size={16} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Bir konum için arama yapın"
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
          />
          {query && (
            <button className="search-clear-btn" onClick={handleClear} aria-label="Temizle">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && (
          <div className="search-dropdown">
            {isLoading && (
              <div className="search-dropdown-loading">
                <Loader2 size={16} className="animate-spin" />
                <span>Aranıyor...</span>
              </div>
            )}
            {!isLoading && results.length === 0 && query.length >= 2 && (
              <div className="search-dropdown-empty">Sonuç bulunamadı</div>
            )}
            {results.map(result => (
              <button
                key={result.place_id}
                className="search-dropdown-item"
                onClick={() => handleSelect(result)}
              >
                <Search size={14} className="search-dropdown-icon" />
                <span className="search-dropdown-text">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="top-bar-actions">
        <button
          className="action-btn alert-bell-btn"
          aria-label="Uyarılar"
          onClick={onAlertClick}
        >
          <Bell size={20} />
          {alertCount > 0 && (
            <span
              className="alert-badge"
              style={{
                background: highestAlertLevel ? BADGE_COLORS[highestAlertLevel] : '#D32F2F',
              }}
            >
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          )}
        </button>
        <button className="action-btn" aria-label="Yardım">
          <HelpCircle size={20} />
        </button>
        <button className="action-btn" aria-label="Ayarlar">
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}
