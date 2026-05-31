import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type IncomeCategory =
  | "salário"
  | "vale-alimentação"
  | "vale-refeição"
  | "freelance"
  | "investimentos"
  | "outros";

export interface Income {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  category: IncomeCategory;
  date: Timestamp;
  receivedBy: string;
  receivedByName: string;
  /** Se true, será copiada automaticamente ao virar o mês */
  recurring?: boolean;
}

export type NewIncome = Omit<Income, "id">;

export const INCOME_CATEGORIES: IncomeCategory[] = [
  "salário",
  "vale-alimentação",
  "vale-refeição",
  "freelance",
  "investimentos",
  "outros",
];

export const INCOME_ICONS: Record<IncomeCategory, string> = {
  salário: "💼",
  "vale-alimentação": "🍽️",
  "vale-refeição": "🥗",
  freelance: "💻",
  investimentos: "📈",
  outros: "💰",
};

export async function addIncome(data: NewIncome): Promise<string> {
  const ref = await addDoc(collection(db, "incomes"), data);
  return ref.id;
}

export async function updateIncome(
  id: string,
  data: Partial<Income>,
): Promise<void> {
  await updateDoc(doc(db, "incomes", id), data);
}

export async function deleteIncome(id: string): Promise<void> {
  await deleteDoc(doc(db, "incomes", id));
}

/**
 * Copia as receitas recorrentes do mês/ano dados para o mês seguinte.
 * Chamado ao virar o mês.
 */
export async function copyRecurringIncomes(
  groupId: string,
  fromYear: number,
  fromMonth: number, // 0-indexed
): Promise<void> {
  const nextDate = new Date(fromYear, fromMonth + 1, 1);
  const q = query(
    collection(db, "incomes"),
    where("groupId", "==", groupId),
    where("recurring", "==", true),
  );
  const snap = await getDocs(q);
  const jobs: Promise<void>[] = [];
  snap.docs.forEach((d) => {
    const inc = { id: d.id, ...d.data() } as Income;
    const incDate = inc.date.toDate();
    // só copia as do mês de origem (evita duplicar múltiplas vezes)
    if (
      incDate.getFullYear() === fromYear &&
      incDate.getMonth() === fromMonth
    ) {
      jobs.push(
        addIncome({
          groupId: inc.groupId,
          description: inc.description,
          amount: inc.amount,
          category: inc.category,
          date: Timestamp.fromDate(nextDate),
          receivedBy: inc.receivedBy,
          receivedByName: inc.receivedByName,
          recurring: true,
        }).then(() => {}),
      );
    }
  });
  await Promise.all(jobs);
}

export function subscribeToIncomes(
  groupId: string,
  callback: (incomes: Income[]) => void,
): () => void {
  const q = query(collection(db, "incomes"), where("groupId", "==", groupId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Income)
      .sort((a, b) => b.date.toMillis() - a.date.toMillis());
    callback(list);
  });
}
