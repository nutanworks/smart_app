# MongoDB Connection Troubleshooting

If your application works locally but fails to connect to MongoDB when hosted (on Render, Vercel, etc.), follow these steps.

## 1. Allow Access from Anywhere (IP Whitelist)

Cloud hosting platforms like Render use dynamic IP addresses, so you cannot whitelist a single IP. You must allow connections from **anywhere**.

1.  Log in to your [MongoDB Atlas Dashboard](https://cloud.mongodb.com/).
2.  Select your project.
3.  In the left sidebar, under **Security**, click **Network Access**.
4.  Click the **+ Add IP Address** button.
5.  Select **Allow Access from Anywhere** (or enter `0.0.0.0/0`).
6.  Click **Confirm**.
    *   *Note: It may take a few minutes for the changes to propagate.*

## 2. Verify Environment Variables

Ensure your hosting provider has the correct `MONGODB_URI`.

1.  Go to your hosting dashboard (e.g., Render Dashboard).
2.  Navigate to your service settings -> **Environment** (or **Environment Variables**).
3.  Check that `MONGODB_URI` is set and matches your local `.env` (or your Atlas connection string).
    *   Format: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority`
    *   **Important**: Ensure there are no special characters in your password that need URL encoding, or that the password is correct.

## 3. Check Logs

After making these changes:
1.  Redeploy your service (if needed) or restart it.
2.  Check the **Logs** tab in your hosting dashboard.
3.  Look for "Connected to MongoDB Atlas successfully".

---

# Frontend Connection Troubleshooting

If your frontend is saving data locally instead of to the database, it means it cannot connect to the backend.

## 1. Check CORS Settings (Backend)
The backend must allow the frontend URL to connect.
-   I have updated `backend/server.js` to include `https://smart-app-4982.vercel.app`.
-   **Action**: Redeploy your Backend (Render).

## 2. Check API URL (Frontend)
The frontend needs to know where the backend is.
1.  Go to your **Vercel Dashboard**.
2.  Select your project -> **Settings** -> **Environment Variables**.
3.  Add a new variable:
    *   **Key**: `VITE_API_URL`
    *   **Value**: Your Render Backend URL (e.g., `https://smart-app-p0qn.onrender.com/api`).
    *   *Note: Make sure to include `/api` at the end.*
4.  **Redeploy** your Frontend (Vercel) for the changes to take effect.
