'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function BalancesModal({ isOpen, onClose, flatId, myUser, onSubmitSuccess }) {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDebt, setActiveDebt] = useState(null); // The debt currently being settled
  const [settleMode, setSettleMode] = useState(null); // 'pay' or 'receive'
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
    if (!activeDebt) return;
    setIsSettling(true);

    try {
      const formData = new FormData();
      // If I am paying, I send to activeDebt.to. If I am receiving, I received from activeDebt.from (but wait, recordSettlement always assumes req.user is the sender).
      // Ah! Our backend recordSettlement always sets `from: req.user._id`.
      // So if I am RECEIVING, I cannot easily record it using the existing API unless I change it.
      // Wait, let's look at recordSettlement endpoint. It assumes `req.user` is the one paying.
      formData.append('toUserId', settleMode === 'pay' ? activeDebt.to._id : activeDebt.from._id);
      formData.append('amount', activeDebt.amount);
      formData.append('method', 'upi');
      if (proofFile) {
        formData.append('proof', proofFile);
      }

      // If we are in 'receive' mode, we need a way to tell the backend that the OTHER person paid us.
      // For now, let's add a 'isReceiverRecording' flag, and backend can handle it.
      if (settleMode === 'receive') {
        formData.append('isReceiverRecording', 'true');
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/settlements/flat/${flatId}`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setActiveDebt(null);
        setSettleMode(null);
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
        {activeDebt && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--md-surface)', zIndex: 10, padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 className="text-h6 mb-4">{settleMode === 'pay' ? 'Settle Up' : 'Receive Payment'}</h3>
            
            <div className="flex flex-col items-center flex-1 justify-center gap-4 text-center">
              <p className="text-body1">
                {settleMode === 'pay' ? (
                  <>Pay <span style={{ fontWeight: 500 }}>{activeDebt.to.name}</span></>
                ) : (
                  <>Ask <span style={{ fontWeight: 500 }}>{activeDebt.from.name}</span> to scan and pay</>
                )}
              </p>
              <h2 className="text-h3" style={{ color: 'var(--md-primary)', margin: 0 }}>₹{activeDebt.amount}</h2>

              {settleMode === 'pay' ? (
                // PAY MODE: Show receiver's QR code
                activeDebt.to.upiId ? (
                  <>
                    <div className="p-4 bg-white rounded-xl shadow-sm" style={{ border: '1px solid var(--md-divider)' }}>
                      <QRCodeSVG 
                        value={`upi://pay?pa=${activeDebt.to.upiId}&pn=${encodeURIComponent(activeDebt.to.name)}&am=${activeDebt.amount}&cu=INR&tn=FlatSplit%20Settlement`} 
                        size={180} 
                      />
                    </div>
                    <p className="text-body2 text-gray-500">Scan QR with any UPI app, or tap below</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <a 
                        href={`tez://upi/pay?pa=${activeDebt.to.upiId}&pn=${encodeURIComponent(activeDebt.to.name)}&am=${activeDebt.amount}&cu=INR&tn=FlatSplit%20Settlement`}
                        className="md-btn md-btn-outlined w-full flex justify-center items-center gap-2"
                        style={{ borderColor: '#4285F4', color: '#4285F4', fontSize: '14px' }}
                      >
                        <span style={{ fontSize: '18px' }}>💳</span>
                        Pay via Google Pay
                      </a>
                      <a 
                        href={`phonepe://pay?pa=${activeDebt.to.upiId}&pn=${encodeURIComponent(activeDebt.to.name)}&am=${activeDebt.amount}&cu=INR&tn=FlatSplit%20Settlement`}
                        className="md-btn md-btn-outlined w-full flex justify-center items-center gap-2"
                        style={{ borderColor: '#5F259F', color: '#5F259F', fontSize: '14px' }}
                      >
                        <span style={{ fontSize: '18px' }}>📱</span>
                        Pay via PhonePe
                      </a>
                      <a 
                        href={`paytmmp://pay?pa=${activeDebt.to.upiId}&pn=${encodeURIComponent(activeDebt.to.name)}&am=${activeDebt.amount}&cu=INR&tn=FlatSplit%20Settlement`}
                        className="md-btn md-btn-outlined w-full flex justify-center items-center gap-2"
                        style={{ borderColor: '#00BAF2', color: '#00BAF2', fontSize: '14px' }}
                      >
                        <span style={{ fontSize: '18px' }}>💰</span>
                        Pay via Paytm
                      </a>
                      <a 
                        href={`upi://pay?pa=${activeDebt.to.upiId}&pn=${encodeURIComponent(activeDebt.to.name)}&am=${activeDebt.amount}&cu=INR&tn=FlatSplit%20Settlement`}
                        className="md-btn md-btn-text w-full flex justify-center items-center gap-2"
                        style={{ color: 'var(--md-text-secondary)', fontSize: '13px' }}
                      >
                        <span className="material-icons" style={{ fontSize: '16px' }}>account_balance_wallet</span>
                        Other UPI App
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="p-4 rounded-lg mt-4" style={{ backgroundColor: 'rgba(176, 0, 32, 0.05)', color: 'var(--md-error)' }}>
                    <p className="text-body2 font-medium mb-1">No UPI ID Found</p>
                    <p className="text-body2 text-sm opacity-80">This user hasn't added their UPI ID to their profile yet. Please pay them offline.</p>
                  </div>
                )
              ) : (
                // RECEIVE MODE: Show my own QR code
                myUser.upiId ? (
                  <>
                    <div className="p-4 bg-white rounded-xl shadow-sm" style={{ border: '1px solid var(--md-divider)' }}>
                      <QRCodeSVG 
                        value={`upi://pay?pa=${myUser.upiId}&pn=${encodeURIComponent(myUser.name)}&am=${activeDebt.amount}&cu=INR&tn=FlatSplit%20Settlement`} 
                        size={180} 
                      />
                    </div>
                    <p className="text-body2 text-gray-500">Show this QR to {activeDebt.from.name}</p>
                  </>
                ) : (
                  <div className="p-4 rounded-lg mt-4" style={{ backgroundColor: 'rgba(176, 0, 32, 0.05)', color: 'var(--md-error)' }}>
                    <p className="text-body2 font-medium mb-1">Your UPI ID is missing</p>
                    <p className="text-body2 text-sm opacity-80">Go to Settings and add your UPI ID so others can scan and pay you.</p>
                  </div>
                )
              )}
            </div>
            
            {/* Proof Upload */}
            <div className="mt-4 mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {settleMode === 'pay' ? 'Upload Payment Screenshot (Optional)' : 'Upload Receipt/Proof (Optional)'}
              </label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setProofFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="flex justify-between gap-2 mt-auto pt-4" style={{ borderTop: '1px solid var(--md-divider)' }}>
              <button className="md-btn md-btn-text" onClick={() => { setActiveDebt(null); setSettleMode(null); setProofFile(null); }}>Cancel</button>
              <button className="md-btn md-btn-contained" onClick={handleSettleUp} disabled={isSettling}>
                {isSettling ? 'Recording...' : (settleMode === 'pay' ? "I've Paid" : "Mark as Received")}
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
                      onClick={() => { setActiveDebt(debt); setSettleMode('pay'); }}
                    >
                      Pay
                    </button>
                  )}
                  {isOwedToMe && (
                    <button 
                      className="md-btn md-btn-outlined" 
                      style={{ padding: '4px 12px', borderColor: 'var(--md-secondary-variant)', color: 'var(--md-secondary-variant)' }}
                      onClick={() => { setActiveDebt(debt); setSettleMode('receive'); }}
                    >
                      Receive
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
