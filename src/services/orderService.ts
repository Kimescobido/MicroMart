import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import type { CustomerAddress } from "./customerProfileService";
import type { Product } from "./productService";

export type PaymentMethod = "COD" | "COP" | "PAYPAL";
export type OrderStatus = "pending_confirmation" | "to_pay" | "to_ship" | "to_receive" | "cop" | "completed" | "cancelled";
export type FulfillmentType = "delivery" | "pickup";

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  category: string;
  voltage: string;
}

export interface StoreOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: CustomerAddress | null;
  pickupLocation: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: "unpaid" | "paid";
  fulfillmentType: FulfillmentType;
  status: OrderStatus;
  assignedDeliveryId: string | null;
  assignedDeliveryName: string | null;
  items: OrderItem[];
  subtotal: number;
  total: number;
  createdAt?: { toMillis?: () => number } | number;
  updatedAt?: unknown;
}

export interface OrderCustomer {
  uid: string;
  name: string;
  email: string;
  phone: string;
}

export interface CreateOrderInput {
  customer: OrderCustomer;
  cart: Array<Product & { quantity: number }>;
  paymentMethod: PaymentMethod;
  fulfillmentType: FulfillmentType;
  deliveryAddress: CustomerAddress;
}

export interface DeliveryStaff {
  uid: string;
  fullName: string;
  email: string;
}

export const PICKUP_POINT_LABEL = "MicroMart pickup point, Iligan City";

export class OrderCheckoutError extends Error {
  constructor(message: string, public readonly code: "stock" | "product" | "auth" | "invalid") {
    super(message);
    this.name = "OrderCheckoutError";
  }
}

const sortNewestFirst = (orders: StoreOrder[]) =>
  orders.sort((a, b) => {
    const aTime = typeof a.createdAt === "number" ? a.createdAt : a.createdAt?.toMillis?.() ?? 0;
    const bTime = typeof b.createdAt === "number" ? b.createdAt : b.createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });

