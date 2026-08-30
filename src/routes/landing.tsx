import { LazyLandingPage as Page } from "./lazy-pages";
import { AppProviders } from "../providers";



/** Ruta perezosa (v2.192): la página con sus providers Firestore en un
 *  chunk propio — el shell ya no importa vendor-firebase. */
export default function landing_Route() {
  return (
    <AppProviders>
      <Page />
    </AppProviders>
  );
}
