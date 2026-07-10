'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { io } from 'socket.io-client';
import ExpenseFormModal from '@/components/expenses/ExpenseFormModal';
import BalancesModal from '@/components/settlements/BalancesModal';

let socket;

export default function FlatFeed({ params }) {
  const { id } = params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [myUser, setMyUser] = useState(null);
  const [flat, setFlat] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isBalancesModalOpen, setIsBalancesModalOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen w-full" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, backgroundColor: 'var(--md-background)' }}>
      
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
        <div className="flex-1 overflow-hidden">
          <div className="text-h6" style={{ lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {flat ? flat.name : 'Loading...'}
          </div>
          <div className="text-caption" style={{ color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {flat ? `${flat.members.length} members` : ''}
          </div>
        </div>
        <button className="md-btn-text" style={{ color: 'var(--md-on-primary)' }} onClick={() => setIsBalancesModalOpen(true)}>
          <span className="material-icons">account_balance_wallet</span>
        </button>
      </header>

      {/* Feed Area */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2" style={{ padding: '16px 16px 80px 16px' }}>
        {messages.map((msg) => {
          const isMe = myUser && msg.sender._id === myUser._id;
          
          if (msg.type === 'text') {
            return (
              <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`} style={{ marginBottom: '8px' }}>
                {!isMe && <span className="text-caption" style={{ marginLeft: '8px', marginBottom: '2px' }}>{msg.sender.name.split(' ')[0]}</span>}
                <div style={{
                  padding: '8px 16px', 
                  maxWidth: '85%', 
                  borderRadius: '16px',
                  borderTopRightRadius: isMe ? '4px' : '16px',
                  borderTopLeftRadius: !isMe ? '4px' : '16px',
                  backgroundColor: isMe ? 'var(--md-primary)' : 'var(--md-surface)',
                  color: isMe ? 'var(--md-on-primary)' : 'var(--md-text-primary)',
                  boxShadow: 'var(--elevation-1)'
                }}>
                  <span className="text-body1">{msg.content}</span>
                </div>
                <span className="text-caption" style={{ marginTop: '4px', margin: '0 8px' }}>{formatTime(msg.createdAt)}</span>
              </div>
            );
          }

          if (msg.type === 'expense') {
            return (
              <div key={msg._id} className="flex flex-col items-center my-2 w-full">
                <div className="md-card w-full" style={{ maxWidth: '360px', padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      backgroundColor: 'rgba(98, 0, 238, 0.1)', color: 'var(--md-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <span className="material-icons">receipt_long</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-subtitle1">{msg.relatedExpense?.title || 'Expense'}</div>
                      <div className="text-body2">Paid by {msg.sender.name.split(' ')[0]}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="text-h6" style={{ color: 'var(--md-primary)' }}>₹{msg.relatedExpense?.amount || 0}</div>
                      <div className="text-caption">Total</div>
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.03)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--md-divider)' }}>
                    <span className="text-body2">View split breakdown</span>
                    <span className="material-icons" style={{ fontSize: '18px', color: 'var(--md-text-secondary)' }}>chevron_right</span>
                  </div>
                </div>
                <span className="text-caption" style={{ marginTop: '8px' }}>{formatTime(msg.createdAt)}</span>
              </div>
            );
          }

          if (msg.type === 'settlement') {
            return (
              <div key={msg._id} className="flex flex-col items-center my-2 w-full">
                <div style={{
                  padding: '8px 16px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(3, 218, 198, 0.15)', // Secondary color light tint
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
                <span className="text-caption" style={{ marginTop: '4px' }}>{formatTime(msg.createdAt)}</span>
              </div>
            );
          }

          return null;
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
        
        <form onSubmit={handleSendMessage} className="flex-1 flex items-center">
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
    </div>
  );
}
