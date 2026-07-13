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
      formData.append('toUserId', settleMode === 'pay' ? activeDebt.to._id : activeDebt.from._id);
      formData.append('amount', activeDebt.amount);
      formData.append('method', 'upi');
      if (proofFile) {
        formData.append('proof', proofFile);
      }

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
    <div className="modal-overlay">
      <div className="md-card modal-card flex flex-col w-full" style={{ maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', position: 'relative' }}>
        
        {/* Settlement Confirmation Dialog (Overlay within Modal) */}
        {activeDebt && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--color-surface)', zIndex: 10, padding: '24px', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-md)' }}>
            <h3 className="text-h6" style={{ marginBottom: '20px' }}>{settleMode === 'pay' ? 'Settle Up' : 'Receive Payment'}</h3>
            
            <div className="flex flex-col items-center flex-1 justify-center" style={{ gap: '16px', textAlign: 'center' }}>
              <p className="text-body1">
                {settleMode === 'pay' ? (
                  <>Pay <span style={{ fontWeight: 600 }}>{activeDebt.to.name}</span></>
                ) : (
                  <>Ask <span style={{ fontWeight: 600 }}>{activeDebt.from.name}</span> to scan and pay</>
                )}
              </p>
              <h2 style={{ fontSize: '2rem', color: 'var(--color-primary)', margin: 0, fontWeight: 700 }}>₹{activeDebt.amount}</h2>

              {settleMode === 'pay' ? (
                // PAY MODE: Show receiver's QR code
                activeDebt.to.upiId ? (
                  <>
                    <div style={{ padding: '16px', background: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                      <QRCodeSVG 
                        value={`upi://pay?pa=${activeDebt.to.upiId}&pn=${encodeURIComponent(activeDebt.to.name)}&am=${activeDebt.amount}&cu=INR&tn=FlatSplit%20Settlement`} 
                        size={180} 
                      />
                    </div>
                    <p className="text-body2">Scan QR with any UPI app, or tap below</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <a 
                        href={`tez://upi/pay?pa=${activeDebt.to.upiId}&pn=${encodeURIComponent(activeDebt.to.name)}&am=${activeDebt.amount}&cu=INR&tn=FlatSplit%20Settlement`}
                        className="md-btn md-btn-outlined w-full flex justify-center items-center"
                        style={{ gap: '8px', borderColor: '#4285F4', color: '#4285F4', fontSize: '13px' }}
                      >
                        <span style={{ fontSize: '16px' }}>💳</span>
                        Pay via Google Pay
                      </a>
                      <a 
                        href={`phonepe://pay?pa=${activeDebt.to.upiId}&pn=${encodeURIComponent(activeDebt.to.name)}&am=${activeDebt.amount}&cu=INR&tn=FlatSplit%20Settlement`}
                        className="md-btn md-btn-outlined w-full flex justify-center items-center"
                        style={{ gap: '8px', borderColor: '#5F259F', color: '#5F259F', fontSize: '13px' }}
                      >
                        <span style={{ fontSize: '16px' }}>📱</span>
                        Pay via PhonePe
                      </a>
                      <a 
                        href={`paytmmp://pay?pa=${activeDebt.to.upiId}&pn=${encodeURIComponent(activeDebt.to.name)}&am=${activeDebt.amount}&cu=INR&tn=FlatSplit%20Settlement`}
                        className="md-btn md-btn-outlined w-full flex justify-center items-center"
                        style={{ gap: '8px', borderColor: '#00BAF2', color: '#00BAF2', fontSize: '13px' }}
                      >
                        <span style={{ fontSize: '16px' }}>💰</span>
                        Pay via Paytm
                      </a>
                      <a 
                        href={`upi://pay?pa=${activeDebt.to.upiId}&pn=${encodeURIComponent(activeDebt.to.name)}&am=${activeDebt.amount}&cu=INR&tn=FlatSplit%20Settlement`}
                        className="md-btn md-btn-text w-full flex justify-center items-center"
                        style={{ gap: '6px', color: 'var(--color-text-secondary)', fontSize: '12px' }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>account_balance_wallet</span>
                        Other UPI App
                      </a>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)', marginTop: '16px' }}>
                    <p className="text-body2 font-medium" style={{ marginBottom: '4px', color: 'var(--color-error)' }}>No UPI ID Found</p>
                    <p className="text-body2" style={{ opacity: 0.8, color: 'var(--color-error)' }}>This user hasn't added their UPI ID to their profile yet. Please pay them offline.</p>
                  </div>
                )
              ) : (
                // RECEIVE MODE: Show my own QR code
                myUser.upiId ? (
                  <>
                    <div style={{ padding: '16px', background: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                      <QRCodeSVG 
                        value={`upi://pay?pa=${myUser.upiId}&pn=${encodeURIComponent(myUser.name)}&am=${activeDebt.amount}&cu=INR&tn=FlatSplit%20Settlement`} 
                        size={180} 
                      />
                    </div>
                    <p className="text-body2">Show this QR to {activeDebt.from.name}</p>
                  </>
                ) : (
                  <div style={{ padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)', marginTop: '16px' }}>
                    <p className="text-body2 font-medium" style={{ marginBottom: '4px', color: 'var(--color-error)' }}>Your UPI ID is missing</p>
                    <p className="text-body2" style={{ opacity: 0.8, color: 'var(--color-error)' }}>Go to Settings and add your UPI ID so others can scan and pay you.</p>
                  </div>
                )
              )}
            </div>
            
            {/* Proof Upload */}
            <div style={{ marginTop: '16px', marginBottom: '8px' }}>
              <label className="text-caption" style={{ display: 'block', marginBottom: '6px' }}>
                {settleMode === 'pay' ? 'Upload Payment Screenshot (Optional)' : 'Upload Receipt/Proof (Optional)'}
              </label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setProofFile(e.target.files[0])}
                className="md-input"
                style={{ padding: '8px' }}
              />
            </div>

            <div className="flex justify-between" style={{ gap: '8px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--color-divider)' }}>
              <button className="md-btn md-btn-text" style={{ color: 'var(--color-text-secondary)' }} onClick={() => { setActiveDebt(null); setSettleMode(null); setProofFile(null); }}>Cancel</button>
              <button className="md-btn md-btn-contained" onClick={handleSettleUp} disabled={isSettling}>
                {isSettling ? 'Recording...' : (settleMode === 'pay' ? "I've Paid" : "Mark as Received")}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
          <h2 className="text-h6" style={{ margin: 0 }}>Balances</h2>
          <button onClick={onClose} className="md-btn-text" style={{ color: 'var(--color-text-tertiary)', padding: '4px', minWidth: 'auto' }}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {loading ? (
          <p className="text-body2" style={{ textAlign: 'center', margin: '16px 0' }}>Calculating balances...</p>
        ) : debts.length === 0 ? (
          <div style={{ textAlign: 'center', margin: '32px 0' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'var(--color-success)', marginBottom: '12px', display: 'block' }}>check_circle</span>
            <p className="text-body1">All settled up!</p>
            <p className="text-body2 mt-1">No one owes anything in this flat.</p>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: '10px' }}>
            {debts.map((debt, idx) => {
              const isMeOwing = myUser && debt.from._id === myUser._id;
              const isOwedToMe = myUser && debt.to._id === myUser._id;

              return (
                <div key={idx} className="flex items-center justify-between" style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                  <div>
                    <div className="text-subtitle2" style={{ color: 'var(--color-text)' }}>
                      {isMeOwing ? 'You' : debt.from.name.split(' ')[0]} owes {isOwedToMe ? 'You' : debt.to.name.split(' ')[0]}
                    </div>
                    <div className="text-h6" style={{ color: isMeOwing ? 'var(--color-error)' : isOwedToMe ? 'var(--color-success)' : 'var(--color-text)' }}>
                      ₹{debt.amount}
                    </div>
                  </div>
                  
                  {isMeOwing && (
                    <button 
                      className="md-btn md-btn-outlined" 
                      style={{ padding: '4px 12px' }}
                      onClick={() => { setActiveDebt(debt); setSettleMode('pay'); }}
                    >
                      Pay
                    </button>
                  )}
                  {isOwedToMe && (
                    <button 
                      className="md-btn md-btn-outlined" 
                      style={{ padding: '4px 12px', borderColor: 'var(--color-success)', color: 'var(--color-success)' }}
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
