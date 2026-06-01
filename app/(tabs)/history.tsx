import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { getActiveGroupId } from "../../services/auth";
import { subscribeToExpenses, Expense } from "../../services/expenses";
import { subscribeToIncomes, Income } from "../../services/income";
import { subscribeToGroupSettings } from "../../services/groups";

interface MonthSummary {
  key: string;
  year: number;
  month: number;
  totalExpenses: number;
  totalIncome: number;
  totalFixed: number;
  totalVariable: number;
  count: number;
}

export default function HistoryScreen() {
  const { profile } = useAuth();
  const groupId = getActiveGroupId(profile);

  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allIncomes, setAllIncomes] = useState<Income[]>([]);
  const [activePeriod, setActivePeriod] = useState<{
    year: number;
    month: number;
  } | null>(null);

  useEffect(() => {
    if (!groupId) return;
    const unsub = subscribeToExpenses(groupId, setAllExpenses);
    return unsub;
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    const unsub = subscribeToIncomes(groupId, setAllIncomes);
    return unsub;
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    const unsub = subscribeToGroupSettings(groupId, (settings) => {
      if (!settings) {
        setActivePeriod(null);
        return;
      }
      setActivePeriod({ year: settings.activeYear, month: settings.activeMonth });
    });
    return unsub;
  }, [groupId]);

  const months = useMemo(() => {
    const map = new Map<string, MonthSummary>();

    const ensure = (year: number, month: number) => {
      const key = `${year}-${String(month).padStart(2, "0")}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          year,
          month,
          totalExpenses: 0,
          totalIncome: 0,
          totalFixed: 0,
          totalVariable: 0,
          count: 0,
        });
      }
      return map.get(key)!;
    };

    allExpenses.forEach((e) => {
      if (e.type === "fixa" && !e.paid) return;
      const baseDate =
        e.type === "fixa" && e.paidAt ? e.paidAt.toDate() : e.date.toDate();
      const item = ensure(baseDate.getFullYear(), baseDate.getMonth());
      item.totalExpenses += e.amount;
      item.count += 1;
      if (e.type === "fixa") item.totalFixed += e.amount;
      if (e.type === "variavel") item.totalVariable += e.amount;
    });

    allIncomes.forEach((i) => {
      const d = i.date.toDate();
      const item = ensure(d.getFullYear(), d.getMonth());
      item.totalIncome += i.amount;
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [allExpenses, allIncomes]);

  if (!groupId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Configure um grupo primeiro.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Historico mensal</Text>
        {activePeriod && (
          <Text style={styles.subtitle}>
            Mes ativo: {formatMonth(activePeriod.year, activePeriod.month)}
          </Text>
        )}

        {months.length === 0 && (
          <Text style={styles.emptyText}>Sem lancamentos anteriores.</Text>
        )}

        {months.map((m) => {
          const balance = m.totalIncome - m.totalExpenses;
          return (
            <View key={m.key} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {formatMonth(m.year, m.month)}
                </Text>
                <Text
                  style={[
                    styles.balance,
                    { color: balance >= 0 ? "#2ecc71" : "#FF6B6B" },
                  ]}
                >
                  {balance >= 0 ? "+" : ""}
                  {fmt(balance)}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Receitas</Text>
                <Text style={styles.value}>{fmt(m.totalIncome)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Despesas</Text>
                <Text style={styles.value}>{fmt(m.totalExpenses)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Fixas</Text>
                <Text style={styles.value}>{fmt(m.totalFixed)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Variaveis</Text>
                <Text style={styles.value}>{fmt(m.totalVariable)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Lancamentos</Text>
                <Text style={styles.value}>{m.count}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatMonth(year: number, month: number) {
  return new Date(year, month, 1).toLocaleString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A1A2E" },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: "#fff", fontSize: 20, fontWeight: "bold", marginBottom: 6 },
  subtitle: { color: "#888", fontSize: 12, marginBottom: 16 },
  card: {
    backgroundColor: "#16213E",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#0F3460",
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: { color: "#fff", fontSize: 14, fontWeight: "600" },
  balance: { fontSize: 14, fontWeight: "bold" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  label: { color: "#888", fontSize: 11 },
  value: { color: "#fff", fontSize: 12, fontWeight: "600" },
  emptyText: { color: "#666", textAlign: "center", marginTop: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
