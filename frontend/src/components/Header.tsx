type Section = "inventory" | "catalog";

interface Props {
  activeSection: Section;
  onSectionChange: (s: Section) => void;
  userEmail: string | null;
  onLogout: () => void;
}

const NAV_ITEMS: { key: Section; label: string }[] = [
  { key: "inventory", label: "Inventory" },
  { key: "catalog", label: "Catalog" },
];

export function Header({ activeSection, onSectionChange, userEmail, onLogout }: Props) {
  return (
    <header className="app-header">
      <div className="app-header__brand">Star Wars: Unlimited Inventory Manager</div>

      <nav className="app-header__nav">
        {NAV_ITEMS.map(({ key, label }) => (
          <button
            key={key}
            className={`nav-tab${activeSection === key ? " nav-tab--active" : ""}`}
            onClick={() => onSectionChange(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="app-header__account">
        {userEmail && <span className="app-header__email">{userEmail}</span>}
        <button className="app-header__logout" onClick={onLogout}>
          Log Out
        </button>
      </div>
    </header>
  );
}
