/**
 * Auth — elegant sign-in / register.
 *
 * Registration now returns { needsEmailVerification }: when the platform
 * requires email confirmation, the user gets a "Verify your email" popup
 * and cannot log in until they do. The same flow runs in demo mode.
 * Login shows a branded processing popup while the session is restored.
 */

import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { Button, Input } from "@/components/ui";
import { colors, font, MAX_CONTENT_WIDTH, radius, spacing } from "@/constants/theme";
import { dataMode } from "@/lib/api";
import { api } from "@/lib/api";
import { ProcessingOverlay } from "@/components/ProcessingOverlay";
import { VerifyEmailPopup } from "@/components/VerifyEmailPopup";
import { useAuth } from "@/providers/AuthProvider";

type Mode = "register" | "login";

export default function AuthScreen() {
  const router = useRouter();
  const { register, login, confirmEmail } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedPopup, setVerifiedPopup] = useState(false);

  const isRegister = mode === "register";
  const canSubmit =
    email.includes("@") &&
    password.length >= 6 &&
    (!isRegister || handle.trim().length >= 3);

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (isRegister) {
        const result = await register(handle, email, password);
        if (result.needsEmailVerification) {
          // Registration succeeded, but the inbox must be verified first.
          setVerifiedPopup(true);
          setMode("login");
          return;
        }
      } else {
        await login(email, password);
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something choke. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.gradient}>
        {/* Decorative brand stripe + accent band for the same premium feel */}
        <View style={styles.accentBar} />
        <View style={styles.gradientContent}>
          <View style={styles.gradientHeader}>
            <View style={styles.logoRow}>
              <View style={styles.logoDot}>
                <Text style={styles.logoGlyph}>G</Text>
              </View>
              <Text style={styles.appName}>GIST</Text>
            </View>
            <Text style={styles.tagline}>
              Anonymous community engagement for Naija 🇳🇬
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.card}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.headline}>
              {isRegister ? "Join the gist 🔥" : "Welcome back 👋"}
            </Text>
            <Text style={styles.subhead}>
              {isRegister
                ? "One account, infinite anonymity. Register to post, like and reply."
                : "Sign in to keep reading — and to drop your own gist."}
            </Text>

            {error ? <ErrorText>{error}</ErrorText> : null}

            {isRegister ? (
              <>
                <Label>Handle</Label>
                <Input
                  value={handle}
                  onChangeText={setHandle}
                  placeholder="e.g. lagos_gist_girl"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  editable={!busy}
                />
                <Hint>
                  Your public identity — never shown on anonymous posts.
                </Hint>
              </>
            ) : null}

            <Label>Email</Label>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              editable={!busy}
            />

            <Label>Password</Label>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Minimum 6 characters"
              secureTextEntry
              editable={!busy}
            />

            <Button
              label={isRegister ? "Create account" : "Sign in"}
              onPress={submit}
              disabled={!canSubmit}
              loading={busy}
              style={styles.submit}
            />

            <Button
              label={isRegister ? "Already have an account" : "Register a new one"}
              variant="ghost"
              onPress={() => {
                setMode(isRegister ? "login" : "register");
                setError(null);
              }}
              style={styles.switch}
            />

            {dataMode === "demo" ? (
              <Text style={styles.demoRow}>
                <Text style={styles.demoText}>Demo mode:</Text>
                <Button
                  label="Verify my email"
                  variant="ghost"
                  small
                  onPress={() => {
                    confirmEmail(email);
                    setVerifiedPopup(true);
                  }}
                />
                <Text style={styles.demoNote}>
                  marks your account verified so you can log in.
                </Text>
              </Text>
            ) : null}

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Read everything free. Post anonymously if you like.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>

      <ProcessingOverlay
        visible={busy}
        title={isRegister ? "Creating your account…" : "Signing in…"}
        subtitle={isRegister ? "We're setting up your gist profile." : "Your session is being restored."}
      />

      <VerifyEmailPopup
        visible={verifiedPopup}
        email={email}
        onVerified={() => setVerifiedPopup(false)}
      />
    </KeyboardAvoidingView>
  );
}

const ErrorText = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.error}>{children}</Text>
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.label}>{children}</Text>
);

const Hint = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.hint}>{children}</Text>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: {
    flex: 1,
    backgroundColor: colors.green,
  },
  accentBar: {
    height: 8,
    backgroundColor: colors.accent,
  },
  gradientContent: {
    flex: 1,
    padding: spacing.xl,
  },
  gradientHeader: {
    alignItems: "center",
    paddingBottom: spacing.xl,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logoDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlyph: {
    fontSize: font.sizes.xl,
    fontWeight: "900",
    color: colors.accent,
  },
  appName: {
    fontSize: font.sizes.xl,
    fontWeight: "900",
    color: colors.white,
    letterSpacing: 2,
    marginTop: 4,
  },
  tagline: {
    fontSize: font.sizes.sm,
    color: colors.mist,
    marginTop: spacing.xs,
  },
  card: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
    paddingBottom: spacing.xl,
  },
  headline: {
    fontSize: font.sizes.xxl,
    fontWeight: "900",
    color: colors.white,
    marginBottom: spacing.xs,
  },
  subhead: {
    fontSize: font.sizes.sm,
    color: colors.mist,
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  submit: {
    marginVertical: spacing.md,
  },
  switch: {
    marginTop: spacing.md,
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  footerText: {
    fontSize: font.sizes.xs,
    color: colors.mist,
  },
  demoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  demoText: {
    color: colors.mist,
    fontSize: font.sizes.xs,
  },
  demoNote: {
    color: colors.mist,
    fontSize: font.sizes.xs,
    marginTop: 4,
  },
  error: {
    color: colors.danger,
    fontSize: font.sizes.sm,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: font.sizes.xs,
    fontWeight: "800",
    color: colors.white,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: font.sizes.xs,
    color: colors.mist,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
});
