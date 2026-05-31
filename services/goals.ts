import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { Category } from "./expenses";

export interface Goal {
  category: Category;
  limit: number; // valor máximo mensal em R$
}

/** Salva (ou atualiza) a meta de uma categoria para o grupo */
export async function setGoal(
  groupId: string,
  category: Category,
  limit: number,
): Promise<void> {
  await setDoc(doc(db, "groups", groupId, "goals", category), {
    category,
    limit,
  });
}

/** Remove a meta de uma categoria */
export async function deleteGoal(
  groupId: string,
  category: Category,
): Promise<void> {
  await deleteDoc(doc(db, "groups", groupId, "goals", category));
}

/** Escuta em tempo real todas as metas do grupo */
export function subscribeToGoals(
  groupId: string,
  callback: (goals: Goal[]) => void,
): () => void {
  const col = collection(db, "groups", groupId, "goals");
  return onSnapshot(col, (snap) => {
    const list = snap.docs.map((d) => d.data() as Goal);
    callback(list);
  });
}
