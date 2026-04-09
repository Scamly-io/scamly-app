import { fetchLatestPolicy, parsePolicyContent } from "@/utils/policies";
import { supabase } from "@/utils/supabase";

jest.mock("@/utils/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

function mockPoliciesQuery(result: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const limit = jest.fn(() => ({ maybeSingle }));
  const order = jest.fn(() => ({ limit }));
  const eq = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ eq }));
  (supabase.from as jest.Mock).mockReturnValue({ select });
}

describe("parsePolicyContent", () => {
  it("should return null for non-array input", () => {
    expect(parsePolicyContent(null)).toBeNull();
    expect(parsePolicyContent({})).toBeNull();
  });

  it("should accept valid policy sections and floor levels", () => {
    const raw = [
      {
        title: "Intro",
        sections: [
          { level: 1.9, text: "A" },
          { level: -2, text: "B" },
        ],
      },
    ];
    const parsed = parsePolicyContent(raw);
    expect(parsed).toEqual([
      {
        title: "Intro",
        sections: [
          { level: 1, text: "A" },
          { level: 0, text: "B" },
        ],
      },
    ]);
  });

  it("should return null when a section row is malformed", () => {
    expect(
      parsePolicyContent([{ title: "T", sections: [{ level: "x", text: "a" }] }]),
    ).toBeNull();
    expect(parsePolicyContent([{ title: 1, sections: [] }])).toBeNull();
  });
});

describe("fetchLatestPolicy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return error from Supabase unchanged", async () => {
    const dbError = { message: "boom" };
    mockPoliciesQuery({ data: null, error: dbError });

    const out = await fetchLatestPolicy("privacy");

    expect(out.data).toBeNull();
    expect(out.error).toBe(dbError);
    expect(supabase.from).toHaveBeenCalledWith("policies");
  });

  it("should return null data when content is missing", async () => {
    mockPoliciesQuery({ data: { content: null, version: "1" }, error: null });

    const out = await fetchLatestPolicy("terms");

    expect(out.data).toBeNull();
    expect(out.error).toBeNull();
  });

  it("should return structured error when JSON shape is invalid", async () => {
    mockPoliciesQuery({
      data: { content: { not: "array" }, version: "2" },
      error: null,
    });

    const out = await fetchLatestPolicy("privacy");

    expect(out.data).toBeNull();
    expect(out.error).toBeInstanceOf(Error);
    expect(String((out.error as Error).message)).toContain("Invalid policy content");
  });

  it("should normalize non-string version to string", async () => {
    mockPoliciesQuery({
      data: {
        content: [{ title: "A", sections: [{ level: 0, text: "x" }] }],
        version: 10,
      },
      error: null,
    });

    const out = await fetchLatestPolicy("terms");

    expect(out.error).toBeNull();
    expect(out.data).toEqual({
      content: [{ title: "A", sections: [{ level: 0, text: "x" }] }],
      version: "10",
    });
  });
});
