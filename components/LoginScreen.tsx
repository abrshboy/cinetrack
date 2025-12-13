import React, { useState } from 'react';
import { Clapperboard, AlertTriangle, Lock, UserCircle, Loader2 } from 'lucide-react';
import { signInPersonal } from '../services/firebase';

interface LoginScreenProps {
  onGuestLogin: () => void;
  onPersonalLocalLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onGuestLogin, onPersonalLocalLogin }) => {
  const [error, setError] = useState<{code: string; message: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePersonalLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInPersonal();
    } catch (err: any) {
      console.error("Login Error:", err);
      
      // Fallback for preview environments where Firebase Auth is not configured
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/internal-error') {
         // Proceed as if logged in, but use local storage
         onPersonalLocalLogin();
         return; 
      }

      let message = err.message;
      
      if (err.code === 'auth/network-request-failed') {
        message = "Network error. Please check your internet connection.";
      } else if (err.code === 'auth/invalid-credential') {
        message = "Invalid credentials or account setup issue.";
      }

      setError({ code: err.code, message: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[url('https://assets.nflxext.com/ffe/siteui/vlv3/c38a2d52-138e-48a3-ab68-36787ece46b3/eeb03fc9-99c6-438e-824d-32917ce55783/US-en-20240101-popsignuptwoweeks-perspective_alpha_website_large.jpg')] bg-cover bg-center flex items-center justify-center relative">
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>

      <div className="relative z-10 w-full max-w-md p-12 bg-black/80 rounded-xl backdrop-blur-md border border-white/10 shadow-2xl flex flex-col items-center text-center">
        <div className="flex items-center gap-2 text-red-600 mb-8">
            <Clapperboard size={48} />
            <h1 className="text-4xl font-bold tracking-tighter">CINETRACK</h1>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Personal Library</h2>
        <p className="text-gray-400 mb-8">Secure access to your personal movie and series collection.</p>

        <div className="w-full flex flex-col gap-4">
            <button 
                onClick={handlePersonalLogin}
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-md transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    <Lock size={20} />
                    Login as Owner
                  </>
                )}
            </button>

            <button 
                onClick={onGuestLogin}
                className="w-full bg-transparent border border-white/20 hover:bg-white/10 text-white font-medium py-3 rounded-md transition-all flex items-center justify-center gap-2 text-sm"
            >
                <UserCircle size={18} />
                Continue as Guest
            </button>
        </div>

        {error && (
            <div className="mt-6 w-full text-left bg-red-900/30 border border-red-500/50 rounded-lg p-4 animate-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20}/>
                    <div className="flex-1">
                        <h3 className="font-bold text-red-200 text-sm mb-1">Access Denied</h3>
                        <p className="text-xs text-gray-300 leading-relaxed">
                            {error.message}
                        </p>
                    </div>
                </div>
            </div>
        )}
        
        <p className="mt-8 text-xs text-gray-500">
            Powered by TMDB and Firebase.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
