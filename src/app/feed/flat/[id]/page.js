'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import ExpenseFormModal from '@/components/expenses/ExpenseFormModal';
import BalancesModal from '@/components/settlements/BalancesModal';
import FlatSettingsModal from '@/components/layout/FlatSettingsModal';
import FlatMembersModal from '@/components/layout/FlatMembersModal';
import SplitBreakdownModal from '@/components/expenses/SplitBreakdownModal';

let socket;

export default function FlatFeed() {
  const params = useParams();
  const id = params?.id;
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
        const userData = await userRes.json();
        if (userData.success) setMyUser(userData.data);

        const flatRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flats/${id}`, { credentials: 'include' });
        const flatData = await flatRes.json();
        if (flatData.success) setFlat(flatData.data);

        const msgRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/messages/flat/${id}`, { credentials: 'include' });
        const msgData = await msgRes.json();
        if (msgData.success) setMessages(msgData.data);
      } catch (err) {
        console.error(err);
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

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (!myUser) return;

    socket.emit('typing', { userId: myUser._id, flatId: id });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { userId: myUser._id, flatId: id });
    }, 2000);
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

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1200, backgroundColor: 'var(--md-background)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top App Bar */}
      <header className="md-app-bar">
        <Link href="/dashboard" className="md-btn-text flex items-center justify-center" style={{ color: 'var(--md-on-primary)', minWidth: '48px', padding: 0, marginRight: '16px' }}>
          <span className="material-icons">arrow_back</span>
        </Link>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%', 
          backgroundColor: 'rgba(255,255,255,0.2)', color: 'var(--md-on-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.25rem', fontWeight: 500, marginRight: '16px', flexShrink: 0
        }}>
          {flat ? flat.name.charAt(0) : ''}
        </div>
        <div style={{ flex: '1 1 0%', overflow: 'hidden' }}>
          <div className="text-h6" style={{ lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {flat ? flat.name : 'Loading...'}
          </div>
          <div className="text-caption" style={{ color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {flat ? `${flat.members.length} members` : ''}
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          <button className="md-btn-text" style={{ color: 'var(--md-on-primary)', padding: '8px', minWidth: '40px' }} onClick={() => setIsMembersModalOpen(true)}>
            <span className="material-icons">people</span>
          </button>
          
          <button className="md-btn-text" style={{ color: 'var(--md-on-primary)', padding: '8px', minWidth: '40px' }} onClick={() => setIsBalancesModalOpen(true)}>
            <span className="material-icons">account_balance_wallet</span>
          </button>
          
          {(myUser && flat && (flat.createdBy?._id === myUser._id || flat.members.some(m => m.user._id === myUser._id && m.role === 'admin'))) && (
            <button className="md-btn-text" style={{ color: 'var(--md-on-primary)', padding: '8px', minWidth: '40px' }} onClick={() => setIsSettingsModalOpen(true)}>
              <span className="material-icons">settings</span>
            </button>
          )}
        </div>
      </header>

      {/* Feed Area */}
      <div style={{ flex: '1 1 0%', overflowY: 'auto', padding: '16px 16px 80px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg) => {
          const isMe = myUser && msg.sender._id === myUser._id;
          
          return (
            <div key={msg._id} style={{ 
              display: 'flex', 
              width: '100%', 
              justifyContent: isMe ? 'flex-end' : 'flex-start',
              marginBottom: '16px'
            }}>
              
              {/* Avatar for others */}
              {!isMe && (
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  backgroundColor: 'var(--md-primary)', color: 'white', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  marginRight: '8px', flexShrink: 0, alignSelf: 'flex-end',
                  fontSize: '0.85rem', fontWeight: 600
                }}>
                  {msg.sender?.avatar ? (
                    <img src={msg.sender.avatar} alt="avatar" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}}/>
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
                  <span className="text-caption" style={{ marginBottom: '4px', marginLeft: '4px' }}>
                    {msg.sender?.name?.split(' ')[0]}
                  </span>
                )}

                {/* Message Content */}
                {msg.type === 'text' && (
                  <div style={{
                    padding: '8px 16px', 
                    borderRadius: '16px',
                    borderTopRightRadius: isMe ? '4px' : '16px',
                    borderTopLeftRadius: !isMe ? '4px' : '16px',
                    backgroundColor: isMe ? 'var(--md-primary)' : 'var(--md-surface)',
                    color: isMe ? 'var(--md-on-primary)' : 'var(--md-text-primary)',
                    boxShadow: 'var(--elevation-1)'
                  }}>
                    <span className="text-body1">{msg.content}</span>
                  </div>
                )}

                {msg.type === 'expense' && (() => {
                  const myShareObj = msg.relatedExpense?.splitAmong?.find(s => 
                    s.user === myUser?._id || s.user?._id === myUser?._id
                  );
                  const myShareAmount = myShareObj ? myShareObj.amount : 0;

                  return (
                  <div className="md-card" style={{ padding: 0, overflow: 'hidden', width: '100%', minWidth: '240px' }}>
                    <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {msg.relatedExpense?.photos?.length > 0 ? (() => {
                        const photoUrl = msg.relatedExpense.photos[0].url;
                        const resolvedUrl = photoUrl.startsWith('http') 
                          ? photoUrl 
                          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${photoUrl}`;
                        return (
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            overflow: 'hidden', flexShrink: 0,
                            border: '1px solid var(--md-divider)'
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
                          width: '40px', height: '40px', borderRadius: '50%',
                          backgroundColor: 'rgba(98, 0, 238, 0.1)', color: 'var(--md-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <span className="material-icons" style={{ fontSize: '20px' }}>receipt_long</span>
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div className="text-subtitle1" style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {msg.relatedExpense?.title || 'Expense'}
                          {msg.relatedExpense?.status === 'closed' && (
                            <span style={{ 
                              fontSize: '0.6rem', padding: '1px 6px', borderRadius: '10px',
                              backgroundColor: 'rgba(0,0,0,0.08)', color: 'var(--md-text-secondary)',
                              fontWeight: 600, textTransform: 'uppercase'
                            }}>Closed</span>
                          )}
                        </div>
                        <div className="text-body2" style={{ fontSize: '0.8rem', color: 'var(--md-text-secondary)' }}>
                          Paid by {isMe ? 'you' : msg.sender?.name?.split(' ')[0]}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="text-h6" style={{ 
                          color: msg.relatedExpense?.status === 'closed' ? 'var(--md-text-disabled)' : 'var(--md-primary)', 
                          fontSize: '1.1rem',
                          lineHeight: '1.2',
                          textDecoration: msg.relatedExpense?.status === 'closed' ? 'line-through' : 'none'
                        }}>
                          {myShareAmount > 0 ? `₹${myShareAmount.toFixed(2)}` : '₹0'}
                        </div>
                        <div className="text-caption" style={{ 
                          color: 'var(--md-text-secondary)',
                          marginTop: '2px',
                          fontSize: '0.7rem',
                          textDecoration: msg.relatedExpense?.status === 'closed' ? 'line-through' : 'none'
                        }}>
                          Total: ₹{msg.relatedExpense?.amount || 0}
                        </div>
                      </div>
                    </div>
                    <div 
                      className="interactive"
                      onClick={() => setSelectedExpenseForBreakdown(msg.relatedExpense)}
                      style={{ backgroundColor: 'rgba(0,0,0,0.03)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--md-divider)', cursor: 'pointer' }}
                    >
                      <span className="text-body2" style={{ fontSize: '0.8rem', color: 'var(--md-text-secondary)' }}>View split breakdown</span>
                      <span className="material-icons" style={{ fontSize: '16px', color: 'var(--md-text-secondary)' }}>chevron_right</span>
                    </div>
                  </div>
                  );
                })()}

                {msg.type === 'settlement' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      padding: '8px 16px',
                      borderRadius: '16px',
                      backgroundColor: 'rgba(3, 218, 198, 0.15)',
                      color: 'var(--md-secondary-variant)',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      boxShadow: 'var(--elevation-1)'
                    }}>
                      <span className="material-icons" style={{ fontSize: '18px' }}>paid</span>
                      <span className="text-body2 font-medium">{msg.content}</span>
                    </div>
                    {msg.imageUrl && (
                      <div className="mt-2 rounded-xl overflow-hidden shadow-sm" style={{ maxWidth: '240px', border: '1px solid var(--md-divider)' }}>
                        <img src={msg.imageUrl} alt="Payment Proof" style={{ width: '100%', height: 'auto', display: 'block' }} />
                      </div>
                    )}
                  </div>
                )}

                <span className="text-caption" style={{ marginTop: '4px', margin: isMe ? '0 4px 0 0' : '0 0 0 4px' }}>
                  {formatTime(msg.createdAt)}
                </span>
              </div>

              {/* Avatar for Me */}
              {isMe && (
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  backgroundColor: 'var(--md-primary)', color: 'white', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  marginLeft: '8px', flexShrink: 0, alignSelf: 'flex-end',
                  fontSize: '0.85rem', fontWeight: 600
                }}>
                  {myUser?.avatar ? (
                    <img src={myUser.avatar} alt="avatar" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}}/>
                  ) : (
                    myUser?.name?.charAt(0).toUpperCase() || '?'
                  )}
                </div>
              )}
            </div>
          );
        })}
        {isTyping && (
          <div className="text-caption" style={{ fontStyle: 'italic', marginLeft: '8px' }}>Someone is typing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        backgroundColor: 'var(--md-surface)',
        padding: '8px 16px',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        display: 'flex', alignItems: 'center', gap: '12px',
        zIndex: 1100
      }}>
        <button 
          type="button" 
          className="md-fab" 
          style={{ width: '48px', height: '48px' }} 
          title="Add Expense"
          onClick={() => setIsExpenseModalOpen(true)}
        >
          <span className="material-icons">add</span>
        </button>
        
        <form onSubmit={handleSendMessage} style={{ flex: '1 1 0%', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={inputText}
            onChange={handleTyping}
            placeholder="Message..."
            className="md-input"
            style={{ borderRadius: '24px', padding: '12px 20px', border: 'none', backgroundColor: 'var(--md-background)' }}
          />
          <button type="submit" disabled={!inputText.trim()} className="md-btn-text" style={{ minWidth: '48px', padding: 0, marginLeft: '4px' }}>
            <span className="material-icons" style={{ color: inputText.trim() ? 'var(--md-primary)' : 'var(--md-text-disabled)' }}>send</span>
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
        onFlatUpdated={(newName) => setFlat(prev => ({ ...prev, name: newName }))}
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
