import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import {
  subscribeToExpenses,
  subscribeToFixedBills,
  Expense,
  CATEGORY_ICONS,
  Category,
  resetBillsPaid,
  saveMonthSnapshot,
} from "../../services/expenses";
import { subscribeToGoals, Goal } from "../../services/goals";
import {
  subscribeToIncomes,
  Income,
  INCOME_ICONS,
  copyRecurringIncomes,
} from "../../services/income";
import {
  ensureGroupActiveMonth,
  setActiveMonth,
  subscribeToGroupSettings,
} from "../../services/groups";
import GoalsModal from "../../components/GoalsModal";
import AddIncomeModal from "../../components/AddIncomeModal";

export default function DashboardScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();

  // ── dados brutos (todos os meses) ────────────────────────────────────────
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [bills, setBills] = useState<Expense[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [allIncomes, setAllIncomes] = useState<Income[]>([]);
  const [activePeriod, setActivePeriod] = useState<{
    year: number;
    month: number;
  } | null>(null);
  const [closingMonth, setClosingMonth] = useState(false);
  const [hasInitMonth, setHasInitMonth] = useState(false);
  const prevActiveRef = useRef<{ year: number; month: number } | null>(null);

  // ── navegação de mês ─────────────────────────────────────────────────────
  const today = new Date();
  const [selYear, setSelYear] = useState(today.getFullYear());
  const [selMonth, setSelMonth] = useState(today.getMonth()); // 0-indexed

  const isCurrentMonth =
    selYear === today.getFullYear() && selMonth === today.getMonth();
  const isActiveMonth = activePeriod
    ? selYear === activePeriod.year && selMonth === activePeriod.month
    : isCurrentMonth;

  const [showGoals, setShowGoals] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [editIncome, setEditIncome] = useState<Income | null>(null);

  const groupId = profile?.groupId;

  useEffect(() => {
    if (!groupId) return;
    const unsubExp = subscribeToExpenses(groupId, setAllExpenses);
    const unsubBills = subscribeToFixedBills(groupId, setBills);
    const unsubGoals = subscribeToGoals(groupId, setGoals);
    const unsubInc = subscribeToIncomes(groupId, setAllIncomes);
    return () => {
      unsubExp();
      unsubBills();
      unsubGoals();
      unsubInc();
    };
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    ensureGroupActiveMonth(groupId);
    const unsub = subscribeToGroupSettings(groupId, setActivePeriod);
    return unsub;
  }, [groupId]);

  useEffect(() => {
    if (!activePeriod) return;
    const prev = prevActiveRef.current;
    const shouldSync =
      !hasInitMonth ||
      (prev && selYear === prev.year && selMonth === prev.month);
    if (shouldSync) {
      setSelYear(activePeriod.year);
      setSelMonth(activePeriod.month);
      setHasInitMonth(true);
    }
    prevActiveRef.current = activePeriod;
  }, [activePeriod, hasInitMonth, selMonth, selYear]);

  // ── filtro por mês selecionado ────────────────────────────────────────────
  const expenses = useMemo(
    () =>
      allExpenses.filter((e) => {
        const d = e.date.toDate();
        return d.getFullYear() === selYear && d.getMonth() === selMonth;
      }),
    [allExpenses, selYear, selMonth],
  );

  const incomes = useMemo(
    () =>
      allIncomes.filter((i) => {
        const d = i.date.toDate();
        return d.getFullYear() === selYear && d.getMonth() === selMonth;
      }),
    [allIncomes, selYear, selMonth],
  );

  // ── navegação de mês ──────────────────────────────────────────────────────
  const prevMonth = () => {
    if (selMonth === 0) {
      setSelMonth(11);
      setSelYear(selYear - 1);
    } else setSelMonth(selMonth - 1);
  };
  const nextMonth = () => {
    if (selMonth === 11) {
      setSelMonth(0);
      setSelYear(selYear + 1);
    } else setSelMonth(selMonth + 1);
  };
  const monthLabel = new Date(selYear, selMonth, 1).toLocaleString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const confirmCloseMonth = () => {
    const msg = `Fechar ${monthLabel}? Você vai começar a lançar no próximo mês.`;
    if (Platform.OS === "web") {
      return Promise.resolve(window.confirm(msg));
    }
    return new Promise<boolean>((resolve) => {
      Alert.alert("Fechar mês", msg, [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
        { text: "Fechar", style: "destructive", onPress: () => resolve(true) },
      ]);
    });
  };

  const handleCloseMonth = async () => {
    if (!groupId || closingMonth) return;
    const ok = await confirmCloseMonth();
    if (!ok) return;
    setClosingMonth(true);
    try {
      await saveMonthSnapshot(groupId, selYear, selMonth, {
        groupId,
        year: selYear,
        month: selMonth,
        monthLabel,
        totalExpenses,
        totalFixed,
        totalVariable,
        totalIncome,
        billsSummary: bills.map((b) => ({
          description: b.description,
          amount: b.amount,
          splitBetween: b.splitBetween ?? 1,
          paid: !!b.paid,
          paidByName2: b.paidByName2,
        })),
      });
      await resetBillsPaid(bills);
      await copyRecurringIncomes(groupId, selYear, selMonth);
      const nextDate = new Date(selYear, selMonth + 1, 1);
      await setActiveMonth(
        groupId,
        nextDate.getFullYear(),
        nextDate.getMonth(),
      );
      setSelYear(nextDate.getFullYear());
      setSelMonth(nextDate.getMonth());
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setClosingMonth(false);
    }
  };

  // ── totais ────────────────────────────────────────────────────────────────
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalFixed = expenses
    .filter((e) => e.type === "fixa")
    .reduce((s, e) => s + e.amount, 0);
  const totalVariable = expenses
    .filter((e) => e.type === "variavel")
    .reduce((s, e) => s + e.amount, 0);
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const balance = totalIncome - totalExpenses;

  // ── saldo entre usuários ──────────────────────────────────────────────────
  const byUser = expenses.reduce<
    Record<string, { name: string; total: number }>
  >((acc, e) => {
    if (!acc[e.paidBy]) acc[e.paidBy] = { name: e.paidByName, total: 0 };
    acc[e.paidBy].total += e.amount;
    return acc;
  }, {});
  const userEntries = Object.entries(byUser).sort(
    ([, a], [, b]) => b.total - a.total,
  );
  const myTotal = byUser[user?.uid ?? ""]?.total ?? 0;
  const othersTotal = Object.entries(byUser)
    .filter(([uid]) => uid !== user?.uid)
    .reduce((s, [, v]) => s + v.total, 0);
  const splitDiff = myTotal - totalExpenses / 2;

  // ── contas fixas ──────────────────────────────────────────────────────────
  const billsPaid = bills.filter((b) => b.paid).length;
  const billsPct = bills.length > 0 ? (billsPaid / bills.length) * 100 : 0;

  // ── por categoria ─────────────────────────────────────────────────────────
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const maxCatVal = Math.max(...Object.values(byCategory), 1);

  // ── alertas ───────────────────────────────────────────────────────────────
  const alerts = goals.filter((g) => (byCategory[g.category] || 0) > g.limit);

  // ── projeção (só mês atual) ───────────────────────────────────────────────
  const endOfMonth = new Date(selYear, selMonth + 1, 0);
  const daysTotal = endOfMonth.getDate();
  const daysPassed = isCurrentMonth ? today.getDate() : daysTotal;
  const daysLeft = isCurrentMonth ? daysTotal - today.getDate() : 0;
  const dailyAvg = daysPassed > 0 ? totalVariable / daysPassed : 0;
  const projectedMonth = dailyAvg * daysTotal;

  if (!groupId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noGroupContainer}>
          <Text style={styles.noGroupEmoji}>👥</Text>
          <Text style={styles.noGroupTitle}>Você não está em um grupo</Text>
          <Text style={styles.noGroupText}>
            Para compartilhar gastos, crie ou entre em um grupo com sua
            namorada.
          </Text>
          <TouchableOpacity
            style={styles.groupButton}
            onPress={() => router.push("/group")}
          >
            <Text style={styles.groupButtonText}>Configurar Grupo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── Cabeçalho ── */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Olá, {profile?.name?.split(" ")[0]} 👋
          </Text>
          <TouchableOpacity
            style={styles.goalsBtn}
            onPress={() => setShowGoals(true)}
          >
            <Text style={styles.goalsBtnText}>🎯 Metas</Text>
          </TouchableOpacity>
        </View>

        {/* ── Navegação de mês ── */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.monthArrow} onPress={prevMonth}>
            <Text style={styles.monthArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity
            style={[
              styles.monthArrow,
              !isActiveMonth && styles.monthArrowActive,
            ]}
            onPress={nextMonth}
            disabled={isActiveMonth}
          >
            <Text
              style={[
                styles.monthArrowText,
                isActiveMonth && { color: "#333" },
              ]}
            >
              ›
            </Text>
          </TouchableOpacity>
        </View>

        {isActiveMonth && (
          <TouchableOpacity
            style={[
              styles.closeMonthBtn,
              closingMonth && styles.closeMonthBtnDisabled,
            ]}
            onPress={handleCloseMonth}
            disabled={closingMonth}
          >
            <Text style={styles.closeMonthBtnText}>
              {closingMonth ? "Fechando..." : "Fechar mês"}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Alertas ── */}
        {alerts.length > 0 && (
          <View style={styles.alertsBox}>
            <Text style={styles.alertsTitle}>⚠️ Limites ultrapassados</Text>
            {alerts.map((g) => {
              const spent = byCategory[g.category] || 0;
              return (
                <View key={g.category} style={styles.alertRow}>
                  <Text style={styles.alertEmoji}>
                    {CATEGORY_ICONS[g.category as Category]}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertCat}>{cap(g.category)}</Text>
                    <Text style={styles.alertMsg}>
                      {formatCurrency(spent)} · limite {formatCurrency(g.limit)}
                    </Text>
                  </View>
                  <Text style={styles.alertOver}>
                    +{formatCurrency(spent - g.limit)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Receitas ── */}
        <View style={styles.incomeCard}>
          <View style={styles.incomeRow}>
            <View>
              <Text style={styles.incomeLabel}>💰 Receitas do mês</Text>
              <Text style={styles.incomeValue}>
                {formatCurrency(totalIncome)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addIncomeBtn}
              onPress={() => {
                setEditIncome(null);
                setShowIncomeModal(true);
              }}
            >
              <Text style={styles.addIncomeBtnText}>+ Adicionar</Text>
            </TouchableOpacity>
          </View>
          {incomes.length > 0 && (
            <View style={styles.incomeList}>
              {incomes.slice(0, 3).map((inc) => (
                <TouchableOpacity
                  key={inc.id}
                  style={styles.incomeItem}
                  onPress={() => {
                    setEditIncome(inc);
                    setShowIncomeModal(true);
                  }}
                >
                  <Text style={styles.incomeIcon}>
                    {INCOME_ICONS[inc.category]}
                  </Text>
                  <Text style={styles.incomeItemDesc} numberOfLines={1}>
                    {inc.description}
                  </Text>
                  <Text style={styles.incomeItemVal}>
                    {formatCurrency(inc.amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Saldo (receita - despesa) ── */}
        <View
          style={[
            styles.balanceCard,
            { borderColor: balance >= 0 ? "#2ecc71" : "#FF6B6B" },
          ]}
        >
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Saldo do mês</Text>
              <Text
                style={[
                  styles.balanceValue,
                  { color: balance >= 0 ? "#2ecc71" : "#FF6B6B" },
                ]}
              >
                {balance >= 0 ? "+" : ""}
                {formatCurrency(balance)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={styles.balanceSub}>
                Receitas: {formatCurrency(totalIncome)}
              </Text>
              <Text style={styles.balanceSub}>
                Despesas: {formatCurrency(totalExpenses)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Total + projeção ── */}
        <View style={styles.totalCard}>
          <View style={styles.totalCardRow}>
            <View>
              <Text style={styles.totalLabel}>Total gasto</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(totalExpenses)}
              </Text>
            </View>
            {isCurrentMonth && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.totalLabel}>{daysLeft}d restantes</Text>
                <Text style={styles.totalSub}>
                  Média/dia: {formatCurrency(dailyAvg)}
                </Text>
                <Text style={[styles.totalSub, { color: "#ffd59e" }]}>
                  Projeção: {formatCurrency(projectedMonth)}
                </Text>
              </View>
            )}
          </View>
          {isCurrentMonth && (
            <>
              <View style={styles.monthBar}>
                <View
                  style={[
                    styles.monthBarFill,
                    {
                      width:
                        `${((daysPassed / daysTotal) * 100).toFixed(0)}%` as any,
                    },
                  ]}
                />
              </View>
              <Text style={styles.monthBarLabel}>
                Dia {daysPassed} de {daysTotal}
              </Text>
            </>
          )}
        </View>

        {/* ── Saldo entre vocês ── */}
        {userEntries.length > 0 && (
          <View style={styles.splitCard}>
            <Text style={styles.splitTitle}>⚖️ Divisão entre vocês</Text>
            <View style={styles.splitRow}>
              {userEntries.map(([uid, { name, total }]) => (
                <View key={uid} style={styles.splitUser}>
                  <Text style={styles.splitName}>{name.split(" ")[0]}</Text>
                  <Text
                    style={[
                      styles.splitAmt,
                      uid === user?.uid && { color: "#4ECDC4" },
                    ]}
                  >
                    {formatCurrency(total)}
                  </Text>
                  <Text style={styles.splitPct}>
                    {totalExpenses > 0
                      ? ((total / totalExpenses) * 100).toFixed(0)
                      : 0}
                    %
                  </Text>
                </View>
              ))}
            </View>
            {userEntries.length >= 2 && (
              <Text style={styles.splitMsg}>
                {splitDiff > 1
                  ? `Você gastou ${formatCurrency(splitDiff)} a mais · ela te deve ${formatCurrency(splitDiff)}`
                  : splitDiff < -1
                    ? `Ela gastou ${formatCurrency(-splitDiff)} a mais · você deve ${formatCurrency(-splitDiff)}`
                    : "✓ Divisão equilibrada"}
              </Text>
            )}
          </View>
        )}

        {/* ── Fixas vs Variáveis ── */}
        <View style={styles.row}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>🏠</Text>
            <Text style={styles.summaryLabel}>Contas Fixas</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(totalFixed)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>💸</Text>
            <Text style={styles.summaryLabel}>Variáveis</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(totalVariable)}
            </Text>
          </View>
        </View>

        {/* ── Status contas fixas ── */}
        {bills.length > 0 && (
          <TouchableOpacity
            style={styles.billsCard}
            onPress={() => router.push("/(tabs)/bills" as any)}
          >
            <View style={styles.billsRow}>
              <Text style={styles.billsTitle}>🏠 Contas do mês</Text>
              <Text style={styles.billsCount}>
                {billsPaid}/{bills.length} pagas
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${billsPct.toFixed(0)}%` as any },
                ]}
              />
            </View>
            <Text style={styles.billsSub}>
              {formatCurrency(
                bills.filter((b) => b.paid).reduce((s, b) => s + b.amount, 0),
              )}{" "}
              pagos
              {" · "}
              {formatCurrency(
                bills.filter((b) => !b.paid).reduce((s, b) => s + b.amount, 0),
              )}{" "}
              pendente
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Gráfico de barras por categoria ── */}
        {Object.keys(byCategory).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>📊 Por categoria</Text>
            {Object.entries(byCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, value]) => {
                const goal = goals.find((g) => g.category === cat);
                const barPct = (value / maxCatVal) * 100;
                const goalPct = goal
                  ? Math.min((value / goal.limit) * 100, 100)
                  : null;
                const over = goal ? value > goal.limit : false;
                return (
                  <View
                    key={cat}
                    style={[
                      styles.categoryCard,
                      over && styles.categoryCardAlert,
                    ]}
                  >
                    <View style={styles.categoryCardHeader}>
                      <View style={styles.categoryLeft}>
                        <Text style={styles.categoryEmoji}>
                          {CATEGORY_ICONS[cat as Category] || "📦"}
                        </Text>
                        <Text style={styles.categoryName}>{cap(cat)}</Text>
                        {over && <Text style={styles.overBadge}>ACIMA</Text>}
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={[
                            styles.categoryValue,
                            over && { color: "#FF6B6B" },
                          ]}
                        >
                          {formatCurrency(value)}
                        </Text>
                        {goal && (
                          <Text style={styles.categoryGoalText}>
                            de {formatCurrency(goal.limit)}
                          </Text>
                        )}
                      </View>
                    </View>
                    {/* barra proporcional ao maior valor */}
                    <View style={styles.catBarTrack}>
                      <View
                        style={[
                          styles.catBarFill,
                          {
                            width: `${barPct.toFixed(0)}%` as any,
                            backgroundColor: over ? "#FF6B6B" : "#E94560",
                          },
                        ]}
                      />
                      {/* marcador de meta */}
                      {goal && (
                        <View
                          style={[
                            styles.catGoalMarker,
                            {
                              left: `${Math.min((goal.limit / maxCatVal) * 100, 98).toFixed(0)}%` as any,
                            },
                          ]}
                        />
                      )}
                    </View>
                    {goalPct !== null && (
                      <Text
                        style={[
                          styles.catGoalPct,
                          over && { color: "#FF6B6B" },
                        ]}
                      >
                        {goalPct.toFixed(0)}% da meta
                      </Text>
                    )}
                  </View>
                );
              })}
          </>
        )}

        {Object.keys(byCategory).length === 0 && (
          <Text style={styles.emptyText}>
            Nenhum gasto registrado neste mês.
          </Text>
        )}

        {/* ── Últimos lançamentos ── */}
        <Text style={styles.sectionTitle}>Últimos lançamentos</Text>
        {expenses.slice(0, 5).map((e) => (
          <View key={e.id} style={styles.expenseRow}>
            <Text style={styles.expenseEmoji}>
              {CATEGORY_ICONS[e.category] || "📦"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.expenseDesc}>{e.description}</Text>
              <Text style={styles.expenseMeta}>
                {e.paidByName} · {e.date.toDate().toLocaleDateString("pt-BR")}
              </Text>
            </View>
            <Text style={styles.expenseAmount}>{formatCurrency(e.amount)}</Text>
          </View>
        ))}
        {expenses.length === 0 && (
          <Text style={styles.emptyText}>Nenhum lançamento neste mês.</Text>
        )}

        <TouchableOpacity
          style={styles.groupLink}
          onPress={() => router.push("/group")}
        >
          <Text style={styles.groupLinkText}>⚙️ Grupo: {groupId}</Text>
        </TouchableOpacity>
      </ScrollView>

      <GoalsModal
        visible={showGoals}
        onClose={() => setShowGoals(false)}
        groupId={groupId}
        goals={goals}
      />
      <AddIncomeModal
        visible={showIncomeModal}
        onClose={() => setShowIncomeModal(false)}
        groupId={groupId}
        uid={user!.uid}
        userName={profile!.name}
        editItem={editIncome}
        activeYear={activePeriod?.year}
        activeMonth={activePeriod?.month}
      />
    </SafeAreaView>
  );
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A1A2E" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  greeting: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  goalsBtn: {
    backgroundColor: "rgba(233,69,96,0.15)",
    borderWidth: 1,
    borderColor: "#E94560",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  goalsBtnText: { color: "#E94560", fontWeight: "700", fontSize: 13 },

  // navegação de mês
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 16,
  },
  monthArrow: { padding: 8 },
  monthArrowActive: {},
  monthArrowText: { color: "#fff", fontSize: 28, lineHeight: 30 },
  monthLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textTransform: "capitalize",
    flex: 1,
    textAlign: "center",
  },
  closeMonthBtn: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "rgba(255,107,107,0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FF6B6B",
    paddingVertical: 10,
    alignItems: "center",
  },
  closeMonthBtnDisabled: { opacity: 0.7 },
  closeMonthBtnText: { color: "#FF6B6B", fontWeight: "700", fontSize: 12 },

  // alertas
  alertsBox: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "rgba(255,107,107,0.1)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FF6B6B",
    padding: 12,
  },
  alertsTitle: {
    color: "#FF6B6B",
    fontWeight: "bold",
    fontSize: 13,
    marginBottom: 8,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  alertEmoji: { fontSize: 18 },
  alertCat: { color: "#fff", fontSize: 13, fontWeight: "600" },
  alertMsg: { color: "#888", fontSize: 11 },
  alertOver: { color: "#FF6B6B", fontWeight: "bold", fontSize: 13 },

  // receitas
  incomeCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "rgba(46,204,113,0.1)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2ecc71",
  },
  incomeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  incomeLabel: { color: "#2ecc71", fontSize: 12, fontWeight: "600" },
  incomeValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 2,
  },
  addIncomeBtn: {
    backgroundColor: "#27ae60",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addIncomeBtnText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  incomeList: { gap: 6 },
  incomeItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  incomeIcon: { fontSize: 16 },
  incomeItemDesc: { color: "#ccc", fontSize: 12, flex: 1 },
  incomeItemVal: { color: "#2ecc71", fontWeight: "bold", fontSize: 12 },

  // saldo
  balanceCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#16213E",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: { color: "#888", fontSize: 12 },
  balanceValue: { fontSize: 24, fontWeight: "bold", marginTop: 2 },
  balanceSub: { color: "#888", fontSize: 11 },

  // total
  totalCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#E94560",
    borderRadius: 20,
    padding: 20,
  },
  totalCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  totalLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
  totalValue: { color: "#fff", fontSize: 30, fontWeight: "bold", marginTop: 2 },
  totalSub: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 },
  monthBar: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 3,
    overflow: "hidden",
  },
  monthBarFill: { height: 5, backgroundColor: "#fff", borderRadius: 3 },
  monthBarLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
    marginTop: 4,
    textAlign: "right",
  },

  // saldo entre usuários
  splitCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#16213E",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#0F3460",
  },
  splitTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
    marginBottom: 12,
  },
  splitRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  splitUser: {
    flex: 1,
    backgroundColor: "#1A1A2E",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  splitName: { color: "#888", fontSize: 11 },
  splitAmt: { color: "#fff", fontWeight: "bold", fontSize: 16, marginTop: 2 },
  splitPct: { color: "#555", fontSize: 11, marginTop: 2 },
  splitMsg: { color: "#888", fontSize: 12, textAlign: "center" },

  // fixas vs variáveis
  row: {
    flexDirection: "row",
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#16213E",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0F3460",
  },
  summaryEmoji: { fontSize: 22 },
  summaryLabel: { color: "#888", fontSize: 11, marginTop: 4 },
  summaryValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    marginTop: 2,
  },

  // status contas
  billsCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#16213E",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#0F3460",
  },
  billsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  billsTitle: { color: "#fff", fontWeight: "600", fontSize: 13 },
  billsCount: { color: "#4ECDC4", fontSize: 13, fontWeight: "bold" },
  progressBar: {
    height: 6,
    backgroundColor: "#0F3460",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: { height: 6, backgroundColor: "#4ECDC4", borderRadius: 4 },
  billsSub: { color: "#888", fontSize: 11 },

  // categorias / gráfico
  sectionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  categoryCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#16213E",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#0F3460",
  },
  categoryCardAlert: {
    borderColor: "#FF6B6B",
    backgroundColor: "rgba(255,107,107,0.07)",
  },
  categoryCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryEmoji: { fontSize: 20 },
  categoryName: { color: "#fff", fontSize: 14 },
  overBadge: {
    backgroundColor: "#FF6B6B",
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryValue: { color: "#E94560", fontWeight: "bold", fontSize: 14 },
  categoryGoalText: { color: "#888", fontSize: 10, marginTop: 1 },
  catBarTrack: {
    height: 6,
    backgroundColor: "#0F3460",
    borderRadius: 4,
    overflow: "visible",
    position: "relative",
  },
  catBarFill: {
    height: 6,
    borderRadius: 4,
    position: "absolute",
    top: 0,
    left: 0,
  },
  catGoalMarker: {
    position: "absolute",
    top: -3,
    width: 2,
    height: 12,
    backgroundColor: "#ffd59e",
    borderRadius: 1,
  },
  catGoalPct: { color: "#888", fontSize: 10, marginTop: 4 },

  // últimos
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#16213E",
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  expenseEmoji: { fontSize: 18 },
  expenseDesc: { color: "#fff", fontSize: 13 },
  expenseMeta: { color: "#888", fontSize: 10, marginTop: 2 },
  expenseAmount: { color: "#4ECDC4", fontWeight: "bold", fontSize: 13 },

  groupLink: { alignItems: "center", marginTop: 20 },
  groupLinkText: { color: "#444", fontSize: 11 },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginVertical: 16,
    fontSize: 13,
  },

  noGroupContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  noGroupEmoji: { fontSize: 64, marginBottom: 16 },
  noGroupTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  noGroupText: {
    color: "#888",
    textAlign: "center",
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 22,
  },
  groupButton: {
    backgroundColor: "#E94560",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  groupButtonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
