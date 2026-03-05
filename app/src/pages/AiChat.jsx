import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function AiChat() {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hey Chef! 👋 I\'ve got all your recipes loaded up. Ask me anything — ingredients, quantities, procedures, you name it.' }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

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
        <div>
            <div className="page-header">
                <h1 className="page-title">Knowledge Base</h1>
                <p className="page-subtitle">Ask questions about your recipes — ingredients, quantities, procedures, and more.</p>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="chat-container">
                    <div className="chat-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`chat-bubble ${msg.role}`}>
                                {msg.text}
                            </div>
                        ))}
                        {loading && (
                            <div className="chat-bubble assistant" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <span className="spinner" /> Thinking...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chat-input-bar" onSubmit={handleSend}>
                        <input
                            className="input"
                            placeholder="Ask a question... e.g. 'How many cups of ketchup in the BBQ sauce?'"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            disabled={loading}
                        />
                        <button className="btn btn-primary" type="submit" disabled={loading || !input.trim()}>
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
