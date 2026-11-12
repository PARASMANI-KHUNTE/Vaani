import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMobileProfileByUserId, getMobileProfileByUsername } from "@/lib/api/client";
import { MobileProfile } from "@/lib/types";
import { useSessionStore } from "@/store/session-store";
import { radii, spacing, typography, type AppColors } from "@/theme/tokens";
import { useAppTheme, useThemedStyles } from "@/theme/use-app-theme";

export default function SharedProfileScreen() {
  const { username, userId } = useLocalSearchParams<{ username?: string; userId?: string }>();
  const session = useSessionStore((state) => state.session);
  const token = session?.accessToken;
  const { colors, contentWidth } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!token || (!username && !userId)) {
      setIsLoading(false);
      setError("No user specified");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = userId
        ? await getMobileProfileByUserId(token, userId)
        : await getMobileProfileByUsername(token, username!);
      setProfile(response.profile);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load profile";
      if (message.includes("404") || message.includes("not found")) {
        setError("User not found");
      } else if (message.includes("403") || message.includes("blocked")) {
        setError("This profile is unavailable");
      } else {
        setError("Unable to load profile");
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, username, userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const header = (title: string) => (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={24} color={colors.fg} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {header("Profile")}
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {header("Profile")}
        <View style={styles.centerState}>
          <View style={styles.errorIcon}>
            <Ionicons name="person-outline" size={34} color={colors.faint} />
          </View>
          <Text style={styles.errorText}>{error || "Profile not found"}</Text>
          <Pressable style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const relationshipStatus = profile.isFriend
    ? "Friends"
    : profile.requestSent
    ? "Request Sent"
    : profile.requestReceived
    ? "Respond in Alerts"
    : "Not Friends";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.fg} />
        </Pressable>
        <Text style={styles.headerTitle}>User profile</Text>
        <Pressable style={styles.headerButton} onPress={() => router.push("/(app)/chats")}>
          <Text style={styles.headerButtonText}>Open app</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { maxWidth: contentWidth }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.tagline && (
            <View style={styles.taglineContainer}>
              <Text style={styles.tagline}>{profile.tagline}</Text>
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.friendsCount || 0}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValueAlt}>{relationshipStatus}</Text>
              <Text style={styles.statLabel}>Relationship</Text>
            </View>
          </View>
        </View>

        <View style={styles.bioSection}>
          <Text style={styles.sectionLabel}>Biography</Text>
          <Text style={styles.bioText}>
            {profile.bio || "This user hasn't shared a bio yet."}
          </Text>
        </View>

        {profile.lastSeen && (
          <View style={styles.lastSeenContainer}>
            <Ionicons name="time-outline" size={14} color={colors.muted} />
            <Text style={styles.lastSeenText}>
              Last seen {new Date(profile.lastSeen).toLocaleDateString()}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.canvas },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      gap: spacing.sm,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    backButton: { padding: 4 },
    headerTitle: {
      flex: 1,
      ...typography.h3,
      color: c.fg,
      textAlign: "center",
    },
    headerSpacer: { width: 60 },
    headerButton: {
      position: "absolute",
      right: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: c.subtle,
      borderRadius: radii.sm,
    },
    headerButtonText: { fontSize: 12, fontWeight: "600", color: c.muted },
    errorIcon: {
      width: 76,
      height: 76,
      borderRadius: radii.xl,
      backgroundColor: c.subtle,
      alignItems: "center",
      justifyContent: "center",
    },
    errorText: { fontSize: 15, color: c.muted, textAlign: "center" },
    button: {
      backgroundColor: c.brand,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: radii.pill,
    },
    buttonText: { color: c.onBrand, fontWeight: "700" },
    content: {
      width: "100%",
      alignSelf: "center",
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    profileSection: { alignItems: "center", gap: 8 },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: radii.xxl,
      backgroundColor: c.brand,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 4,
      borderColor: c.surface,
      shadowColor: "#0A0C18",
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    avatarText: { fontSize: 40, fontWeight: "800", color: c.onBrand },
    name: { ...typography.h1, color: c.fg, textAlign: "center" },
    username: { fontSize: 15, color: c.muted },
    taglineContainer: {
      marginTop: 4,
      backgroundColor: c.brandSoft,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: radii.pill,
    },
    tagline: { fontSize: 13, fontWeight: "700", color: c.brand, letterSpacing: 2 },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "stretch",
      marginTop: 16,
      backgroundColor: c.surface,
      borderRadius: radii.xl,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: c.line,
    },
    statItem: { alignItems: "center", flex: 1 },
    statValue: { fontSize: 22, fontWeight: "800", color: c.fg },
    statValueAlt: { fontSize: 14, fontWeight: "700", color: c.brand, textAlign: "center" },
    statLabel: {
      ...typography.caption,
      color: c.faint,
      marginTop: 4,
    },
    statDivider: { width: 1, height: 40, backgroundColor: c.line },
    bioSection: {
      backgroundColor: c.surface,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: c.line,
      padding: 18,
    },
    sectionLabel: {
      ...typography.caption,
      color: c.faint,
      marginBottom: 8,
    },
    bioText: { fontSize: 15, lineHeight: 22, color: c.muted },
    lastSeenContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 4,
    },
    lastSeenText: { fontSize: 12, color: c.faint },
  });
