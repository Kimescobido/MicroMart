// src/services/authService.ts
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

export type UserRole = "customer" | "admin" | "delivery";

export interface MicroMartUser {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: any;
}

/**
 * Registers a new user via Firebase Auth and creates their default 'customer' profile in Firestore.
 */
export const registerUser = async (
  email: string,
  password: string,
  fullName: string,
) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const user = userCredential.user;

  const userDoc: MicroMartUser = {
    uid: user.uid,
    email: user.email!,
    fullName,
    role: "customer", // Public registration defaults to customer
    avatarUrl: null,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, "users", user.uid), userDoc);
  return { user, userDoc };
};

/**
 * Authenticates an existing user and retrieves their role-based profile.
 */
export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const user = userCredential.user;

  const docRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    await signOut(auth);
    throw new Error("User profile data not found in Firestore.");
  }

  const userProfile = docSnap.data() as Partial<MicroMartUser>;
  if (userProfile.role !== "customer" && userProfile.role !== "admin" && userProfile.role !== "delivery") {
    await signOut(auth);
    throw new Error("This account does not have a valid role. Contact the shop administrator.");
  }

  return { user, userProfile: userProfile as MicroMartUser };
};

export const logoutUser = () => signOut(auth);
