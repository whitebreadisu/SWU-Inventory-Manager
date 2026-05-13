import { SWUButton } from './SWUButton';

type Section = 'inventory' | 'catalog' | 'decks';

interface Props {
  activeSection: Section;
  onSectionChange: (s: Section) => void;
}

const NAV_ITEMS: { key: Section; label: string }[] = [
  { key: 'inventory', label: 'Inventory' },
  { key: 'catalog',   label: 'Catalog'   },
  { key: 'decks',     label: 'Decks'     },
];

export function Header({ activeSection, onSectionChange }: Props) {
  return (
    <header className="app-header">
      <div className="app-header__brand">SWU Inventory Manager</div>

      <nav className="app-header__nav">
        {NAV_ITEMS.map(({ key, label }) => (
          <button
            key={key}
            className={`nav-tab${activeSection === key ? ' nav-tab--active' : ''}`}
            onClick={() => onSectionChange(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeSection === 'inventory' && (
        <div className="app-header__subnav">
          <SWUButton size="sm">Add Cards</SWUButton>
          <SWUButton size="sm">Card Search</SWUButton>
        </div>
      )}
    </header>
  );
}
