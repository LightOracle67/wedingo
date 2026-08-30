import { LazySuperAdminPanel as Page } from "./lazy-pages";
import { SuperAdminProviders } from "../providers";



/** Ruta perezosa del superadmin (v2.192): solo Firebase Auth. */
export default function superadmin_panel_Route() {
  return (
    <SuperAdminProviders>
      <Page />
    </SuperAdminProviders>
  );
}
