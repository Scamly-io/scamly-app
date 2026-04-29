import NativeMenu from "@/components/NativeMenu";
import PickerModal from "@/components/PickerModal";
import ThemedBackground from "@/components/ThemedBackground";
import { countries } from "@/constants/countries";
import { useAuth } from "@/contexts/AuthContext";
import { useSignUp } from "@/contexts/SignUpContext";
import { useTheme } from "@/theme";
import {
  getAuthenticationMethodForAnalytics,
  trackEmailPasswordSignupAccountCreated,
  trackOnboardingStepViewed,
  trackSignupAttempted,
  trackSignupCompleted,
  trackSignupFailed,
} from "@/utils/analytics";
import { formatDobInput, isoToDobDisplay, parseDob, toISODate } from "@/utils/date";
import { getPublicIp } from "@/utils/network";
import { getOAuthCollectWelcomeSeen, setOAuthCollectWelcomeSeen } from "@/utils/oauth-collect-welcome-seen";
import {
  COLLECT_PROFILE_HREF,
  getInitialCollectProfileUiStep,
  getProfileCollectStepIndex,
  type ProfileOnboardingRow,
} from "@/utils/onboarding";
import { onboardingHref } from "@/utils/onboarding-href";
import { replaceFromProfileStep } from "@/utils/profile-onboarding-nav";
import { addActionBreadcrumb, captureError } from "@/utils/sentry";
import { isEmailPasswordProfileDraft, shouldRedirectMissingEmailDraftToSignup } from "@/utils/signup-profile-draft";
import { supabase } from "@/utils/supabase";
import { genderOptions, referralSourceOptions, signUpSchema } from "@/utils/validation/auth";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Globe,
  HelpCircle,
  Megaphone,
  Sparkles,
  User as UserIcon,
  Users,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  SlideInLeft,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const COUNTRY_LIST = countries as readonly string[];
const SLIDE_MS = 260;
const TOTAL_STEPS = 5;

const GENDER_OPTION_ROWS = genderOptions.map((g) => ({ label: g, value: g }));
const REFERRAL_OPTION_ROWS = referralSourceOptions.map((g) => ({ label: g, value: g }));

const STEP_ANALYTICS = [
  "profile_name",
  "profile_dob",
  "profile_gender",
  "profile_country",
  "profile_referral",
] as const;

function collectProfileStepAnalytics(
  step: number,
  oauth: boolean,
): (typeof STEP_ANALYTICS)[number] | "profile_oauth_welcome" {
  if (oauth && step === 0) {
    return "profile_oauth_welcome";
  }
  return STEP_ANALYTICS[step] ?? "profile_name";
}

// Per-step icons
const STEP_ICONS = [UserIcon, Calendar, Users, Globe, Megaphone] as const;

function signedInWithOAuth(u: User | null): boolean {
  if (!u) {
    return false;
  }
  return u.identities?.some(({ provider }) => provider === "google" || provider === "apple") ?? false;
}

type StepBodyProps = {
  step: number;
  colors: ReturnType<typeof useTheme>["colors"];
  radius: ReturnType<typeof useTheme>["radius"];
  // name
  firstName: string;
  setFirstName: (s: string) => void;
  nameError: string | null;
  // dob
  dobText: string;
  setDobText: (s: string) => void;
  dobError: string | null;
  onDobChange: (t: string) => void;
  // gender
  gender: string;
  genderError: string | null;
  onGender: (g: string) => void;
  // country
  country: string;
  countryError: string | null;
  setCountryPickerOpen: (b: boolean) => void;
  loading: boolean;
  // referral
  referral: string;
  referralError: string | null;
  onReferral: (r: string) => void;
  /** OAuth-only: first screen = welcome + display name (same step index 0) */
  oauthWelcomeStep: boolean;
};

