import { useQuickScanRedirect } from "@/hooks/useQuickScanRedirect";
import { router } from "expo-router";
import { renderHook } from "@testing-library/react-native";

jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
  },
}));

const replace = router.replace as jest.MockedFunction<typeof router.replace>;

describe("useQuickScanRedirect", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("router.replace to clipboard scan", () => {
    it("should call router.replace with /scan/clipboard when quickscan is 'true'", () => {
      renderHook(() => useQuickScanRedirect("true"));

      expect(replace).toHaveBeenCalledTimes(1);
      expect(replace).toHaveBeenCalledWith("/scan/clipboard");
    });

    it("should call router.replace when quickscan is an array whose first value is 'true'", () => {
      renderHook(() => useQuickScanRedirect(["true"]));

      expect(replace).toHaveBeenCalledTimes(1);
      expect(replace).toHaveBeenCalledWith("/scan/clipboard");
    });
  });

  describe("when redirect should not run", () => {
    it("should not call router.replace when quickscan is undefined", () => {
      renderHook(() => useQuickScanRedirect(undefined));

      expect(replace).not.toHaveBeenCalled();
    });

    it("should not call router.replace when quickscan is 'false'", () => {
      renderHook(() => useQuickScanRedirect("false"));

      expect(replace).not.toHaveBeenCalled();
    });
  });

  describe("when quickscan changes across renders", () => {
    it("should call replace only after the param becomes true", () => {
      const { rerender } = renderHook(
        (q: string | undefined) => useQuickScanRedirect(q),
        { initialProps: undefined as string | undefined }
      );

      expect(replace).not.toHaveBeenCalled();

      rerender("true");

      expect(replace).toHaveBeenCalledTimes(1);
      expect(replace).toHaveBeenCalledWith("/scan/clipboard");
    });

    it("should not call replace again when quickscan stays true", () => {
      const { rerender } = renderHook(
        (q: string | undefined) => useQuickScanRedirect(q),
        { initialProps: "true" as string | undefined }
      );

      expect(replace).toHaveBeenCalledTimes(1);

      rerender("true");

      expect(replace).toHaveBeenCalledTimes(1);
    });
  });
});