export const createCustomerOrder = async (input: CreateOrderInput): Promise<string> => {
  if (!input.customer.uid) throw new OrderCheckoutError("Please sign in to place an order.", "auth");
  if (input.cart.length === 0) throw new OrderCheckoutError("Your cart is empty.", "invalid");
  if (!input.customer.name.trim() || !input.customer.phone.trim()) {
    throw new OrderCheckoutError("Add a recipient name and phone number in your profile first.", "invalid");
  }
  if (input.paymentMethod === "COD" && input.fulfillmentType !== "delivery") {
    throw new OrderCheckoutError("Cash on Delivery requires delivery.", "invalid");
  }
  if (input.paymentMethod === "COP" && input.fulfillmentType !== "pickup") {
    throw new OrderCheckoutError("Cash on Pickup requires pickup.", "invalid");
  }
  if (input.fulfillmentType === "delivery" &&
      (!input.deliveryAddress.streetAddress.trim() || !input.deliveryAddress.barangay.trim())) {
    throw new OrderCheckoutError("Add your barangay and house or street details in your profile for delivery.", "invalid");
  }

  const orderRef = doc(collection(db, "orders"));
  const productRefs = input.cart.map((item) => {
    if (!item.id || !Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new OrderCheckoutError("One of the cart items is invalid. Please review your cart.", "invalid");
    }
    return doc(db, "products", item.id);
  });

  await runTransaction(db, async (transaction) => {
    const snapshots = await Promise.all(productRefs.map((productRef) => transaction.get(productRef)));
    const orderItems: OrderItem[] = [];
    let total = 0;

    snapshots.forEach((snapshot, index) => {
      const cartItem = input.cart[index];
      if (!snapshot.exists()) {
        throw new OrderCheckoutError(`${cartItem.name} is no longer available. Remove it from your cart and try again.`, "product");
      }

      const product = snapshot.data() as Omit<Product, "id">;
      const stock = Number(product.stock ?? 0);
      const price = Number(product.price);
      if (!Number.isFinite(price) || price < 0) {
        throw new OrderCheckoutError(`The price for ${product.name || cartItem.name} is invalid.`, "product");
      }
      if (stock < cartItem.quantity) {
        throw new OrderCheckoutError(
          `${product.name || cartItem.name} has only ${stock} left in stock. Please update your cart.`,
          "stock",
        );
      }

      const item: OrderItem = {
        productId: snapshot.id,
        name: product.name,
        price,
        quantity: cartItem.quantity,
        imageUrl: product.imageUrl ?? "",
        category: product.category ?? "",
        voltage: product.voltage ?? "",
      };
      orderItems.push(item);
      total += price * cartItem.quantity;
    });

    const isPickup = input.fulfillmentType === "pickup";
    transaction.set(orderRef, {
      customerId: input.customer.uid,
      customerName: input.customer.name.trim(),
      customerEmail: input.customer.email,
      customerPhone: input.customer.phone.trim(),
      deliveryAddress: isPickup ? null : input.deliveryAddress,
      pickupLocation: isPickup ? PICKUP_POINT_LABEL : null,
      paymentMethod: input.paymentMethod,
      paymentStatus: "unpaid",
      fulfillmentType: input.fulfillmentType,
      status: "pending_confirmation",
      assignedDeliveryId: null,
      assignedDeliveryName: null,
      items: orderItems,
      subtotal: total,
      total,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  return orderRef.id;
};

export const watchCustomerOrders = (
  customerId: string,
  onOrders: (orders: StoreOrder[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => onSnapshot(
  query(collection(db, "orders"), where("customerId", "==", customerId)),
  (snapshot) => onOrders(sortNewestFirst(snapshot.docs.map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() }) as StoreOrder))),
  (error) => onError?.(error),
);

export const watchAdminOrders = (
  onOrders: (orders: StoreOrder[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => onSnapshot(
  query(collection(db, "orders"), where("status", "in", ["pending_confirmation", "to_ship", "to_receive", "cop"])),
  (snapshot) => onOrders(sortNewestFirst(snapshot.docs.map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() }) as StoreOrder))),
  (error) => onError?.(error),
);

export const confirmCustomerOrder = async (orderId: string, adminId: string) => {
  const orderRef = doc(db, "orders", orderId);
  await runTransaction(db, async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists()) throw new Error("This order request no longer exists.");
    const order = orderSnapshot.data();
    if (order.status !== "pending_confirmation") throw new Error("This order request has already been handled.");

    const items = order.items as OrderItem[];
    const productRefs = items.map((item) => doc(db, "products", item.productId));
    const productSnapshots = await Promise.all(productRefs.map((productRef) => transaction.get(productRef)));

    productSnapshots.forEach((productSnapshot, index) => {
      const item = items[index];
      if (!productSnapshot.exists()) {
        throw new Error(`${item.name} is no longer available. Reject this order request.`);
      }
      const stock = Number(productSnapshot.data().stock ?? 0);
      if (stock < item.quantity) {
        throw new Error(`${item.name} has only ${stock} left, but this order needs ${item.quantity}. Reject this request or contact the customer.`);
      }
    });

    productSnapshots.forEach((productSnapshot, index) => {
      const item = items[index];
      const productRef = productRefs[index];
      const product = productSnapshot.data();
      if (!product) throw new Error(`${item.name} is no longer available. Reject this order request.`);
      transaction.update(productRef, {
        stock: Number(product.stock ?? 0) - item.quantity,
        soldCount: Number(product.soldCount ?? 0) + item.quantity,
      });
    });

    transaction.update(orderRef, {
      status: order.paymentMethod === "PAYPAL"
        ? "to_pay"
        : order.fulfillmentType === "pickup" ? "cop" : "to_ship",
      confirmedBy: adminId,
      confirmedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
};

export const rejectCustomerOrder = async (orderId: string, adminId: string) => {
  const orderRef = doc(db, "orders", orderId);
  await runTransaction(db, async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists()) throw new Error("This order request no longer exists.");
    if (orderSnapshot.data().status !== "pending_confirmation") {
      throw new Error("This order request has already been handled.");
    }
    transaction.update(orderRef, {
      status: "cancelled",
      rejectedBy: adminId,
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
};

export const watchDeliveryStaff = (
  onStaff: (staff: DeliveryStaff[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => onSnapshot(
  query(collection(db, "users"), where("role", "==", "delivery")),
  (snapshot) => onStaff(snapshot.docs.map((staffDoc) => {
    const data = staffDoc.data();
    return { uid: staffDoc.id, fullName: data.fullName ?? "Delivery person", email: data.email ?? "" };
  })),
  (error) => onError?.(error),
);

export const watchAssignedDeliveries = (
  deliveryPersonId: string,
  onOrders: (orders: StoreOrder[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => onSnapshot(
  query(
    collection(db, "orders"),
    where("assignedDeliveryId", "==", deliveryPersonId),
  ),
  (snapshot) => onOrders(sortNewestFirst(snapshot.docs
    .map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() }) as StoreOrder)
    .filter((order) => order.status === "to_receive"))),
  (error) => onError?.(error),
);

export const assignOrderToDelivery = async (orderId: string, staff: DeliveryStaff) => {
  const orderRef = doc(db, "orders", orderId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists()) throw new Error("This order no longer exists.");
    if (snapshot.data().status !== "to_ship" || snapshot.data().fulfillmentType !== "delivery") {
      throw new Error("This order is no longer waiting for a delivery assignment.");
    }
    transaction.update(orderRef, {
      status: "to_receive",
      assignedDeliveryId: staff.uid,
      assignedDeliveryName: staff.fullName,
      assignedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
};

export const completeAssignedDelivery = async (orderId: string, deliveryPersonId: string) => {
  const orderRef = doc(db, "orders", orderId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists()) throw new Error("This order no longer exists.");
    const order = snapshot.data();
    if (order.assignedDeliveryId !== deliveryPersonId || order.status !== "to_receive") {
      throw new Error("This order is not assigned to you or is no longer active.");
    }
    transaction.update(orderRef, {
      status: "completed",
      paymentStatus: "paid",
      deliveredAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
};

export const completePickupOrder = async (orderId: string) => {
  const orderRef = doc(db, "orders", orderId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists()) throw new Error("This order no longer exists.");
    if (snapshot.data().status !== "cop") throw new Error("This order is no longer waiting for pickup.");
    transaction.update(orderRef, {
      status: "completed",
      paymentStatus: "paid",
      pickedUpAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
};

export const watchCustomerOrderCounts = (
  customerId: string,
  onCounts: (counts: Record<"to_pay" | "to_ship" | "to_receive" | "cop", number>) => void,
  onError?: (error: Error) => void,
): Unsubscribe => watchCustomerOrders(customerId, (orders) => {
  onCounts({
    to_pay: orders.filter((order) => order.status === "to_pay" || order.status === "pending_confirmation").length,
    to_ship: orders.filter((order) => order.status === "to_ship").length,
    to_receive: orders.filter((order) => order.status === "to_receive").length,
    cop: orders.filter((order) => order.status === "cop").length,
  });
}, onError);
