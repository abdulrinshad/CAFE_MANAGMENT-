import React, { useState, useEffect, useRef } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { useApp } from '../../context/AppContext'
import { conversationApi } from '../../api'
import './OwnerMessagesPage.css'

export default function OwnerMessagesPage() {
  const { conversations, fetchConversations, markConversationSeen, replyToConversation } = useApp()

  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages]         = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [replyText, setReplyText]       = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [filterPriority, setFilterPriority] = useState('ALL')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeConvId) {
      setActiveConvId(conversations[0].id)
    }
  }, [conversations, activeConvId])

  // Load message thread when active conversation changes
  useEffect(() => {
    if (!activeConvId) return
    let isMounted = true
    async function loadThread() {
      setLoadingMessages(true)
      try {
        const msgs = await conversationApi.getMessages(activeConvId)
        if (isMounted) {
          setMessages(Array.isArray(msgs) ? msgs : [])
          markConversationSeen(activeConvId)
        }
      } catch (err) {
        console.error('Failed to load conversation messages:', err)
      } finally {
        if (isMounted) setLoadingMessages(false)
      }
    }
    loadThread()
    return () => { isMounted = false }
  }, [activeConvId, markConversationSeen])

  // Auto-scroll to bottom of chat thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const activeConv = (conversations || []).find(c => c.id === activeConvId)

  const filteredConversations = (conversations || []).filter(c => {
    if (filterPriority === 'ALL') return true
    if (filterPriority === 'UNSEEN') return !c.is_seen_by_owner
    return (c.priority || '').toUpperCase() === filterPriority
  })

  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || !activeConvId || submittingReply) return

    const text = replyText.trim()
    setReplyText('')
    setSubmittingReply(true)
    try {
      const newMsg = await replyToConversation(activeConvId, text)
      setMessages(prev => [...prev, newMsg])
    } catch (err) {
      console.error('Failed to send reply:', err)
      setReplyText(text)
    } finally {
      setSubmittingReply(false)
    }
  }

  const formatTimeAgo = (iso) => {
    if (!iso) return ''
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(iso).toLocaleDateString('en-IN')
  }

  const getPriorityBadgeClass = (p) => {
    const priority = (p || '').toLowerCase()
    if (priority === 'urgent') return 'priority-badge priority-badge--urgent'
    if (priority === 'important') return 'priority-badge priority-badge--important'
    return 'priority-badge priority-badge--normal'
  }

  return (
    <AdminLayout searchPlaceholder="Search branch alerts..." pageTitle="Branch Messages & Alerts">
      <div className="owner-messages-container">
        
        {/* LEFT COLUMN: CONVERSATIONS LIST */}
        <div className="owner-messages-sidebar">
          <div className="messages-sidebar-header">
            <h2 className="sidebar-title">Branch Alerts & Inbox</h2>
            <div className="priority-filters-bar">
              {['ALL', 'UNSEEN', 'URGENT', 'IMPORTANT'].map(p => (
                <button
                  key={p}
                  className={`filter-btn ${filterPriority === p ? 'active' : ''}`}
                  onClick={() => setFilterPriority(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="conversations-list">
            {filteredConversations.length > 0 ? (
              filteredConversations.map(c => {
                const isSelected = c.id === activeConvId
                const isUnseen = !c.is_seen_by_owner
                return (
                  <div
                    key={c.id}
                    className={`conversation-card ${isSelected ? 'selected' : ''} ${isUnseen ? 'unseen' : ''}`}
                    onClick={() => setActiveConvId(c.id)}
                  >
                    <div className="conv-card-top">
                      <span className="conv-branch-name">{c.branch_name || 'Branch'}</span>
                      <span className={getPriorityBadgeClass(c.priority)}>{(c.priority || 'NORMAL').toUpperCase()}</span>
                    </div>

                    <div className="conv-card-subject">{c.subject}</div>
                    
                    <div className="conv-card-bottom">
                      <span className="conv-manager-name">From: {c.manager_name || 'Branch Manager'}</span>
                      <span className="conv-time">{formatTimeAgo(c.last_message_at || c.created_at)}</span>
                    </div>

                    {isUnseen && <span className="unseen-dot" title="Unseen message">●</span>}
                  </div>
                )
              })
            ) : (
              <div className="conversations-empty">
                <span>No messages found matching criteria.</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CHAT THREAD VIEW */}
        <div className="owner-messages-thread-panel">
          {activeConv ? (
            <>
              {/* Thread Header */}
              <div className="thread-header">
                <div>
                  <div className="thread-header-title-wrap">
                    <h2 className="thread-subject">{activeConv.subject}</h2>
                    <span className={getPriorityBadgeClass(activeConv.priority)}>{(activeConv.priority || 'NORMAL').toUpperCase()}</span>
                  </div>
                  <div className="thread-meta">
                    <span>Branch: <strong>{activeConv.branch_name}</strong></span>
                    <span>•</span>
                    <span>Manager: <strong>{activeConv.manager_name}</strong></span>
                    <span>•</span>
                    <span>{formatTimeAgo(activeConv.created_at)}</span>
                  </div>
                </div>

                <button
                  className="btn-mark-seen"
                  onClick={() => markConversationSeen(activeConv.id)}
                >
                  ✓ Mark as Seen
                </button>
              </div>

              {/* Thread Messages */}
              <div className="thread-messages-body">
                {loadingMessages ? (
                  <div className="loading-thread">Loading conversation thread...</div>
                ) : (
                  messages.map(msg => {
                    const isOwnerSender = (msg.sender_role || '').toLowerCase().includes('owner') || (msg.sender_name || '').toLowerCase().includes('owner')
                    return (
                      <div
                        key={msg.id}
                        className={`message-bubble-wrap ${isOwnerSender ? 'owner-reply' : 'manager-msg'}`}
                      >
                        <div className="message-bubble-header">
                          <span className="sender-name">{msg.sender_name}</span>
                          <span className="sender-role">({msg.sender_role})</span>
                          <span className="msg-time">{formatTimeAgo(msg.created_at)}</span>
                        </div>
                        <div className="message-bubble-content">
                          {msg.message}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Form */}
              <form className="thread-reply-form" onSubmit={handleSendReply}>
                <textarea
                  className="reply-textarea"
                  placeholder="Type your response to the Branch Manager..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={2}
                />
                <button
                  type="submit"
                  className="btn-send-reply"
                  disabled={!replyText.trim() || submittingReply}
                >
                  {submittingReply ? 'Sending...' : 'Send Reply →'}
                </button>
              </form>
            </>
          ) : (
            <div className="thread-empty-state">
              <div className="thread-empty-icon">✉️</div>
              <h3>Select a Conversation</h3>
              <p>Choose a message from the left inbox to view details and reply.</p>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  )
}
