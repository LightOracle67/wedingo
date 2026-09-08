export {};
/* oxlint-disable no-redeclare — interface + var del mismo nombre (patrón lib.dom
   con fusión de tipos TS) que oxlint 1.82 señala como duplicado en .d.ts. */

declare global {
  interface PasswordCredentialData {
    id: string;
    password: string;
    name: string;
  }

  interface PasswordCredential extends Credential {
    id: string;
    type: "password";
  }

  // La fusión `interface` + `var` del mismo nombre es el patrón lib.dom
  // estándar (Tipos JS + namespace de valor) y legal en TypeScript; oxlint
  // `no-redeclare` lo señala como duplicado.
  // oxlint-disable-next-line no-redeclare
  var PasswordCredential: {
    prototype: PasswordCredential;
    new (data: PasswordCredentialData): PasswordCredential;
  };

  interface CredentialContainer {
    store(credential: PasswordCredential): Promise<void>;
  }
}
