import { PropsWithChildren } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ScreenShellProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
}>;

export const ScreenShell = ({ eyebrow, title, subtitle, children }: ScreenShellProps) => {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f2e8" />
      <View style={styles.container}>
        <View style={styles.header}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.content}>{children}</View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "#f7f2e8",
  },
  header: {
    gap: 4,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#0f766e",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
  },
  content: {
    flex: 1,
  },
});
