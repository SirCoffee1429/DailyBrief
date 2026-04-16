import { Link } from 'react-router-dom'

export default function RoleSelect() {
    return (
        <div className="role-select-page">
            <div className="role-select-header">
                <h1 className="role-select-title">DailyBrief</h1>
                <p className="role-select-subtitle">Select your dashboard</p>
            </div>

            <div className="role-select-cards">
                <Link to="/kitchen" className="role-card kitchen-card">
                    <div className="role-card-icon" style={{ color: '#f97316' }}><i className="fa-solid fa-fire-burner" /></div>
                    <div className="role-card-label">Kitchen</div>
                    <div className="role-card-desc">Today's briefing, tasks & recipes</div>
                </Link>

                <Link to="/office" className="role-card office-card">
                    <div className="role-card-icon"><i className="fa-solid fa-building" /></div>
                    <div className="role-card-label">Office</div>
                    <div className="role-card-desc">Manage briefings, workbooks & history</div>
                </Link>

                <Link to="/foh" className="role-card foh-card">
                    <div className="role-card-icon" style={{ color: '#06b6d4' }}><i className="fa-solid fa-utensils" /></div>
                    <div className="role-card-label">Front of House</div>
                    <div className="role-card-desc">Shift notes, features & service info</div>
                </Link>
            </div>
        </div>
    )
}
