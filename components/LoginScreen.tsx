import React, { useState } from 'react';
import { Clapperboard, AlertTriangle, Copy, Check } from 'lucide-react';
import { signInWithGoogle } from '../services/firebase';

const LoginScreen: React.FC = () => {
  const [error, setError] = useState<{code: string; message: string; domain?: string} | null>(null);
  const [copied, setCopied] = useState(false);

  const handleLogin = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Login Error:", err);
      
      let errorData = { code: err.code, message: err.message, domain: '' };

      if (err.code === 'auth/unauthorized-domain') {
         errorData.domain = window.location.hostname;
         errorData.message = "This domain is not authorized.";
      } else if (err.code === 'auth/configuration-not-found') {
         errorData.message = "Google Sign-In is not enabled in Firebase Console.";
      } else if (err.code === 'auth/popup-closed-by-user') {
         return; // Ignore
      }

      setError(errorData);
    }
  };

  const copyDomain = () => {
    if (error?.domain) {
      navigator.clipboard.writeText(error.domain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

        <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-gray-400 mb-8">Track your movies, series, and watch history across all your devices.</p>

        <button 
            onClick={handleLogin}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-md transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-3"
        >
            <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
        </button>

        {error && (
            <div className="mt-6 w-full text-left bg-red-900/30 border border-red-500/50 rounded-lg p-4 animate-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20}/>
                    <div className="flex-1">
                        <h3 className="font-bold text-red-200 text-sm mb-1">
                            {error.code === 'auth/unauthorized-domain' ? 'Domain Not Authorized' : 'Login Failed'}
                        </h3>
                        <p className="text-xs text-gray-300 mb-3 leading-relaxed">
                            {error.code === 'auth/unauthorized-domain' 
                                ? "Firebase blocks unknown domains for security. You must whitelist the current URL to sign in." 
                                : error.message}
                        </p>
                        
                        {error.code === 'auth/unauthorized-domain' && (
                            <div className="bg-black/50 rounded p-2 flex items-center justify-between gap-2 border border-white/10">
                                <code className="text-xs text-orange-300 truncate font-mono select-all">
                                    {error.domain}
                                </code>
                                <button 
                                    onClick={copyDomain}
                                    className="p-1.5 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                                    title="Copy Domain"
                                >
                                    {copied ? <Check size={14} className="text-green-500"/> : <Copy size={14}/>}
                                </button>
                            </div>
                        )}
                        
                        {error.code === 'auth/unauthorized-domain' && (
                             <p className="text-[10px] text-gray-500 mt-2">
                                Go to Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains and add the domain above.
                             </p>
                        )}
                    </div>
                </div>
            </div>
        )}
        
        <p className="mt-8 text-xs text-gray-500">
            Powered by TMDB and Firebase. <br/>
            Your data is stored securely in the cloud.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
