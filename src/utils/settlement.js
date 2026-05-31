/**
 * Calculates the net balance for each participant in a trip.
 * Net balance = (total amount paid by participant) - (total share owed by participant across all expenses).
 * Positive balance means they are owed money (creditor).
 * Negative balance means they owe money (debtor).
 * 
 * @param {string[]} participants - List of participant names.
 * @param {object[]} expenses - List of expense objects.
 * @returns {object} Map of participant name to net balance.
 */
export function calculateBalances(participants, expenses) {
  const balances = {};
  
  // Initialize balances to 0 for all participants
  participants.forEach(p => {
    balances[p] = 0;
  });

  // Calculate net balances
  expenses.forEach(expense => {
    const amount = Number(expense.amount) || 0;
    const paidBy = expense.paidBy;
    const splitAmong = expense.splitAmong || participants;

    if (!paidBy || splitAmong.length === 0) return;

    // Payer gets credited the full amount
    if (balances[paidBy] !== undefined) {
      balances[paidBy] += amount;
    }

    // Each split participant gets debited their share
    const share = amount / splitAmong.length;
    splitAmong.forEach(p => {
      if (balances[p] !== undefined) {
        balances[p] -= share;
      }
    });
  });

  // Round values to 2 decimal places to avoid floating point issues
  Object.keys(balances).forEach(p => {
    balances[p] = Math.round(balances[p] * 100) / 100;
  });

  return balances;
}

/**
 * Simplifies debts to minimize the number of transactions.
 * Uses a greedy algorithm that matches the largest debtor with the largest creditor.
 * 
 * @param {object} balances - Map of participant name to net balance.
 * @returns {object[]} List of simplified transactions: [{ from: string, to: string, amount: number }]
 */
export function simplifyDebts(balances) {
  const debtors = [];
  const creditors = [];

  // Group into debtors and creditors
  Object.keys(balances).forEach(person => {
    const bal = balances[person];
    if (bal < -0.01) {
      debtors.push({ name: person, amount: Math.abs(bal) });
    } else if (bal > 0.01) {
      creditors.push({ name: person, amount: bal });
    }
  });

  const transactions = [];

  // Helper to sort descending by amount
  const sortDesc = (a, b) => b.amount - a.amount;

  // Greedy match largest debtor and largest creditor
  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort(sortDesc);
    creditors.sort(sortDesc);

    const debtor = debtors[0];
    const creditor = creditors[0];

    const amount = Math.min(debtor.amount, creditor.amount);
    
    if (amount > 0.01) {
      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(amount * 100) / 100
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    // Remove settled parties
    if (debtor.amount < 0.01) debtors.shift();
    if (creditor.amount < 0.01) creditors.shift();
  }

  return transactions;
}
