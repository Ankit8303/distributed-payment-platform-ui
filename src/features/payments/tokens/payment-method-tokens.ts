/**
 * Development / Sandbox Test Payment Method Tokens
 *
 * Security Notice:
 * The Distributed Payment & Ledger Platform operates with tokenized payment methods.
 * In this development/sandbox environment, predefined mock tokens are provided
 * to test distinct backend payment execution and settlement paths.
 *
 * Invariants:
 * - NO real Primary Account Numbers (PANs), CVVs, or expiration dates are collected.
 * - Raw card credentials NEVER touch this frontend or the backend.
 * - These tokens are NEVER persisted to localStorage or sessionStorage.
 */

export interface PaymentMethodOption {
  id: string;
  token: string;
  name: string;
  description: string;
  simulatedOutcome: "SUCCESS" | "DECLINE" | "TIMEOUT" | "CUSTOM";
}

export const SANDBOX_PAYMENT_METHODS: readonly PaymentMethodOption[] = [
  {
    id: "sandbox-visa",
    token: "tok_visa",
    name: "Visa Test Card (Success)",
    description: "Simulates an approved authorization and successful dual-entry ledger settlement (SETTLED).",
    simulatedOutcome: "SUCCESS",
  },
  {
    id: "sandbox-decline",
    token: "tok_decline",
    name: "Declining Test Card",
    description: "Simulates issuer refusal (PROVIDER_DECLINED) returning terminal DECLINED status.",
    simulatedOutcome: "DECLINE",
  },
  {
    id: "sandbox-timeout",
    token: "tok_timeout",
    name: "Gateway Timeout Card",
    description: "Simulates gateway timeout (HTTP 202) transitioning to PENDING_RECONCILIATION.",
    simulatedOutcome: "TIMEOUT",
  },
  {
    id: "sandbox-custom",
    token: "tok_custom",
    name: "Custom Token",
    description: "Allows entering a custom sandbox test token for bespoke testing.",
    simulatedOutcome: "CUSTOM",
  },
] as const;

export const DEFAULT_PAYMENT_METHOD_TOKEN = "tok_visa";
