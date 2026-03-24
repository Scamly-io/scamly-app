import { supabase } from "@/utils/supabase";

export type PolicyPoint = {
  level: number;
  text: string;
};

export type PolicyContentSection = {
  title: string;
  sections: PolicyPoint[];
};

export type PolicyContent = PolicyContentSection[];

export type PolicyType = "privacy" | "terms";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates and returns policy JSON from the `policies.content` JSONB column.
 * Expected shape: array of { title: string, sections: { level: number, text: string }[] }.
 */
export function parsePolicyContent(raw: unknown): PolicyContent | null {
  if (!Array.isArray(raw)) return null;

  const out: PolicyContent = [];

  for (const item of raw) {
    if (!isRecord(item)) return null;
    if (typeof item.title !== "string") return null;
    if (!Array.isArray(item.sections)) return null;

    const points: PolicyPoint[] = [];
    for (const p of item.sections) {
      if (!isRecord(p)) return null;
      if (typeof p.level !== "number" || !Number.isFinite(p.level)) return null;
      if (typeof p.text !== "string") return null;
      points.push({ level: Math.max(0, Math.floor(p.level)), text: p.text });
    }

    out.push({ title: item.title, sections: points });
  }

  return out;
}

export type FetchedPolicy = {
  content: PolicyContent;
  version: string;
};

export type FetchLatestPolicyResult = {
  data: FetchedPolicy | null;
  error: unknown;
};

/**
 * Loads the newest row for the given policy type. Rows are ordered by `version`
 * descending (string sort); use a sortable version format in the database (e.g. semver or ISO dates).
 */
export async function fetchLatestPolicy(
  policyType: PolicyType
): Promise<FetchLatestPolicyResult> {
  const { data, error } = await supabase
    .from("policies")
    .select("content, version")
    .eq("policy_type", policyType)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (data?.content == null) {
    return { data: null, error: null };
  }

  const content = parsePolicyContent(data.content);
  if (!content) {
    return {
      data: null,
      error: new Error(`Invalid policy content shape for policy_type=${policyType}`),
    };
  }

  return {
    data: {
      content,
      version: typeof data.version === "string" ? data.version : String(data.version ?? ""),
    },
    error: null,
  };
}
