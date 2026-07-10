'use client';

import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Reports() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/expenses/me`, {
        credentials: 'include'
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setExpenses(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`FlatSplit-Report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading reports...</div>;

  const totalSpend = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="flex-col gap-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-h5" style={{ margin: 0 }}>Monthly Reports</h1>
        <button 
          onClick={generatePDF} 
          disabled={isGenerating || expenses.length === 0}
          className="md-btn md-btn-contained flex items-center gap-2"
        >
          <span className="material-icons" style={{ fontSize: '18px' }}>download</span>
          {isGenerating ? 'Generating...' : 'Download PDF'}
        </button>
      </div>

      <div className="md-card p-6" style={{ overflowX: 'auto' }}>
        
        {/* Hidden/Printable Area for PDF */}
        <div ref={reportRef} style={{ padding: '24px', backgroundColor: '#FFFFFF', color: '#000000', minWidth: '700px' }}>
          
          <div className="flex justify-between items-end mb-6" style={{ borderBottom: '2px solid #6200EE', paddingBottom: '16px' }}>
            <div>
              <h1 style={{ margin: 0, color: '#6200EE', fontSize: '28px', fontWeight: 'bold' }}>FlatSplit</h1>
              <p style={{ margin: '4px 0 0 0', color: '#666' }}>Expense Summary Report</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>Date: {new Date().toLocaleDateString()}</p>
              <p style={{ margin: '4px 0 0 0', color: '#666' }}>Generated Automatically</p>
            </div>
          </div>

          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F5F5F6', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#666' }}>Total Net Expenses</h3>
            <h2 style={{ margin: 0, fontSize: '32px', color: '#6200EE' }}>₹{totalSpend.toLocaleString()}</h2>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#6200EE', color: 'white' }}>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Date</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Group/Flat</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Description</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Category</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Paid By</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '16px', textAlign: 'center', border: '1px solid #ddd' }}>
                    No expenses found for this period.
                  </td>
                </tr>
              ) : (
                expenses.map(exp => (
                  <tr key={exp._id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{new Date(exp.date).toLocaleDateString()}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{exp.flat?.name || 'Unknown'}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{exp.title}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', textTransform: 'capitalize' }}>{exp.category}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{exp.paidBy?.name || 'Unknown'}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>₹{exp.amount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          <div style={{ marginTop: '32px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
            <p>End of Report</p>
            <p>© {new Date().getFullYear()} FlatSplit</p>
          </div>
        </div>

      </div>
    </div>
  );
}
