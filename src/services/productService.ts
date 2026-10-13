// src/services/productService.ts
import { db, storage } from './firebaseConfig';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, updateDoc, deleteDoc, doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface Product {
  id?: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  voltage: string;
  compatibleBoards?: string[];
  interfaces?: string[];
  currentRequirement?: string;
  specifications?: string;
  imageUrl?: string; // We added the imageUrl field here!
  soldCount?: number;
  createdAt?: any;
}

// Helper function to upload the image to Firebase Storage
const uploadImageAsync = async (uri: string, productName: string) => {
  // Convert the image URI to a blob (binary data)
  const response = await fetch(uri);
  const blob = await response.blob();
  
  // Create a reference in Firebase Storage (e.g., products/ESP32-16912345.jpg)
  const sanitizedName = productName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const fileRef = ref(storage, `products/${sanitizedName}-${Date.now()}`);
  
  // Upload the blob and return the download URL
  await uploadBytes(fileRef, blob);
  return await getDownloadURL(fileRef);
};

export const addProduct = async (productData: Omit<Product, 'id' | 'createdAt'>, imageUri: string | null) => {
  try {
    let imageUrl = '';
    
    // If the user selected an image, upload it first
    if (imageUri) {
      imageUrl = await uploadImageAsync(imageUri, productData.name);
    }

    // Then save the product to Firestore with the image URL attached
    const docRef = await addDoc(collection(db, 'products'), {
      ...productData,
      imageUrl,
      soldCount: productData.soldCount ?? 0,
      createdAt: serverTimestamp(),
    });
    
    return { id: docRef.id, ...productData, imageUrl };
  } catch (error) {
    console.error("Error adding product: ", error);
    throw error;
  }
};

export const getProducts = async () => {
  try {
    const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(productsQuery);
    
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() } as Product);
    });
    
    return products;
  } catch (error) {
    console.error("Error fetching products: ", error);
    throw error;
  }
};

export const getProductById = async (id: string) => {
  try {
    const docRef = doc(db, 'products', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Product;
    }
    return null;
  } catch (error) {
    console.error("Error fetching product by ID: ", error);
    throw error;
  }
};

export const watchProducts = (
  onProducts: (products: Product[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => onSnapshot(
  query(collection(db, 'products'), orderBy('createdAt', 'desc')),
  (snapshot) => onProducts(snapshot.docs.map((productDoc) => ({ id: productDoc.id, ...productDoc.data() }) as Product)),
  (error) => onError?.(error),
);

export type EditableProduct = Pick<Product, "name" | "price" | "stock" | "category" | "voltage">
  & Pick<Product, "compatibleBoards" | "interfaces" | "currentRequirement" | "specifications">;

export const updateProduct = async (id: string, productData: EditableProduct, imageUri: string | null) => {
  let imageUrl: string | undefined;
  if (imageUri && !imageUri.startsWith("https://")) {
    imageUrl = await uploadImageAsync(imageUri, productData.name);
  }

  await updateDoc(doc(db, "products", id), {
    ...productData,
    ...(imageUrl ? { imageUrl } : {}),
    updatedAt: serverTimestamp(),
  });
};

export const deleteProduct = async (id: string) => {
  await deleteDoc(doc(db, "products", id));
};
