import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
  subscribeToFixedBills,
  deleteExpense,
  toggleBillPaid,
  resetBillsPaid,
  Expense,
  CATEGORY_ICONS,
} from "../../services/expenses";
import { getActiveGroupId } from "../../services/auth";
import {
  ensureGroupActiveMonth,
  subscribeToGroupSettings,
} from "../../services/groups";
import AddExpenseModal from "../../components/AddExpenseModal";

export default function BillsScreen() {
  const { user, profile } = useAuth();
  const [bills, setBills] = useState<Expense[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [activePeriod, setActivePeriod] = useState<{
    year: number;
    month: number;
  } | null>(null);
  const today = new Date();

  const groupId = getActiveGroupId(profile);

  useEffect(() => {
    if (!groupId) return;
    const unsub = subscribeToFixedBills(groupId, setBills);
    return unsub;
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    ensureGroupActiveMonth(groupId);
    const unsub = subscribeToGroupSettings(groupId, (settings) => {
      if (!settings) {
        setActivePeriod(null);
        return;
      }
      setActivePeriod({ year: settings.activeYear, month: settings.activeMonth });
    });
    return unsub;
  }, [groupId]);

  const activeMonthLabel = new Date(
    activePeriod?.year ?? today.getFullYear(),
    activePeriod?.month ?? today.getMonth(),
    1,
  ).toLocaleString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const handleDelete = (id: string) => {
    if (Platform.OS === "web") {
      if (window.confirm("Excluir esta conta?")) deleteExpense(id);
      return;
    }
    Alert.alert("Excluir conta", "Tem certeza?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => deleteExpense(id),
      },
    ]);
  };

  const handleTogglePaid = (item: Expense) => {
    const nowPaid = !item.paid;
    toggleBillPaid(item.id, nowPaid, nowPaid ? profile!.name : undefined);
  };

  const handleRenew = () => {
    if (bills.length === 0) return;
    resetBillsPaid(bills);
  };

  const total = bills.reduce((s, b) => s + b.amount, 0);
  const totalPaid = bills
    .filter((b) => b.paid)
    .reduce((s, b) => s + b.amount, 0);
  const countPaid = bills.filter((b) => b.paid).length;
  const progressPct =
    bills.length > 0 ? Math.round((countPaid / bills.length) * 100) : 0;

  // ordenar: pendentes primeiro, depois pagas
  const sorted = [...bills].sort((a, b) => {
    if (!!a.paid === !!b.paid) return b.date.toMillis() - a.date.toMillis();
    return a.paid ? 1 : -1;
  });

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
        <Text style={styles.title}>🏠 Contas Fixas</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {bills.some((b) => b.paid) && (
            <TouchableOpacity style={styles.renewBtn} onPress={handleRenew}>
              <Text style={styles.renewBtnText}>🔄 Novo mês</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setEditItem(null);
              setShowModal(true);
            }}
          >
            <Text style={styles.addBtnText}>+ Nova</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.activeMonthHint}>Mes ativo: {activeMonthLabel}</Text>

      {/* Banner de totais */}
      <View style={styles.totalBanner}>
        <View>
          <Text style={styles.totalLabel}>Total mensal</Text>
          <Text style={styles.totalValue}>
            {total.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.totalLabel}>Pago até agora</Text>
          <Text style={[styles.totalValue, { color: "#4ECDC4" }]}>
            {totalPaid.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </Text>
        </View>
      </View>

      {/* Barra de progresso */}
      {bills.length > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {countPaid} de {bills.length} contas pagas
            </Text>
            <Text style={styles.progressPct}>{progressPct}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progressPct}%` as any }]}
            />
          </View>
        </View>
      )}

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma conta fixa cadastrada.</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.paid && styles.cardPaid]}>
            {/* Toque no corpo → editar */}
            <TouchableOpacity
              style={styles.cardBody}
              onLongPress={() => handleDelete(item.id)}
              onPress={() => {
                setEditItem(item);
                setShowModal(true);
              }}
            >
              <Text style={styles.cardEmoji}>
                {CATEGORY_ICONS[item.category] || "🏠"}
              </Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.cardDesc, item.paid && styles.cardDescPaid]}
                >
                  {item.description}
                </Text>
                <Text style={styles.cardCategory}>{item.category}</Text>
                {item.paid && item.paidByName2 ? (
                  <Text style={styles.cardPaidBy}>
                    ✓ Pago por {item.paidByName2}
                  </Text>
                ) : (
                  <Text style={styles.cardMeta}>
                    Toque para editar · Segure para excluir
                  </Text>
                )}
              </View>
              <Text
                style={[styles.cardAmount, item.paid && styles.cardAmountPaid]}
              >
                {item.amount.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </Text>
            </TouchableOpacity>

            {/* Botão de pagar */}
            <TouchableOpacity
              style={[styles.payBtn, item.paid && styles.payBtnPaid]}
              onPress={() => handleTogglePaid(item)}
            >
              <Text
                style={[styles.payBtnText, item.paid && styles.payBtnTextPaid]}
              >
                {item.paid ? "✓ Pago" : "Pagar"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <AddExpenseModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        groupId={groupId}
        uid={user!.uid}
        userName={profile!.name}
        type="fixa"
        editItem={editItem}
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
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: "#1A1A2E", fontWeight: "bold" },
  renewBtn: {
    backgroundColor: "rgba(78,205,196,0.15)",
    borderWidth: 1,
    borderColor: "#4ECDC4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  renewBtnText: { color: "#4ECDC4", fontWeight: "bold", fontSize: 12 },
  totalBanner: {
    marginHorizontal: 16,
    backgroundColor: "#16213E",
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#0F3460",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { color: "#888", fontSize: 12 },
  totalValue: { color: "#fff", fontSize: 17, fontWeight: "bold", marginTop: 2 },
  progressContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressText: { color: "#888", fontSize: 12 },
  progressPct: { color: "#4ECDC4", fontSize: 12, fontWeight: "bold" },
  progressBar: {
    height: 6,
    backgroundColor: "#16213E",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    backgroundColor: "#4ECDC4",
    borderRadius: 4,
  },
  card: {
    backgroundColor: "#16213E",
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#0F3460",
    overflow: "hidden",
  },
  cardPaid: {
    borderColor: "#4ECDC4",
    opacity: 0.75,
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  cardEmoji: { fontSize: 24 },
  cardDesc: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cardDescPaid: {
    textDecorationLine: "line-through",
    color: "#888",
  },
  cardCategory: {
    color: "#4ECDC4",
    fontSize: 11,
    marginTop: 2,
    textTransform: "capitalize",
  },
  cardPaidBy: { color: "#4ECDC4", fontSize: 10, marginTop: 2 },
  cardMeta: { color: "#555", fontSize: 10, marginTop: 2 },
  cardAmount: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  cardAmountPaid: { color: "#4ECDC4" },
  payBtn: {
    backgroundColor: "#0F3460",
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#0F3460",
  },
  payBtnPaid: {
    backgroundColor: "rgba(78,205,196,0.12)",
    borderColor: "#4ECDC4",
  },
  payBtnText: { color: "#888", fontSize: 13, fontWeight: "600" },
  payBtnTextPaid: { color: "#4ECDC4" },
  empty: { color: "#666", textAlign: "center", marginTop: 40 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  noGroupText: { color: "#888", textAlign: "center" },
  activeMonthHint: {
    color: "#6c7a93",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 6,
  },
});
