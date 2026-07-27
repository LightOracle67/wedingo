interface PasswordCredentialData {
  id: string;
  password: string;
  name: string;
}

interface PasswordCredential extends Credential {
  id: string;
  type: "password";
}

declare var PasswordCredential: {
  prototype: PasswordCredential;
  new (data: PasswordCredentialData): PasswordCredential;
};

interface CredentialContainer {
  store(credential: PasswordCredential): Promise<void>;
}
