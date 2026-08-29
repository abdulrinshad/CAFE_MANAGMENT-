import React, { useState, useEffect, useRef } from 'react'
import BranchManagerLayout from '../../layouts/BranchManagerLayout'
import { useApp } from '../../context/AppContext'
import { conversationApi } from '../../api'
import './BranchMessagesPage.css'

export default function BranchMessagesPage() {
  const { conversations, fetchConversations, sendMessageToOwner, replyToConversation } = useApp()

  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages]         = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [replyText, setReplyText]       = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

  // New Alert Modal State
  const [showModal, setShowModal]       = useState(false)
  const [newSubject, setNewSubject]     = useState('')
  const [newPriority, setNewPriority]   = useState('normal')
  const [newMessage, setNewMessage]     = useState('')
  const [submittingNewAlert, setSubmittingNewAlert] = useState(false)
  const [alertError, setAlertError]     = useState('')

  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeConvId) {
      setActiveConvId(conversations[0].id)
    }
  }, [conversations, activeConvId])

  useEffect(() => {
    if (!activeConvId) return
    let isMounted = true
    async function loadThread() {
      setLoadingMessages(true)
      try {
        const msgs = await conversationApi.getMessages(activeConvId)
        if (isMounted) setMessages(Array.isArray(msgs) ? msgs : [])
      } catch (err) {
        console.error('Failed to load thread:', err)
      } finally {
        if (isMounted) setLoadingMessages(false)
      }
    }
    loadThread()
    return () => { isMounted = false }
  }, [activeConvId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const activeConv = (conversations || []).find(c => c.id === activeConvId)

  const handleCreateAlert = async (e) => {
    e.preventDefault()
    if (!newSubject.trim() || !newMessage.trim() || submittingNewAlert) return

    setSubmittingNewAlert(true)
    setAlertError('')
    try {
      const created = await sendMessageToOwner({
        subject: newSubject.trim(),
        priority: newPriority,
        message: newMessage.trim(),
      })
      setShowModal(false)
      setNewSubject('')
      setNewMessage('')
      setNewPriority('normal')
      if (created && created.id) {
        setActiveConvId(created.id)
      }
    } catch (err) {
      console.error('Failed to send alert:', err)
      setAlertError('Failed to send alert to Owner. Please try again.')
    } finally {
      setSubmittingNewAlert(false)
    }
  }

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
    <BranchManagerLayout pageTitle="Contact Owner / Alerts">
      <div className="branch-messages-container">
        
        {/* LEFT COLUMN: CONVERSATIONS LIST */}
        <div className="branch-messages-sidebar">
          <div className="messages-sidebar-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="sidebar-title" style={{ margin: 0 }}>Alerts to Owner</h2>
              <button
                className="btn-new-alert-cta"
                onClick={() => setShowModal(true)}
              >
                + New Alert
              </button>
            </div>
          </div>

          <div className="conversations-list">
            {(conversations || []).length > 0 ? (
              (conversations || []).map(c => {
                const isSelected = c.id === activeConvId
                const isUnseen = !c.is_seen_by_manager
                return (
                  <div
                    key={c.id}
                    className={`conversation-card ${isSelected ? 'selected' : ''} ${isUnseen ? 'unseen' : ''}`}
                    onClick={() => setActiveConvId(c.id)}
                  >
                    <div className="conv-card-top">
                      <span className="conv-branch-name">{c.branch_name || 'My Branch'}</span>
                      <span className={getPriorityBadgeClass(c.priority)}>{(c.priority || 'NORMAL').toUpperCase()}</span>
                    </div>

                    <div className="conv-card-subject">{c.subject}</div>
                    
                    <div className="conv-card-bottom">
                      <span className="conv-manager-name">Owner Replies: {c.messages ? c.messages.filter(m => (m.sender_role || '').toLowerCase().includes('owner')).length : 0}</span>
                      <span className="conv-time">{formatTimeAgo(c.last_message_at || c.created_at)}</span>
                    </div>

                    {isUnseen && <span className="unseen-dot" title="New Owner Reply">●</span>}
                  </div>
                )
              })
            ) : (
              <div className="conversations-empty">
                <span>No alerts sent yet. Click "+ New Alert" to send a message to the Owner.</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CHAT THREAD VIEW */}
        <div className="branch-messages-thread-panel">
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
                    <span>Started: <strong>{formatTimeAgo(activeConv.created_at)}</strong></span>
                  </div>
                </div>
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
                  placeholder="Type a follow-up message to the Owner..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={2}
                />
                <button
                  type="submit"
                  className="btn-send-reply"
                  disabled={!replyText.trim() || submittingReply}
                >
                  {submittingReply ? 'Sending...' : 'Send Message →'}
                </button>
              </form>
            </>
          ) : (
            <div className="thread-empty-state">
              <div className="thread-empty-icon">📢</div>
              <h3>Send an Alert to the Owner</h3>
              <p>Communicate stock alerts, urgent issues, or operational updates directly to the Owner.</p>
              <button className="btn-new-alert-cta" style={{ marginTop: 14 }} onClick={() => setShowModal(true)}>
                + Create New Alert
              </button>
            </div>
          )}
        </div>

      </div>

      {/* NEW ALERT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Send Alert / Message to Owner</h3>
              <button className="btn-close-modal" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateAlert}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Subject</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Low Stock Alert / Maintenance Required"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Alert Priority Level</label>
                <select
                  className="form-input"
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value)}
                >
                  <option value="normal">Normal Priority</option>
                  <option value="important">Important Priority</option>
                  <option value="urgent">Urgent Priority</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Message Content</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Describe the issue or update in detail for the Owner..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  required
                />
              </div>

              {alertError && (
                <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
                  {alertError}
                </div>
              )}

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit-alert" disabled={submittingNewAlert}>
                  {submittingNewAlert ? 'Sending Alert...' : 'Send Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </BranchManagerLayout>
  )
}
