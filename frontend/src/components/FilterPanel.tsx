import React, { useState, useEffect, useRef } from 'react';
import { AspectIcon } from './AspectIcon';
import { VARIANT_DEFS } from '../utils/inventory';
import { parseCardDisplay } from '../utils/catalog';
import type { BaseCard } from '../utils/catalog';
import './FilterPanel.css';

// ── Domain constants ──────────────────────────────────────────────────────

const ASPECT_LIST = ['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy'] as const;

const SET_LIST = [
  { code: 'SOR', name: 'Spark of Rebellion' },
  { code: 'SHD', name: 'Shadows of the Galaxy' },
  { code: 'TWI', name: 'Twilight of the Republic' },
  { code: 'JTL', name: 'Jump to Lightspeed' },
  { code: 'LOF', name: 'Legends of the Force' },
  { code: 'SEC', name: 'Secrets of Power' },
  { code: 'LAW', name: 'A Lawless Time' },
] as const;

const TYPE_OPTIONS = ['Leader', 'Base', 'Unit', 'Event', 'Upgrade'];

const RARITY_OPTIONS: SelectOption[] = [
  { value: 'S', label: 'Starter' },
  { value: 'C', label: 'Common' },
  { value: 'U', label: 'Uncommon' },
  { value: 'R', label: 'Rare' },
  { value: 'L', label: 'Legendary' },
];

const ARENA_OPTIONS = ['Ground', 'Space'];

const COST_MAX  = 15;
const POWER_MAX = 12;
const HP_MAX    = 35;

// ── FilterState type ──────────────────────────────────────────────────────

export interface FilterState {
  search: string;
  aspects: Set<string>;
  set: Set<string>;
  type: Set<string>;
  rarity: Set<string>;
  variant: Set<string>;
  keyword: Set<string>;
  trait: Set<string>;
  arena: Set<string>;
  costRange: [number, number];
  powerRange: [number, number];
  hpRange: [number, number];
}

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  aspects: new Set(ASPECT_LIST),
  set: new Set(),
  type: new Set(),
  rarity: new Set(),
  variant: new Set(),
  keyword: new Set(),
  trait: new Set(),
  arena: new Set(),
  costRange:  [0, COST_MAX],
  powerRange: [0, POWER_MAX],
  hpRange:    [0, HP_MAX],
};

// ── applyFilters ──────────────────────────────────────────────────────────

