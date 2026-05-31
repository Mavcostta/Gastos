import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  /** @deprecated use groupIds + activeGroupId */
  groupId?: string;
  groupIds?: string[];
  activeGroupId?: string;
}

/** Retorna o groupId ativo, com retrocompatibilidade */
export function getActiveGroupId(profile: UserProfile | null): string | null {
  if (!profile) return null;
  return profile.activeGroupId ?? profile.groupId ?? null;
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: name });
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name,
    email,
    groupId: null,
    createdAt: new Date(),
  });
  return user;
}

export async function login(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data() as UserProfile;
  // migração: se só tem groupId antigo, converte para novo formato
  if (data.groupId && !data.groupIds) {
    data.groupIds = [data.groupId];
    data.activeGroupId = data.groupId;
  }
  return data;
}

export async function switchActiveGroup(uid: string, groupId: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { activeGroupId: groupId });
}

export async function getGroupMembers(groupId: string): Promise<{ uid: string; name: string }[]> {
  const q = query(collection(db, "users"), where("groupIds", "array-contains", groupId));
  const snap = await getDocs(q);
  const members: { uid: string; name: string }[] = [];
  snap.docs.forEach((d) => {
    const data = d.data();
    members.push({ uid: data.uid, name: data.name });
  });
  // fallback: buscar também pelo campo legado groupId
  if (members.length === 0) {
    const q2 = query(collection(db, "users"), where("groupId", "==", groupId));
    const snap2 = await getDocs(q2);
    snap2.docs.forEach((d) => {
      const data = d.data();
      if (!members.find((m) => m.uid === data.uid))
        members.push({ uid: data.uid, name: data.name });
    });
  }
  return members;
}

export async function createGroup(uid: string, name?: string): Promise<string> {
  const groupId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const groupRef = doc(db, "groups", groupId);
  await setDoc(groupRef, {
    id: groupId,
    name: name ?? "Grupo Compartilhado",
    members: [uid],
    createdAt: new Date(),
  });
  // atualiza user com novo array de grupos
  const userSnap = await getDoc(doc(db, "users", uid));
  const userData = userSnap.data() as UserProfile;
  const existing = userData.groupIds ?? (userData.groupId ? [userData.groupId] : []);
  await updateDoc(doc(db, "users", uid), {
    groupIds: [...existing, groupId],
    activeGroupId: groupId,
    groupId: groupId, // compat legado
  });
  return groupId;
}

export async function joinGroup(uid: string, groupId: string): Promise<void> {
  const groupRef = doc(db, "groups", groupId);
  const snap = await getDoc(groupRef);
  if (!snap.exists()) throw new Error("Grupo não encontrado.");
  const data = snap.data();
  const members: string[] = data.members || [];
  if (!members.includes(uid)) {
    await updateDoc(groupRef, { members: [...members, uid] });
  }
  const userSnap = await getDoc(doc(db, "users", uid));
  const userData = userSnap.data() as UserProfile;
  const existing = userData.groupIds ?? (userData.groupId ? [userData.groupId] : []);
  if (!existing.includes(groupId)) {
    await updateDoc(doc(db, "users", uid), {
      groupIds: [...existing, groupId],
      activeGroupId: groupId,
      groupId: groupId, // compat legado
    });
  } else {
    await updateDoc(doc(db, "users", uid), {
      activeGroupId: groupId,
      groupId: groupId,
    });
  }
}

export async function getGroupInfo(groupId: string): Promise<{ id: string; name: string; members: string[] } | null> {
  const snap = await getDoc(doc(db, "groups", groupId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { id: d.id, name: d.name ?? groupId, members: d.members ?? [] };
}
