import fs from "node:fs";
import path from "node:path";

describe("onboarding scan tutorial completion actions", () => {
  it("shows a view results prompt instead of rescan controls", () => {
    const sourcePath = path.join(
      process.cwd(),
      "components/onboarding/first-onboarding-scan-panel.tsx",
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("Clear Results");
    expect(source).not.toContain("Rescan");
    expect(source).toContain("View Results");
  });
});
