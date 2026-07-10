'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ExpenseForm() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'groceries',
    splitType: 'equal',
    // We will handle dynamic split mapping later
  });

  const categories = [
    { value: 'groceries', label: '🥬 Groceries' },
    { value: 'rent', label: '🏠 Rent' },
    { value: 'electricity', label: '⚡ Electricity' },
    { value: 'cook', label: '👨‍🍳 Cook' },
    { value: 'gas', label: '⛽ Gas' },
    { value: 'water', label: '💧 Water' },
    { value: 'maintenance', label: '🔧 Maintenance' },
    { value: 'other', label: '📝 Other' },
  ];

  const splitTypes = [
    { value: 'equal', label: 'Equal Split' },
    { value: 'custom', label: 'Custom Amount' },
    { value: 'percentage', label: 'Percentage' },
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitting Expense: ', formData);
    // TODO: Add API call to save expense
    router.push('/dashboard');
  };

  return (
    <form className="card flex flex-col gap-4" onSubmit={handleSubmit}>
      
      {/* Title */}
      <div className="flex-col gap-2">
        <label className="font-bold">Expense Title</label>
        <input 
          type="text" 
          name="title"
          className="p-2 border rounded" 
          placeholder="e.g. Reliance Fresh" 
          value={formData.title}
          onChange={handleChange}
          required
        />
      </div>

      {/* Amount */}
      <div className="flex-col gap-2">
        <label className="font-bold">Amount (₹)</label>
        <input 
          type="number" 
          name="amount"
          className="p-2 border rounded" 
          placeholder="0.00" 
          value={formData.amount}
          onChange={handleChange}
          required
          min="1"
        />
      </div>

      {/* Category */}
      <div className="flex-col gap-2">
        <label className="font-bold">Category</label>
        <select 
          name="category" 
          className="p-2 border rounded bg-white dark:bg-slate-800"
          value={formData.category}
          onChange={handleChange}
        >
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Split Type */}
      <div className="flex-col gap-2">
        <label className="font-bold">Split Type</label>
        <div className="flex gap-2 flex-wrap">
          {splitTypes.map(type => (
            <button
              key={type.value}
              type="button"
              className={`p-2 rounded border flex-1 min-w-[100px] text-sm ${formData.splitType === type.value ? 'bg-primary-500 text-white border-primary-500' : 'bg-transparent'}`}
              style={formData.splitType === type.value ? { background: 'var(--primary-color)', color: 'white' } : {}}
              onClick={() => setFormData({ ...formData, splitType: type.value })}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="btn btn-primary w-full mt-4">
        Add Expense
      </button>

    </form>
  );
}
