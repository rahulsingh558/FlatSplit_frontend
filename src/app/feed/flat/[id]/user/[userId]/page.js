'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import PersonalExpenseFormModal from '@/components/expenses/PersonalExpenseFormModal';

let socket;

export default function DirectMessageFeed() {
  const { id: flatId, userId: targetUserId } = useParams();
  const router = useRouter();
  
  const [flat, setFlat] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [myUser, setMyUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    fetchData();
    // Initialize socket
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Connected to socket in DM');
    });

    socket.on('direct-message-received', (newMessage) => {
      setMessages(prev => {
        if (prev.some(m => m._id === newMessage._id)) return prev;
        return [...prev, newMessage];
      });
    });

    socket.on('dm-typing', ({ senderId }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.add(senderId);
        return next;
      });
    });

    socket.on('dm-stop-typing', ({ senderId }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(senderId);
        return next;
      });
    });

    return () => {
      if (socket) socket.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [flatId, targetUserId]);

  useEffect(() => {
    if (myUser && targetUserId && socket) {
      socket.emit('join-dm', { flatId, userId1: myUser._id, userId2: targetUserId });
    }
  }, [myUser, targetUserId, flatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const fetchData = async () => {
    try {
      // 1. Get flat and target user details
      const flatRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flats/${flatId}`, {
        credentials: 'include'
      });
      const flatData = await flatRes.json();
      if (flatData.success) {
        setFlat(flatData.data);
        const target = flatData.data.members.find(m => m.user._id === targetUserId);
        if (target) setTargetUser(target.user);
      }

      // 2. Get current user
      const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/me`, {
        credentials: 'include'
      });
      const userData = await userRes.json();
      if (userData.success) {
        setMyUser(userData.data);
      }

      // 3. Get direct messages
      const msgsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/direct-messages/flat/${flatId}/user/${targetUserId}`, {
        credentials: 'include'
      });
      const msgsData = await msgsRes.json();
      if (msgsData.success) {
        setMessages(msgsData.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (!socket || !myUser) return;
    
    socket.emit('dm-typing', { flatId, senderId: myUser._id, receiverId: targetUserId });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('dm-stop-typing', { flatId, senderId: myUser._id, receiverId: targetUserId });
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !myUser) return;

    const content = inputText.trim();
    setInputText('');
    
    if (socket) {
      socket.emit('dm-stop-typing', { flatId, senderId: myUser._id, receiverId: targetUserId });
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/direct-messages/flat/${flatId}/user/${targetUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      
      if (data.success) {
        const newMsg = data.data;
        setMessages(prev => [...prev, newMsg]);
        if (socket) {
          socket.emit('new-direct-message', { ...newMsg, flatId, receiverId: targetUserId });
        }
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
      <header className="md-app-bar" style={{ backgroundColor: 'var(--md-surface)', color: 'var(--md-text-primary)' }}>
        <button onClick={() => router.push(`/feed/flat/${flatId}`)} className="md-btn-text flex items-center justify-center" style={{ color: 'var(--md-text-primary)', minWidth: '48px', padding: 0, marginRight: '16px' }}>
          <span className="material-icons">arrow_back</span>
        </button>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%', 
          backgroundColor: 'var(--md-primary)', color: 'var(--md-on-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.25rem', fontWeight: 500, marginRight: '16px', flexShrink: 0
        }}>
          {targetUser ? targetUser.name.charAt(0) : ''}
        </div>
        <div style={{ flex: '1 1 0%', overflow: 'hidden' }}>
          <div className="text-h6" style={{ lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {targetUser ? targetUser.name : 'Loading...'}
          </div>
          <div className="text-caption" style={{ color: 'var(--md-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {flat ? flat.name : ''}
          </div>
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

                {msg.type === 'personal_expense_notification' && (
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
                        <div className="text-subtitle1" style={{ fontSize: '0.95rem' }}>{msg.relatedExpense?.title || 'Expense'}</div>
                        <div className="text-body2" style={{ fontSize: '0.8rem', color: 'var(--md-text-secondary)' }}>
                          Paid by {isMe ? 'you' : msg.sender?.name?.split(' ')[0]}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="text-h6" style={{ color: 'var(--md-primary)', fontSize: '1.1rem' }}>₹{msg.relatedExpense?.amount || 0}</div>
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.03)', padding: '10px 16px', display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--md-divider)' }}>
                      <span className="text-body2" style={{ fontSize: '0.8rem', color: 'var(--md-text-secondary)' }}>
                        {isMe 
                          ? `They owe you ₹${msg.relatedExpense?.owedAmount || (msg.relatedExpense?.amount / 2)}` 
                          : `You owe ₹${msg.relatedExpense?.owedAmount || (msg.relatedExpense?.amount / 2)}`
                        }
                      </span>
                    </div>
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
          <div className="text-caption" style={{ fontStyle: 'italic', marginLeft: '8px' }}>Typing...</div>
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
          title="Add Split"
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

      <PersonalExpenseFormModal 
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        flatId={flatId}
        targetUserId={targetUserId}
        targetUser={targetUser}
        onSubmitSuccess={(newMsg) => {
          setMessages(prev => [...prev, newMsg]);
          if (socket) {
            socket.emit('new-direct-message', { ...newMsg, flatId, receiverId: targetUserId });
          }
        }}
      />
    </div>
  );
}
