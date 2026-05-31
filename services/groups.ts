import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface GroupSettings {
  activeYear: number;
  activeMonth: number; // 0-indexed
}

export function subscribeToGroupSettings(
  groupId: string,
  callback: (settings: GroupSettings | null) => void,
): () => void {
  const ref = doc(db, "groups", groupId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data() as Partial<GroupSettings>;
    if (
      typeof data.activeYear === "number" &&
      typeof data.activeMonth === "number"
    ) {
      callback({ activeYear: data.activeYear, activeMonth: data.activeMonth });
    } else {
      callback(null);
    }
  });
}

export async function ensureGroupActiveMonth(
  groupId: string,
  date = new Date(),
): Promise<void> {
  const ref = doc(db, "groups", groupId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data() as Partial<GroupSettings>;
    if (
      typeof data.activeYear === "number" &&
      typeof data.activeMonth === "number"
    ) {
      return;
    }
  }
  await setDoc(
    ref,
    {
      activeYear: date.getFullYear(),
      activeMonth: date.getMonth(),
    },
    { merge: true },
  );
}

export async function setActiveMonth(
  groupId: string,
  year: number,
  month: number,
): Promise<void> {
  const ref = doc(db, "groups", groupId);
  await setDoc(
    ref,
    {
      activeYear: year,
      activeMonth: month,
    },
    { merge: true },
  );
}
