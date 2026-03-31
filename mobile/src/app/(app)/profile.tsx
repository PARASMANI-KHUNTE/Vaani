import { router } from "expo-router";
import * as Updates from "expo-updates";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { useMobileSocial } from "@/hooks/use-mobile-social";
import { useSessionStore } from "@/store/session-store";

export default function ProfileScreen() {
  const session = useSessionStore((state) => state.session);
  const clearSession = useSessionStore((state) => state.clearSession);
  const token = useSessionStore((state) => state.session?.accessToken);
  const { profile, callHistory, saveProfile, isLoadingProfile, error } = useMobileSocial({ token });
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setTagline(profile.tagline || "");
    setBio(profile.bio || "");
  }, [profile]);

  const formatDuration = (durationSeconds: number) => {
    if (!durationSeconds) return "0m";
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    if (!mins) return `${secs}s`;
    return secs ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <ScreenShell
      eyebrow="Profile"
      title={profile?.name || session?.user?.name || "Your profile"}
      subtitle={error || "Edit your profile and review recent audio/video calls from the Android app."}
    >
      <ScrollView contentContainerStyle={styles.stack}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Identity</Text>
          <Text style={styles.metaLabel}>Username</Text>
          <Text style={styles.metaValue}>@{profile?.username || "loading"}</Text>
          <Text style={styles.metaLabel}>Friends</Text>
          <Text style={styles.metaValue}>{profile?.friendsCount ?? 0}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Edit profile</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Display name" placeholderTextColor="#94a3b8" style={styles.input} />
          <TextInput
            value={tagline}
            onChangeText={(value) => setTagline(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))}
            placeholder="AB12"
            placeholderTextColor="#94a3b8"
            maxLength={4}
            style={styles.input}
          />
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Bio"
            placeholderTextColor="#94a3b8"
            multiline
            style={[styles.input, styles.bioInput]}
          />
          <Pressable style={styles.primaryButton} onPress={() => void saveProfile({ name, tagline, bio })}>
            <Text style={styles.primaryButtonText}>{isLoadingProfile ? "Saving..." : "Save profile"}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent calls</Text>
          {callHistory.length === 0 ? (
            <Text style={styles.listItem}>Call history will appear here once you start using audio or video calls.</Text>
          ) : (
            callHistory.map((entry) => (
              <View key={entry._id} style={styles.historyItem}>
                <Text style={styles.historyTitle}>
                  {entry.otherUser?.name || "Unknown"} • {entry.direction} {entry.callType}
                </Text>
                <Text style={styles.historyMeta}>
                  {entry.status} • {formatDuration(entry.durationSeconds)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>OTA readiness</Text>
          <Text style={styles.metaLabel}>Runtime version</Text>
          <Text style={styles.metaValue}>{Updates.runtimeVersion || "appVersion policy"}</Text>
          <Text style={styles.metaLabel}>Channel</Text>
          <Text style={styles.metaValue}>{Updates.channel || "development"}</Text>
          <Text style={styles.metaLabel}>Update ID</Text>
          <Text style={styles.metaValue} numberOfLines={2}>
            {Updates.updateId || "Embedded build / no OTA update applied yet"}
          </Text>
        </View>

        <Pressable
          style={styles.signOutButton}
          onPress={() => {
            void clearSession();
            router.replace("/auth");
          }}
        >
          <Text style={styles.signOutButtonText}>Clear mobile session</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  card: {
    borderRadius: 28,
    backgroundColor: "#fffdf8",
    padding: 18,
    gap: 8,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f766e",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 6,
  },
  metaValue: {
    fontSize: 14,
    lineHeight: 21,
    color: "#334155",
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0f172a",
  },
  bioInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: "#155e75",
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  listItem: {
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
  },
  historyItem: {
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 12,
    marginTop: 8,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  historyMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
  },
  signOutButton: {
    borderRadius: 999,
    backgroundColor: "#172033",
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
