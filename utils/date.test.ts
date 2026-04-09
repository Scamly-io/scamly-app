import {
  formatDobInput,
  isoToDobDisplay,
  parseDob,
  toISODate,
} from "@/utils/date";

describe("formatDobInput", () => {
  it("should strip non-digits and cap at 8 digits with slashes", () => {
    expect(formatDobInput("12ab34cd1990", "")).toBe("12/34/1990");
  });

  it("should return empty string when no digits", () => {
    expect(formatDobInput("abc", "")).toBe("");
  });

  it("should cap formatted output at eight digits (DD/MM/YYYY)", () => {
    expect(formatDobInput("123456789012", "")).toBe("12/34/5678");
  });
});

describe("parseDob", () => {
  it("should parse a valid calendar date", () => {
    const d = parseDob("15/03/1990");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(1990);
    expect(d!.getMonth()).toBe(2);
    expect(d!.getDate()).toBe(15);
  });

  it("should return null for invalid format", () => {
    expect(parseDob("1990-03-15")).toBeNull();
    expect(parseDob("1/03/1990")).toBeNull();
    expect(parseDob("")).toBeNull();
  });

  it("should return null for impossible dates", () => {
    expect(parseDob("31/02/2020")).toBeNull();
    expect(parseDob("00/01/2020")).toBeNull();
    expect(parseDob("01/13/2020")).toBeNull();
  });
});

describe("toISODate", () => {
  it("should format local date as YYYY-MM-DD", () => {
    const d = new Date(2024, 0, 5);
    expect(toISODate(d)).toBe("2024-01-05");
  });
});

describe("isoToDobDisplay", () => {
  it("should convert ISO date to DD/MM/YYYY", () => {
    expect(isoToDobDisplay("2024-01-05")).toBe("05/01/2024");
  });

  it("should return empty string for non-ISO input", () => {
    expect(isoToDobDisplay("05/01/2024")).toBe("");
    expect(isoToDobDisplay("")).toBe("");
  });
});
