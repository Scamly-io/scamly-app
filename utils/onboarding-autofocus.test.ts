import fs from "node:fs";
import path from "node:path";

describe("onboarding input focus behavior", () => {
  it("does not auto-focus profile fields on screen load", () => {
    const sourcePath = path.join(
      process.cwd(),
      "app/(auth)/onboarding/collect-profile.tsx",
    );
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toMatch(/\bautoFocus\b/);
  });
});
