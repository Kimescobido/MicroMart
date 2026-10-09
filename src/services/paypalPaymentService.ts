import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebaseConfig";

const functions = getFunctions(app, "us-central1");

export const startPayPalSandboxPayment = async (orderId: string) => {
  const redirectUrl = Linking.createURL("paypal-return");
  const createOrder = httpsCallable<
    { orderId: string; returnUrl: string },
    { approvalUrl: string }
  >(functions, "createPayPalOrder");
  const response = await createOrder({ orderId, returnUrl: redirectUrl });
  const browserResult = await WebBrowser.openAuthSessionAsync(response.data.approvalUrl, redirectUrl);

  if (browserResult.type !== "success") return { status: "cancelled" as const };
  if (browserResult.url.includes("cancelled=1")) return { status: "cancelled" as const };

  const captureOrder = httpsCallable<{ orderId: string }, { status: "COMPLETED" }>(
    functions,
    "capturePayPalOrder",
  );
  await captureOrder({ orderId });
  return { status: "paid" as const };
};
