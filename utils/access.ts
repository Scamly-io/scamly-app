import { supabase } from "@/utils/supabase";

/**
 * Returns whether the currently signed-in user has a premium subscription.
 * Falls back to `false` on any auth/profile lookup issues.
 */
export async function getIsPremium(): Promise<boolean> {
  const { data: userResp, error: userError } = await supabase.auth.getUser();
  const user = userResp?.user;

  if (userError || !user) return false;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_plan")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return false;

  // subscription_plan is expected to be one of: "free", "premium-monthly", "premium-yearly"
  return profile.subscription_plan !== "free";
}


