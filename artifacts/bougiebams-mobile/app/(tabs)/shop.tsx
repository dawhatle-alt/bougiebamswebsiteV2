import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { products, categories, Product } from "@/data/products";
import * as Haptics from "expo-haptics";

function ProductGridCard({ product }: { product: Product }) {
  const colors = useColors();
  const [inCart, setInCart] = useState(false);

  const handleAddToCart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setInCart(true);
    setTimeout(() => setInCart(false), 1500);
  };

  return (
    <View style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.gridCardImage, { backgroundColor: product.accentColor }]}>
        <View style={styles.gridCardImageInner}>
          {product.isNew && (
            <View style={[styles.productBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.productBadgeText, { color: colors.primaryForeground }]}>NEW</Text>
            </View>
          )}
          {product.isBestseller && !product.isNew && (
            <View style={[styles.productBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Text style={[styles.productBadgeText, { color: "#fff" }]}>BESTSELLER</Text>
            </View>
          )}
          {!product.inStock && (
            <View style={[styles.soldOutOverlay]}>
              <Text style={styles.soldOutText}>SOLD OUT</Text>
            </View>
          )}
        </View>
        <Text style={styles.gridCardTileChar} numberOfLines={1}>
          {product.name.charAt(0)}
        </Text>
      </View>

      <View style={styles.gridCardBody}>
        <Text style={[styles.gridCardCategory, { color: colors.mutedForeground }]}>
          {product.category}
        </Text>
        <Text style={[styles.gridCardName, { color: colors.foreground }]} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.gridCardRating}>
          {[1,2,3,4,5].map(i => (
            <Feather
              key={i}
              name="star"
              size={11}
              color={i <= Math.floor(product.rating) ? colors.primary : colors.border}
            />
          ))}
          <Text style={[styles.gridCardRatingText, { color: colors.mutedForeground }]}>
            ({product.reviewCount})
          </Text>
        </View>

        <View style={styles.gridCardFooter}>
          <Text style={[styles.gridCardPrice, { color: colors.foreground }]}>${product.price}</Text>
          <TouchableOpacity
            style={[
              styles.addButton,
              {
                backgroundColor: inCart ? colors.primary : colors.secondary,
                opacity: product.inStock ? 1 : 0.5,
              }
            ]}
            onPress={handleAddToCart}
            disabled={!product.inStock}
            activeOpacity={0.75}
          >
            <Feather
              name={inCart ? "check" : "shopping-bag"}
              size={14}
              color={inCart ? colors.primaryForeground : colors.secondaryForeground}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filtered = activeCategory === "All"
    ? products
    : products.filter(p => p.category === activeCategory);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[
        styles.header,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          paddingTop: insets.top + webTopInset + 12,
        }
      ]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>The Collection</Text>
        <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
          {filtered.length} products
        </Text>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.filterBarContent}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterPill,
              {
                backgroundColor: activeCategory === cat ? colors.foreground : "transparent",
                borderColor: activeCategory === cat ? colors.foreground : colors.border,
              }
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveCategory(cat);
            }}
            activeOpacity={0.75}
          >
            <Text style={[
              styles.filterPillText,
              { color: activeCategory === cat ? colors.background : colors.mutedForeground }
            ]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Product Grid */}
      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) }
        ]}
        renderItem={({ item }) => <ProductGridCard product={item} />}
        showsVerticalScrollIndicator={false}
        scrollEnabled={filtered.length > 0}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="shopping-bag" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No products in this category</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  filterBar: {
    borderBottomWidth: 1,
    maxHeight: 56,
    flexGrow: 0,
  },
  filterBarContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
  },
  filterPill: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
  grid: { padding: 12 },
  row: { gap: 12, marginBottom: 12 },
  gridCard: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 1,
    overflow: "hidden",
  },
  gridCardImage: {
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gridCardImageInner: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 2,
  },
  productBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
  },
  productBadgeText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  soldOutOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  soldOutText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  gridCardTileChar: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 72,
    fontFamily: "Inter_700Bold",
  },
  gridCardBody: { padding: 12 },
  gridCardCategory: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  gridCardName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
    marginBottom: 6,
  },
  gridCardRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 10,
  },
  gridCardRatingText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginLeft: 2,
  },
  gridCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gridCardPrice: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
