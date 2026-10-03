import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export function Tabs({ items, value, onChange }: {items: TabItem[];value: string;onChange: (id: string) => void;}) {
  return (
    <div className="flex items-end gap-0.5 border-b border-win-border" role="tablist">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`relative -mb-px inline-flex items-center gap-1.5 border border-b-0 px-3 py-1.5 text-xs font-medium rounded-t-win transition-colors duration-150 ease-out ${
            active ?
            'border-win-border bg-win-surface text-win-accent' :
            'border-transparent text-win-muted hover:bg-win-panel hover:text-win-text'}`
            }>
            
            {item.label}
            {item.count !== undefined &&
            <span
              className={`px-1 text-2xs tabular-nums rounded-win ${
              active ? 'bg-win-accentSoft text-win-accent' : 'bg-win-sunken text-win-muted'}`
              }>
              
                {item.count}
              </span>
            }
            {active && <span className="absolute inset-x-0 -top-px h-0.5 bg-win-accent" aria-hidden="true" />}
          </button>);

      })}
    </div>);

}