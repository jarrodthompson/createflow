import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "./crypto";

describe("crypto", () => {
  it("round-trips a secret", () => {
    const plain = "12345678.etsy-access-token-value";
    const enc = encryptSecret(plain);
    expect(enc).not.toContain(plain);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("produces different ciphertext each time (random IV)", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("returns null for tampered payloads", () => {
    const enc = encryptSecret("secret");
    expect(decryptSecret(enc + "tampered")).toBeNull();
    expect(decryptSecret("not-valid")).toBeNull();
  });
});
