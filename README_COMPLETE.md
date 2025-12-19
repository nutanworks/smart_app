# Smart Attendance System

A modern web application for managing student attendance using QR codes, with separate dashboards for Admins, Teachers, and Students.

## 🚀 Features

### Admin Dashboard
- User Management (Add/Edit/Delete Teachers & Students)
- Attendance Reports with filtering and PDF export
- System Settings Configuration
- QR Code Generation for students

### Teacher Dashboard
- QR Code Scanner for attendance marking
- Manual attendance marking
- Student marks management (CIE Scores)
- Notice board for announcements
- PDF Reports of attendance and marks

### Student Dashboard
- View personal attendance records
- Track attendance percentage
- View notices from teachers
- Download attendance certificates

## 📋 Tech Stack

### Frontend
- **React 19** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **TailwindCSS** - Styling
- **Lucide React** - Icons
- **jsQR** - QR Code Scanning
- **react-qr-code** - QR Code Generation
- **jsPDF** - PDF Export

### Backend
- **Node.js** - Runtime
- **Express** - Web Framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **CORS** - Cross-origin Support

## 🔐 Default Credentials

```
Email: nutan123@gmail.com
Password: Admin@123
Role: Admin
```

## 📦 Installation (Local Development)

```bash
# Clone the repository
git clone https://github.com/nutanworks/smart_app.git
cd smart_app

# Install dependencies
npm install

# Start development server (both backend and frontend)
npm run dev:all

# Or run separately:
npm run dev          # Backend on http://localhost:5000
npm run client       # Frontend on http://localhost:3000
```

## 🌐 Deployment

### Prerequisites
- GitHub Account
- Render Account (Backend)
- Vercel Account (Frontend)

### Deploy Backend to Render

1. Go to [Render.com](https://render.com)
2. Click "New Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `node backend/server.js`
5. Add Environment Variables:
   ```
   MONGODB_URI=your_mongodb_url
   NODE_ENV=production
   ```
6. Deploy!

### Deploy Frontend to Vercel

1. Go to [Vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add Environment Variables:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com/api
   ```
6. Deploy!

## 📁 Project Structure

```
smart-attendance-system/
├── backend/
│   ├── server.js           # Express server
│   └── models/
│       ├── User.js
│       ├── Attendance.js
│       ├── Notice.js
│       └── Settings.js
├── components/             # React components
├── views/                  # Page components
├── services/               # API services
├── App.tsx                 # Main app component
└── index.tsx               # Entry point
```

## 🔌 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/forgot-password` - Password reset

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark attendance

### Notices
- `GET /api/notices` - Get notices
- `POST /api/notices` - Create notice
- `PUT /api/notices/:id` - Update notice
- `DELETE /api/notices/:id` - Delete notice

### Settings
- `GET /api/settings` - Get system settings
- `POST /api/settings` - Update settings

## 🎨 Customization

### Change Colors
Edit TailwindCSS classes in components (e.g., `bg-indigo-600`, `text-emerald-500`)

### Change School Name
Update in Admin Dashboard → Settings

### Add New Subjects
Edit `constants.ts` → `MOCK_SUBJECTS`

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot GET /" | Check Vercel build settings and `dist` folder |
| API Connection Failed | Verify `VITE_API_URL` environment variable |
| MongoDB Connection Error | Check `MONGODB_URI` and network access |
| QR Scanner Not Working | Ensure camera permissions are granted |

## 📝 Environment Variables

### Local Development (.env)
```
VITE_API_URL=http://localhost:5000/api
```

### Production (Render Dashboard)
```
MONGODB_URI=your_mongodb_url
NODE_ENV=production
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 📞 Support

For issues and questions, please create an issue in the GitHub repository.

---

**Live Demo:** [Deploy using the steps above]

**GitHub:** https://github.com/nutanworks/smart_app
