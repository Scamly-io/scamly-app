import {
  buildChatImageStoragePath,
  chatImageSignedUrlExpirySeconds,
  joinImageIdCsv,
  normalizePickerBase64,
  parseImageIdCsv,
} from "./chat-images";

describe("normalizePickerBase64", () => {
  it("returns null for empty input", () => {
    expect(normalizePickerBase64(null)).toBeNull();
    expect(normalizePickerBase64(undefined)).toBeNull();
    expect(normalizePickerBase64("")).toBeNull();
    expect(normalizePickerBase64("   ")).toBeNull();
  });

  it("strips data URL prefix when present", () => {
    expect(normalizePickerBase64("data:image/png;base64,ABCxyz+/=")).toBe("ABCxyz+/=");
  });

  it("returns trimmed raw payload when no data URL prefix", () => {
    expect(normalizePickerBase64("  SGVsbG8=  ")).toBe("SGVsbG8=");
  });
});

describe("parseImageIdCsv", () => {
  it("returns empty array for null, undefined, and empty string", () => {
    expect(parseImageIdCsv(null)).toEqual([]);
    expect(parseImageIdCsv(undefined)).toEqual([]);
    expect(parseImageIdCsv("")).toEqual([]);
    expect(parseImageIdCsv("   ")).toEqual([]);
  });

  it("splits comma-separated filenames and trims whitespace", () => {
    expect(parseImageIdCsv("a.jpg,b.png")).toEqual(["a.jpg", "b.png"]);
    expect(parseImageIdCsv(" a.jpg , b.png ")).toEqual(["a.jpg", "b.png"]);
  });

  it("accepts string[] from jsonb image_id", () => {
    expect(parseImageIdCsv(["a.jpg", " b.png "])).toEqual(["a.jpg", "b.png"]);
    expect(parseImageIdCsv(["x.jpg,y.jpg"])).toEqual(["x.jpg", "y.jpg"]);
  });

  it("returns empty for non-string non-array values", () => {
    expect(parseImageIdCsv(42)).toEqual([]);
    expect(parseImageIdCsv({})).toEqual([]);
    expect(parseImageIdCsv(true)).toEqual([]);
  });
});

describe("joinImageIdCsv", () => {
  it("joins non-empty entries with commas", () => {
    expect(joinImageIdCsv(["x", "y"])).toBe("x,y");
  });

  it("returns empty string for empty input", () => {
    expect(joinImageIdCsv([])).toBe("");
  });
});

describe("buildChatImageStoragePath", () => {
  it("uses userId and filename only (no extra slash)", () => {
    expect(buildChatImageStoragePath("user-1", "f9c2.jpg")).toBe("user-1/f9c2.jpg");
  });
});

describe("chatImageSignedUrlExpirySeconds", () => {
  it("is 24 hours", () => {
    expect(chatImageSignedUrlExpirySeconds()).toBe(86_400);
  });
});
