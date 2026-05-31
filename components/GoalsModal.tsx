import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { CATEGORIES, CATEGORY_ICONS, Category } from "../services/expenses";
import { Goal, setGoal, deleteGoal } from "../services/goals";

interface Props {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  goals: Goal[];
}

export default function GoalsModal({
  visible,
  onClose,
  groupId,
  goals,
}: Props) {
  // mapa category → valor digitado
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  // sincroniza inputs com as metas salvas
  useEffect(() => {
    const map: Record<string, string> = {};
    goals.forEach((g) => {
      map[g.category] = g.limit.toString().replace(".", ",");
    });
    setLimits(map);
  }, [goals, visible]);

  const handleSave = async (cat: Category) => {
    const raw = limits[cat] ?? "";
    if (!raw.trim()) {
      // sem valor → remove a meta
      setLoading(cat);
      try {
        await deleteGoal(groupId, cat);
      } finally {
        setLoading(null);
      }
      return;
    }
    const val = parseFloat(raw.replace(",", "."));
    if (isNaN(val) || val <= 0) return;
    setLoading(cat);
    try {
      await setGoal(groupId, cat, val);
    } finally {
      setLoading(null);
    }
  };

  const handleRemove = async (cat: Category) => {
    setLoading(cat);
    setLimits((prev) => ({ ...prev, [cat]: "" }));
    try {
      await deleteGoal(groupId, cat);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>🎯 Metas de Gasto</Text>
          <Text style={styles.subtitle}>
            Defina um limite mensal por categoria. Você será alertado ao
            ultrapassar.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {CATEGORIES.map((cat) => {
              const isLoading = loading === cat;
              const hasGoal = !!goals.find((g) => g.category === cat);
              return (
                <View key={cat} style={styles.row}>
                  <Text style={styles.emoji}>{CATEGORY_ICONS[cat]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catName}>{cap(cat)}</Text>
                    {hasGoal && (
                      <Text style={styles.goalSet}>
                        Meta: R${" "}
                        {goals
                          .find((g) => g.category === cat)!
                          .limit.toFixed(2)
                          .replace(".", ",")}
                      </Text>
                    )}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Limite R$"
                    placeholderTextColor="#555"
                    value={limits[cat] ?? ""}
                    onChangeText={(v) =>
                      setLimits((prev) => ({ ...prev, [cat]: v }))
                    }
                    keyboardType="decimal-pad"
                    onSubmitEditing={() => handleSave(cat)}
                  />
                  {isLoading ? (
                    <ActivityIndicator color="#E94560" style={{ width: 40 }} />
                  ) : (
                    <TouchableOpacity
                      style={[styles.saveBtn, hasGoal && styles.saveBtnSet]}
                      onPress={() =>
                        hasGoal && !limits[cat]
                          ? handleRemove(cat)
                          : handleSave(cat)
                      }
                    >
                      <Text style={styles.saveBtnText}>
                        {hasGoal ? "✓" : "Ok"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    backgroundColor: "#16213E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 12,
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  subtitle: { color: "#888", fontSize: 12, marginBottom: 20, lineHeight: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    backgroundColor: "#1A1A2E",
    borderRadius: 12,
    padding: 10,
  },
  emoji: { fontSize: 22, width: 28, textAlign: "center" },
  catName: { color: "#fff", fontSize: 14 },
  goalSet: { color: "#4ECDC4", fontSize: 11, marginTop: 1 },
  input: {
    backgroundColor: "#16213E",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#fff",
    fontSize: 14,
    width: 95,
    borderWidth: 1,
    borderColor: "#0F3460",
    textAlign: "right",
  },
  saveBtn: {
    backgroundColor: "#0F3460",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 38,
    alignItems: "center",
  },
  saveBtnSet: {
    backgroundColor: "rgba(78,205,196,0.2)",
    borderWidth: 1,
    borderColor: "#4ECDC4",
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  closeBtn: {
    marginTop: 16,
    backgroundColor: "#E94560",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
