import fs from "node:fs";
import path from "node:path";

describe("chat premium upsell cta layout", () => {
  it("uses centered button styling instead of full-width paywall cta", () => {
    const sourcePath = path.join(
      process.cwd(),
      "app/(tabs)/chat/_components/chat-interface.tsx",
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).toContain("Upgrade to Premium");
    expect(source).not.toContain("fullWidth");
    expect(source).toContain("style={styles.paywallButton}");
  });
});
