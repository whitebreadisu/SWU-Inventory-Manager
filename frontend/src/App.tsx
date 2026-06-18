import { useState } from "react";
import { Header } from "./components/Header";
import { SectionSeparator } from "./components/SectionSeparator";
import { CatalogPage } from "./components/CatalogPage";
import { InventoryPage } from "./screens/inventory/InventoryPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AuthScreen } from "./screens/auth/AuthScreen";

type Section = "inventory" | "catalog" | "decks";

function AppContent() {
  const [activeSection, setActiveSection] = useState<Section>("catalog");
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <p className="loading-text">Loading…</p>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="app-layout">
      <Header
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        userEmail={user.email}
        onLogout={logout}
      />
      <SectionSeparator />
      <main className="app-main">
        <div style={{ display: activeSection === "catalog" ? "block" : "none" }}>
          <CatalogPage />
        </div>
        <div style={{ display: activeSection === "inventory" ? "block" : "none" }}>
          <InventoryPage />
        </div>
        {activeSection === "decks" && <p className="placeholder">Decks — coming soon</p>}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
