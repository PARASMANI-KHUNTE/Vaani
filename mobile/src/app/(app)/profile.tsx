import { router } from "expo-router";
import * as Updates from "expo-updates";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { useMobileSocial } from "@/hooks/use-mobile-social";
import { useNotificationStore } from "@/store/notification-store";
import { useSessionStore } from "@/store/session-store";
import { radii, spacing, typography, type AppColors } from "@/theme/tokens";
import { useAppTheme, useThemedStyles } from "@/theme/use-app-theme";

export default function ProfileScreen() {
  const session = useSessionStore((state) => state.session);
  const clearSession = useSessionStore((state) => state.clearSession);
  const token = useSessionStore((state) => state.session?.accessToken);
  const soundEnabled = useNotificationStore((state) => state.soundEnabled);
  const setSoundEnabled = useNotificationStore((state) => state.setSoundEnabled);
  const { profile, saveProfile, isLoadingProfile, error } = useMobileSocial({ token });
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const { colors, isTablet } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setTagline(profile.tagline || "");
    setBio(profile.bio || "");
  }, [profile]);

  return (
    <ScreenShell
      eyebrow="Profile"
      title={profile?.name || session?.user?.name || "Your profile"}
      subtitle={error || "Edit your profile information below."}
    >
      <ScrollView
        contentContainerStyle={[styles.stack, isTablet && styles.stackWide]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, isTablet && styles.cardWide]}>
          <Text style={styles.cardTitle}>Identity</Text>
          <View style={styles.cardBody}>
            <Text style={styles.metaLabel}>Username</Text>
            <Text style={styles.metaValue}>@{profile?.username || "loading"}</Text>
            <Text style={styles.metaLabel}>Friends</Text>
            <Text style={styles.metaValue}>{profile?.friendsCount ?? 0}</Text>
          </View>
        </View>

        <View style={[styles.card, isTablet && styles.cardWide]}>
          <Text style={styles.cardTitle}>Edit profile</Text>
          <View style={styles.cardBody}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Display name"
              placeholderTextColor={colors.faint}
              style={styles.input}
            />
            <TextInput
              value={tagline}
              onChangeText={(value) =>
                setTagline(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))
              }
              placeholder="AB12"
              placeholderTextColor={colors.faint}
              maxLength={4}
              style={styles.input}
            />
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Bio"
              placeholderTextColor={colors.faint}
              multiline
              style={[styles.input, styles.bioInput]}
            />
            <Pressable
              style={styles.primaryButton}
              onPress={() => void saveProfile({ name, tagline, bio })}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>
                {isLoadingProfile ? "Saving..." : "Save profile"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.card, isTablet && styles.cardWide]}>
          <Text style={styles.cardTitle}>Settings</Text>
          <View style={styles.cardBody}>
            <Pressable
              style={styles.linkRow}
              onPress={() => setSoundEnabled(!soundEnabled)}
              accessibilityRole="switch"
              accessibilityState={{ checked: soundEnabled }}
            >
              <View style={styles.linkIconContainer}>
                <Ionicons
                  name={soundEnabled ? "volume-high-outline" : "volume-mute-outline"}
                  size={20}
                  color={colors.brand}
                />
              </View>
              <View style={styles.linkContent}>
                <Text style={styles.linkTitle}>Notification sound</Text>
                <Text style={styles.linkSubtitle}>
                  {soundEnabled ? "Sound is enabled" : "Sound is muted"}
                </Text>
              </View>
              <View style={[styles.toggleTrack, soundEnabled && styles.toggleTrackOn]}>
                <View style={[styles.toggleThumb, soundEnabled && styles.toggleThumbOn]} />
              </View>
            </Pressable>
            <Pressable style={styles.linkRow} onPress={() => router.push("/blocked-users" as any)}>
              <View style={styles.linkIconContainer}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.brand} />
              </View>
              <View style={styles.linkContent}>
                <Text style={styles.linkTitle}>Blocked users</Text>
                <Text style={styles.linkSubtitle}>Manage blocked contacts</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.faint} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.card, isTablet && styles.cardWide]}>
          <Text style={styles.cardTitle}>OTA readiness</Text>
          <View style={styles.cardBody}>
            <Text style={styles.metaLabel}>Runtime version</Text>
            <Text style={styles.metaValue}>{Updates.runtimeVersion || "appVersion policy"}</Text>
            <Text style={styles.metaLabel}>Channel</Text>
            <Text style={styles.metaValue}>{Updates.channel || "development"}</Text>
            <Text style={styles.metaLabel}>Update ID</Text>
            <Text style={styles.metaValue} numberOfLines={2}>
              {Updates.updateId || "Embedded build / no OTA update applied yet"}
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.signOutButton, isTablet && styles.cardWide]}
          onPress={() => {
            void clearSession();
            router.replace("/auth");
          }}
          accessibilityRole="button"
        >
          <Text style={styles.signOutButtonText}>Clear mobile session</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    stack: {
      gap: 14,
      paddingBottom: spacing.xl,
    },
    stackWide: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-start",
      gap: spacing.md,
    },
    card: {
      borderRadius: radii.xxl,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      padding: 18,
      gap: 8,
    },
    cardWide: {
      flexBasis: "48%",
      flexGrow: 1,
      minWidth: 320,
    },
    cardTitle: {
      ...typography.h3,
      color: c.fg,
      marginBottom: 4,
    },
    cardBody: {
      gap: 8,
    },
    metaLabel: {
      ...typography.caption,
      color: c.brand,
      marginTop: 6,
    },
    metaValue: {
      fontSize: 14,
      lineHeight: 21,
      color: c.muted,
    },
    input: {
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.elevated,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: c.fg,
    },
    bioInput: {
      minHeight: 96,
      textAlignVertical: "top",
    },
    primaryButton: {
      borderRadius: radii.pill,
      backgroundColor: c.brand,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 4,
    },
    primaryButtonText: {
      color: c.onBrand,
      fontSize: 15,
      fontWeight: "700",
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
    },
    linkIconContainer: {
      width: 40,
      height: 40,
      borderRadius: radii.sm,
      backgroundColor: c.brandSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    linkContent: {
      flex: 1,
      minWidth: 0,
    },
    linkTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: c.fg,
    },
    linkSubtitle: {
      fontSize: 12,
      color: c.muted,
    },
    toggleTrack: {
      width: 46,
      height: 26,
      borderRadius: 999,
      backgroundColor: c.subtle,
      padding: 3,
      justifyContent: "center",
    },
    toggleTrackOn: {
      backgroundColor: c.brand,
    },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.surface,
      transform: [{ translateX: 0 }],
    },
    toggleThumbOn: {
      transform: [{ translateX: 20 }],
    },
    signOutButton: {
      borderRadius: radii.pill,
      backgroundColor: c.fg,
      paddingVertical: 14,
      alignItems: "center",
    },
    signOutButtonText: {
      color: c.canvas,
      fontSize: 15,
      fontWeight: "700",
    },
  });
