import { describe, it, expect } from "vitest";
import { STORAGE_KEYS, INVITE_CACHE_PREFIX, AUDIO_PREFIX } from "../storage-keys";

describe("storage-keys", () => {
  it("centraliza claves y genera las por token (incluida trivia)", () => {
    expect(STORAGE_KEYS.session).toBe("wedin_session");
    expect(STORAGE_KEYS.inviteCache("abc123")).toBe("wedin_invite_cache_abc123");
    expect(STORAGE_KEYS.rsvpSubmitted("abc123")).toBe("wedin_rsvp_submitted_abc123");
    expect(STORAGE_KEYS.triviaState("abc123")).toBe("wedin_trivia_abc123");
    expect(INVITE_CACHE_PREFIX).toBe("wedin_invite_cache_");
    expect(AUDIO_PREFIX).toBe("wedin_audio_");
  });
});
