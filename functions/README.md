# PayPal sandbox setup

The app uses PayPal's sandbox API. It does not contain PayPal credentials; the callable Firebase Functions create and capture payments using server-side secrets.

1. In the PayPal Developer Dashboard, create a Sandbox REST app and copy its Client ID and Secret. Use a sandbox personal account to test checkout.
2. From the project root, set the secrets with Firebase CLI (enter each value when prompted):

   ```sh
   firebase functions:secrets:set PAYPAL_CLIENT_ID
   firebase functions:secrets:set PAYPAL_CLIENT_SECRET
   ```

3. Install the function dependencies and deploy the callable functions:

   ```sh
   npm install --prefix functions
   firebase deploy --only functions
   ```

The Firebase project must have Cloud Functions enabled. Orders remain unpaid until the server captures and verifies the PayPal payment. Stock is still deducted only when an admin confirms the order request.
