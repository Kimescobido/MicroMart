const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { defineSecret } = require("firebase-functions/params");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

initializeApp();

const db = getFirestore();
const paypalClientId = defineSecret("PAYPAL_CLIENT_ID");
const paypalClientSecret = defineSecret("PAYPAL_CLIENT_SECRET");
const PAYPAL_API = "https://api-m.sandbox.paypal.com";

async function paypalAccessToken() {
  const credentials = Buffer.from(`${paypalClientId.value()}:${paypalClientSecret.value()}`).toString("base64");
  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    console.error("PayPal token request failed", payload);
    throw new HttpsError("internal", "PayPal is temporarily unavailable.");
  }
  return payload.access_token;
}

async function paypalRequest(path, token, options = {}) {
  const response = await fetch(`${PAYPAL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    console.error("PayPal API request failed", response.status, payload);
    throw new HttpsError("failed-precondition", "PayPal could not process this payment. Please try again.");
  }
  return payload;
}

function validateReturnUrl(value) {
  if (typeof value !== "string") throw new HttpsError("invalid-argument", "A PayPal return URL is required.");
  let url;
  try { url = new URL(value); } catch { throw new HttpsError("invalid-argument", "The PayPal return URL is invalid."); }
  const valid = url.protocol === "micromart:" || url.protocol === "exp:" || url.protocol === "exps:";
  if (!valid) throw new HttpsError("invalid-argument", "The PayPal return URL is not supported.");
  return url.toString();
}

function paypalAmount(order) {
  const amount = Number(order.total);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpsError("failed-precondition", "This order has an invalid total.");
  }
  return amount.toFixed(2);
}

exports.createPayPalOrder = onCall(
  { region: "us-central1", secrets: [paypalClientId, paypalClientSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before paying.");
    const orderId = request.data?.orderId;
    if (typeof orderId !== "string" || !orderId) throw new HttpsError("invalid-argument", "An order ID is required.");

    const orderRef = db.collection("orders").doc(orderId);
    const snapshot = await orderRef.get();
    if (!snapshot.exists) throw new HttpsError("not-found", "This order could not be found.");
    const order = snapshot.data();
    if (order.customerId !== request.auth.uid) throw new HttpsError("permission-denied", "This order belongs to another customer.");
    if (order.paymentMethod !== "PAYPAL" || order.status !== "to_pay" || order.paymentStatus === "paid") {
      throw new HttpsError("failed-precondition", "This order is not ready for PayPal payment.");
    }

    const returnUrl = validateReturnUrl(request.data.returnUrl);
    const token = await paypalAccessToken();
    if (order.paypalOrderId) {
      const existing = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(order.paypalOrderId)}`, token);
      const approval = existing.links?.find((link) => link.rel === "approve" || link.rel === "payer-action");
      if (approval?.href && existing.status === "CREATED") return { approvalUrl: approval.href };
    }

    const cancelUrl = new URL(returnUrl);
    cancelUrl.searchParams.set("cancelled", "1");
    const paypalOrder = await paypalRequest("/v2/checkout/orders", token, {
      method: "POST",
      headers: { "PayPal-Request-Id": `micromart-${orderId}` },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: orderId,
          custom_id: orderId,
          amount: { currency_code: "PHP", value: paypalAmount(order) },
          description: `MicroMart order ${orderId.slice(0, 8)}`,
        }],
        application_context: {
          brand_name: "MicroMart",
          user_action: "PAY_NOW",
          return_url: returnUrl,
          cancel_url: cancelUrl.toString(),
          shipping_preference: "NO_SHIPPING",
        },
      }),
    });
    const approval = paypalOrder.links?.find((link) => link.rel === "approve" || link.rel === "payer-action");
    if (!paypalOrder.id || !approval?.href) throw new HttpsError("internal", "PayPal did not return an approval link.");

    await orderRef.update({
      paypalOrderId: paypalOrder.id,
      paypalOrderCreatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { approvalUrl: approval.href };
  },
);

exports.capturePayPalOrder = onCall(
  { region: "us-central1", secrets: [paypalClientId, paypalClientSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before completing payment.");
    const orderId = request.data?.orderId;
    if (typeof orderId !== "string" || !orderId) throw new HttpsError("invalid-argument", "An order ID is required.");

    const orderRef = db.collection("orders").doc(orderId);
    const snapshot = await orderRef.get();
    if (!snapshot.exists) throw new HttpsError("not-found", "This order could not be found.");
    const order = snapshot.data();
    if (order.customerId !== request.auth.uid) throw new HttpsError("permission-denied", "This order belongs to another customer.");
    if (order.paymentMethod !== "PAYPAL") throw new HttpsError("failed-precondition", "This order does not use PayPal.");
    if (order.paymentStatus === "paid") return { status: "COMPLETED" };
    if (order.status !== "to_pay" || !order.paypalOrderId) {
      throw new HttpsError("failed-precondition", "This order is not ready for PayPal capture.");
    }

    const token = await paypalAccessToken();
    const captureResult = await paypalRequest(
      `/v2/checkout/orders/${encodeURIComponent(order.paypalOrderId)}/capture`,
      token,
      { method: "POST", headers: { "PayPal-Request-Id": `micromart-capture-${orderId}` }, body: "{}" },
    );
    const capture = captureResult.purchase_units?.[0]?.payments?.captures?.[0];
    if (captureResult.status !== "COMPLETED" || capture?.status !== "COMPLETED" ||
        capture.amount?.currency_code !== "PHP" || capture.amount?.value !== paypalAmount(order)) {
      console.error("PayPal capture did not match the MicroMart order", { orderId, captureResult });
      throw new HttpsError("failed-precondition", "PayPal did not confirm the expected payment amount.");
    }

    await db.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(orderRef);
      if (!currentSnapshot.exists) throw new HttpsError("not-found", "This order could not be found.");
      const current = currentSnapshot.data();
      if (current.customerId !== request.auth.uid) throw new HttpsError("permission-denied", "This order belongs to another customer.");
      if (current.paymentStatus === "paid") return;
      if (current.paymentMethod !== "PAYPAL" || current.status !== "to_pay" || current.paypalOrderId !== order.paypalOrderId) {
        throw new HttpsError("failed-precondition", "The order changed while payment was processing.");
      }
      transaction.update(orderRef, {
        paymentStatus: "paid",
        status: current.fulfillmentType === "pickup" ? "cop" : "to_ship",
        paypalCaptureId: capture.id,
        paypalCapturedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return { status: "COMPLETED" };
  },
);
