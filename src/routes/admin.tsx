import { LazyAdminPage as Page } from "./lazy-pages";
import { AppProviders, InviteChrome } from "../providers";



/** Ruta perezosa (v2.192): la página con sus providers Firestore en un
 *  chunk propio — el shell ya no importa vendor-firebase. */
export default function admin_Route() {
  return (
    <AppProviders>
<InviteChrome />
      <Page />
    </AppProviders>
  );
}
