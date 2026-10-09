import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

export interface CustomerAddress {
  recipientName: string;
  phoneNumber: string;
  streetAddress: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  landmark: string;
}

export interface CustomerProfile {
  fullName?: string;
  deliveryAddress?: CustomerAddress;
}

export const getCustomerProfile = async (uid: string): Promise<CustomerProfile | null> => {
  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists() ? (snapshot.data() as CustomerProfile) : null;
};

export const saveCustomerAddress = async (uid: string, address: CustomerAddress) => {
  await updateDoc(doc(db, "users", uid), {
    deliveryAddress: address,
    updatedAt: serverTimestamp(),
  });
};
