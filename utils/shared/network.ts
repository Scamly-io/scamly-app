export async function getPublicIp(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(5000),
    });
    const { ip } = await res.json();
    return typeof ip === "string" ? ip : null;
  } catch {
    return null;
  }
}
