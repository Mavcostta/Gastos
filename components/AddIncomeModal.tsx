import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Timestamp } from "firebase/firestore";
import {
  addIncome,
  updateIncome,
  Income,
  INCOME_CATEGORIES,
  INCOME_ICONS,
  IncomeCategory,
} from "../services/income";

interface Props {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  uid: string;
  userName: string;
  editItem?: Income | null;
  activeYear?: number;
  activeMonth?: number;
}

export default function AddIncomeModal({
  visible,
  onClose,
  groupId,
  uid,
  userName,
  editItem,
  activeYear,
  activeMonth,
}: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<IncomeCategory>("salário");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editItem) {
      setDescription(editItem.description);
      setAmount(editItem.amount.toString().replace(".", ","));
      setCategory(editItem.category);
    } else {
      setDescription("");
      setAmount("");
      setCategory("salário");
    }
  }, [editItem, visible]);

  const handleSave = async () => {
    if (!description.trim() || !amount.trim()) {
      Alert.alert("Atenção", "Preencha descrição e valor.");
      return;
    }
    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Atenção", "Digite um valor válido.");
      return;
    }
    setLoading(true);
    try {
      if (editItem) {
        await updateIncome(editItem.id, {
          description: description.trim(),
          amount: parsedAmount,
          category,
        });
      } else {
        const baseDate = buildActiveMonthDate(activeYear, activeMonth);
        await addIncome({
          groupId,
          description: description.trim(),
          amount: parsedAmount,
          category,
          date: Timestamp.fromDate(baseDate),
          receivedBy: uid,
          receivedByName: userName,
        });
      }
      onClose();
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>
              {editItem ? "Editar" : "Nova"} 💰 Receita
            </Text>

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Salário março, VA…"
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.label}>Valor (R$)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor="#666"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Categoria</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesScroll}
            >
              {INCOME_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={styles.categoryChipEmoji}>
                    {INCOME_ICONS[cat]}
                  </Text>
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat && styles.categoryChipTextActive,
                    ]}
                  >
                    {cap(cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {editItem ? "Salvar alterações" : "Adicionar receita"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function buildActiveMonthDate(activeYear?: number, activeMonth?: number) {
  const now = new Date();
  if (activeYear === undefined || activeMonth === undefined) return now;
  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
  const day = Math.min(now.getDate(), daysInMonth);
  return new Date(
    activeYear,
    activeMonth,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: "#16213E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 12,
    maxHeight: "85%",
    borderTopWidth: 1,
    borderColor: "#2ecc71",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#2ecc71",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  label: { color: "#888", fontSize: 13, marginBottom: 8 },
  input: {
    backgroundColor: "#1A1A2E",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2ecc71",
  },
  categoriesScroll: { marginBottom: 24, flexGrow: 0 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A2E",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#0F3460",
    gap: 6,
  },
  categoryChipActive: {
    borderColor: "#2ecc71",
    backgroundColor: "rgba(46,204,113,0.15)",
  },
  categoryChipEmoji: { fontSize: 16 },
  categoryChipText: { color: "#888", fontSize: 13 },
  categoryChipTextActive: { color: "#2ecc71", fontWeight: "600" },
  saveBtn: {
    backgroundColor: "#27ae60",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelBtn: { padding: 12, alignItems: "center" },
  cancelBtnText: { color: "#666", fontSize: 14 },
});
