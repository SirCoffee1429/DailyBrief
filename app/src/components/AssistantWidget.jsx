import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function AssistantWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hey Chef! 👋 Ask me anything about your recipes.' }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef(null)

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, isOpen])

    async function handleSend(e) {
        e.preventDefault()
        const question = input.trim()
        if (!question || loading) return

        setMessages(prev => [...prev, { role: 'user', text: question }])
        setInput('')
        setLoading(true)

        try {
            const { data, error } = await supabase.functions.invoke('kitchen-assistant', {
                body: { question },
            })

            if (error) throw error

            const answer = data?.answer
                || 'Sorry, I couldn\'t generate a response. Please try again.'

            setMessages(prev => [...prev, { role: 'assistant', text: answer }])
        } catch (err) {
            console.error('Assistant error:', err)
            setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Something went wrong. Check the console for details.' }])
        }

        setLoading(false)
    }

    return (
        <div className="assistant-widget-container">
            {isOpen && (
                <div className="assistant-widget-window">
                    <div className="assistant-widget-header">
                        <div className="assistant-widget-title">
                            <i className="fa-solid fa-robot"></i> Kitchen Assistant
                        </div>
                        <button className="assistant-widget-close" onClick={() => setIsOpen(false)}>
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div className="assistant-widget-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`chat-bubble ${msg.role}`}>
                                {msg.text}
                            </div>
                        ))}
                        {loading && (
                            <div className="chat-bubble assistant" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> Thinking...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form className="assistant-widget-input" onSubmit={handleSend}>
                        <input
                            className="input"
                            style={{ padding: '8px 12px', fontSize: '13px' }}
                            placeholder="Ask a question..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            disabled={loading}
                        />
                        <button className="btn btn-primary btn-sm" style={{ padding: '8px 12px' }} type="submit" disabled={loading || !input.trim()}>
                            <i className="fa-solid fa-paper-plane"></i>
                        </button>
                    </form>
                </div>
            )}

            <button
                className={`assistant-widget-fab ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle Assistant"
            >
                {isOpen ? <i className="fa-solid fa-xmark"></i> : <i className="fa-solid fa-message"></i>}
            </button>
        </div>
    )
}
