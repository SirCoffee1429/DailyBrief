import { Link } from 'react-router-dom'
import ManagementWhiteboard from '../components/ManagementWhiteboard.jsx'

export default function ManagementBoardPage() {
    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1 className="header-title"><i className="fa-solid fa-chalkboard title-icon" style={{ color: '#60a5fa' }} /> Management Board</h1>
                    <p className="header-date">Internal updates for the management team</p>
                </div>
                <div className="header-actions">
                    <Link to="/office" className="btn btn-secondary btn-sm"><i className="fa-solid fa-arrow-left" /> Back</Link>
                </div>
            </header>

            <ManagementWhiteboard />
        </div>
    )
}
