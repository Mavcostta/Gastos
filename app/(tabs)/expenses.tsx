import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
  subscribeToExpenses,
  deleteExpense,
  subscribeToPrivateExpenses,
  deletePrivateExpense,
  Expense,
  PrivateExpense,
  CATEGORY_ICONS,
} from "../../services/expenses";
import { getActiveGroupId } from "../../services/auth";
import {
  ensureGroupActiveMonth,
  subscribeToGroupSettings,
} from "../../services/groups";
import AddExpenseModal from "../../components/AddExpenseModal";
import AddPrivateExpenseModal from "../../components/AddPrivateExpenseModal";

export default function ExpensesScreen() {
  const { user, profile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [privateExpenses, setPrivateExpenses] = useState<PrivateExpense[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [editPrivateItem, setEditPrivateItem] = useState<PrivateExpense | null>(
    null,
  );
  const [filter, setFilter] = useState<"todos" | "meus" | "privados">("todos");
  const [activePeriod, setActivePeriod] = useState<{
    year: number;
    month: number;
  } | null>(null);

  const groupId = getActiveGroupId(profile);

  useEffect(() => {
    if (!groupId) return;
    const unsub = subscribeToExpenses(groupId, (list) => {
      setExpenses(list.filter((e) => e.type === "variavel"));
    });
    return unsub;
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    ensureGroupActiveMonth(groupId);
    const unsub = subscribeToGroupSettings(groupId, setActivePeriod);
    return unsub;
  }, [groupId]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToPrivateExpenses(user.uid, setPrivateExpenses);
    return unsub;
  }, [user]);

  const filtered =
    filter === "meus"
      ? expenses.filter((e) => e.paidBy === user?.uid)
      : expenses;

  const handleDelete = (id: string) => {
    Alert.alert("Excluir gasto", "Tem certeza?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => deleteExpense(id),
      },
    ]);
  };

  const handleDeletePrivate = (id: string) => {
    Alert.alert("Excluir gasto privado", "Tem certeza?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => deletePrivateExpense(user!.uid, id),
      },
    ]);
  };

  if (!groupId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.noGroupText}>
            Configure um grupo primeiro na aba Resumo.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gastos Variáveis</Text>
        {filter !== "privados" && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setEditItem(null);
              setShowModal(true);
            }}
          >
            <Text style={styles.addBtnText}>+ Novo</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            filter === "todos" && styles.filterBtnActive,
          ]}
          onPress={() => setFilter("todos")}
        >
          <Text
            style={[
              styles.filterBtnText,
              filter === "todos" && styles.filterBtnTextActive,
            ]}
          >
            Todos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            filter === "meus" && styles.filterBtnActive,
          ]}
          onPress={() => setFilter("meus")}
        >
          <Text
            style={[
              styles.filterBtnText,
              filter === "meus" && styles.filterBtnTextActive,
            ]}
          >
            Meus gastos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            filter === "privados" && styles.filterBtnPrivate,
          ]}
          onPress={() => setFilter("privados")}
        >
          <Text
            style={[
              styles.filterBtnText,
              filter === "privados" && styles.filterBtnTextPrivate,
            ]}
          >
            🔒 Privados
          </Text>
        </TouchableOpacity>
      </View>

      {filter === "meus" && (
        <View style={styles.personalTotal}>
          <Text style={styles.personalTotalText}>
            Meu total:{" "}
            <Text style={styles.personalTotalValue}>
              {filtered
                .reduce((s, e) => s + e.amount, 0)
                .toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
            </Text>
          </Text>
        </View>
      )}

      {filter === "privados" && (
        <View style={styles.privateBanner}>
          <Text style={styles.privateBannerText}>
            🔒 Só você vê esses gastos
          </Text>
          <TouchableOpacity
            style={styles.addPrivateBtn}
            onPress={() => {
              setEditPrivateItem(null);
              setShowPrivateModal(true);
            }}
          >
            <Text style={styles.addPrivateBtnText}>+ Novo privado</Text>
          </TouchableOpacity>
        </View>
      )}

      {filter === "privados" ? (
        <FlatList
          data={privateExpenses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum gasto privado cadastrado.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, styles.cardPrivate]}
              onLongPress={() => handleDeletePrivate(item.id)}
              onPress={() => {
                setEditPrivateItem(item);
                setShowPrivateModal(true);
              }}
            >
              <Text style={styles.cardEmoji}>
                {CATEGORY_ICONS[item.category] || "📦"}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardDesc}>{item.description}</Text>
                <Text style={styles.cardMeta}>
                  {item.date.toDate().toLocaleDateString("pt-BR")}
                </Text>
                <Text style={[styles.cardCategory, { color: "#DDA0DD" }]}>
                  {item.category}
                </Text>
              </View>
              <Text style={[styles.cardAmount, { color: "#DDA0DD" }]}>
                {item.amount.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum gasto registrado.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onLongPress={() => handleDelete(item.id)}
              onPress={() => {
                setEditItem(item);
                setShowModal(true);
              }}
            >
              <Text style={styles.cardEmoji}>
                {CATEGORY_ICONS[item.category] || "📦"}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardDesc}>{item.description}</Text>
                <Text style={styles.cardMeta}>
                  {item.paidByName} ·{" "}
                  {item.date.toDate().toLocaleDateString("pt-BR")}
                </Text>
                <Text style={styles.cardCategory}>{item.category}</Text>
              </View>
              <Text style={styles.cardAmount}>
                {item.amount.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <AddExpenseModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        groupId={groupId}
        uid={user!.uid}
        userName={profile!.name}
        type="variavel"
        editItem={editItem}
        activeYear={activePeriod?.year}
        activeMonth={activePeriod?.month}
      />

      <AddPrivateExpenseModal
        visible={showPrivateModal}
        onClose={() => setShowPrivateModal(false)}
        uid={user!.uid}
        editItem={editPrivateItem}
        activeYear={activePeriod?.year}
        activeMonth={activePeriod?.month}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A1A2E" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 12,
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  addBtn: {
    backgroundColor: "#E94560",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: "#fff", fontWeight: "bold" },
  card: {
    backgroundColor: "#16213E",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#0F3460",
  },
  cardEmoji: { fontSize: 24 },
  cardDesc: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cardMeta: { color: "#888", fontSize: 11, marginTop: 2 },
  cardCategory: {
    color: "#E94560",
    fontSize: 11,
    marginTop: 2,
    textTransform: "capitalize",
  },
  cardAmount: { color: "#4ECDC4", fontWeight: "bold", fontSize: 14 },
  empty: { color: "#666", textAlign: "center", marginTop: 40 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  noGroupText: { color: "#888", textAlign: "center" },
  filterRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#16213E",
    borderWidth: 1,
    borderColor: "#0F3460",
  },
  filterBtnActive: {
    backgroundColor: "rgba(233,69,96,0.15)",
    borderColor: "#E94560",
  },
  filterBtnPrivate: {
    backgroundColor: "rgba(221,160,221,0.15)",
    borderColor: "#DDA0DD",
  },
  filterBtnText: { color: "#888", fontSize: 13 },
  filterBtnTextActive: { color: "#E94560", fontWeight: "600" },
  filterBtnTextPrivate: { color: "#DDA0DD", fontWeight: "600" },
  personalTotal: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#16213E",
    borderRadius: 10,
    padding: 10,
  },
  personalTotalText: { color: "#888", fontSize: 13 },
  personalTotalValue: { color: "#4ECDC4", fontWeight: "bold" },
  cardPrivate: {
    borderColor: "#5a3a6a",
    backgroundColor: "#1e1230",
  },
  privateBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#1e1230",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#5a3a6a",
  },
  privateBannerText: { color: "#DDA0DD", fontSize: 13 },
  addPrivateBtn: {
    backgroundColor: "#DDA0DD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addPrivateBtnText: { color: "#1A1A2E", fontWeight: "bold", fontSize: 12 },
});