export function applyFilters(cards: BaseCard[], filters: FilterState): BaseCard[] {
  const allAspects    = filters.aspects.size === ASPECT_LIST.length;
  const q             = filters.search.trim().toLowerCase();
  const costNarrowed  = filters.costRange[0]  !== 0 || filters.costRange[1]  !== COST_MAX;
  const powerNarrowed = filters.powerRange[0] !== 0 || filters.powerRange[1] !== POWER_MAX;
  const hpNarrowed    = filters.hpRange[0]    !== 0 || filters.hpRange[1]    !== HP_MAX;

  const hasAnyOf = (set: Set<string>, values: string[]) =>
    set.size === 0 || values.some(v => set.has(v));

  return cards.filter(card => {
    if (q) {
      const { displayName, subtitle } = parseCardDisplay(card);
      const hay = [
        displayName, subtitle ?? '',
        ...card.traits, ...card.keywords, card.type,
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (!allAspects) {
      if (card.aspects.length === 0) return false;
      if (!card.aspects.some(a => filters.aspects.has(a))) return false;
    }

    if (filters.set.size    && !filters.set.has(card.set_code))    return false;
    if (filters.type.size   && !filters.type.has(card.type))       return false;
    if (filters.rarity.size && !filters.rarity.has(card.rarity))   return false;

    if (filters.variant.size) {
      const hasVariant = [...filters.variant].some(
        k => card[k as keyof BaseCard],
      );
      if (!hasVariant) return false;
    }

    if (filters.keyword.size && !hasAnyOf(filters.keyword, card.keywords)) return false;
    if (filters.trait.size   && !hasAnyOf(filters.trait,   card.traits))   return false;

    if (filters.arena.size && !(card.arena && filters.arena.has(card.arena))) return false;

    if (costNarrowed) {
      if (card.cost == null) return false;
      if (card.cost < filters.costRange[0] || card.cost > filters.costRange[1]) return false;
    }
    if (powerNarrowed) {
      if (card.power == null) return false;
      if (card.power < filters.powerRange[0] || card.power > filters.powerRange[1]) return false;
    }
    if (hpNarrowed) {
      if (card.hp == null) return false;
      if (card.hp < filters.hpRange[0] || card.hp > filters.hpRange[1]) return false;
    }

    return true;
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────

interface SelectOption {
  value: string;
  label: string;
}

function normOpt(opt: string | SelectOption): SelectOption {
  return typeof opt === 'string' ? { value: opt, label: opt } : opt;
}

function distinctMulti(cards: BaseCard[], field: 'keywords' | 'traits'): string[] {
  const out = new Set<string>();
  cards.forEach(c => c[field].forEach(v => out.add(v)));
  return [...out].sort();
}

// ── MultiSelect ───────────────────────────────────────────────────────────

interface MultiSelectProps {
  label: string;
  values: Set<string>;
  onChange: (next: Set<string>) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  searchable?: boolean;
}

export function MultiSelect({
  label,
  values,
  onChange,
  options,
  placeholder = 'All',
  searchable = false,
}: MultiSelectProps) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const ref       = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable && searchRef.current) {
      const id = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
    if (!open) setQuery('');
    return undefined;
  }, [open, searchable]);

  const norm     = options.map(normOpt);
  const labelFor = (v: string) => (norm.find(o => o.value === v) ?? { label: v }).label;
  const visible  = !searchable || !query
    ? norm
    : norm.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));

  const toggle    = (v: string) => { const next = new Set(values); next.has(v) ? next.delete(v) : next.add(v); onChange(next); };
  const clear     = (e: React.MouseEvent) => { e.stopPropagation(); onChange(new Set()); };
  const selectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (searchable && query) {
      const next = new Set(values);
      visible.forEach(o => next.add(o.value));
      onChange(next);
    } else {
      onChange(new Set(norm.map(o => o.value)));
    }
  };

  let summary: string;
  if (values.size === 0)              summary = placeholder;
  else if (values.size === 1)         summary = labelFor([...values][0]);
  else if (values.size === norm.length) summary = placeholder;
  else                                summary = `${values.size} selected`;
  const isPlaceholder = values.size === 0 || values.size === norm.length;

  return (
    <div className="ifp-field" ref={ref}>
      <span className="ifp-field__label">{label}</span>
      <div className={`ifp-multi${open ? ' ifp-multi--open' : ''}`}>
        <button
          type="button"
          className="ifp-multi__button"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={isPlaceholder ? 'ifp-multi__placeholder' : 'ifp-multi__value'}>
            {summary}
          </span>
          <svg className="ifp-chevron" width="10" height="6" viewBox="0 0 10 6">
            <path d="M1 1l4 4 4-4" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {open && (
          <div className="ifp-multi__menu" role="listbox" aria-multiselectable="true">
            {searchable && (
              <div className="ifp-multi__search">
                <svg width="14" height="14" viewBox="0 0 16 16" className="ifp-multi__search-icon">
                  <circle cx="7" cy="7" r="5" stroke="currentColor" fill="none" strokeWidth="1.5" />
                  <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder={`Search ${label.toLowerCase()}…`}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    className="ifp-multi__search-clear"
                    onClick={e => { e.stopPropagation(); setQuery(''); searchRef.current?.focus(); }}
                    aria-label="Clear search"
                  >×</button>
                )}
              </div>
            )}

            <div className="ifp-multi__menubar">
              <button type="button" className="ifp-multi__bar-btn" onClick={selectAll}>
                {searchable && query ? `All matches (${visible.length})` : 'All'}
              </button>
              <button
                type="button"
                className="ifp-multi__bar-btn"
                onClick={clear}
                disabled={values.size === 0}
              >Clear</button>
            </div>

            <div className="ifp-multi__items">
              {visible.length === 0 && <div className="ifp-multi__empty">No matches</div>}
              {visible.map(({ value, label: optLabel }) => {
                const checked = values.has(value);
                return (
                  <button
                    key={value}
                    type="button"
                    className={`ifp-multi__item${checked ? ' ifp-multi__item--on' : ''}`}
                    onClick={() => toggle(value)}
                    role="option"
                    aria-selected={checked}
                  >
                    <span className={`ifp-multi__check${checked ? ' ifp-multi__check--on' : ''}`}>
                      {checked && (
                        <svg width="10" height="8" viewBox="0 0 10 8">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="ifp-multi__item-label">{optLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── RangeSlider ───────────────────────────────────────────────────────────

interface RangeSliderProps {
  label: string;
  min?: number;
  max: number;
  value: [number, number];
  onChange: (next: [number, number]) => void;
}

export function RangeSlider({ label, min = 0, max, value, onChange }: RangeSliderProps) {
  const [lo, hi] = value;
  const pct   = (n: number) => `${(n / max) * 100}%`;
  const isAny = lo === min && hi === max;
  const setLo = (n: number) => onChange([Math.min(Math.max(min, n), hi), hi]);
  const setHi = (n: number) => onChange([lo, Math.max(Math.min(max, n), lo)]);

  return (
    <div className="ifp-range">
      <div className="ifp-range__head">
        <span className="ifp-range__label">{label}</span>
        <span className="ifp-range__readout">{isAny ? 'Any' : `${lo} – ${hi}`}</span>
      </div>
      <div className="ifp-range__track-wrap">
        <div className="ifp-range__track" />
        <div className="ifp-range__fill" style={{ left: pct(lo), right: `calc(100% - ${pct(hi)})` }} />
        <input
          type="range" min={min} max={max} value={lo}
          onChange={e => setLo(Number(e.target.value))}
          className="ifp-range__input ifp-range__input--lo"
          aria-label={`${label} minimum`}
        />
        <input
          type="range" min={min} max={max} value={hi}
          onChange={e => setHi(Number(e.target.value))}
          className="ifp-range__input ifp-range__input--hi"
          aria-label={`${label} maximum`}
        />
      </div>
      <div className="ifp-range__scale"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}

// ── AspectPicker ──────────────────────────────────────────────────────────

interface AspectPickerProps {
  selected: Set<string>;
  onToggle: (aspect: string) => void;
}

export function AspectPicker({ selected, onToggle }: AspectPickerProps) {
  const allOn = selected.size === ASPECT_LIST.length;
  return (
    <div className="ifp-aspects">
      {ASPECT_LIST.map(aspect => {
        const isActive = allOn || selected.has(aspect);
        return (
          <button
            key={aspect}
            type="button"
            className={`ifp-aspect${isActive ? '' : ' ifp-aspect--off'}`}
            onClick={() => onToggle(aspect)}
            title={aspect}
            aria-pressed={isActive}
          >
            <AspectIcon aspect={aspect} size={36} />
          </button>
        );
      })}
    </div>
  );
}

// ── FilterPanel ───────────────────────────────────────────────────────────

interface FilterPanelProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  cards: BaseCard[];
  children?: React.ReactNode;
}

export function FilterPanel({ filters, setFilters, cards, children }: FilterPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const update = (patch: Partial<FilterState>) =>
    setFilters(prev => ({ ...prev, ...patch }));

  const toggleAspect = (aspect: string) => {
    setFilters(prev => {
      const allOn = prev.aspects.size === ASPECT_LIST.length;
      let next: Set<string>;
      if (allOn) {
        next = new Set([aspect]);
      } else if (prev.aspects.has(aspect)) {
        next = new Set(prev.aspects);
        next.delete(aspect);
        if (next.size === 0) next = new Set(ASPECT_LIST);
      } else {
        next = new Set(prev.aspects);
        next.add(aspect);
      }
      return { ...prev, aspects: next };
    });
  };

  const setOptions     = SET_LIST.map(s => ({ value: s.code, label: `${s.code} — ${s.name}` }));
  const variantOptions = VARIANT_DEFS.map(v => ({ value: v.key as string, label: v.label }));
  const keywordOptions = distinctMulti(cards, 'keywords');
  const traitOptions   = distinctMulti(cards, 'traits');

  return (
    <div className="ifp">
      <button
        type="button"
        className="ifp__header"
        onClick={() => setCollapsed(v => !v)}
        aria-expanded={!collapsed}
      >
        <span className="ifp__title">Filters</span>
        <svg className={`ifp__chev${collapsed ? ' ifp__chev--down' : ''}`} width="12" height="8" viewBox="0 0 12 8">
          <path d="M1 6l5-4 5 4" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {!collapsed && (
        <div className="ifp__body">
          <div className="ifp-search">
            <svg className="ifp-search__icon" width="16" height="16" viewBox="0 0 16 16">
              <circle cx="7" cy="7" r="5" stroke="currentColor" fill="none" strokeWidth="1.5" />
              <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search cards…"
              value={filters.search}
              onChange={e => update({ search: e.target.value })}
            />
            {filters.search && (
              <button
                type="button"
                className="ifp-search__clear"
                onClick={() => update({ search: '' })}
                aria-label="Clear search"
              >×</button>
            )}
          </div>

          <AspectPicker selected={filters.aspects} onToggle={toggleAspect} />

          <div className="ifp-grid ifp-grid--4">
            <MultiSelect label="Set"     values={filters.set}     onChange={v => update({ set: v })}     options={setOptions}     placeholder="All sets" />
            <MultiSelect label="Type"    values={filters.type}    onChange={v => update({ type: v })}    options={TYPE_OPTIONS}   placeholder="All types" />
            <MultiSelect label="Rarity"  values={filters.rarity}  onChange={v => update({ rarity: v })}  options={RARITY_OPTIONS} placeholder="All rarities" />
            <MultiSelect label="Variant" values={filters.variant} onChange={v => update({ variant: v })} options={variantOptions} placeholder="All variants" />
          </div>

          <div className="ifp-grid ifp-grid--3">
            <MultiSelect label="Keywords" values={filters.keyword} onChange={v => update({ keyword: v })} options={keywordOptions} placeholder="All keywords" searchable />
            <MultiSelect label="Traits"   values={filters.trait}   onChange={v => update({ trait: v })}   options={traitOptions}   placeholder="All traits"   searchable />
            <MultiSelect label="Arenas"   values={filters.arena}   onChange={v => update({ arena: v })}   options={ARENA_OPTIONS}  placeholder="All arenas" />
          </div>

          <div className="ifp-grid ifp-grid--3">
            <RangeSlider label="Cost"  max={COST_MAX}  value={filters.costRange}  onChange={v => update({ costRange: v })} />
            <RangeSlider label="Power" max={POWER_MAX} value={filters.powerRange} onChange={v => update({ powerRange: v })} />
            <RangeSlider label="HP"    max={HP_MAX}    value={filters.hpRange}    onChange={v => update({ hpRange: v })} />
          </div>

          {children}
        </div>
      )}
    </div>
  );
}
