import { lazy, memo } from "react";

const PanelTab = lazy(() => import("../pages/admin/PanelTab"));
const AttendanceTab = lazy(() => import("../pages/admin/AttendanceTab"));
const AccessTab = lazy(() => import("../pages/admin/AccessTab"));
const ShareTab = lazy(() => import("../pages/admin/ShareTab"));
const SupportTab = lazy(() => import("../pages/admin/SupportTab"));

const AdminTabContent = memo(function AdminTabContent({ activeTab, ...props }: any) {
  switch (activeTab) {
    case "panel": return <PanelTab {...props} />;
    case "asistencia": return <AttendanceTab {...props} />;
    case "compartir": return <ShareTab {...props} />;
    case "acceso": return <AccessTab {...props} />;
    case "soporte": return <SupportTab {...props} />;
    default: return null;
  }
});

export default AdminTabContent;
