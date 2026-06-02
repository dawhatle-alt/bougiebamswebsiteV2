import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { events, MobileEvent, eventCategories, EventCategory } from "@/data/events";
import * as Haptics from "expo-haptics";

function EventCard({ event, onRegister }: { event: MobileEvent; onRegister: () => void }) {
  const colors = useColors();
  const spotsPercent = event.spotsLeft / event.totalSpots;
  const isAlmostFull = event.spotsLeft <= 5;

  return (
    <View style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.eventCardHeader, { backgroundColor: event.accentColor }]}>
        <View style={styles.eventCardHeaderRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{event.category.toUpperCase()}</Text>
          </View>
          {event.price === "Free" && (
            <View style={[styles.categoryBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.categoryBadgeText, { color: colors.primaryForeground }]}>FREE</Text>
            </View>
          )}
        </View>
        <Text style={styles.eventCardTitle} numberOfLines={2}>{event.title}</Text>
      </View>

      <View style={styles.eventCardBody}>
        <View style={styles.eventMeta}>
          <View style={styles.eventMetaItem}>
            <Feather name="calendar" size={13} color={colors.primary} />
            <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]}>{event.date}</Text>
          </View>
          <View style={styles.eventMetaItem}>
            <Feather name="clock" size={13} color={colors.primary} />
            <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]}>{event.time}</Text>
          </View>
          <View style={styles.eventMetaItem}>
            <Feather name="map-pin" size={13} color={colors.primary} />
            <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        </View>

        <Text style={[styles.eventDescription, { color: colors.mutedForeground }]} numberOfLines={2}>
          {event.description}
        </Text>

        <View style={styles.spotsRow}>
          <Text style={[styles.spotsText, { color: isAlmostFull ? "#E02020" : colors.mutedForeground }]}>
            {isAlmostFull ? `⚠ Only ${event.spotsLeft} spots left` : `${event.spotsLeft}/${event.totalSpots} spots available`}
          </Text>
          <View style={[styles.spotsBar, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.spotsBarFill,
                {
                  width: `${(1 - spotsPercent) * 100}%`,
                  backgroundColor: isAlmostFull ? "#E02020" : colors.primary,
                }
              ]}
            />
          </View>
        </View>

        <View style={styles.eventCardFooter}>
          <Text style={[styles.eventPrice, { color: colors.foreground }]}>
            {event.price === "Free" ? "Free" : `$${event.price}`}
          </Text>
          <TouchableOpacity
            style={[styles.registerButton, { backgroundColor: colors.secondary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onRegister();
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.registerButtonText, { color: colors.secondaryForeground }]}>Register</Text>
            <Feather name="arrow-right" size={14} color={colors.secondaryForeground} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function RegisterModal({
  event,
  visible,
  onClose,
}: {
  event: MobileEvent | null;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert("Name required", "Please enter your full name."); return; }
    if (!email.includes("@")) { Alert.alert("Invalid email", "Please enter a valid email address."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    setSubmitted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => { setName(""); setEmail(""); setSubmitted(false); }, 400);
  };

  if (!event) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <TouchableOpacity style={styles.modalDismiss} onPress={handleClose} activeOpacity={1} />
        <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 20 }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {submitted ? "You're In!" : "Reserve Your Spot"}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {submitted ? (
            <View style={styles.successState}>
              <View style={[styles.successIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="check-circle" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>See you there, {name.split(" ")[0]}!</Text>
              <Text style={[styles.successSubtitle, { color: colors.mutedForeground }]}>
                A confirmation has been sent to {email}.
              </Text>
              <View style={[styles.successDetails, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.successEventTitle, { color: colors.foreground }]}>{event.title}</Text>
                <Text style={[styles.successMeta, { color: colors.mutedForeground }]}>{event.date} · {event.time}</Text>
              </View>
            </View>
          ) : (
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={[styles.eventSummary, { backgroundColor: colors.muted }]}>
                <Text style={[styles.eventSummaryTitle, { color: colors.foreground }]}>{event.title}</Text>
                <Text style={[styles.eventSummaryMeta, { color: colors.mutedForeground }]}>
                  {event.date} · {event.price === "Free" ? "Free" : `$${event.price}`}
                </Text>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>FULL NAME</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
                placeholder="Your name"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>EMAIL ADDRESS</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: loading ? colors.muted : colors.secondary }]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={[styles.submitButtonText, { color: loading ? colors.mutedForeground : colors.secondaryForeground }]}>
                  {loading ? "Reserving…" : event.price === "Free" ? "Reserve Free Spot" : `Confirm — $${event.price}`}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function EventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<EventCategory>("All");
  const [selectedEvent, setSelectedEvent] = useState<MobileEvent | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const filtered = activeCategory === "All" ? events : events.filter(e => e.category === activeCategory);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[
        styles.header,
        { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: insets.top + webTopInset + 12 }
      ]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Events</Text>
        <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>Gather & Play</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.filterBarContent}
      >
        {eventCategories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterPill,
              {
                backgroundColor: activeCategory === cat ? colors.foreground : "transparent",
                borderColor: activeCategory === cat ? colors.foreground : colors.border,
              }
            ]}
            onPress={() => { Haptics.selectionAsync(); setActiveCategory(cat); }}
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

      <FlatList
        data={filtered}
        keyExtractor={e => e.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) }
        ]}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onRegister={() => { setSelectedEvent(item); setModalVisible(true); }}
          />
        )}
        showsVerticalScrollIndicator={false}
        scrollEnabled={filtered.length > 0}
      />

      <RegisterModal
        event={selectedEvent}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  headerSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  filterBar: { borderBottomWidth: 1, maxHeight: 56, flexGrow: 0 },
  filterBarContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: "center" },
  filterPill: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6 },
  filterPillText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  list: { padding: 16, gap: 16 },
  eventCard: { borderRadius: 4, borderWidth: 1, overflow: "hidden" },
  eventCardHeader: { padding: 16 },
  eventCardHeaderRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  categoryBadge: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3 },
  categoryBadgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  eventCardTitle: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold", lineHeight: 24 },
  eventCardBody: { padding: 16, gap: 10 },
  eventMeta: { gap: 6 },
  eventMetaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  eventMetaText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  eventDescription: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  spotsRow: { gap: 6 },
  spotsText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  spotsBar: { height: 3, borderRadius: 2, overflow: "hidden" },
  spotsBarFill: { height: 3 },
  eventCardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  eventPrice: { fontSize: 20, fontFamily: "Inter_700Bold" },
  registerButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 2 },
  registerButtonText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalDismiss: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 12, maxHeight: "80%" },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, marginBottom: 16 },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  modalBody: { paddingHorizontal: 20 },
  eventSummary: { borderRadius: 4, padding: 14, marginBottom: 20 },
  eventSummaryTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  eventSummaryMeta: { fontSize: 13, fontFamily: "Inter_400Regular" },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 2, marginBottom: 8, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 2, height: 48, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 16 },
  submitButton: { height: 52, borderRadius: 2, alignItems: "center", justifyContent: "center", marginTop: 4, marginBottom: 20 },
  submitButtonText: { fontSize: 14, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  successState: { alignItems: "center", padding: 24, gap: 12 },
  successIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  successSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  successDetails: { borderWidth: 1, borderRadius: 4, padding: 16, width: "100%", marginTop: 8 },
  successEventTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  successMeta: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
