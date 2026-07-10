'use client';

import ExpenseForm from '@/components/expenses/ExpenseForm';

export default function AddExpensePage() {
  return (
    <div className="container">
      <h1 className="text-2xl mb-4">Add Expense</h1>
      <ExpenseForm />
    </div>
  );
}
