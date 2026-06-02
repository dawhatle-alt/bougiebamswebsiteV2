import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

interface Chapter {
  id: string;
  number: string;
  title: string;
  duration: string;
  content: string;
  bullets?: string[];
}

const CHAPTERS: Chapter[] = [
  {
    id: "c1",
    number: "01",
    title: "What Is Mahjong?",
    duration: "5 min read",
    content: "American Mahjong is a tile-based game played by four people. The goal is to complete a winning hand of 14 tiles by drawing and discarding. Each game consists of multiple rounds, and the player who goes Mahjong first wins the hand.",
    bullets: [
      "4 players, 152 tiles",
      "Played counterclockwise",
      "First to complete a valid hand wins",
      "Scores are tracked over multiple rounds"
    ]
  },
  {
    id: "c2",
    number: "02",
    title: "The Tiles",
    duration: "8 min read",
    content: "The tile set contains three main suits — Bams (bamboos), Craks (characters), and Dots — plus winds, dragons, flowers, and jokers.",
    bullets: [
      "Bams: Numbered 1–9, depicted with bamboo",
      "Craks: Numbered 1–9, depicted with Chinese characters",
      "Dots: Numbered 1–9, depicted with circles",
      "Winds: North, South, East, West",
      "Dragons: Red (中), Green (發), White (blank or frame)",
      "Flowers: Unique illustrative tiles",
      "Jokers: Wild tiles unique to American Mahjong"
    ]
  },
  {
    id: "c3",
    number: "03",
    title: "Setting Up",
    duration: "5 min read",
    content: "Before each game, build the wall, determine the East Wind (first dealer), and deal 13 tiles to each player. East draws first to begin the game.",
    bullets: [
      "Build a 2-tile-high wall",
      "Roll dice to determine the starting position",
      "Deal 13 tiles to each player",
      "East player draws a 14th tile and plays first"
    ]
  },
  {
    id: "c4",
    number: "04",
    title: "The Charleston",
    duration: "10 min read",
    content: "The Charleston is a pre-game tile exchange unique to American Mahjong. It's one of the most strategic phases of the game and involves passing tiles left, right, and across.",
    bullets: [
      "First Charleston: Pass 3 tiles Left → Across → Right",
      "Second Charleston (optional): Repeat if all players agree",
      "Courtesy pass: Pass 1–3 tiles if you choose",
      "Always pass tiles you don't want in your hand",
      "You may never pass a Joker"
    ]
  },
  {
    id: "c5",
    number: "05",
    title: "Reading the Card",
    duration: "12 min read",
    content: "The National Mah Jongg League card is released annually and lists all valid winning hands for that year. Learning to read the card is essential to American Mahjong.",
    bullets: [
      "The card is organized into sections (e.g., 2025, Like Numbers, Quints)",
      "Numbers show which tile values are needed",
      "Letters show the suit: B=Bams, C=Craks, D=Dots, F=Flowers, N/S/E/W=Winds",
      "X represents any same tile used throughout the hand",
      "Jokers can substitute for any tile in a group of 3+"
    ]
  },
  {
    id: "c6",
    number: "06",
    title: "Winning Hands",
    duration: "6 min read",
    content: "A winning Mahjong hand consists of the exact tiles needed to match one pattern on the NMJL card. You must call Mahjong on a tile from another player or draw the winning tile yourself.",
    bullets: [
      "Match exactly one hand on the card",
      "Declare Mahjong when you draw or claim your final tile",
      "Closed hands (self-drawn final tile) score higher",
      "Jokers cannot be in pairs",
      "Invalid Mahjong is penalized"
    ]
  }
];

function ChapterCard({ chapter }: { chapter: Chapter }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.chapterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.chapterHeader}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded(e => !e);
        }}
        activeOpacity={0.75}
      >
        <View style={styles.chapterHeaderLeft}>
          <Text style={[styles.chapterNumber, { color: colors.primary }]}>{chapter.number}</Text>
          <View>
            <Text style={[styles.chapterTitle, { color: colors.foreground }]}>{chapter.title}</Text>
            <Text style={[styles.chapterDuration, { color: colors.mutedForeground }]}>{chapter.duration}</Text>
          </View>
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.chapterBody, { borderTopColor: colors.border }]}>
          <Text style={[styles.chapterContent, { color: colors.mutedForeground }]}>{chapter.content}</Text>
          {chapter.bullets && (
            <View style={styles.bulletList}>
              {chapter.bullets.map((b, i) => (
                <View key={i} style={styles.bulletItem}>
                  <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.bulletText, { color: colors.foreground }]}>{b}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function LearnScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 20, backgroundColor: colors.secondary }]}>
        <Text style={[styles.headerEyebrow, { color: colors.primary }]}>BEGINNER'S GUIDE</Text>
        <Text style={[styles.headerTitle, { color: colors.secondaryForeground }]}>Learn to Play</Text>
        <Text style={[styles.headerSubtitle, { color: colors.secondaryForeground + "99" }]}>
          Everything you need to know to sit down at your first table, in six short chapters.
        </Text>
      </View>

      {/* Progress indicator */}
      <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
        <View style={[styles.progressRow, { borderBottomColor: colors.border }]}>
          <Feather name="book-open" size={16} color={colors.primary} />
          <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
            {CHAPTERS.length} chapters · ~46 min
          </Text>
        </View>
      </View>

      {/* Chapters */}
      <View style={styles.chapterList}>
        {CHAPTERS.map(chapter => (
          <ChapterCard key={chapter.id} chapter={chapter} />
        ))}
      </View>

      {/* Tip Banner */}
      <View style={[styles.tipBanner, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
        <Feather name="info" size={18} color={colors.primary} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.tipTitle, { color: colors.foreground }]}>Pro tip</Text>
          <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
            The best way to learn is to play. Join a Virtual Game Night — our community welcomes beginners at every session.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingBottom: 28 },
  headerEyebrow: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 3, marginBottom: 8 },
  headerTitle: { fontSize: 36, fontFamily: "Inter_700Bold", marginBottom: 10 },
  headerSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24 },
  progressBar: { paddingHorizontal: 20, paddingVertical: 12 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  chapterList: { padding: 16, gap: 10 },
  chapterCard: { borderRadius: 4, borderWidth: 1, overflow: "hidden" },
  chapterHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  chapterHeaderLeft: { flexDirection: "row", alignItems: "flex-start", gap: 14, flex: 1 },
  chapterNumber: { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 28 },
  chapterTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 22, flex: 1 },
  chapterDuration: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  chapterBody: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 14, borderTopWidth: 1 },
  chapterContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 14 },
  bulletList: { gap: 8 },
  bulletItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 8, flexShrink: 0 },
  bulletText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 22 },
  tipBanner: { margin: 16, borderWidth: 1, borderRadius: 4, padding: 16, flexDirection: "row", gap: 12 },
  tipTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  tipText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
