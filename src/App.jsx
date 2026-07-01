import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppProvider, useApp } from "./contexts/AppContext";
import PublicInvitation from "./pages/PublicInvitation";
import SetupPage from "./pages/SetupPage";
import AdminPage from "./pages/AdminPage";

function AppShell() {
  const { config, formData, isAdminTokenLoggedIn } = useApp();
  const location = useLocation();

  const isEditingRoute = location.pathname === "/setup" || (location.pathname === "/admin" && isAdminTokenLoggedIn);

  useEffect(() => {
    const activeTheme = isEditingRoute ? formData.theme || config.theme : config.theme;
    document.documentElement.dataset.weddingTheme = activeTheme || "golden";
  }, [config.theme, formData.theme, isEditingRoute]);

  useEffect(() => {
    const activeBackground = isEditingRoute ? formData.backgroundImage || config.backgroundImage : config.backgroundImage;
    const encodedBackground = activeBackground ? `url('${activeBackground.replace(/'/g, "\\'")}')` : "none";
    document.documentElement.style.setProperty("--wedding-background-image", encodedBackground);
  }, [config.backgroundImage, formData.backgroundImage, isEditingRoute]);

  return (
    <Routes>
      <Route path="/" element={<PublicInvitation />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
