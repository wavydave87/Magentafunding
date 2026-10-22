/**
 * Bank verification abstraction.
 *
 * The Partner Portal wizard talks to this service, never to a vendor SDK, so a
 * real Plaid (or Decision Logic, or MX) integration can be dropped in later by
 * implementing `connectBanking` against the provider without touching the UI.
 */
export interface BankingConnectResult {
  connected: boolean;
  provider: string;
  message: string;
  /** Vendor handle (Plaid item id, etc.) once a real provider is wired up. */
  reference?: string;
}

export type BankingProvider = {
  name: string;
  connect: () => Promise<BankingConnectResult>;
};

/**
 * Placeholder provider: records intent so underwriting knows the partner opted
 * into bank verification. No credentials are collected or stored.
 */
const manualProvider: BankingProvider = {
  name: "Magenta Bank Verification",
  connect: async () => ({
    connected: true,
    provider: "Magenta Bank Verification",
    message: "Bank verification requested — Magenta will send a secure link to the merchant.",
  }),
};

let activeProvider: BankingProvider = manualProvider;

export function setBankingProvider(provider: BankingProvider) {
  activeProvider = provider;
}

export function connectBanking(): Promise<BankingConnectResult> {
  return activeProvider.connect();
}
