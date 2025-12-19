import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { loginUser, resetPassword } from '../services/storage';
import { Input } from '../components/Input';
import { ADMIN_EMAIL, ADMIN_PASS } from '../constants';
import { 
  QrCode, 
  ShieldCheck, 
  GraduationCap, 
  School, 
  Lock, 
  ChevronLeft,
  Loader,
  Mail,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Globe,
  Zap,
  LayoutDashboard
} from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

type LoginView = 'SELECTION' | UserRole;
type LoginStatus = 'idle' | 'loading' | 'success' | 'error';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<LoginView>('SELECTION');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Replaced simple isLoading with status for animation states
  const [loginStatus, setLoginStatus] = useState<LoginStatus>('idle');

  // Clear fields when switching views
  useEffect(() => {
    setEmail('');
    setPassword('');
    setError('');
    setSuccessMsg('');
    setIsForgotPassword(false);
    setLoginStatus('idle');
  }, [view]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginStatus('loading');

    try {
      if (view !== 'SELECTION') {
          // Trim whitespace to avoid copy-paste errors
          const cleanEmail = email.trim();
          
          // Minimum delay to prevent flickering if API is too fast
          const minDelay = new Promise(resolve => setTimeout(resolve, 600));
          
          const [user] = await Promise.all([
            loginUser(cleanEmail, password, view),
            minDelay
          ]);
          
          setLoginStatus('success');
          
          // Allow success animation to play before unmounting
          setTimeout(() => {
             onLogin(user);
          }, 800);
      }
    } catch (err: any) {
      console.error(err);
      setError('Invalid credentials or connection error.');
      setLoginStatus('error');
      // Reset to idle after shake animation completes
      setTimeout(() => setLoginStatus('idle'), 500);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoginStatus('loading');

    try {
        await resetPassword(email.trim());
        setSuccessMsg(`Reset link sent to ${email}`);
        setEmail(''); // Clear for UX
        setLoginStatus('success');
        setTimeout(() => setLoginStatus('idle'), 2000); // Revert to idle to allow another request
    } catch (err: any) {
        setError(err.message || 'Failed to request password reset.');
        setLoginStatus('error');
        setTimeout(() => setLoginStatus('idle'), 500);
    }
  };

  const getTheme = (role: LoginView) => {
    switch (role) {
      case UserRole.ADMIN:
        return {
          bgGradient: 'from-slate-800 to-gray-900',
          accent: 'text-indigo-400',
          button: 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-400',
          title: 'Admin Portal',
          icon: <ShieldCheck className="h-10 w-10 text-indigo-500" />
        };
      case UserRole.TEACHER:
        return {
          bgGradient: 'from-blue-600 to-indigo-800',
          accent: 'text-blue-200',
          button: 'bg-white text-blue-700 hover:bg-blue-50 focus:ring-white',
          title: 'Teacher Dashboard',
          icon: <School className="h-10 w-10 text-blue-600" />
        };
      case UserRole.STUDENT:
        return {
          bgGradient: 'from-emerald-500 to-teal-700',
          accent: 'text-emerald-100',
          button: 'bg-white text-emerald-700 hover:bg-emerald-50 focus:ring-white',
          title: 'Student Zone',
          icon: <GraduationCap className="h-10 w-10 text-emerald-600" />
        };
      default:
        return { bgGradient: 'from-gray-100 to-gray-200', accent: '', button: '', title: '', icon: null };
    }
  };

  const theme = getTheme(view);

  // Inline styles for custom animations
  const animationStyles = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeInScale {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes blob {
      0% { transform: translate(0px, 0px) scale(1); }
      33% { transform: translate(30px, -50px) scale(1.1); }
      66% { transform: translate(-20px, 20px) scale(0.9); }
      100% { transform: translate(0px, 0px) scale(1); }
    }
    @keyframes gradient-x {
      0%, 100% { background-size: 200% 200%; background-position: left center; }
      50% { background-size: 200% 200%; background-position: right center; }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
      20%, 40%, 60%, 80% { transform: translateX(4px); }
    }
    .animate-blob { animation: blob 7s infinite; }
    .animate-gradient-text { 
        background-size: 200% auto; 
        animation: gradient-x 5s ease infinite; 
    }
    .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
    .animation-delay-2000 { animation-delay: 2s; }
    .animation-delay-4000 { animation-delay: 4s; }
  `;

  // 1. Role Selection Screen
  if (view === 'SELECTION') {
    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center bg-gray-50 selection:bg-indigo-500 selection:text-white">
        <style>{animationStyles}</style>

        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 z-0"></div>
        
        {/* Animated Blobs */}
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-20 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

        {/* Content Container */}
        <div className="relative z-10 w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col items-center">
          
          {/* Header / Hero */}
          <div className="text-center mb-16 space-y-6 animate-[fadeInUp_0.8s_ease-out]">
            <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-lg mb-6 ring-1 ring-black/5">
              <div className="bg-indigo-600 p-2.5 rounded-xl">
                <QrCode className="h-8 w-8 text-white" />
              </div>
              <span className="ml-3 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 animate-gradient-text tracking-tight">
                Smart Attendance
              </span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Streamline Your <br className="hidden md:block" />
              <span className="text-indigo-600 relative whitespace-nowrap">
                <span className="relative z-10">Campus Life</span>
                <span className="absolute bottom-2 left-0 w-full h-3 bg-indigo-200/50 -rotate-1 z-0"></span>
              </span>
            </h1>
            
            <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-600 leading-relaxed">
              A secure, QR-based attendance system designed for modern education. 
              Select your role to access your personalized dashboard.
            </p>
          </div>

          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
            {/* Admin Card */}
            <div 
              onClick={() => setView(UserRole.ADMIN)}
              className="group relative bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border border-slate-100 hover:border-indigo-100 overflow-hidden animate-[fadeInUp_0.6s_ease-out_0.2s_both]"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <LayoutDashboard className="h-32 w-32 text-indigo-600 -mr-8 -mt-8" />
              </div>
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors duration-300">
                  <ShieldCheck className="h-8 w-8 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">Administrator</h3>
                <p className="text-slate-500 mb-6 group-hover:text-slate-600">
                  Manage users, configure system settings, and generate comprehensive attendance reports.
                </p>
                
                <div className="flex items-center text-indigo-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Access Portal <ArrowRight className="h-4 w-4 ml-2" />
                </div>
              </div>
            </div>

            {/* Teacher Card */}
            <div 
              onClick={() => setView(UserRole.TEACHER)}
              className="group relative bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border border-slate-100 hover:border-blue-100 overflow-hidden animate-[fadeInUp_0.6s_ease-out_0.4s_both]"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Globe className="h-32 w-32 text-blue-600 -mr-8 -mt-8" />
              </div>

              <div className="relative z-10">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                  <School className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">Teacher</h3>
                <p className="text-slate-500 mb-6 group-hover:text-slate-600">
                  Mark attendance via QR scan, manage student enrollment, and view class history.
                </p>
                
                <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Access Portal <ArrowRight className="h-4 w-4 ml-2" />
                </div>
              </div>
            </div>

            {/* Student Card */}
            <div 
              onClick={() => setView(UserRole.STUDENT)}
              className="group relative bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border border-slate-100 hover:border-emerald-100 overflow-hidden animate-[fadeInUp_0.6s_ease-out_0.6s_both]"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="h-32 w-32 text-emerald-600 -mr-8 -mt-8" />
              </div>

              <div className="relative z-10">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 transition-colors duration-300">
                  <GraduationCap className="h-8 w-8 text-emerald-600 group-hover:text-white transition-colors duration-300" />
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-emerald-600 transition-colors">Student</h3>
                <p className="text-slate-500 mb-6 group-hover:text-slate-600">
                  View your personal attendance ID, track your history, and monitor your statistics.
                </p>
                
                <div className="flex items-center text-emerald-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Access Portal <ArrowRight className="h-4 w-4 ml-2" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 text-center text-slate-400 text-sm animate-[fadeInUp_0.8s_ease-out_0.8s_both]">
            © {new Date().getFullYear()} Smart Attendance System. Secure & Reliable.
          </div>
        </div>
      </div>
    );
  }

  // 2. Login Form Screen (Dynamic Theme based on Role)
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 bg-gradient-to-br ${theme.bgGradient} relative overflow-hidden transition-all duration-700`}>
       <style>{animationStyles}</style>

       {/* Animated Background Particles for Login */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[70vh] h-[70vh] rounded-full bg-white/5 blur-3xl animate-blob"></div>
          <div className="absolute top-[40%] -left-[10%] w-[50vh] h-[50vh] rounded-full bg-white/5 blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-[20%] right-[20%] w-[60vh] h-[60vh] rounded-full bg-white/5 blur-3xl animate-blob animation-delay-4000"></div>
       </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden animate-[fadeInScale_0.5s_ease-out] ring-1 ring-white/20">
        
        {/* Left Side: Illustration / Branding */}
        <div className={`hidden md:flex flex-col justify-between p-12 bg-gray-50/50 relative overflow-hidden`}>
           <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-100 to-transparent rounded-full blur-3xl opacity-60 -mr-16 -mt-16"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-indigo-100 to-transparent rounded-full blur-3xl opacity-60 -ml-16 -mb-16"></div>
           
           <div className="relative z-10">
             <button 
               onClick={() => setView('SELECTION')}
               className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
             >
               <ChevronLeft className="h-4 w-4 mr-1" />
               Back to Selection
             </button>
           </div>

           <div className="relative z-10 flex flex-col items-center text-center">
             <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 ring-1 ring-gray-100">
               {theme.icon}
             </div>
             <h2 className="text-3xl font-bold text-gray-900 mb-4">{theme.title}</h2>
             <p className="text-gray-500 max-w-xs">
               Welcome back! Please enter your credentials to access the secure dashboard.
             </p>
           </div>

           <div className="relative z-10 text-center">
             <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">Secure Login • {view} Access</p>
           </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center relative bg-white">
          <div className="md:hidden mb-8">
            <button 
              onClick={() => setView('SELECTION')}
              className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </button>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
            <p className="text-sm text-gray-500 mt-2">Enter your email and password to continue.</p>
          </div>

          {!isForgotPassword ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-5">
                 <div className="relative">
                   <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                   <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-gray-900"
                    placeholder="Email Address"
                   />
                 </div>
                 <div className="relative">
                   <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                   <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-gray-900"
                    placeholder="Password"
                   />
                 </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center text-gray-500 cursor-pointer hover:text-gray-700">
                  <input type="checkbox" className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  Remember me
                </label>
                <button 
                  type="button" 
                  onClick={() => setIsForgotPassword(true)}
                  className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loginStatus === 'loading' || loginStatus === 'success'}
                className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg transform transition-all hover:-translate-y-1 hover:shadow-xl focus:ring-4 focus:ring-opacity-50 
                ${loginStatus === 'error' ? 'animate-shake bg-red-600 ring-red-300' : ''} 
                ${loginStatus === 'success' ? 'bg-green-600 scale-105 ring-green-300' : ''} 
                ${loginStatus === 'loading' ? 'opacity-80 cursor-not-allowed' : ''}
                ${loginStatus === 'idle' ? theme.button : ''}
                `}
              >
                {loginStatus === 'loading' && (
                  <div className="flex items-center justify-center">
                    <Loader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Signing in...
                  </div>
                )}
                {loginStatus === 'success' && (
                  <div className="flex items-center justify-center">
                    <CheckCircle className="animate-bounce mr-2 h-5 w-5" />
                    Success!
                  </div>
                )}
                {loginStatus === 'error' && "Try Again"}
                {loginStatus === 'idle' && 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-6 animate-[fadeInUp_0.4s_ease-out]">
                <div className="bg-indigo-50 p-4 rounded-xl mb-4 border border-indigo-100">
                    <h3 className="text-sm font-bold text-indigo-900 mb-1">Reset Password</h3>
                    <p className="text-xs text-indigo-700">Enter your registered email address and we'll send you instructions to reset your password.</p>
                </div>

                <div className="relative">
                   <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                   <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-gray-900"
                    placeholder="Enter your email"
                   />
                </div>

                <div className="space-y-3">
                    <button
                        type="submit"
                        disabled={loginStatus === 'loading' || loginStatus === 'success'}
                        className={`w-full py-3 px-6 rounded-xl font-bold text-white shadow-lg transition-all 
                        ${loginStatus === 'error' ? 'animate-shake bg-red-600' : ''} 
                        ${loginStatus === 'success' ? 'bg-green-600' : theme.button}`}
                    >
                        {loginStatus === 'loading' ? 'Sending...' : 
                         loginStatus === 'success' ? 'Sent!' :
                         loginStatus === 'error' ? 'Failed' : 'Send Reset Link'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsForgotPassword(false)}
                        className="w-full py-3 px-6 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
          )}

          {/* Feedback Messages */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-600 animate-fade-in">
              <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          
          {successMsg && (
            <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center text-green-600 animate-fade-in">
              <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
              <p className="text-sm font-medium">{successMsg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};