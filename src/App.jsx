import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AuthScreen from './components/AuthScreen';
import DashboardScreen from './components/DashboardScreen';
import TripDetailsScreen from './components/TripDetailsScreen';
import { Sun, Moon, Compass } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    // Check local storage or system preference
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Track Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      // Reset selected trip on logout
      if (!currentUser) {
        setSelectedTrip(null);
      }
    });

    return unsubscribe;
  }, []);

  // Update DOM on dark mode change
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4">
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-500/15 border border-indigo-400/20 rounded-3xl text-indigo-300 animate-spin" style={{ animationDuration: '3s' }}>
            <Compass className="w-10 h-10" />
          </div>
          <h2 className="font-display font-bold text-lg text-indigo-200 tracking-wide animate-pulse">
            Syncing Trip Manager...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      
      {/* View routing */}
      {!user ? (
        <AuthScreen />
      ) : selectedTrip ? (
        <TripDetailsScreen 
          trip={selectedTrip} 
          onBack={() => setSelectedTrip(null)} 
        />
      ) : (
        <DashboardScreen 
          user={user}
          onSelectTrip={(trip) => setSelectedTrip(trip)} 
        />
      )}

      {/* Persistent Theme Toggle FAB at the bottom left */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="fixed bottom-6 left-6 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all z-40"
        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        id="btn-theme-toggle"
      >
        {darkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-500" />}
      </button>

    </div>
  );
}
