import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { calculateBalances, simplifyDebts } from '../utils/settlement';
import { 
  ArrowLeft, 
  Plus, 
  Users, 
  Calendar, 
  DollarSign, 
  Layers, 
  UserCheck, 
  Trash2, 
  X, 
  TrendingUp, 
  Utensils, 
  Car, 
  Bed, 
  Ticket, 
  ShoppingBag, 
  CheckCircle,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

const CATEGORIES = [
  { id: 'Food', label: 'Food', icon: Utensils, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { id: 'Transport', label: 'Transport', icon: Car, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { id: 'Lodging', label: 'Lodging', icon: Bed, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { id: 'Activities', label: 'Activities', icon: Ticket, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  { id: 'Shopping', label: 'Shopping', icon: ShoppingBag, color: 'bg-pink-500/10 text-pink-500 border-pink-500/20' },
  { id: 'Settlement', label: 'Settlement', icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { id: 'Other', label: 'Other', icon: HelpCircle, color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' }
];

export default function TripDetailsScreen({ trip, onBack }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'balances' | 'participants'
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  // Add Expense Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food');
  const [paidBy, setPaidBy] = useState(trip.participants[0] || '');
  const [splitAmong, setSplitAmong] = useState(trip.participants || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const getLocalDateTimeString = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };
  const [expenseDate, setExpenseDate] = useState(getLocalDateTimeString);
  const [paymentMode, setPaymentMode] = useState('Cash');
  
  const amountInputRef = useRef(null);

  // Fetch expenses in real-time
  useEffect(() => {
    const expensesRef = collection(db, 'expenses');
    const q = query(
      expensesRef, 
      where('tripId', '==', trip.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expenseList = [];
      snapshot.forEach(doc => {
        expenseList.push({ id: doc.id, ...doc.data() });
      });
      // Sort client-side to prevent missing index errors in Firestore
      expenseList.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(expenseList);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching expenses:", err);
      setLoading(false);
    });

    return unsubscribe;
  }, [trip.id]);

  // Open drawer and focus input
  const openAddExpenseDrawer = () => {
    setAmount('');
    setDescription('');
    setCategory('Food');
    setPaidBy(trip.participants[0] || '');
    setSplitAmong(trip.participants || []);
    setExpenseDate(getLocalDateTimeString());
    setPaymentMode('Cash');
    setError('');
    setIsDrawerOpen(true);
    
    // Focus amount input
    setTimeout(() => {
      if (amountInputRef.current) {
        amountInputRef.current.focus();
      }
    }, 100);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setError('');

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    if (splitAmong.length === 0) {
      setError('Please select at least one traveler to split with');
      return;
    }

    setSubmitting(true);

    try {
      const expenseData = {
        tripId: trip.id,
        amount: numericAmount,
        description: description.trim(),
        category,
        paidBy,
        splitAmong,
        paymentMode,
        date: new Date(expenseDate).toISOString()
      };

      await addDoc(collection(db, 'expenses'), expenseData);
      setIsDrawerOpen(false);
      showToast("Expense added successfully!");
    } catch (err) {
      console.error(err);
      setError('Failed to add expense: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await deleteDoc(doc(db, 'expenses', id));
        showToast("Expense deleted successfully!");
      } catch (err) {
        console.error("Error deleting expense:", err);
        showToast("Failed to delete expense: " + err.message, "error");
      }
    }
  };

  // Settle Up logic (logs a special balancing transaction)
  const handleSettleUp = async (from, to, amountToSettle) => {
    try {
      const settlementExpense = {
        tripId: trip.id,
        amount: Number(amountToSettle),
        description: `Settlement: ${from} ➔ ${to}`,
        category: 'Settlement',
        paidBy: from,
        splitAmong: [to],
        date: new Date().toISOString()
      };

      await addDoc(collection(db, 'expenses'), settlementExpense);
      showToast(`Settled ₹${amountToSettle} from ${from} to ${to}!`);
    } catch (err) {
      console.error("Error settling up:", err);
      showToast("Failed to record settlement: " + err.message, "error");
    }
  };

  // Calculations
  const totalSpent = expenses
    .filter(exp => exp.category !== 'Settlement')
    .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const balances = calculateBalances(trip.participants, expenses);
  const simplifiedDebts = simplifyDebts(balances);

  // Calculate category distribution (excluding Settlement)
  const catDistribution = CATEGORIES.reduce((acc, cat) => {
    if (cat.id === 'Settlement') return acc;
    const total = expenses
      .filter(exp => exp.category === cat.id)
      .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    if (total > 0) {
      acc.push({ ...cat, total });
    }
    return acc;
  }, []);

  const totalActiveSpent = catDistribution.reduce((sum, item) => sum + item.total, 0);

  const toggleSplitUser = (name) => {
    if (splitAmong.includes(name)) {
      setSplitAmong(splitAmong.filter(n => n !== name));
    } else {
      setSplitAmong([...splitAmong, name]);
    }
  };

  const toggleSelectAllSplit = () => {
    if (splitAmong.length === trip.participants.length) {
      setSplitAmong([]);
    } else {
      setSplitAmong([...trip.participants]);
    }
  };

  const getCategoryDetails = (catId) => {
    return CATEGORIES.find(c => c.id === catId) || CATEGORIES[6]; // default to other
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Dynamic Header */}
      <header className="sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 py-4.5 z-30 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-505 dark:text-slate-400 rounded-xl transition-colors"
          title="Back to Trips"
          id="btn-trip-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 truncate">
          <h2 className="font-display font-extrabold text-lg text-slate-800 dark:text-white truncate">
            {trip.name}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {trip.travelDate 
              ? `${new Date(trip.travelDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • ${trip.participants.length} travelers`
              : trip.description || `${trip.participants.length} travelers`
            }
          </p>
        </div>
      </header>

      {/* Main Core */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-6">
        
        {/* Overview Banner (Glassmorphic card) */}
        <section className="glass rounded-3xl p-6 shadow-md border border-slate-200/50 dark:border-slate-800/80 mb-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Expenses
              </span>
              <h3 className="font-display font-black text-3xl text-indigo-600 dark:text-indigo-400 mt-1">
                ₹{totalSpent.toLocaleString()}
              </h3>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          {/* Quick stats on user shares */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/80 text-sm">
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-xs">Trip Budget Pool</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {trip.participants.length} Splitters
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-xs">Total Expenses</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {expenses.filter(e => e.category !== 'Settlement').length} logs
              </p>
            </div>
          </div>

          {/* Expense Breakdown Visual Bar */}
          {totalActiveSpent > 0 && (
            <div className="mt-5 pt-5 border-t border-slate-200/50 dark:border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Expense Breakdown
              </span>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden flex">
                {catDistribution.map((item) => {
                  const pct = (item.total / totalActiveSpent) * 100;
                  let bgClass = 'bg-slate-500';
                  if (item.id === 'Food') bgClass = 'bg-amber-500';
                  else if (item.id === 'Transport') bgClass = 'bg-blue-500';
                  else if (item.id === 'Lodging') bgClass = 'bg-purple-500';
                  else if (item.id === 'Activities') bgClass = 'bg-green-500';
                  else if (item.id === 'Shopping') bgClass = 'bg-pink-500';
                  else if (item.id === 'Other') bgClass = 'bg-slate-400';

                  return (
                    <div 
                      key={item.id} 
                      className={`${bgClass} transition-all`} 
                      style={{ width: `${pct}%` }}
                      title={`${item.label}: ${pct.toFixed(0)}%`}
                    />
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-slate-500 dark:text-slate-400">
                {catDistribution.map((item) => {
                  const pct = (item.total / totalActiveSpent) * 100;
                  let dotColor = 'bg-slate-500';
                  if (item.id === 'Food') dotColor = 'bg-amber-500';
                  else if (item.id === 'Transport') dotColor = 'bg-blue-500';
                  else if (item.id === 'Lodging') dotColor = 'bg-purple-500';
                  else if (item.id === 'Activities') dotColor = 'bg-green-500';
                  else if (item.id === 'Shopping') dotColor = 'bg-pink-500';
                  else if (item.id === 'Other') dotColor = 'bg-slate-400';

                  return (
                    <div key={item.id} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                      <span>{item.label}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Action / Navigation Tabs */}
        <nav className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl mb-6 relative z-10">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 py-2.5 px-2 sm:px-4 font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
              activeTab === 'expenses' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Expenses</span>
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`flex-1 py-2.5 px-2 sm:px-4 font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
              activeTab === 'balances' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>Balances</span>
          </button>
          <button
            onClick={() => setActiveTab('participants')}
            className={`flex-1 py-2.5 px-2 sm:px-4 font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
              activeTab === 'participants' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Travelers</span>
          </button>
        </nav>

        {/* Tab Contents */}
        {loading ? (
          <div className="space-y-3.5 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800/80 rounded-2xl h-20 shadow-sm">
                <div className="w-11 h-11 bg-slate-200 dark:bg-slate-700/60 rounded-2xl shrink-0"></div>
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700/60 rounded-lg w-1/3"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700/60 rounded-lg w-1/4"></div>
                </div>
                <div className="h-4.5 bg-slate-200 dark:bg-slate-700/60 rounded-lg w-14 shrink-0"></div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {/* 1. EXPENSES TAB */}
            {activeTab === 'expenses' && (
              <div className="space-y-4 animate-fade-in">
                {expenses.length === 0 ? (
                  <div className="text-center py-12 px-6 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-slate-400 dark:text-slate-500 text-sm">
                      No expenses logged yet. Tap the '+' button below to add your first expense.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {expenses.map((expense) => {
                      const cat = getCategoryDetails(expense.category);
                      const IconComp = cat.icon;
                      const isSettlement = expense.category === 'Settlement';
                      
                      return (
                        <article
                          key={expense.id}
                          className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm relative group"
                        >
                          <div className={`p-3 rounded-2xl border ${cat.color} shrink-0`}>
                            <IconComp className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-800 dark:text-white truncate">
                              {expense.description}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              {isSettlement 
                                ? `${expense.paidBy} paid ${expense.splitAmong[0]}`
                                : `Paid by ${expense.paidBy} • split among ${expense.splitAmong?.length || 0}`
                              }
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                {new Date(expense.date).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {expense.paymentMode && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${
                                  expense.paymentMode === 'Cash'
                                    ? 'bg-amber-500/5 text-amber-500 border-amber-500/10'
                                    : 'bg-indigo-500/5 text-indigo-500 border-indigo-500/10'
                                }`}>
                                  {expense.paymentMode}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <span className="font-bold text-slate-900 dark:text-white text-base">
                              ₹{Number(expense.amount).toLocaleString()}
                            </span>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. BALANCES TAB */}
            {activeTab === 'balances' && (
              <div className="space-y-6 animate-fade-in">
                {/* Net Balances List */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                  <h4 className="font-display font-bold text-base text-slate-800 dark:text-white mb-4">
                    Individual Balance Sheets
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {trip.participants.map((person) => {
                      const net = balances[person] || 0;
                      const isOwed = net > 0.01;
                      const isOwes = net < -0.01;
                      
                      return (
                        <div key={person} className="flex justify-between items-center py-3.5 first:pt-0 last:pb-0">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {person}
                          </span>
                          <span className={`font-bold font-display ${
                            isOwed ? 'text-emerald-500' : isOwes ? 'text-rose-500' : 'text-slate-400'
                          }`}>
                            {isOwed ? `+₹${net.toLocaleString()}` : isOwes ? `-₹${Math.abs(net).toLocaleString()}` : '₹0'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Simplified Settlements */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                  <h4 className="font-display font-bold text-base text-slate-800 dark:text-white mb-4">
                    Who Owes Whom
                  </h4>
                  {simplifiedDebts.length === 0 ? (
                    <div className="py-4 text-center">
                      <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-500 rounded-full mb-3">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                        All settled up! No debts to display.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {simplifiedDebts.map((debt, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm gap-3"
                        >
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-0 flex-1">
                            <span className="font-bold text-rose-500">{debt.from}</span> owes{' '}
                            <span className="font-bold text-emerald-500">{debt.to}</span>{' '}
                            <span className="font-display font-extrabold text-base text-slate-850 dark:text-white block mt-0.5">
                              ₹{debt.amount.toLocaleString()}
                            </span>
                          </div>

                          <button
                            onClick={() => handleSettleUp(debt.from, debt.to, debt.amount)}
                            className="py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/15 transition-all active:scale-[0.97] shrink-0"
                          >
                            Settle Up
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. PARTICIPANTS TAB */}
            {activeTab === 'participants' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                  <h4 className="font-display font-bold text-base text-slate-800 dark:text-white mb-4">
                    Trip Members
                  </h4>
                  <ul className="space-y-3.5">
                    {trip.participants.map((person, index) => (
                      <li key={index} className="flex items-center gap-3.5 py-1">
                        <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-display font-bold text-base rounded-full">
                          {person.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-850 dark:text-slate-200">
                          {person}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button for Add Expense (Instant mobile action) */}
      <button
        onClick={openAddExpenseDrawer}
        className="fixed bottom-6 right-6 p-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-500/35 hover:scale-105 active:scale-95 transition-all z-40"
        title="Add Expense"
        id="btn-fab-add-expense"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Bottom Sheet Drawer for adding expense */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 animate-fade-in"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div 
            className="fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 rounded-t-[32px] p-6 shadow-2xl z-50 animate-slide-up max-h-[90vh] overflow-y-auto max-w-md mx-auto border-t border-slate-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-5"></div>

            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-bold text-xl text-slate-800 dark:text-white">
                Add Expense
              </h3>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-4 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 dark:text-rose-400 text-sm flex items-start gap-2 animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-5">
              {/* Amount - Huge visual field for travelers */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4.5 flex items-center text-slate-500 font-display font-black text-2xl">
                    ₹
                  </span>
                  <input
                    type="number"
                    ref={amountInputRef}
                    required
                    placeholder="0"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-white font-display font-extrabold text-2xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dinner at Beach Restaurant"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-sans text-base"
                />
              </div>

              {/* Category Quick select Grid */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.filter(c => c.id !== 'Settlement').map((cat) => {
                    const CatIcon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`py-2.5 px-2 border rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-medium cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-md' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <CatIcon className="w-5 h-5" />
                        <span className="truncate max-w-full scale-90">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Expense Date & Time
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                    <Calendar className="w-5 h-5" />
                  </span>
                  <input
                    type="datetime-local"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-sans text-base cursor-pointer"
                  />
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                  Payment Mode
                </label>
                <div className="flex bg-slate-150 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('Cash')}
                    className={`flex-1 py-2.5 font-bold text-sm rounded-xl transition-all cursor-pointer ${
                      paymentMode === 'Cash'
                        ? 'bg-white dark:bg-slate-800 text-amber-500 dark:text-amber-400 shadow-sm border border-slate-100 dark:border-slate-800/10'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('Online')}
                    className={`flex-1 py-2.5 font-bold text-sm rounded-xl transition-all cursor-pointer ${
                      paymentMode === 'Online'
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100 dark:border-slate-800/10'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Online
                  </button>
                </div>
              </div>

              {/* Paid By selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Paid By
                </label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-sans text-base appearance-none bg-no-repeat bg-[right_16px_center]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundSize: '1.25rem'
                  }}
                >
                  {trip.participants.map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </div>

              {/* Split Among selection checkboxes */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Split Among
                  </label>
                  <button
                    type="button"
                    onClick={toggleSelectAllSplit}
                    className="text-xs font-semibold text-indigo-500 hover:text-indigo-600"
                  >
                    {splitAmong.length === trip.participants.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {trip.participants.map((person) => {
                    const isChecked = splitAmong.includes(person);
                    return (
                      <label 
                        key={person} 
                        className="flex items-center gap-3.5 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSplitUser(person)}
                          className="w-5 h-5 rounded-md border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950 accent-indigo-500 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                          {person}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submit Action */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-base mt-4"
              >
                {submitting ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Add Expense</span>
                    <Plus className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 py-3 px-5 rounded-2xl shadow-xl flex items-center gap-2.5 animate-fade-in text-sm font-semibold border ${
          toast.type === 'error'
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-450'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-450'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-500" /> : <CheckCircle className="w-4.5 h-4.5 shrink-0 text-emerald-500" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
