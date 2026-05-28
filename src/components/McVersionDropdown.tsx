import React, { useState, useRef, useEffect } from 'react';
import { groupMcVersions, formatVersionsCompact } from '../config/mcVersions';

interface McVersionDropdownProps {
  selected: string[];
  onChange: (versions: string[]) => void;
}

const McVersionDropdown: React.FC<McVersionDropdownProps> = ({ selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const groups = groupMcVersions();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  };

  const toggleGroup = (versions: string[]) => {
    const allSelected = versions.every(v => selected.includes(v));
    if (allSelected) {
      onChange(selected.filter(v => !versions.includes(v)));
    } else {
      const merged = [...new Set([...selected, ...versions])];
      onChange(merged);
    }
  };

  const clearAll = () => onChange([]);

  const filteredGroups = groups.map(g => ({
    ...g,
    versions: g.versions.filter(v => v.includes(search)),
  })).filter(g => g.versions.length > 0 || g.prefix.includes(search));

  const compactDisplay = formatVersionsCompact(selected);

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-2xl border-[3px] border-black bg-surface-container-high px-4 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:border-primary-container/50"
      >
        <div className="flex flex-wrap gap-1.5 min-h-[24px]">
          {selected.length === 0 ? (
            <span className="font-body-sm text-[13px] text-on-surface-variant/50">Seleziona versioni MC...</span>
          ) : (
            compactDisplay.slice(0, 6).map((v) => (
              <span key={v} className="rounded-md bg-primary-container/80 px-2 py-0.5 font-label-caps text-[9px] text-white">{v}</span>
            ))
          )}
          {compactDisplay.length > 6 && (
            <span className="font-label-caps text-[9px] text-on-surface-variant">+{compactDisplay.length - 6}</span>
          )}
        </div>
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant ml-2 shrink-0">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-2 w-full max-h-[360px] overflow-hidden rounded-2xl border-[3px] border-black bg-surface-container shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          {/* Search + controls */}
          <div className="sticky top-0 z-10 bg-surface-container border-b border-black/20 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[14px] text-on-surface-variant">search</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cerca versione..."
                  className="w-full rounded-lg bg-surface-container-high pl-8 pr-3 py-1.5 font-body-sm text-[12px] text-on-surface placeholder:text-on-surface-variant/50 outline-none"
                />
              </div>
              {selected.length > 0 && (
                <button type="button" onClick={clearAll}
                  className="rounded-lg px-2 py-1.5 font-label-caps text-[9px] text-error hover:bg-error/10">
                  CLEAR
                </button>
              )}
            </div>
            <p className="font-label-caps text-[9px] text-on-surface-variant">
              {selected.length} selezionate • Clicca il gruppo per selezionare tutte
            </p>
          </div>

          {/* Scrollable list */}
          <div className="overflow-y-auto max-h-[280px] p-2">
            {filteredGroups.map((group) => {
              const allSelected = group.versions.every(v => selected.includes(v));
              const someSelected = group.versions.some(v => selected.includes(v));
              return (
                <div key={group.prefix} className="mb-1">
                  {/* Group header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.versions)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-all hover:bg-surface-container-high ${
                      allSelected ? 'bg-primary-container/15' : ''
                    }`}
                  >
                    <span className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                      allSelected ? 'border-primary-container bg-primary-container text-white' :
                      someSelected ? 'border-primary-container/50 bg-primary-container/30 text-white' :
                      'border-on-surface-variant/30'
                    }`}>
                      {allSelected ? '✓' : someSelected ? '−' : ''}
                    </span>
                    <span className="font-headline-md text-[12px] text-white">{group.prefix}.x</span>
                    <span className="font-label-caps text-[9px] text-on-surface-variant/60 ml-auto">
                      {group.versions.filter(v => selected.includes(v)).length}/{group.versions.length}
                    </span>
                  </button>
                  {/* Individual versions */}
                  <div className="ml-6 flex flex-wrap gap-1 py-1">
                    {group.versions.filter(v => !search || v.includes(search)).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => toggle(v)}
                        className={`rounded-md border px-2 py-0.5 font-label-caps text-[9px] transition-all ${
                          selected.includes(v)
                            ? 'border-primary-container bg-primary-container/80 text-white'
                            : 'border-black/30 bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                        }`}
                      >{v}</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default McVersionDropdown;
