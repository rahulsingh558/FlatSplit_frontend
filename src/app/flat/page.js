'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { io } from 'socket.io-client';
import ExpenseFormModal from '@/components/expenses/ExpenseFormModal';
import BalancesModal from '@/components/settlements/BalancesModal';
import FlatSettingsModal from '@/components/layout/FlatSettingsModal';
import FlatMembersModal from '@/components/layout/FlatMembersModal';
import SplitBreakdownModal from '@/components/expenses/SplitBreakdownModal';

let socket;

function FlatFeedContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [myUser, setMyUser] = useState(null);
  const [flat, setFlat] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isBalancesModalOpen, setIsBalancesModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedExpenseForBreakdown, setSelectedExpenseForBreakdown] = useState(null);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const router = useRouter();

  // ... (keeping useEffects the same)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initData = async () => {
      try {
        const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/me`, { credentials: 'include' });
        if (userRes.status === 401 || !userRes.ok) {
          setIsRedirecting(true);
          window.location.href = '/login';
          return;
        }
        const userData = await userRes.json();
        if (userData.success) setMyUser(userData.data);

        const flatRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flats/${id}`, { credentials: 'include' });
        if (flatRes.status === 401 || flatRes.status === 404 || !flatRes.ok) {
          setNotAuthorized(true);
          return; // Stop here if not authorized
        }
        const flatData = await flatRes.json();
        if (flatData.success) {
          setFlat(flatData.data);
        } else {
          setNotAuthorized(true);
          return;
        }

        const msgRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/messages/flat/${id}`, { credentials: 'include' });
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          if (msgData.success) setMessages(msgData.data);
        }
      } catch (err) {
        console.error(err);
        setIsRedirecting(true);
        window.location.href = '/login';
      }
    };
    initData();

    socket = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}`);
    
    socket.on('connect', () => {
      socket.emit('join-flat', { flatId: id });
    });

    socket.on('message-received', (message) => {
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
    });

    socket.on('typing', ({ userId }) => {
      setTypingUsers(prev => new Set([...prev, userId]));
    });

    socket.on('stop-typing', ({ userId }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    // Automatically open the Add Expense modal if a shared receipt is pending
    if (typeof window !== 'undefined') {
      const pendingReceipt = sessionStorage.getItem('pendingSharedReceipt');
      const pendingReceiptPath = sessionStorage.getItem('pendingSharedReceiptPath');
      if ((pendingReceipt || pendingReceiptPath) && !isExpenseModalOpen) {
        setIsExpenseModalOpen(true);
      }
    }
  }, [id, isExpenseModalOpen]);

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (!myUser) return;

    socket.emit('typing', { userId: myUser._id, flatId: id });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { userId: myUser._id, flatId: id });
    }, 2000);
  };

  const handleJoinFlat = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setJoining(true);
    setJoinError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flats/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ inviteCode })
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload(); // Reload to fetch the flat properly
      } else {
        setJoinError(data.error || 'Failed to join group');
      }
    } catch (err) {
      console.error(err);
      setJoinError('An error occurred');
    } finally {
      setJoining(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !myUser) return;
    
    const content = inputText;
    setInputText('');
    socket.emit('stop-typing', { userId: myUser._id, flatId: id });

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/messages/flat/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      
      if (data.success) {
        const newMsg = data.data;
        setMessages(prev => [...prev, newMsg]);
        socket.emit('new-message', { ...newMsg, flatId: id });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isTyping = Array.from(typingUsers).filter(uid => uid !== myUser?._id).length > 0;

  if (isRedirecting) {
    return (
      <div className="flex-col items-center justify-center app-container" style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '24px', height: '24px', border: '3px solid var(--color-primary-light)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div className="text-body2 text-center" style={{ color: 'var(--color-text-secondary)' }}>Redirecting to login...</div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (notAuthorized) {
    return (
      <div className="flex-col items-center justify-center app-container" style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
        <div className="md-card flex flex-col items-center" style={{ maxWidth: '400px', width: '100%', margin: '16px', padding: '32px 24px', textAlign: 'center' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'var(--color-warning)', marginBottom: '16px' }}>lock</span>
          <h2 className="text-h5" style={{ marginBottom: '8px' }}>Access Denied</h2>
          <p className="text-body2" style={{ marginBottom: '24px' }}>
            You are not a member of this group. If you have an invite code, you can join below.
          </p>
          <form onSubmit={handleJoinFlat} className="w-full flex flex-col gap-3">
            <input 
              type="text" 
              className="md-input" 
              placeholder="Enter invite code" 
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              required
            />
            {joinError && <div className="text-caption" style={{ color: 'var(--color-error)' }}>{joinError}</div>}
            <button type="submit" className="md-btn md-btn-contained w-full" disabled={joining}>
              {joining ? 'Joining...' : 'Join Group'}
            </button>
            <Link href="/dashboard" className="md-btn md-btn-text w-full mt-2 flex justify-center items-center" style={{ color: 'var(--color-text-secondary)', gap: '4px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>arrow_back</span>
              Back to Dashboard
            </Link>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1200, backgroundColor: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top App Bar — Clean, light */}
      <header className="md-app-bar">
        <Link href="/dashboard" className="md-btn-text flex items-center justify-center" style={{ color: 'var(--color-text)', minWidth: '40px', padding: 0, marginRight: '12px' }}>
          <span className="material-symbols-rounded">arrow_back</span>
        </Link>
        <div style={{
          width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', 
          backgroundColor: 'var(--color-primary)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.875rem', fontWeight: 600, marginRight: '12px', flexShrink: 0
        }}>
          {flat ? flat.name.charAt(0) : ''}
        </div>
        <div style={{ flex: '1 1 0%', overflow: 'hidden' }}>
          <div className="text-subtitle1" style={{ lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
            {flat ? flat.name : 'Loading...'}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
            {flat ? `${flat.members.length} members` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="md-btn-text" style={{ color: 'var(--color-text-secondary)', padding: '8px', minWidth: '36px' }} onClick={() => setIsMembersModalOpen(true)}>
            <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>group</span>
          </button>
          
          <button className="md-btn-text" style={{ color: 'var(--color-text-secondary)', padding: '8px', minWidth: '36px' }} onClick={() => setIsBalancesModalOpen(true)}>
            <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>account_balance_wallet</span>
          </button>
          
          {(myUser && flat && (flat.createdBy?._id === myUser._id || flat.members.some(m => m.user._id === myUser._id && m.role === 'admin'))) && (
            <button className="md-btn-text" style={{ color: 'var(--color-text-secondary)', padding: '8px', minWidth: '36px' }} onClick={() => setIsSettingsModalOpen(true)}>
              <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>settings</span>
            </button>
          )}
        </div>
      </header>

      {/* Feed Area */}
      <div style={{ flex: '1 1 0%', overflowY: 'auto', padding: '16px 16px 80px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg) => {
          const isMe = myUser && msg.sender._id === myUser._id;
          
          return (
            <div key={msg._id} style={{ 
              display: 'flex', 
              width: '100%', 
              justifyContent: isMe ? 'flex-end' : 'flex-start',
              marginBottom: '8px'
            }}>
              
              {/* Avatar for others */}
              {!isMe && (
                <div style={{ 
                  width: '30px', height: '30px', borderRadius: 'var(--radius-sm)', 
                  backgroundColor: 'var(--color-primary)', color: 'white', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  marginRight: '8px', flexShrink: 0, alignSelf: 'flex-end',
                  fontSize: '0.75rem', fontWeight: 600
                }}>
                  {msg.sender?.avatar ? (
                    <img src={msg.sender.avatar} alt="avatar" style={{width:'100%', height:'100%', borderRadius:'var(--radius-sm)', objectFit:'cover'}}/>
                  ) : (
                    msg.sender?.name?.charAt(0).toUpperCase() || '?'
                  )}
                </div>
              )}

              <div style={{ 
                display: 'flex', flexDirection: 'column', 
                alignItems: isMe ? 'flex-end' : 'flex-start', 
                maxWidth: '75%' 
              }}>
                {!isMe && (
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginBottom: '3px', marginLeft: '2px', fontWeight: 500 }}>
                    {msg.sender?.name?.split(' ')[0]}
                  </span>
                )}

                {/* Message Content */}
                {msg.type === 'text' && (
                  <div style={{
                    padding: '10px 16px', 
                    borderRadius: 'var(--radius-lg)',
                    borderTopRightRadius: isMe ? '4px' : 'var(--radius-lg)',
                    borderTopLeftRadius: !isMe ? '4px' : 'var(--radius-lg)',
                    backgroundColor: isMe ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: isMe ? '#fff' : 'var(--color-text)',
                    border: isMe ? 'none' : '1px solid var(--color-border)',
                    fontSize: '0.875rem', lineHeight: 1.5
                  }}>
                    {msg.content}
                  </div>
                )}

                {msg.type === 'expense' && (() => {
                  const myShareObj = msg.relatedExpense?.splitAmong?.find(s => 
                    s.user === myUser?._id || s.user?._id === myUser?._id
                  );
                  const myShareAmount = myShareObj ? myShareObj.amount : 0;

                  return (
                  <div className="md-card" style={{ padding: 0, overflow: 'hidden', width: '100%', minWidth: '240px' }}>
                    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      {msg.relatedExpense?.photos?.length > 0 ? (() => {
                        const photoUrl = msg.relatedExpense.photos[0].url;
                        const resolvedUrl = photoUrl.startsWith('http') 
                          ? photoUrl 
                          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${photoUrl}`;
                        return (
                          <div style={{
                            width: '40px', height: '40px', borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden', flexShrink: 0,
                            border: '1px solid var(--color-border)'
                          }}>
                            <img 
                              src={resolvedUrl} 
                              alt="Receipt" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          </div>
                        );
                      })() : (
                        <div style={{
                          width: '40px', height: '40px', borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>receipt_long</span>
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div className="text-subtitle1" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {msg.relatedExpense?.title || 'Expense'}
                          {msg.relatedExpense?.status === 'closed' && (
                            <span style={{ 
                              fontSize: '0.5625rem', padding: '1px 6px', borderRadius: 'var(--radius-full)',
                              backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-tertiary)',
                              fontWeight: 600, textTransform: 'uppercase'
                            }}>Closed</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                          Paid by {isMe ? 'you' : msg.sender?.name?.split(' ')[0]}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          color: msg.relatedExpense?.status === 'closed' ? 'var(--color-text-tertiary)' : 'var(--color-primary)', 
                          fontSize: '1rem', fontWeight: 700,
                          lineHeight: '1.2',
                          textDecoration: msg.relatedExpense?.status === 'closed' ? 'line-through' : 'none'
                        }}>
                          {myShareAmount > 0 ? `₹${myShareAmount.toFixed(2)}` : '₹0'}
                        </div>
                        <div style={{ 
                          color: 'var(--color-text-tertiary)',
                          marginTop: '2px',
                          fontSize: '0.625rem',
                          textDecoration: msg.relatedExpense?.status === 'closed' ? 'line-through' : 'none'
                        }}>
                          Total: ₹{msg.relatedExpense?.amount || 0}
                        </div>
                      </div>
                    </div>
                    <div 
                      onClick={() => setSelectedExpenseForBreakdown(msg.relatedExpense)}
                      style={{ 
                        backgroundColor: 'var(--color-surface-hover)', padding: '10px 16px', 
                        display: 'flex', justifyContent: 'space-between', 
                        borderTop: '1px solid var(--color-border)', cursor: 'pointer',
                        transition: 'background-color var(--transition-fast)'
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>View split breakdown</span>
                      <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--color-text-tertiary)' }}>chevron_right</span>
                    </div>
                  </div>
                  );
                })()}

                {msg.type === 'settlement' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: 'var(--color-success-light)',
                      color: 'var(--color-success)',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      border: '1px solid rgba(22, 163, 74, 0.15)'
                    }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>paid</span>
                      <span className="text-body2 font-medium" style={{ color: 'var(--color-success)' }}>{msg.content}</span>
                    </div>
                    {msg.imageUrl && (
                      <div className="mt-2 rounded-xl overflow-hidden shadow-sm" style={{ maxWidth: '240px', border: '1px solid var(--color-border)' }}>
                        <img src={msg.imageUrl} alt="Payment Proof" style={{ width: '100%', height: 'auto', display: 'block' }} />
                      </div>
                    )}
                  </div>
                )}

                <span style={{ fontSize: '0.625rem', color: 'var(--color-text-tertiary)', marginTop: '4px', padding: isMe ? '0 4px 0 0' : '0 0 0 4px' }}>
                  {formatTime(msg.createdAt)}
                </span>
              </div>

              {/* Avatar for Me */}
              {isMe && (
                <div style={{ 
                  width: '30px', height: '30px', borderRadius: 'var(--radius-sm)', 
                  backgroundColor: 'var(--color-primary)', color: 'white', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  marginLeft: '8px', flexShrink: 0, alignSelf: 'flex-end',
                  fontSize: '0.75rem', fontWeight: 600
                }}>
                  {myUser?.avatar ? (
                    <img src={myUser.avatar} alt="avatar" style={{width:'100%', height:'100%', borderRadius:'var(--radius-sm)', objectFit:'cover'}}/>
                  ) : (
                    myUser?.name?.charAt(0).toUpperCase() || '?'
                  )}
                </div>
              )}
            </div>
          );
        })}
        {isTyping && (
          <div style={{ fontSize: '0.75rem', fontStyle: 'italic', marginLeft: '8px', color: 'var(--color-text-tertiary)' }}>Someone is typing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        backgroundColor: 'var(--color-surface)',
        padding: '10px 16px',
        borderTop: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: '10px',
        zIndex: 1100
      }}>
        <button 
          type="button" 
          className="md-fab" 
          style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', fontSize: '20px' }} 
          title="Add Expense"
          onClick={() => setIsExpenseModalOpen(true)}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>add</span>
        </button>
        
        <form onSubmit={handleSendMessage} style={{ flex: '1 1 0%', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={inputText}
            onChange={handleTyping}
            placeholder="Message..."
            className="md-input"
            style={{ borderRadius: 'var(--radius-full)', padding: '10px 18px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}
          />
          <button type="submit" disabled={!inputText.trim()} className="md-btn-text" style={{ minWidth: '40px', padding: 0, marginLeft: '4px' }}>
            <span className="material-symbols-rounded" style={{ color: inputText.trim() ? 'var(--color-primary)' : 'var(--color-text-tertiary)', fontSize: '22px' }}>send</span>
          </button>
        </form>
      </div>

      {/* Expense Modal */}
      <ExpenseFormModal 
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        flatId={id}
        flatMembers={flat?.members || []}
        myUser={myUser}
        onSubmitSuccess={(newMsg) => {
          setMessages(prev => [...prev, newMsg]);
          if (socket) {
            socket.emit('new-message', { ...newMsg, flatId: id });
          }
        }}
      />

      {/* Balances Modal */}
      <BalancesModal 
        isOpen={isBalancesModalOpen}
        onClose={() => setIsBalancesModalOpen(false)}
        flatId={id}
        myUser={myUser}
        onSubmitSuccess={(newMsg) => {
          setMessages(prev => [...prev, newMsg]);
          if (socket) {
            socket.emit('new-message', { ...newMsg, flatId: id });
          }
        }}
      />

      {/* Settings Modal */}
      <FlatSettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        flat={flat}
        isCreator={myUser && flat && flat.createdBy?._id === myUser._id}
        isAdmin={myUser && flat && flat.members.some(m => m.user._id === myUser._id && m.role === 'admin')}
        onFlatUpdated={(newName, newSettlementType) => setFlat(prev => ({ ...prev, name: newName, settlementType: newSettlementType }))}
        onFlatDeleted={() => router.push('/dashboard')}
      />

      {/* Members Modal */}
      <FlatMembersModal 
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        flat={flat}
        myUser={myUser}
      />

      {/* Split Breakdown Modal */}
      <SplitBreakdownModal 
        isOpen={!!selectedExpenseForBreakdown}
        onClose={() => setSelectedExpenseForBreakdown(null)}
        expense={selectedExpenseForBreakdown}
        flatMembers={flat?.members || []}
        myUser={myUser}
        onExpenseUpdated={(updatedExpense) => {
          setSelectedExpenseForBreakdown(updatedExpense);
          // Also update the expense in the messages list
          setMessages(prev => prev.map(msg => {
            if (msg.relatedExpense && msg.relatedExpense._id === updatedExpense._id) {
              return { ...msg, relatedExpense: updatedExpense };
            }
            return msg;
          }));
        }}
      />
    </div>
  );
}

export default function FlatFeed() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <FlatFeedContent />
    </Suspense>
  );
}
