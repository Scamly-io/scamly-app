import { isQuickScanQuery } from "@/utils/isQuickScanQuery";

describe("isQuickScanQuery", () => {
  describe("when quickscan should enable redirect", () => {
    it("should return true for the string 'true'", () => {
      expect(isQuickScanQuery("true")).toBe(true);
    });

    it("should return true for case-insensitive 'true'", () => {
      expect(isQuickScanQuery("TRUE")).toBe(true);
      expect(isQuickScanQuery("True")).toBe(true);
    });

    it("should return true when the first array value is 'true'", () => {
      expect(isQuickScanQuery(["true", "false"])).toBe(true);
    });
  });

  describe("when quickscan should not enable redirect", () => {
    it("should return false when the param is undefined", () => {
      expect(isQuickScanQuery(undefined)).toBe(false);
    });

    it("should return false for other string values", () => {
      expect(isQuickScanQuery("false")).toBe(false);
      expect(isQuickScanQuery("1")).toBe(false);
      expect(isQuickScanQuery("")).toBe(false);
      expect(isQuickScanQuery("yes")).toBe(false);
    });

    it("should return false for an empty array", () => {
      expect(isQuickScanQuery([])).toBe(false);
    });

    it("should return false when the first array element is not 'true'", () => {
      expect(isQuickScanQuery(["false", "true"])).toBe(false);
    });
  });
});
