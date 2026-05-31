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
  addPrivateExpense,
  updatePrivateExpense,
  PrivateExpense,
  CATEGORIES,
  CATEGORY_ICONS,
  Category,
} from "../services/expenses";

interface Props {
  visible: boolean;
  onClose: () => void;
  uid: string;
  editItem?: PrivateExpense | null;
  activeYear?: number;
  activeMonth?: number;
}

export default function AddPrivateExpenseModal({
  visible,
  onClose,
  uid,
  editItem,
  activeYear,
  activeMonth,
}: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("outros");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editItem) {
      setDescription(editItem.description);
      setAmount(editItem.amount.toString().replace(".", ","));
      setCategory(editItem.category);
    } else {
      setDescription("");
      setAmount("");
      setCategory("outros");
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
        await updatePrivateExpense(uid, editItem.id, {
          description: description.trim(),
          amount: parsedAmount,
          category,
        });
      } else {
        const baseDate = buildActiveMonthDate(activeYear, activeMonth);
        await addPrivateExpense(uid, {
          description: description.trim(),
          amount: parsedAmount,
          category,
          date: Timestamp.fromDate(baseDate),
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
              {editItem ? "Editar" : "Novo"} 🔒 Gasto Privado
            </Text>
            <Text style={styles.subtitle}>Só você verá este gasto</Text>

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Presente, assinatura…"
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
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={styles.categoryChipEmoji}>
                    {CATEGORY_ICONS[cat]}
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
                  {editItem ? "Salvar alterações" : "Adicionar privado"}
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
    backgroundColor: "#1A1230",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 12,
    maxHeight: "85%",
    borderTopWidth: 1,
    borderColor: "#5a3a6a",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#5a3a6a",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    color: "#DDA0DD",
    fontSize: 12,
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
    borderColor: "#5a3a6a",
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
    borderColor: "#5a3a6a",
    gap: 6,
  },
  categoryChipActive: {
    borderColor: "#DDA0DD",
    backgroundColor: "rgba(221,160,221,0.15)",
  },
  categoryChipEmoji: { fontSize: 16 },
  categoryChipText: { color: "#888", fontSize: 13 },
  categoryChipTextActive: { color: "#DDA0DD", fontWeight: "600" },
  saveBtn: {
    backgroundColor: "#9B59B6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelBtn: { padding: 12, alignItems: "center" },
  cancelBtnText: { color: "#666", fontSize: 14 },
});
