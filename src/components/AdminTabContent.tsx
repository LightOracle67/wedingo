import { lazy, memo } from "react";
import type { PanelTabConfig } from "../pages/admin/PanelTab";
import type { AttendanceTabProps } from "../pages/admin/AttendanceTab";
import type { AccessTabProps } from "../pages/admin/AccessTab";
import type { ShareTabProps } from "../pages/admin/ShareTab";

const PanelTab = lazy(() => import("../pages/admin/PanelTab"));
const AttendanceTab = lazy(() => import("../pages/admin/AttendanceTab"));
const AccessTab = lazy(() => import("../pages/admin/AccessTab"));
const ShareTab = lazy(() => import("../pages/admin/ShareTab"));
const SupportTab = lazy(() => import("../pages/admin/SupportTab"));

const AdminTabContent = memo(function AdminTabContent({ activeTab, ...props }: { activeTab: string } & Record<string, unknown>) {
  switch (activeTab) {
    case "panel": return <PanelTab {...(props as { config: PanelTabConfig })} />;
    case "asistencia": return <AttendanceTab {...(props as unknown as AttendanceTabProps)} />;
    case "compartir": return <ShareTab {...(props as unknown as ShareTabProps)} />;
    case "acceso": return <AccessTab {...(props as unknown as AccessTabProps)} />;
    case "soporte": return <SupportTab {...(props as Record<string, unknown>)} />;
    default: return null;
  }
});

export default AdminTabContent;
