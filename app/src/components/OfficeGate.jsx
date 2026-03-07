import { useState } from 'react'

const OFFICE_PASSWORD = 'chef21'

export default function OfficeGate({ children }) {
    const [unlocked, setUnlocked] = useState(
        () => sessionStorage.getItem('officeUnlocked') === 'true'
    )
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    function handleSubmit(e) {
        e.preventDefault()
        if (password === OFFICE_PASSWORD) {
            sessionStorage.setItem('officeUnlocked', 'true')
            setUnlocked(true)
        } else {
            setError('Incorrect password')
            setPassword('')
        }
    }

    if (unlocked) return children

    return (
        <div className="password-gate">
            <div className="password-gate-card">
                <div className="password-gate-icon"><i className="fa-solid fa-lock" /></div>
                <h2 className="password-gate-title">Office Access</h2>
                <p className="password-gate-desc">Enter the manager password to continue</p>
                <form onSubmit={handleSubmit}>
                    <input
                        className="input password-gate-input"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError('') }}
                        autoFocus
                    />
                    {error && <div className="password-gate-error">{error}</div>}
                    <button type="submit" className="btn btn-primary password-gate-btn">
                        Unlock
                    </button>
                </form>
            </div>
        </div>
    )
}
