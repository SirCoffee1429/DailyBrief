import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import WorkbookUpload from './pages/WorkbookUpload.jsx'
import WorkbookLibrary from './pages/WorkbookLibrary.jsx'
import WorkbookViewer from './pages/WorkbookViewer.jsx'
import AiChat from './pages/AiChat.jsx'
import Briefings from './pages/Briefings.jsx'
import BriefingEditor from './pages/BriefingEditor.jsx'

export default function App() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/workbooks" element={<WorkbookLibrary />} />
                <Route path="/workbooks/upload" element={<WorkbookUpload />} />
                <Route path="/workbooks/:id" element={<WorkbookViewer />} />
                <Route path="/chat" element={<AiChat />} />
                <Route path="/briefings" element={<Briefings />} />
                <Route path="/briefings/new" element={<BriefingEditor />} />
                <Route path="/briefings/:id/edit" element={<BriefingEditor />} />
            </Routes>
        </Layout>
    )
}