function StepFormFields(p: StepBodyProps) {
  const { colors, radius } = p;
  if (p.oauthWelcomeStep) {
    return (
      <View style={{ gap: 10 }}>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 20,
            fontFamily: "Poppins-SemiBold",
            color: colors.textPrimary,
          }}
          selectable
        >
          Adjust your display name
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1.5,
            borderColor: p.nameError ? colors.error : colors.border,
            borderRadius: radius.lg,
            paddingHorizontal: 16,
            minHeight: 56,
            gap: 10,
            backgroundColor: colors.backgroundSecondary,
            borderCurve: "continuous" as const,
          }}
        >
          <UserIcon size={20} color={colors.textTertiary} />
          <TextInput
            value={p.firstName}
            onChangeText={p.setFirstName}
            placeholder="First name"
            placeholderTextColor={colors.textTertiary}
            style={{
              flex: 1,
              color: colors.textPrimary,
              fontSize: 17,
              fontFamily: "Poppins-Regular",
            }}
            autoCapitalize="words"
            editable={!p.loading}
            autoFocus
          />
        </View>
        {p.nameError ? (
          <Text style={{ color: colors.error, fontSize: 13, fontFamily: "Poppins-Regular" }} selectable>
            {p.nameError}
          </Text>
        ) : null}
      </View>
    );
  }
  if (p.step === 0) {
    return (
      <View style={{ gap: 6 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1.5,
            borderColor: p.nameError ? colors.error : colors.border,
            borderRadius: radius.lg,
            paddingHorizontal: 16,
            minHeight: 56,
            gap: 10,
            backgroundColor: colors.backgroundSecondary,
            borderCurve: "continuous" as const,
          }}
        >
          <UserIcon size={20} color={colors.textTertiary} />
          <TextInput
            value={p.firstName}
            onChangeText={p.setFirstName}
            placeholder="First name"
            placeholderTextColor={colors.textTertiary}
            style={{
              flex: 1,
              color: colors.textPrimary,
              fontSize: 17,
              fontFamily: "Poppins-Regular",
            }}
            autoCapitalize="words"
            editable={!p.loading}
            autoFocus
          />
        </View>
        {p.nameError ? (
          <Text style={{ color: colors.error, fontSize: 13, fontFamily: "Poppins-Regular" }} selectable>
            {p.nameError}
          </Text>
        ) : null}
      </View>
    );
  }
  if (p.step === 1) {
    return (
      <View style={{ gap: 6 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1.5,
            borderColor: p.dobError ? colors.error : colors.border,
            borderRadius: radius.lg,
            paddingHorizontal: 16,
            minHeight: 56,
            gap: 10,
            backgroundColor: colors.backgroundSecondary,
            borderCurve: "continuous" as const,
          }}
        >
          <Calendar size={20} color={colors.textTertiary} />
          <TextInput
            value={p.dobText}
            onChangeText={p.onDobChange}
            placeholder="DD/MM/YYYY"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            maxLength={10}
            style={{
              flex: 1,
              color: colors.textPrimary,
              fontSize: 17,
              fontFamily: "Poppins-Regular",
            }}
            editable={!p.loading}
            autoFocus
          />
        </View>
        {p.dobError ? (
          <Text style={{ color: colors.error, fontSize: 13, fontFamily: "Poppins-Regular" }} selectable>
            {p.dobError}
          </Text>
        ) : null}
      </View>
    );
  }
  if (p.step === 2) {
    return (
      <View style={{ gap: 6 }}>
        <NativeMenu
          options={GENDER_OPTION_ROWS}
          onSelect={p.onGender}
          trigger={
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1.5,
                borderColor: p.genderError ? colors.error : colors.border,
                borderRadius: radius.lg,
                paddingHorizontal: 16,
                minHeight: 56,
                gap: 10,
                backgroundColor: colors.backgroundSecondary,
                borderCurve: "continuous" as const,
              }}
            >
              <Users size={20} color={colors.textTertiary} />
              <Text
                style={{
                  flex: 1,
                  color: p.gender ? colors.textPrimary : colors.textTertiary,
                  fontSize: 17,
                  fontFamily: "Poppins-Regular",
                }}
              >
                {p.gender || "Choose"}
              </Text>
              <ChevronDown size={18} color={colors.textTertiary} />
            </View>
          }
        />
        {p.genderError ? (
          <Text style={{ color: colors.error, fontSize: 13, fontFamily: "Poppins-Regular" }} selectable>
            {p.genderError}
          </Text>
        ) : null}
      </View>
    );
  }
  if (p.step === 3) {
    return (
      <View style={{ gap: 6 }}>
        <Pressable
          onPress={() => p.setCountryPickerOpen(true)}
          disabled={p.loading}
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1.5,
            borderColor: p.countryError ? colors.error : colors.border,
            borderRadius: radius.lg,
            paddingHorizontal: 16,
            minHeight: 56,
            gap: 10,
            backgroundColor: colors.backgroundSecondary,
            borderCurve: "continuous" as const,
          }}
        >
          <Globe size={20} color={colors.textTertiary} />
          <Text
            style={{
              flex: 1,
              color: p.country ? colors.textPrimary : colors.textTertiary,
              fontSize: 17,
              fontFamily: "Poppins-Regular",
            }}
          >
            {p.country || "Country"}
          </Text>
          <ChevronDown size={18} color={colors.textTertiary} />
        </Pressable>
        {p.countryError ? (
          <Text style={{ color: colors.error, fontSize: 13, fontFamily: "Poppins-Regular" }} selectable>
            {p.countryError}
          </Text>
        ) : null}
      </View>
    );
  }
  // referral
  return (
    <View style={{ gap: 6 }}>
      <NativeMenu
        options={REFERRAL_OPTION_ROWS}
        onSelect={p.onReferral}
        trigger={
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1.5,
              borderColor: p.referralError ? colors.error : colors.border,
              borderRadius: radius.lg,
              paddingHorizontal: 16,
              minHeight: 56,
              gap: 10,
              backgroundColor: colors.backgroundSecondary,
              borderCurve: "continuous" as const,
            }}
          >
            <Megaphone size={20} color={colors.textTertiary} />
            <Text
              style={{
                flex: 1,
                color: p.referral ? colors.textPrimary : colors.textTertiary,
                fontSize: 17,
                fontFamily: "Poppins-Regular",
              }}
            >
              {p.referral || "How did you hear about us?"}
            </Text>
            <ChevronDown size={18} color={colors.textTertiary} />
          </View>
        }
      />
      {p.referralError ? (
        <Text style={{ color: colors.error, fontSize: 13, fontFamily: "Poppins-Regular" }} selectable>
          {p.referralError}
        </Text>
      ) : null}
    </View>
  );
}

