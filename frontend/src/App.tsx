import { useState } from 'react';
import { Header } from './components/Header';
import { SectionSeparator } from './components/SectionSeparator';
import { CatalogPage } from './components/CatalogPage';
import { InventoryPage } from './screens/inventory/InventoryPage';

type Section = 'inventory' | 'catalog' | 'decks';

function App() {
  const [activeSection, setActiveSection] = useState<Section>('catalog');

  return (
    <div className="app-layout">
      <Header activeSection={activeSection} onSectionChange={setActiveSection} />
      <SectionSeparator />
      <main className="app-main">
        {activeSection === 'catalog'   && <CatalogPage />}
        {activeSection === 'inventory' && <InventoryPage />}
        {activeSection === 'decks'     && <p className="placeholder">Decks — coming soon</p>}
      </main>
    </div>
  );
}

export default App;
