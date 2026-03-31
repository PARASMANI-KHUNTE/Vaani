import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSessionStore } from "@/store/session-store";

export default function IndexScreen() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const session = useSessionStore((state) => state.session);

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
        }}
      >
        <ActivityIndicator size="large" color="#f8fafc" />
      </View>
    );
  }

  return <Redirect href={session?.accessToken ? "/(app)/chats" : "/auth"} />;
}
