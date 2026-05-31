import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { logout } from "../../services/auth";
import {
  subscribeToExpenses,
  subscribeToMonthSnapshots,
  Expense,
  MonthSnapshot,
} from "../../services/expenses";
import { subscribeToIncomes, Income } from "../../services/income";
import {
  ensureGroupActiveMonth,
  subscribeToGroupSettings,
} from "../../services/groups";

export default function ProfileScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allIncomes, setAllIncomes] = useState<Income[]>([]);
  const [snapshots, setSnapshots] = useState<MonthSnapshot[]>([]);
  const [activePeriod, setActivePeriod] = useState<{
    year: number;
    month: number;
  } | null>(null);

  const groupId = profile?.groupId;

  useEffect(() => {
    if (!groupId || !user) return;
    const unsub = subscribeToExpenses(groupId, (list) => {
      setAllExpenses(list);
    });
    return unsub;
  }, [groupId, user]);

  useEffect(() => {
    if (!groupId) return;
    const unsub = subscribeToIncomes(groupId, setAllIncomes);
    return unsub;
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    ensureGroupActiveMonth(groupId);
    const unsub = subscribeToGroupSettings(groupId, setActivePeriod);
    return unsub;
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    const unsub = subscribeToMonthSnapshots(groupId, setSnapshots);
    return unsub;
  }, [groupId]);

  const periodYear = activePeriod?.year ?? new Date().getFullYear();
  const periodMonth = activePeriod?.month ?? new Date().getMonth();

  const myExpenses = useMemo(() => {
    if (!user) return [] as Expense[];
    return allExpenses.filter((e) => {
      const d = e.date.toDate();
      return (
        e.paidBy === user.uid &&
        d.getFullYear() === periodYear &&
        d.getMonth() === periodMonth
      );
    });
  }, [allExpenses, periodMonth, periodYear, user]);

  const periodExpenses = useMemo(
    () =>
      allExpenses.filter((e) => {
        const d = e.date.toDate();
        return d.getFullYear() === periodYear && d.getMonth() === periodMonth;
      }),
    [allExpenses, periodMonth, periodYear],
  );

  const periodIncomes = useMemo(
    () =>
      allIncomes.filter((i) => {
        const d = i.date.toDate();
        return d.getFullYear() === periodYear && d.getMonth() === periodMonth;
      }),
    [allIncomes, periodMonth, periodYear],
  );

  const prevPeriod = getPrevPeriod(periodYear, periodMonth);
  const prevSnapshot = snapshots.find(
    (s) => s.year === prevPeriod.year && s.month === prevPeriod.month,
  );

  const totalPessoal = myExpenses.reduce((s, e) => s + e.amount, 0);
  const totalFixo = myExpenses
    .filter((e) => e.type === "fixa")
    .reduce((s, e) => s + e.amount, 0);
  const totalVariavel = myExpenses
    .filter((e) => e.type === "variavel")
    .reduce((s, e) => s + e.amount, 0);

  const currentTotalExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const currentTotalIncome = periodIncomes.reduce((s, i) => s + i.amount, 0);
  const currentBalance = currentTotalIncome - currentTotalExpenses;

  const prevTotalExpenses = prevSnapshot?.totalExpenses ?? 0;
  const prevTotalIncome = prevSnapshot?.totalIncome ?? 0;
  const prevBalance = prevTotalIncome - prevTotalExpenses;

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => logout() },
    ]);
  };

  const monthName = new Date(periodYear, periodMonth, 1).toLocaleString(
    "pt-BR",
    {
      month: "long",
      year: "numeric",
    },
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {profile?.name?.charAt(0).toUpperCase() || "?"}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {groupId && (
          <View style={styles.activeMonthBadge}>
            <Text style={styles.activeMonthText}>Mes ativo: {monthName}</Text>
          </View>
        )}

        {groupId && (
          <>
            <Text style={styles.sectionTitle}>Meus gastos em {monthName}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>💰</Text>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={styles.statValue}>{fmt(totalPessoal)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>🏠</Text>
                <Text style={styles.statLabel}>Fixo</Text>
                <Text style={[styles.statValue, { color: "#E94560" }]}>
                  {fmt(totalFixo)}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>💸</Text>
                <Text style={styles.statLabel}>Variável</Text>
                <Text style={[styles.statValue, { color: "#4ECDC4" }]}>
                  {fmt(totalVariavel)}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Comparacao com mes anterior</Text>
            {prevSnapshot ? (
              <>
                <View style={styles.compareRow}>
                  <View style={styles.compareCard}>
                    <Text style={styles.compareLabel}>Gastos do mes</Text>
                    <Text style={styles.compareValue}>
                      {fmt(currentTotalExpenses)}
                    </Text>
                    <Text
                      style={[
                        styles.compareDelta,
                        deltaColor(currentTotalExpenses, prevTotalExpenses),
                      ]}
                    >
                      {formatDelta(currentTotalExpenses, prevTotalExpenses)}
                    </Text>
                  </View>
                  <View style={styles.compareCard}>
                    <Text style={styles.compareLabel}>Receitas do mes</Text>
                    <Text style={styles.compareValue}>
                      {fmt(currentTotalIncome)}
                    </Text>
                    <Text
                      style={[
                        styles.compareDelta,
                        deltaColor(currentTotalIncome, prevTotalIncome),
                      ]}
                    >
                      {formatDelta(currentTotalIncome, prevTotalIncome)}
                    </Text>
                  </View>
                </View>
                <View style={styles.compareCardWide}>
                  <Text style={styles.compareLabel}>Saldo do mes</Text>
                  <Text style={styles.compareValue}>{fmt(currentBalance)}</Text>
                  <Text
                    style={[
                      styles.compareDelta,
                      deltaColor(currentBalance, prevBalance),
                    ]}
                  >
                    {formatDelta(currentBalance, prevBalance)}
                  </Text>
                </View>
                <View style={styles.insightBox}>
                  <Text style={styles.insightTitle}>Insights</Text>
                  <Text style={styles.insightText}>
                    {buildInsight(
                      currentTotalExpenses,
                      prevTotalExpenses,
                      currentBalance,
                      prevBalance,
                    )}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.emptyCompare}>
                <Text style={styles.emptyCompareText}>
                  Feche o mes anterior para ver a comparacao.
                </Text>
              </View>
            )}
          </>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Grupo</Text>
          <Text style={styles.infoValue}>
            {profile?.groupId || "Sem grupo"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.groupBtn}
          onPress={() => router.push("/group")}
        >
          <Text style={styles.groupBtnText}>⚙️ Gerenciar Grupo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getPrevPeriod(year: number, month: number) {
  if (month === 0) return { year: year - 1, month: 11 };
  return { year, month: month - 1 };
}

function formatDelta(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? "0%" : "novo";
  }
  const diff = current - previous;
  const pct = Math.abs((diff / previous) * 100);
  const signal = diff > 0 ? "+" : diff < 0 ? "-" : "";
  return `${signal}${pct.toFixed(0)}%`;
}

function deltaColor(current: number, previous: number) {
  if (previous === 0) return { color: "#888" };
  if (current === previous) return { color: "#888" };
  return { color: current > previous ? "#FF6B6B" : "#2ecc71" };
}

function buildInsight(
  currentExpenses: number,
  prevExpenses: number,
  currentBalance: number,
  prevBalance: number,
) {
  const expensesDelta = currentExpenses - prevExpenses;
  const balanceDelta = currentBalance - prevBalance;
  const expensesText =
    prevExpenses === 0
      ? "Sem base no mes anterior para gastos."
      : expensesDelta > 0
        ? `Gastos subiram ${fmt(Math.abs(expensesDelta))}.`
        : expensesDelta < 0
          ? `Gastos cairam ${fmt(Math.abs(expensesDelta))}.`
          : "Gastos iguais ao mes anterior.";
  const balanceText =
    prevBalance === 0
      ? "Saldo sem comparacao anterior."
      : balanceDelta > 0
        ? `Saldo melhorou ${fmt(Math.abs(balanceDelta))}.`
        : balanceDelta < 0
          ? `Saldo piorou ${fmt(Math.abs(balanceDelta))}.`
          : "Saldo igual ao mes anterior.";
  return `${expensesText} ${balanceText}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A1A2E" },
  content: { alignItems: "center", padding: 32, paddingTop: 48 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E94560",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "bold" },
  name: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  email: { color: "#888", fontSize: 14, marginTop: 4, marginBottom: 24 },
  activeMonthBadge: {
    backgroundColor: "rgba(78,205,196,0.12)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#4ECDC4",
    marginBottom: 20,
  },
  activeMonthText: { color: "#4ECDC4", fontSize: 12, fontWeight: "600" },
  sectionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    alignSelf: "flex-start",
    marginBottom: 12,
    textTransform: "capitalize",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#16213E",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0F3460",
  },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statLabel: { color: "#888", fontSize: 11 },
  statValue: { color: "#fff", fontWeight: "bold", fontSize: 13, marginTop: 2 },
  compareRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginBottom: 10,
  },
  compareCard: {
    flex: 1,
    backgroundColor: "#16213E",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#0F3460",
  },
  compareCardWide: {
    width: "100%",
    backgroundColor: "#16213E",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#0F3460",
    marginBottom: 10,
  },
  compareLabel: { color: "#888", fontSize: 11 },
  compareValue: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    marginTop: 4,
  },
  compareDelta: { fontSize: 11, marginTop: 4, color: "#888" },
  insightBox: {
    width: "100%",
    backgroundColor: "rgba(46,204,113,0.08)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2ecc71",
    marginBottom: 20,
  },
  insightTitle: { color: "#2ecc71", fontWeight: "bold", fontSize: 12 },
  insightText: { color: "#ccc", fontSize: 12, marginTop: 6 },
  emptyCompare: {
    width: "100%",
    backgroundColor: "#16213E",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#0F3460",
    marginBottom: 20,
  },
  emptyCompareText: { color: "#888", fontSize: 12 },
  infoCard: {
    backgroundColor: "#16213E",
    borderRadius: 14,
    padding: 16,
    width: "100%",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#0F3460",
  },
  infoLabel: { color: "#888", fontSize: 12 },
  infoValue: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 4 },
  groupBtn: {
    backgroundColor: "#16213E",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E94560",
  },
  groupBtnText: { color: "#E94560", fontWeight: "bold", fontSize: 15 },
  logoutBtn: {
    padding: 16,
    width: "100%",
    alignItems: "center",
    marginTop: 8,
  },
  logoutBtnText: { color: "#666", fontSize: 15 },
});
