import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { products } from "@/data/products";
import { events } from "@/data/events";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

function ProductCard({ product }: { product: typeof products[0] }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.productCard, { backgroundColor: product.accentColor }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/(tabs)/shop");
      }}
      activeOpacity={0.85}
    >
      <View style={styles.productCardInner}>
        <View style={styles.productCardTop}>
          {product.isNew && (
            <View style={[styles.productBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.productBadgeText, { color: colors.primaryForeground }]}>NEW</Text>
            </View>
          )}
          {product.isBestseller && !product.isNew && (
            <View style={[styles.productBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Text style={[styles.productBadgeText, { color: "#ffffff" }]}>BESTSELLER</Text>
            </View>
          )}
        </View>
        <View>
          <Text style={styles.productCardName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.productCardPrice}>${product.price}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const bestsellers = products.filter(p => p.isBestseller);
  const nextEvent = events[0];

  const handleSubscribe = () => {
    if (!email.includes("@")) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEmail("");
    Alert.alert("Welcome to the Inner Circle!", "You'll be the first to hear about new collections and events.");
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: colors.secondary, paddingTop: insets.top + webTopInset + 24 }]}>
        <Text style={[styles.heroEyebrow, { color: colors.primary }]}>THE ART OF THE GAME</Text>
        <Text style={[styles.heroTitle, { color: colors.secondaryForeground }]}>
          Where Style Meets{"\n"}
          <Text style={[styles.heroTitleItalic, { color: colors.primary }]}>the Table.</Text>
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.secondaryForeground + "99" }]}>
          Premium Mahjong collections for the modern player.
        </Text>
        <TouchableOpacity
          style={[styles.heroButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/(tabs)/shop");
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.heroButtonText, { color: colors.primaryForeground }]}>SHOP THE COLLECTION</Text>
          <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* Best Sellers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>MOST LOVED</Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Best Sellers</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/(tabs)/shop")} activeOpacity={0.7}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          horizontal
          data={bestsellers}
          keyExtractor={p => p.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          renderItem={({ item }) => <ProductCard product={item} />}
          scrollEnabled={bestsellers.length > 0}
        />
      </View>

      {/* Next Event */}
      {nextEvent && (
        <View style={[styles.section, styles.sectionPadded]}>
          <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>GATHER & PLAY</Text>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Next Event</Text>

          <TouchableOpacity
            style={[styles.eventCard, { backgroundColor: nextEvent.accentColor }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/events");
            }}
            activeOpacity={0.9}
          >
            <View style={styles.eventCardBadge}>
              <Text style={styles.eventCardBadgeText}>{nextEvent.category.toUpperCase()}</Text>
            </View>
            <Text style={styles.eventCardTitle} numberOfLines={2}>{nextEvent.title}</Text>
            <View style={styles.eventCardMeta}>
              <View style={styles.eventCardMetaItem}>
                <Feather name="calendar" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.eventCardMetaText}>{nextEvent.date}</Text>
              </View>
              <View style={styles.eventCardMetaItem}>
                <Feather name="map-pin" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.eventCardMetaText} numberOfLines={1}>{nextEvent.location}</Text>
              </View>
            </View>
            <View style={styles.eventCardFooter}>
              <Text style={styles.eventCardPrice}>
                {nextEvent.price === "Free" ? "Free" : `$${nextEvent.price}`}
              </Text>
              <View style={[styles.eventCardButton, { backgroundColor: colors.primary }]}>
                <Text style={[styles.eventCardButtonText, { color: colors.primaryForeground }]}>Register</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Newsletter */}
      <View style={[styles.newsletterSection, { backgroundColor: colors.muted }]}>
        <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>THE INNER CIRCLE</Text>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Join the Club</Text>
        <Text style={[styles.newsletterSubtitle, { color: colors.mutedForeground }]}>
          Exclusive access to new collections, limited drops, and private event invites.
        </Text>
        <View style={[styles.newsletterRow]}>
          <TextInput
            style={[
              styles.newsletterInput,
              {
                backgroundColor: colors.background,
                color: colors.foreground,
                borderColor: colors.border,
              }
            ]}
            placeholder="Email address"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.newsletterButton, { backgroundColor: colors.primary }]}
            onPress={handleSubscribe}
            activeOpacity={0.85}
          >
            <Feather name="arrow-right" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  heroEyebrow: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 3,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    lineHeight: 48,
    marginBottom: 12,
  },
  heroTitleItalic: {
    fontFamily: "Inter_400Regular",
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
    marginBottom: 28,
  },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignSelf: "flex-start",
    borderRadius: 2,
  },
  heroButtonText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  section: { marginTop: 36 },
  sectionPadded: { paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  seeAll: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  productCard: {
    width: 160,
    height: 200,
    borderRadius: 2,
    overflow: "hidden",
  },
  productCardInner: {
    flex: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  productCardTop: { flexDirection: "row" },
  productBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  productBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  productCardName: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
    lineHeight: 20,
  },
  productCardPrice: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  eventCard: {
    borderRadius: 4,
    padding: 20,
    marginTop: 12,
  },
  eventCardBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  eventCardBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  eventCardTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    lineHeight: 26,
  },
  eventCardMeta: { gap: 6, marginBottom: 16 },
  eventCardMetaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  eventCardMetaText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  eventCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventCardPrice: {
    color: "#ffffff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  eventCardButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 2,
  },
  eventCardButtonText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  newsletterSection: {
    marginTop: 36,
    padding: 24,
  },
  newsletterSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 16,
  },
  newsletterRow: {
    flexDirection: "row",
    gap: 8,
  },
  newsletterInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  newsletterButton: {
    width: 48,
    height: 48,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
