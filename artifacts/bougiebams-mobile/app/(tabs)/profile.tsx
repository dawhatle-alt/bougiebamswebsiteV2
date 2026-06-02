import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

const LINKS = [
  { icon: "shopping-bag" as const, label: "Order History", value: "No orders yet" },
  { icon: "heart" as const, label: "Saved Items", value: "0 items" },
  { icon: "calendar" as const, label: "My Events", value: "0 registered" },
  { icon: "help-circle" as const, label: "FAQ & Support", value: "" },
  { icon: "mail" as const, label: "Contact Us", value: "patsy@bougiebams.com" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const handleSubscribe = () => {
    if (!email.includes("@")) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubscribed(true);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[
        styles.profileHeader,
        { backgroundColor: colors.secondary, paddingTop: insets.top + webTopInset + 24 }
      ]}>
        <View style={[styles.avatarCircle, { backgroundColor: colors.primary + "33" }]}>
          <Text style={[styles.avatarGlyph, { color: colors.primary }]}>竹</Text>
        </View>
        <Text style={[styles.profileName, { color: colors.secondaryForeground }]}>Welcome Back</Text>
        <Text style={[styles.profileTagline, { color: colors.primary }]}>BougieBams Member</Text>
      </View>

      {/* Newsletter */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>The Inner Circle</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
          Be first to know about new drops and private events.
        </Text>

        {subscribed ? (
          <View style={[styles.subscribedBanner, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
            <Feather name="check-circle" size={18} color={colors.primary} />
            <Text style={[styles.subscribedText, { color: colors.foreground }]}>You're on the list!</Text>
          </View>
        ) : (
          <View style={styles.emailRow}>
            <TextInput
              style={[
                styles.emailInput,
                { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }
              ]}
              placeholder="Email address"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.subscribeButton, { backgroundColor: colors.primary }]}
              onPress={handleSubscribe}
              activeOpacity={0.85}
            >
              <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Links */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Account</Text>
        {LINKS.map((link, i) => (
          <TouchableOpacity
            key={link.label}
            style={[
              styles.linkRow,
              {
                borderBottomColor: colors.border,
                borderBottomWidth: i < LINKS.length - 1 ? 1 : 0,
              }
            ]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            activeOpacity={0.7}
          >
            <View style={[styles.linkIcon, { backgroundColor: colors.muted }]}>
              <Feather name={link.icon} size={16} color={colors.primary} />
            </View>
            <View style={styles.linkContent}>
              <Text style={[styles.linkLabel, { color: colors.foreground }]}>{link.label}</Text>
              {link.value ? (
                <Text style={[styles.linkValue, { color: colors.mutedForeground }]}>{link.value}</Text>
              ) : null}
            </View>
            <Feather name="chevron-right" size={16} color={colors.border} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Brand footer */}
      <View style={[styles.brandFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.brandName, { color: colors.primary }]}>BougieBams</Text>
        <Text style={[styles.brandTagline, { color: colors.mutedForeground }]}>
          Where Style Meets the Table
        </Text>
        <Text style={[styles.brandVersion, { color: colors.border }]}>v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: {
    alignItems: "center",
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarGlyph: { fontSize: 32 },
  profileName: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  profileTagline: { fontSize: 13, fontFamily: "Inter_500Medium", letterSpacing: 1 },
  section: {
    padding: 20,
    borderBottomWidth: 1,
  },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 6 },
  sectionSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 14 },
  emailRow: { flexDirection: "row", gap: 8 },
  emailInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  subscribeButton: {
    width: 48,
    height: 48,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  subscribedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
  },
  subscribedText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  linkContent: { flex: 1 },
  linkLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  linkValue: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  brandFooter: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    marginTop: 8,
    gap: 6,
  },
  brandName: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  brandTagline: { fontSize: 13, fontFamily: "Inter_400Regular" },
  brandVersion: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
});
