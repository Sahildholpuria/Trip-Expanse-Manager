import React, { useState, useEffect } from 'react';
import { db, auth, signOut } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot,
  deleteDoc,
  doc,
  getDocs
} from 'firebase/firestore';
import { 
  Plus, 
  LogOut, 
  Compass, 
  Calendar, 
  Users, 
  X, 
  Trash,
  ArrowRight,
  TrendingUp,
  User,
  Activity
} from 'lucide-react';

export default function DashboardScreen({ user, onSelectTrip }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Drawer / New Trip Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [tripName, setTripName] = useState('');
  const [tripDesc, setTripDesc] = useState('');
  const [travelDate, setTravelDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newParticipant, setNewParticipant] = useState('');
  const [participants, setParticipants] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch user's trips
  useEffect(() => {
    if (!user) return;

    const tripsRef = collection(db, 'trips');
    const q = query(
      tripsRef, 
      where('createdBy', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripList = [];
      snapshot.forEach(doc => {
        tripList.push({ id: doc.id, ...doc.data() });
      });
      // Sort client-side to prevent missing index errors in Firestore
      tripList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTrips(tripList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching trips:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const handleDeleteTrip = async (e, tripId) => {
    e.stopPropagation(); // Prevent opening the trip details screen
    if (window.confirm("Are you sure you want to delete this trip? All expenses logged under this trip will be permanently deleted.")) {
      try {
        // Delete the main trip doc
        await deleteDoc(doc(db, 'trips', tripId));
        
        // Find and delete all corresponding expenses
        const expensesRef = collection(db, 'expenses');
        const q = query(expensesRef, where('tripId', '==', tripId));
        const snapshot = await getDocs(q);
        
        const deletePromises = [];
        snapshot.forEach((docSnap) => {
          deletePromises.push(deleteDoc(doc(db, 'expenses', docSnap.id)));
        });
        await Promise.all(deletePromises);
      } catch (err) {
        console.error("Error deleting trip and expenses:", err);
        alert("Failed to delete trip: " + err.message);
      }
    }
  };

  const addParticipant = (e) => {
    e.preventDefault();
    const name = newParticipant.trim();
    if (!name) return;
    if (participants.includes(name)) {
      setFormError('Participant name already added');
      return;
    }
    setParticipants([...participants, name]);
    setNewParticipant('');
    setFormError('');
  };

  const removeParticipant = (name) => {
    setParticipants(participants.filter(p => p !== name));
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!tripName.trim()) {
      setFormError('Trip name is required');
      return;
    }

    if (participants.length === 0) {
      setFormError('Add at least one participant');
      return;
    }

    setSubmitting(true);

    try {
      const user = auth.currentUser;
      const tripData = {
        name: tripName.trim(),
        description: tripDesc.trim(),
        travelDate: travelDate,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        // Add creator automatically to the list if they are not already there
        participants: participants
      };

      await addDoc(collection(db, 'trips'), tripData);
      
      // Reset form
      setTripName('');
      setTripDesc('');
      setTravelDate(new Date().toISOString().split('T')[0]);
      setParticipants([]);
      setIsDrawerOpen(false);
    } catch (err) {
      console.error(err);
      setFormError('Failed to create trip: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Header Banner */}
      <header className="sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 py-4 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
            <Compass className="w-6 h-6" />
          </div>
          <span className="font-display font-extrabold text-xl tracking-tight text-slate-800 dark:text-white">
            Trip Expense
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden sm:inline-block truncate max-w-[120px]">
            {auth.currentUser?.displayName || auth.currentUser?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors"
            title="Sign Out"
            id="btn-sign-out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-6">
        
        {/* Welcome Section */}
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-850 dark:text-white">
            My Trips
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select a trip to manage expenses and check balances.
          </p>
        </div>

        {/* Trips List */}
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-3xl h-32 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-lg w-2/3 mb-3"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2"></div>
                </div>
                <div className="flex gap-4 border-t border-slate-100 dark:border-slate-700/50 pt-3.5">
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-lg w-20"></div>
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-lg w-24"></div>
                </div>
              </div>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col items-center">
            <div className="p-4 bg-indigo-500/10 text-indigo-500 rounded-full mb-4">
              <Compass className="w-10 h-10" />
            </div>
            <h3 className="font-display font-semibold text-lg text-slate-800 dark:text-white">No Trips Found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mt-1">
              You haven't created any trips yet. Get started by creating your first adventure!
            </p>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="mt-6 py-3 px-5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
              id="btn-create-first-trip"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Trip</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {trips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => onSelectTrip(trip)}
                className="group p-5 bg-white dark:bg-slate-800 hover:border-indigo-400/50 dark:hover:border-indigo-500/30 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-[0.99] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                      {trip.name}
                    </h3>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </div>
                  {trip.description && (
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 line-clamp-2">
                      {trip.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{trip.participants?.length || 0} travelers</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>
                        {trip.travelDate 
                          ? new Date(trip.travelDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                          : new Date(trip.createdAt).toLocaleDateString()
                        }
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteTrip(e, trip.id)}
                    className="p-2 hover:bg-rose-500/10 hover:text-rose-500 rounded-xl text-slate-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete Trip"
                  >
                    <Trash className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) for Mobile Quick Creation */}
      {trips.length > 0 && (
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-500/35 hover:scale-105 active:scale-95 transition-all z-40"
          title="Create Trip"
          id="btn-fab-create-trip"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Bottom Sheet Drawer Backdrop */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 animate-fade-in"
          onClick={() => setIsDrawerOpen(false)}
        >
          {/* Bottom Sheet Content */}
          <div 
            className="fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 rounded-t-[32px] p-6 shadow-2xl z-50 animate-slide-up max-h-[85vh] overflow-y-auto max-w-md mx-auto border-t border-slate-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle indicator */}
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-5"></div>

            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-bold text-xl text-slate-800 dark:text-white">
                Create New Trip
              </h3>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-4 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 dark:text-rose-400 text-sm flex items-start gap-2 animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTrip} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Trip Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Europe Backpacking 2026"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-sans text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Where are you going and why?"
                  value={tripDesc}
                  onChange={(e) => setTripDesc(e.target.value)}
                  rows="2"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-sans text-base resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Travel Date
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                    <Calendar className="w-5 h-5" />
                  </span>
                  <input
                    type="date"
                    required
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-sans text-base cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Add Participants
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter traveler name"
                    value={newParticipant}
                    onChange={(e) => setNewParticipant(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-sans text-base"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addParticipant(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addParticipant}
                    className="p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl shadow-md transition-colors"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>

                {/* Participant Tags list */}
                {participants.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 max-h-36 overflow-y-auto custom-scrollbar">
                    {participants.map((person) => (
                      <span
                        key={person}
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-sm font-semibold rounded-xl border border-indigo-100 dark:border-indigo-950"
                      >
                        <span>{person}</span>
                        <button
                          type="button"
                          onClick={() => removeParticipant(person)}
                          className="p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-full text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-450 dark:text-slate-500 mt-2 font-sans italic">
                    Add participant names above (e.g. Sahil, Amit, Priya)
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-base mt-4"
              >
                {submitting ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Create Trip</span>
                    <Plus className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
