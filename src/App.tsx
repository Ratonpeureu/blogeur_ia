import { Suspense } from "react";
import { AppProvider } from "./contexts/AppContext";
import { AppShell as EcoleShell } from "./components/shell/AppShell";
import "./ecole.css"; // ← CSS du module, chargé avec ce chunk uniquement

export default function EcoleLayout() {
  return (
    <div className="ecole-scope h-screen overflow-hidden">
      <AppProvider>
        <Suspense fallback={null}>
          <EcoleShell /> {/* rend déjà <Outlet /> */}
        </Suspense>
      </AppProvider>
    </div>
  );
}