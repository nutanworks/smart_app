# Smart Attendance System - Deployment Guide

## Project Structure

```
smart-attendance-system/
├── backend/                    # Node.js + Express (Deploy to Render)
│   ├── server.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Attendance.js
│   │   ├── Notice.js
│   │   └── Settings.js
│   └── .env.example
│
├── components/                 # React Components (Deploy to Vercel)
├── views/                      # React Views
├── services/                   # API Services
├── App.tsx                     # Main App Component
├── index.tsx                   # React Entry
├── index.html                  # HTML Template
├── vite.config.ts              # Vite Config
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
│
├── package.json                # Root Dependencies
├── .gitignore
└── README.md
```

---

## Deployment Steps

### **1. BACKEND - Deploy to Render**

**Platform:** https://render.com

1. Sign up with GitHub
2. Create New → Web Service
3. Select: `nutanworks/smart_app`
4. Configure:
   - **Service Name:** `smart-attendance-backend`
   - **Environment:** Node
   - **Region:** (Choose closest)
   - **Build Command:** `npm install`
   - **Start Command:** `node backend/server.js`
   - **Instance Type:** Free

5. Add Environment Variables:
   ```
   MONGODB_URI=mongodb+srv://admin:2pzUiQJm7jCd4GF4@details.vczgwr8.mongodb.net/smart_attendance?appName=details
   NODE_ENV=production
   ```

6. Click Deploy → Wait 2-3 minutes

**Backend URL will be:** `https://smart-attendance-backend.onrender.com`

---

### **2. FRONTEND - Deploy to Vercel**

**Platform:** https://vercel.com

1. Sign up with GitHub
2. Click "Add New" → "Project"
3. Import: `nutanworks/smart_app`
4. Configure:
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

5. Add Environment Variables:
   ```
   VITE_API_URL=https://smart-attendance-backend.onrender.com/api
   ```

6. Click Deploy → Wait 1-2 minutes

**Frontend URL will be:** `https://smart-attendance.vercel.app`

---

## Login Credentials

- **Email:** `nutan123@gmail.com`
- **Password:** `Admin@123`
- **Role:** Admin

---

## Environment Files

### Backend (.env)
```
MONGODB_URI=mongodb+srv://admin:2pzUiQJm7jCd4GF4@details.vczgwr8.mongodb.net/smart_attendance?appName=details
NODE_ENV=production
PORT=5000
```

### Frontend (.env)
```
VITE_API_URL=https://smart-attendance-backend.onrender.com/api
```

---

## Troubleshooting

### ❌ "Cannot GET /" on Vercel
→ Make sure `vite.config.ts` is correct and build folder is `dist`

### ❌ "Failed to fetch from API"
→ Check `VITE_API_URL` environment variable is set correctly

### ❌ "MongoDB connection error"
→ Verify `MONGODB_URI` in Render environment variables

---

## Tech Stack

| Component | Technology | Host |
|-----------|-----------|------|
| Frontend | React 19 + TypeScript + Vite + TailwindCSS | Vercel |
| Backend | Node.js + Express | Render |
| Database | MongoDB Atlas | Cloud (Free) |
| Icons | Lucide React | CDN |

---

## Features

✅ Admin Dashboard - User Management
✅ Teacher Dashboard - QR Attendance Scanning
✅ Student Dashboard - Attendance Tracking
✅ Notice System
✅ PDF Reports
✅ Real-time QR Code Generation

---

## Support

For issues, check the logs on Render and Vercel dashboards.
