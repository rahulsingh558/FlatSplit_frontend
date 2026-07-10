'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function BalancesModal({ isOpen, onClose, flatId, myUser, onSubmitSuccess }) {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settlingDebt, setSettlingDebt] = useState(null); // The debt currently being settled
  const [isSettling, setIsSettling] = useState(false);
  const [proofFile, setProofFile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchBalances();
    }
  }, [isOpen]);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/settlements/flat/${flatId}/balances`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setDebts(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettleUp = async () => {
    if (!settlingDebt) return;
    setIsSettling(true);

    try {
      const formData = new FormData();
      formData.append('toUserId', settlingDebt.to._id);
      formData.append('amount', settlingDebt.amount);
      formData.append('method', 'upi');
      if (proofFile) {
        formData.append('proof', proofFile);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/settlements/flat/${flatId}`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setSettlingDebt(null);
        setProofFile(null); // Reset file
        fetchBalances(); // Refresh balances
        if (onSubmitSuccess) onSubmitSuccess(data.data.message); // Inject message into feed
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to settle up');
    } finally {
      setIsSettling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="md-card flex flex-col w-full" style={{ maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        
        {/* Settlement Confirmation Dialog (Overlay within Modal) */}
        {settlingDebt && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--md-surface)', zIndex: 10, padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 className="text-h6 mb-4">Settle Up</h3>
            
            <div className="flex flex-col items-center flex-1 justify-center gap-4 text-center">
              <p className="text-body1">
                Pay <span style={{ fontWeight: 500 }}>{settlingDebt.to.name}</span>
              </p>
              <h2 className="text-h3" style={{ color: 'var(--md-primary)', margin: 0 }}>₹{settlingDebt.amount}</h2>

              {settlingDebt.to.upiId ? (
                <>
                  <div className="p-4 bg-white rounded-xl shadow-sm" style={{ border: '1px solid var(--md-divider)' }}>
                    <QRCodeSVG 
                      value={`upi://pay?pa=${settlingDebt.to.upiId}&pn=${encodeURIComponent(settlingDebt.to.name)}&am=${settlingDebt.amount}&cu=INR&tn=FlatSplit%20Settlement`} 
                      size={180} 
                    />
                  </div>
                  <p className="text-body2 text-gray-500">Scan QR or tap below</p>
                  <a 
                    href={`upi://pay?pa=${settlingDebt.to.upiId}&pn=${encodeURIComponent(settlingDebt.to.name)}&am=${settlingDebt.amount}&cu=INR&tn=FlatSplit%20Settlement`}
                    className="md-btn md-btn-outlined w-full flex justify-center items-center gap-2"
                    style={{ borderColor: '#6200EE', color: '#6200EE' }}
                  >
                    <span className="material-icons" style={{ fontSize: '18px' }}>account_balance_wallet</span>
                    Open UPI App
                  </a>
                </>
              ) : (
                <div className="p-4 rounded-lg mt-4" style={{ backgroundColor: 'rgba(176, 0, 32, 0.05)', color: 'var(--md-error)' }}>
                  <p className="text-body2 font-medium mb-1">No UPI ID Found</p>
                  <p className="text-body2 text-sm opacity-80">This user hasn't added their UPI ID to their profile yet. Please pay them offline.</p>
                </div>
              )}
            </div>
            
            {/* Proof Upload */}
            <div className="mt-4 mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Payment Screenshot (Optional)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setProofFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="flex justify-between gap-2 mt-auto pt-4" style={{ borderTop: '1px solid var(--md-divider)' }}>
              <button className="md-btn md-btn-text" onClick={() => { setSettlingDebt(null); setProofFile(null); }}>Cancel</button>
              <button className="md-btn md-btn-contained" onClick={handleSettleUp} disabled={isSettling}>
                {isSettling ? 'Recording...' : "I've Paid"}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-h6" style={{ margin: 0 }}>Balances</h2>
          <button onClick={onClose} className="md-btn-text" style={{ color: 'var(--md-text-secondary)', padding: '4px', minWidth: 'auto' }}>
            <span className="material-icons">close</span>
          </button>
        </div>

        {loading ? (
          <p className="text-body2 text-center my-4">Calculating balances...</p>
        ) : debts.length === 0 ? (
          <div className="text-center my-8">
            <span className="material-icons" style={{ fontSize: '48px', color: 'var(--md-text-disabled)', marginBottom: '16px' }}>check_circle</span>
            <p className="text-body1">All settled up!</p>
            <p className="text-body2 mt-1">No one owes anything in this flat.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {debts.map((debt, idx) => {
              const isMeOwing = myUser && debt.from._id === myUser._id;
              const isOwedToMe = myUser && debt.to._id === myUser._id;

              return (
                <div key={idx} className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.02)', border: '1px solid var(--md-divider)' }}>
                  <div>
                    <div className="text-subtitle2">
                      {isMeOwing ? 'You' : debt.from.name.split(' ')[0]} owes {isOwedToMe ? 'You' : debt.to.name.split(' ')[0]}
                    </div>
                    <div className="text-h6" style={{ color: isMeOwing ? 'var(--md-error)' : isOwedToMe ? 'var(--md-secondary-variant)' : 'var(--md-text-primary)' }}>
                      ₹{debt.amount}
                    </div>
                  </div>
                  
                  {isMeOwing && (
                    <button 
                      className="md-btn md-btn-outlined" 
                      style={{ padding: '4px 12px', borderColor: 'var(--md-primary)' }}
                      onClick={() => setSettlingDebt(debt)}
                    >
                      Settle
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
