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

export default function SharedProfileScreen() {
  const { username, userId } = useLocalSearchParams<{ username?: string; userId?: string }>();
  const session = useSessionStore((state) => state.session);
  const token = session?.accessToken;

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#155e75" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerState}>
          <View style={styles.errorIcon}>
            <Ionicons name="person-outline" size={40} color="#94a3b8" />
          </View>
          <Text style={styles.errorText}>{error || "Profile not found"}</Text>
          <Pressable style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </Pressable>
        <Text style={styles.headerTitle}>User Profile</Text>
        <Pressable style={styles.headerButton} onPress={() => router.push("/(app)/chats")}>
          <Text style={styles.headerButtonText}>Open App</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
            </View>
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
          <Text style={styles.bioText}>{profile.bio || "This user hasn't shared a bio yet."}</Text>
        </View>

        {profile.lastSeen && (
          <View style={styles.lastSeenContainer}>
            <Ionicons name="time-outline" size={14} color="#64748b" />
            <Text style={styles.lastSeenText}>
              Last seen {new Date(profile.lastSeen).toLocaleDateString()}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f2e8" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, backgroundColor: "#fffdf8", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: "#0f172a", textAlign: "center" },
  headerSpacer: { width: 60 },
  headerButton: { position: "absolute", right: 12, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#f1f5f9", borderRadius: 8 },
  headerButtonText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  errorIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  errorText: { fontSize: 16, color: "#64748b", textAlign: "center", marginBottom: 20 },
  button: { backgroundColor: "#155e75", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: "#fff", fontWeight: "700" },
  content: { padding: 20 },
  profileSection: { alignItems: "center", gap: 8, marginBottom: 24 },
  avatarContainer: { marginBottom: 8 },
  avatar: { width: 100, height: 100, borderRadius: 28, backgroundColor: "#155e75", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#fff", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  avatarText: { fontSize: 40, fontWeight: "800", color: "#fff" },
  name: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  username: { fontSize: 15, color: "#64748b" },
  taglineContainer: { marginTop: 8, backgroundColor: "#f1f5f9", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  tagline: { fontSize: 14, fontWeight: "700", color: "#0f172a", letterSpacing: 2 },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 20, backgroundColor: "#fffdf8", borderRadius: 20, paddingVertical: 16, paddingHorizontal: 32, borderWidth: 1, borderColor: "#e2e8f0" },
  statItem: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  statValueAlt: { fontSize: 14, fontWeight: "700", color: "#155e75" },
  statLabel: { fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: "#e2e8f0" },
  bioSection: { backgroundColor: "#fffdf8", borderRadius: 20, padding: 18 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  bioText: { fontSize: 15, lineHeight: 22, color: "#475569" },
  lastSeenContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 20 },
  lastSeenText: { fontSize: 12, color: "#94a3b8" },
});