import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type Category =
  | "alimentação"
  | "moradia"
  | "transporte"
  | "saúde"
  | "lazer"
  | "educação"
  | "outros";

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  category: Category;
  date: Timestamp;
  paidBy: string; // uid
  paidByName: string;
  type: "variavel" | "fixa";
  recurring?: boolean;
  /** Número de pessoas que dividem essa conta (padrão 1 = sem divisão) */
  splitBetween?: number;
  /** Dia do mês que a conta vence (1-31) */
  dueDay?: number;
  // status de pagamento (contas fixas)
  paid?: boolean;
  paidAt?: Timestamp | null;
  paidByName2?: string; // quem marcou como pago
}

export type NewExpense = Omit<Expense, "id">;

export async function addExpense(data: NewExpense): Promise<string> {
  const ref = await addDoc(collection(db, "expenses"), data);
  return ref.id;
}

export async function updateExpense(
  id: string,
  data: Partial<Expense>,
): Promise<void> {
  await updateDoc(doc(db, "expenses", id), data);
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, "expenses", id));
}

export async function toggleBillPaid(
  id: string,
  paid: boolean,
  paidByName2?: string,
): Promise<void> {
  await updateDoc(doc(db, "expenses", id), {
    paid,
    paidAt: paid ? Timestamp.now() : null,
    paidByName2: paid ? (paidByName2 ?? "") : null,
  });
}
/** Reseta o status de pagamento de todas as contas fixas do grupo (virada de mês) */
export async function resetBillsPaid(bills: Expense[]): Promise<void> {
  await Promise.all(
    bills.map((b) =>
      updateDoc(doc(db, "expenses", b.id), {
        paid: false,
        paidAt: null,
        paidByName2: null,
      }),
    ),
  );
}

// ── Histórico Mensal (Snapshots) ───────────────────────────────────────────

export interface MonthSnapshot {
  id: string; // groupId_YYYY_MM
  groupId: string;
  year: number;
  month: number; // 0-indexed
  monthLabel: string; // ex: "fevereiro de 2026"
  savedAt: Timestamp;
  totalExpenses: number;
  totalFixed: number;
  totalVariable: number;
  totalIncome: number;
  billsSummary: {
    description: string;
    amount: number;
    splitBetween: number;
    paid: boolean;
    paidByName2?: string;
  }[];
  /** Balanço por usuário neste mês (pago - parte justa) */
  perUserBills?: {
    [uid: string]: { name: string; paid: number; fairShare: number };
  };
}

export async function saveMonthSnapshot(
  groupId: string,
  year: number,
  month: number,
  data: Omit<MonthSnapshot, "id" | "savedAt">,
): Promise<void> {
  const id = `${groupId}_${year}_${String(month).padStart(2, "0")}`;
  await setDoc(doc(db, "monthSnapshots", id), {
    ...data,
    id,
    savedAt: Timestamp.now(),
  });
}

export function subscribeToMonthSnapshots(
  groupId: string,
  callback: (snapshots: MonthSnapshot[]) => void,
): () => void {
  const q = query(
    collection(db, "monthSnapshots"),
    where("groupId", "==", groupId),
    orderBy("year", "desc"),
    orderBy("month", "desc"),
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as MonthSnapshot[];
    callback(list);
  });
}
export function subscribeToExpenses(
  groupId: string,
  callback: (expenses: Expense[]) => void,
): () => void {
  const q = query(collection(db, "expenses"), where("groupId", "==", groupId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Expense)
      .sort((a, b) => b.date.toMillis() - a.date.toMillis());
    callback(list);
  });
}

export function subscribeToFixedBills(
  groupId: string,
  callback: (bills: Expense[]) => void,
): () => void {
  const q = query(
    collection(db, "expenses"),
    where("groupId", "==", groupId),
    where("type", "==", "fixa"),
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Expense)
      .sort((a, b) => b.date.toMillis() - a.date.toMillis());
    callback(list);
  });
}

// ── Gastos Privados (só o dono vê) ─────────────────────────────────────────

export interface PrivateExpense {
  id: string;
  description: string;
  amount: number;
  category: Category;
  date: Timestamp;
}

export type NewPrivateExpense = Omit<PrivateExpense, "id">;

export async function addPrivateExpense(
  uid: string,
  data: NewPrivateExpense,
): Promise<string> {
  const ref = await addDoc(
    collection(db, "users", uid, "privateExpenses"),
    data,
  );
  return ref.id;
}

export async function updatePrivateExpense(
  uid: string,
  id: string,
  data: Partial<PrivateExpense>,
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "privateExpenses", id), data);
}

export async function deletePrivateExpense(
  uid: string,
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "privateExpenses", id));
}

export function subscribeToPrivateExpenses(
  uid: string,
  callback: (expenses: PrivateExpense[]) => void,
): () => void {
  const q = collection(db, "users", uid, "privateExpenses");
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as PrivateExpense)
      .sort((a, b) => b.date.toMillis() - a.date.toMillis());
    callback(list);
  });
}

// ────────────────────────────────────────────────────────────────────────────

export const CATEGORIES: Category[] = [
  "alimentação",
  "moradia",
  "transporte",
  "saúde",
  "lazer",
  "educação",
  "outros",
];

export const CATEGORY_COLORS: Record<Category, string> = {
  alimentação: "#FF6B6B",
  moradia: "#4ECDC4",
  transporte: "#45B7D1",
  saúde: "#96CEB4",
  lazer: "#FFEAA7",
  educação: "#DDA0DD",
  outros: "#B0B0B0",
};

export const CATEGORY_ICONS: Record<Category, string> = {
  alimentação: "🍽️",
  moradia: "🏠",
  transporte: "🚗",
  saúde: "💊",
  lazer: "🎉",
  educação: "📚",
  outros: "📦",
};
