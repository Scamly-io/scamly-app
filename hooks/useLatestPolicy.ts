import { captureDataFetchError } from "@/utils/sentry";
import { fetchLatestPolicy, type FetchedPolicy, type PolicyType } from "@/utils/policies";
import { useEffect, useState } from "react";

export function useLatestPolicy(policyType: PolicyType) {
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<FetchedPolicy | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await fetchLatestPolicy(policyType);
      if (cancelled) return;

      if (error) {
        captureDataFetchError(error, "home", `fetch_policy_${policyType}`, "warning");
        setPolicy(null);
        setLoadFailed(true);
      } else if (!data) {
        setPolicy(null);
        setLoadFailed(true);
      } else {
        setPolicy(data);
        setLoadFailed(false);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [policyType]);

  return { loading, policy, loadFailed };
}