export default function OnboardingCollectProfile() {
  const { colors, radius, shadows, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const footerPadBottom = Math.max(insets.bottom, 10);
  const { user, refreshAuth } = useAuth();
  const { signUpData, resetSignUpData } = useSignUp();
  const router = useRouter();
  const isDraft = isEmailPasswordProfileDraft(signUpData);
  const authForStep = isDraft ? "email" : getAuthenticationMethodForAnalytics(user);

  const [step, setStep] = useState(0);
  const [loadDone, setLoadDone] = useState(false);
  const navDir = useRef<"forward" | "back">("forward");
  // Tracks whether the user has navigated at least once; suppresses the
  // entering animation on first mount so elements don't animate into view.
  const hasNavigated = useRef(false);
  const nextInFlight = useRef(false);
  const accountCreatedRef = useRef(false);
  const oauth = Boolean(user && signedInWithOAuth(user));

  /** OAuth has no prior in-app sign-up; back on step 0 would drop users on sign-in and break the flow. */
  const showBackButton = !(oauth && step === 0);

  // Button press animations
  const backScale = useSharedValue(1);
  const nextScale = useSharedValue(1);
  const backAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: backScale.value }] }));
  const nextAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: nextScale.value }] }));

  const [firstName, setFirstName] = useState("");
  const [dobText, setDobText] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [referral, setReferral] = useState("");

  const [nameError, setNameError] = useState<string | null>(null);
  const [dobError, setDobError] = useState<string | null>(null);
  const [genderError, setGenderError] = useState<string | null>(null);
  const [countryError, setCountryError] = useState<string | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);

  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const clearAllErrors = useCallback(() => {
    setNameError(null);
    setDobError(null);
    setGenderError(null);
    setCountryError(null);
    setReferralError(null);
  }, []);

  const onDobTextChange = useCallback(
    (t: string) => {
      setDobText((prev) => formatDobInput(t, prev));
      if (dobError) {
        setDobError(null);
      }
    },
    [dobError],
  );

  useEffect(() => {
    if (!loadDone) {
      return;
    }
    trackOnboardingStepViewed(collectProfileStepAnalytics(step, oauth), { auth_method: authForStep });
  }, [loadDone, step, authForStep, oauth]);

  // Session users: load profile and initial step only when `user.id` changes.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: qErr } = await supabase
        .from("profiles")
        .select("first_name, dob, gender, country, referral_source")
        .eq("id", userId)
        .single();
      if (cancelled) {
        return;
      }
      if (qErr) {
        captureError(qErr, { feature: "onboarding", action: "load_collect_profile", severity: "warning" });
      }
      const p = (data ?? {}) as Partial<ProfileOnboardingRow>;
      if (p.first_name) {
        setFirstName(String(p.first_name));
      }
      if (p.dob) {
        setDobText(isoToDobDisplay(p.dob));
      }
      if (p.gender) {
        setGender(String(p.gender));
      }
      if (p.country) {
        setCountry(String(p.country));
      }
      if (p.referral_source) {
        setReferral(String(p.referral_source));
      }
      const dataStep = getProfileCollectStepIndex({
        first_name: p.first_name ?? null,
        dob: p.dob ?? null,
        gender: p.gender ?? null,
        country: p.country ?? null,
        referral_source: p.referral_source ?? null,
      });
      const fnTrim = String(p.first_name ?? "").trim();
      const oauthUser = Boolean(user && signedInWithOAuth(user));
      const welcomeSeen = oauthUser ? await getOAuthCollectWelcomeSeen(userId) : true;
      const initialStep = getInitialCollectProfileUiStep({
        dataStep,
        oauth: oauthUser,
        firstNameTrim: fnTrim,
        oauthWelcomeSeen: welcomeSeen,
      });
      setStep(initialStep);
      setLoadDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Email draft: pre-fill from SignUpContext (no user id).
  useEffect(() => {
    if (userId) {
      return;
    }
    if (isDraft) {
      if (signUpData.firstName) {
        setFirstName(signUpData.firstName);
      }
      if (signUpData.dob) {
        setDobText(signUpData.dob);
      }
      if (signUpData.gender) {
        setGender(signUpData.gender);
      }
      if (signUpData.country) {
        setCountry(signUpData.country);
      }
      if (signUpData.referralSource) {
        setReferral(signUpData.referralSource);
      }
      setLoadDone(true);
      return;
    }
    if (shouldRedirectMissingEmailDraftToSignup({ userId, isDraft, accountCreated: accountCreatedRef.current })) {
      router.replace(onboardingHref("/signup"));
    }
  }, [userId, isDraft, signUpData, router]);

  const onGenderSelect = useCallback((v: string) => {
    setGender(v);
    setGenderError(null);
  }, []);

  const onReferralSelect = useCallback((v: string) => {
    setReferral(v);
    setReferralError(null);
  }, []);

  const goBack = () => {
    if (oauth && step === 0) {
      return;
    }
    if (step <= 0) {
      replaceFromProfileStep(router, COLLECT_PROFILE_HREF, signUpData);
      return;
    }
    hasNavigated.current = true;
    navDir.current = "back";
    setStep((s) => s - 1);
    clearAllErrors();
  };

  const goNext = async () => {
    if (nextInFlight.current) {
      return;
    }
    nextInFlight.current = true;
    try {
      if (step === 0 && oauth) {
        if (!user) {
          return;
        }
        const t = firstName.trim();
        if (!t) {
          setNameError("Please enter a display name");
          return;
        }
        if (t.length > 50) {
          setNameError("That name is a little long");
          return;
        }
        setNameError(null);
        await setOAuthCollectWelcomeSeen(user.id);
        hasNavigated.current = true;
        navDir.current = "forward";
        setStep(1);
        clearAllErrors();
        return;
      }
      if (step === 0) {
        const t = firstName.trim();
        if (!t) {
          setNameError("Please enter your first name");
          return;
        }
        if (t.length > 50) {
          setNameError("That name is a little long");
          return;
        }
        setNameError(null);
        if (!isDraft && !user) {
          return;
        }
      } else if (step === 1) {
        const d = dobText.trim();
        if (d.length === 0) {
          setDobError(null);
        } else {
          if (d.length < 10) {
            setDobError("Please enter a full date (DD/MM/YYYY)");
            return;
          }
          const parsed = parseDob(d);
          if (!parsed) {
            setDobError("That date doesn't look right");
            return;
          }
          if (parsed > new Date()) {
            setDobError("Date of birth can't be in the future");
            return;
          }
          setDobError(null);
        }
      } else if (step === 2) {
        setGenderError(null);
      } else if (step === 3) {
        if (!country.trim()) {
          setCountryError("Please select your country");
          return;
        }
        setCountryError(null);
      } else if (step === 4) {
        if (!referral.trim()) {
          setReferralError("Please select one option");
          return;
        }
        setReferralError(null);

        if (isDraft) {
          const tName = firstName.trim();
          const genderValue = gender.trim() || "Prefer not to say";
          const c = country.trim();
          const r = referral.trim();
          const dRaw = dobText.trim();
          let parsedDob: Date | null = null;
          if (dRaw.length > 0) {
            if (dRaw.length < 10) {
              setDobError("Please enter a full date (DD/MM/YYYY)");
              return;
            }
            parsedDob = parseDob(dRaw) ?? null;
            if (!parsedDob) {
              setDobError("That date doesn't look right");
              return;
            }
            if (parsedDob > new Date()) {
              setDobError("Date of birth can't be in the future");
              return;
            }
          }
          const dobIso = parsedDob ? toISODate(parsedDob) : undefined;
          const formData = {
            email: signUpData.email,
            password: signUpData.password,
            firstName: tName,
            country: c,
            referralSource: r,
            ...(dobIso ? { dob: dobIso } : {}),
            ...(genderValue ? { gender: genderValue } : {}),
          };
          const parsed = signUpSchema.safeParse(formData);
          if (!parsed.success) {
            const first = parsed.error.issues[0];
            setReferralError(first?.message ?? "Please check your details");
            return;
          }

          setLoading(true);
          trackSignupAttempted(r, c);
          addActionBreadcrumb("email_signup_single_payload", "signup");

          const ip = await getPublicIp();
          const profileData: {
            first_name: string;
            country: string;
            referral_source: string;
            onboarding_completed: boolean;
            app_tutorial_completed: boolean;
            dob?: string;
            gender?: string;
            ip_address?: string;
          } = {
            first_name: tName,
            country: c,
            referral_source: r,
            onboarding_completed: true,
            app_tutorial_completed: false,
            gender: genderValue,
          };
          if (dobIso) {
            profileData.dob = dobIso;
          }
          if (ip) {
            profileData.ip_address = ip;
          }

          const { error: signErr } = await supabase.auth.signUp({
            email: signUpData.email,
            password: signUpData.password,
            options: {
              emailRedirectTo: "https://scamly.io/portal",
              data: profileData,
            },
          });

          if (signErr) {
            Alert.alert("Error", signErr.message);
            trackSignupFailed(signErr.message);
            setLoading(false);
            return;
          }

          trackEmailPasswordSignupAccountCreated();
          trackSignupCompleted(r, c);
          addActionBreadcrumb("signup_account_created", "signup");
          accountCreatedRef.current = true;
          resetSignUpData();
          setLoading(false);
          // `replace` from a nested onboarding screen can leave the (auth) stack on /signup.
          router.dismissTo(onboardingHref("/signup-confirm"));
          return;
        }

        if (!user) {
          return;
        }

        const tName = firstName.trim();
        if (!tName) {
          setNameError("Please add your name");
          return;
        }
        if (tName.length > 50) {
          setNameError("That name is a little long");
          return;
        }
        if (!country.trim()) {
          setCountryError("Please select your country");
          return;
        }
        const genderValue = gender.trim() || "Prefer not to say";
        const dRaw = dobText.trim();
        let dobValue: string | null = null;
        if (dRaw.length > 0) {
          if (dRaw.length < 10) {
            setDobError("Please enter a full date (DD/MM/YYYY)");
            setStep(1);
            return;
          }
          const p = parseDob(dRaw);
          if (!p) {
            setDobError("That date doesn't look right");
            setStep(1);
            return;
          }
          if (p > new Date()) {
            setDobError("Date of birth can't be in the future");
            setStep(1);
            return;
          }
          dobValue = toISODate(p);
        }

        setLoading(true);
        const ip = await getPublicIp();
        const { error: uErr } = await supabase
          .from("profiles")
          .update({
            first_name: tName,
            gender: genderValue,
            country: country.trim(),
            referral_source: referral.trim(),
            onboarding_completed: true,
            ...(dobValue != null ? { dob: dobValue } : { dob: null }),
            ...(ip ? { ip_address: ip } : {}),
          })
          .eq("id", user.id);
        if (uErr) {
          captureError(uErr, { feature: "onboarding", action: "save_profile_complete", severity: "critical" });
          setReferralError("Couldn't save. Try again.");
          setLoading(false);
          return;
        }

        if (signedInWithOAuth(user)) {
          const { error: welcomeErr } = await supabase.functions.invoke("send-customer-email", {
            body: { userId: user.id, type: "welcome" },
          });
          if (welcomeErr) {
            captureError(welcomeErr, { feature: "onboarding", action: "send_welcome_email", severity: "warning" });
          }
        }

        await refreshAuth();
        setLoading(false);
        router.replace(onboardingHref("/onboarding"));
        return;
      }

      if (step < 4) {
        hasNavigated.current = true;
        navDir.current = "forward";
        setStep((s) => s + 1);
        clearAllErrors();
      }
    } finally {
      nextInFlight.current = false;
    }
  };

  // Swipe handlers kept in refs so PanResponder captures the latest version.
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;
  const goBackRef = useRef(goBack);
  goBackRef.current = goBack;

  const panResponder = useRef(
    PanResponder.create({
      // Only claim the gesture when horizontal movement is dominant.
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 12 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -50) {
          goNextRef.current();
        } else if (gs.dx > 50) {
          goBackRef.current();
        }
      },
    }),
  ).current;

  const TITLES: [string, string][] = [
    ["What should we call you?", "We'll use this to make the app feel a little more like yours."],
    [
      "When were you born?",
      "Optional — helps us tune the experience for your age. We never use this to sell anything.",
    ],
    [
      "How do you identify?",
      "Optional — helps us show more relevant content. Change this anytime in settings.",
    ],
    ["Where are you based?", "Helps us surface scam patterns that are common in your region."],
    [
      "One last thing",
      "We're curious how people discover Scamly. Your answer really helps us.",
    ],
  ];
  const isOauthFirstScreen = oauth && step === 0;
  const [title, subtitle] = (() => {
    if (isOauthFirstScreen) {
      const name = firstName.trim();
      return [
        name ? `Welcome, ${name}!` : "Welcome!",
        "We need a few quick details to continue. This helps us keep Scamly relevant and secure for you.",
      ] as const;
    }
    return TITLES[step] ?? TITLES[0];
  })();

  const currentDisabled =
    (step === 0 && !firstName.trim()) ||
    (step === 3 && !country.trim()) ||
    (step === 4 && !referral.trim());

  if (!loadDone) {
    return null;
  }

  const isForward = navDir.current === "forward";
  // No entering animation on the very first render — elements don't animate into view.
  // After the first explicit navigation (hasNavigated=true), slides are enabled.
  const entering = hasNavigated.current
    ? isForward
      ? SlideInRight.duration(SLIDE_MS)
      : SlideInLeft.duration(SLIDE_MS)
    : undefined;

  const StepIcon = isOauthFirstScreen ? Sparkles : (STEP_ICONS[step] ?? UserIcon);

  return (
    <>
      <PickerModal
        visible={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        title="Country"
        options={COUNTRY_LIST}
        onSelect={(v) => {
          setCountry(v);
          if (countryError) {
            setCountryError(null);
          }
        }}
        searchable
      />

      {/* "Why we ask" info modal (step 3 – country) */}
      <Modal visible={infoOpen} transparent animationType="fade" onRequestClose={() => setInfoOpen(false)}>
        <View style={styles.infoOverlay}>
          <View style={[styles.infoBox, { backgroundColor: colors.surface, borderRadius: radius["2xl"] }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontFamily: "Poppins-SemiBold", color: colors.textPrimary }} selectable>
                Why we ask
              </Text>
              <Text onPress={() => setInfoOpen(false)} accessibilityRole="button">
                <X size={22} color={colors.textSecondary} />
              </Text>
            </View>
            <Text
              style={{ marginTop: 10, lineHeight: 22, color: colors.textPrimary, fontFamily: "Poppins-Regular" }}
              selectable
            >
              We use your country to align safety tips, regulatory context, and scan analysis with where you live.
            </Text>
            <Text
              onPress={() => setInfoOpen(false)}
              style={{ marginTop: 16, color: colors.accent, fontFamily: "Poppins-SemiBold" }}
            >
              Got it
            </Text>
          </View>
        </View>
      </Modal>

      <ThemedBackground>
        <SafeAreaView style={{ flex: 1, width: "100%" }} edges={["top", "left", "right"]}>

          {/* ── Progress indicators ── */}
          <View style={styles.progressRow}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  {
                    backgroundColor: i <= step ? colors.accent : colors.border,
                    opacity: i < step ? 0.5 : 1,
                  },
                ]}
              />
            ))}
          </View>

          {/* ── Swipeable step content ── */}
          <View
            style={{ flex: 1, minHeight: 0, width: "100%", overflow: "hidden" }}
            {...panResponder.panHandlers}
            collapsable={false}
          >
            <Animated.View
              key={step}
              entering={entering}
              style={{ flex: 1, overflow: "visible" }}
            >
              <ScrollView
                key={`scroll-${step}`}
                contentContainerStyle={styles.scrollContent}
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Step icon */}
                <View
                  style={[
                    styles.stepIconWrap,
                    { backgroundColor: colors.accentMuted, borderRadius: radius.xl },
                  ]}
                >
                  <StepIcon size={28} color={colors.accent} />
                </View>

                {/* Title row — country step adds a "why we ask" hint */}
                <View style={styles.titleRow}>
                  <Text
                    style={[styles.title, { color: colors.textPrimary }]}
                    selectable
                  >
                    {title}
                  </Text>
                  {step === 3 ? (
                    <Pressable
                      onPress={() => setInfoOpen(true)}
                      accessibilityLabel="Why we ask for your country"
                      style={{ padding: 4, marginTop: 2 }}
                    >
                      <HelpCircle size={18} color={colors.textTertiary} />
                    </Pressable>
                  ) : null}
                </View>

                <Text
                  style={[styles.subtitle, { color: colors.textSecondary }]}
                  selectable
                >
                  {subtitle}
                </Text>

                {/* Form field */}
                <View
                  style={[
                    styles.fieldCard,
                    {
                      backgroundColor: colors.surface,
                      borderRadius: radius["2xl"],
                      ...shadows.lg,
                    },
                  ]}
                >
                  <StepFormFields
                    oauthWelcomeStep={isOauthFirstScreen}
                    step={step}
                    colors={colors}
                    radius={radius}
                    firstName={firstName}
                    setFirstName={(t) => {
                      setFirstName(t);
                      if (nameError) {
                        setNameError(null);
                      }
                    }}
                    nameError={nameError}
                    dobText={dobText}
                    setDobText={setDobText}
                    dobError={dobError}
                    onDobChange={onDobTextChange}
                    gender={gender}
                    genderError={genderError}
                    onGender={onGenderSelect}
                    country={country}
                    countryError={countryError}
                    setCountryPickerOpen={setCountryPickerOpen}
                    loading={loading}
                    referral={referral}
                    referralError={referralError}
                    onReferral={onReferralSelect}
                  />
                </View>
              </ScrollView>
            </Animated.View>
          </View>

          {/* ── Footer: back circle + next pill (right-aligned) ── */}
          <View
            style={[
              styles.footer,
              {
                paddingBottom: footerPadBottom,
              },
            ]}
          >
            <View
              style={[styles.footerBackSlot, !showBackButton && { width: 0, overflow: "hidden" }]}
            >
              {showBackButton ? (
                <Animated.View style={backAnimStyle}>
                  <Pressable
                    onPress={goBack}
                    onPressIn={() => {
                      backScale.value = withSpring(0.88, { damping: 12, stiffness: 300 });
                    }}
                    onPressOut={() => {
                      backScale.value = withSpring(1, { damping: 12, stiffness: 300 });
                    }}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    style={[
                      styles.circleBack,
                      {
                        opacity: loading ? 0.6 : 1,
                        backgroundColor: colors.surface,
                        borderWidth: isDark ? 1 : 0,
                        borderColor: colors.border,
                        ...shadows.md,
                      },
                    ]}
                  >
                    <ArrowLeft size={20} color={colors.textPrimary} />
                  </Pressable>
                </Animated.View>
              ) : null}
            </View>
            <View style={styles.footerNextSlot}>
              <Animated.View style={nextAnimStyle}>
                <Pressable
                  onPress={goNext}
                  onPressIn={() => {
                    nextScale.value = withSpring(0.94, { damping: 12, stiffness: 300 });
                  }}
                  onPressOut={() => {
                    nextScale.value = withSpring(1, { damping: 12, stiffness: 300 });
                  }}
                  disabled={currentDisabled || loading}
                  accessibilityRole="button"
                  accessibilityLabel={
                    step === 4 && isDraft
                      ? "Create account"
                      : step === 4
                        ? "Finish"
                        : isOauthFirstScreen
                          ? "Continue"
                          : "Next"
                  }
                  style={[
                    styles.pillNext,
                    {
                      maxWidth: "100%",
                      opacity: currentDisabled || loading ? 0.6 : 1,
                      backgroundColor: colors.accent,
                      borderRadius: radius.full,
                      // Accent-coloured glow — overrides the neutral shadow from theme
                      boxShadow: `0px 4px 20px ${
                        isDark ? "rgba(167, 139, 250, 0.5)" : "rgba(124, 92, 252, 0.4)"
                      }`,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <Text
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                      style={[styles.pillNextText, { color: colors.textInverse }]}
                    >
                      {step === 4 && isDraft
                        ? "Create account"
                        : step === 4
                          ? "Finish"
                          : isOauthFirstScreen
                            ? "Continue"
                            : "Next"}
                    </Text>
                  )}
                </Pressable>
              </Animated.View>
            </View>
          </View>

        </SafeAreaView>
      </ThemedBackground>
    </>
  );
}

const styles = StyleSheet.create({
  // Progress bar
  progressRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },

  // Scrollable step content
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 16,
  },

  // Per-step icon container
  stepIconWrap: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  // Title + optional help icon side by side
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 26,
    fontFamily: "Poppins-Bold",
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    lineHeight: 23,
    marginTop: -4,
  },
  fieldCard: {
    padding: 20,
    marginTop: 4,
  },

  // Footer
  footer: {
    flexDirection: "row",
    flexShrink: 0,
    alignSelf: "stretch",
    width: "100%",
    maxWidth: "100%",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  footerBackSlot: {
    width: 52,
    flexShrink: 0,
    alignItems: "center",
  },
  footerNextSlot: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
  },

  // Circular back button
  circleBack: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },

  // Glowing pill next button
  pillNext: {
    paddingVertical: 24,
    paddingHorizontal: 46,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  },
  pillNextText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 17,
  },

  // "Why we ask" modal
  infoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  infoBox: { padding: 22 },
});
