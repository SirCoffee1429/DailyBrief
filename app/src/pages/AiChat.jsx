import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
const GEMINI_KEY = 'AIzaSyA9kVvvkB-Kn167MG63Fnig_EyG4uMaNAg'

export default function AiChat() {
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Hey Chef! 👋 I\'ve got all your recipes loaded up. Ask me anything — ingredients, quantities, procedures, you name it.' }
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
            // Fetch all workbook chunks for context
            const { data: chunks } = await supabase
                .from('workbook_chunks')
                .select('content')
                .limit(100)

            const context = (chunks || []).map(c => c.content).join('\n\n---\n\n')

            const systemPrompt = `You are a helpful kitchen assistant for a restaurant crew. You have access to the restaurant's recipe workbooks and operational data. Answer questions accurately based on the workbook data provided below. If the answer isn't in the data, say so honestly. Be concise and practical — these are busy kitchen workers.

WORKBOOK DATA:
${context || '(No workbooks uploaded yet)'}`

            const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: systemPrompt + '\n\nQuestion: ' + question }] }
                    ],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1024
                    }
                })
            })

            const data = await response.json()
            const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text
                || 'Sorry, I couldn\'t generate a response. Please try again.'

            setMessages(prev => [...prev, { role: 'ai', text: aiText }])
        } catch (err) {
            console.error('Gemini error:', err)
            setMessages(prev => [...prev, { role: 'ai', text: '⚠️ Something went wrong. Check the console for details.' }])
        }

        setLoading(false)
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Ask AI</h1>
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
                            <div className="chat-bubble ai" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
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
