import { Routes, Route } from 'react-router-dom'
import RoleSelect from './pages/RoleSelect.jsx'
import Dashboard from './pages/Dashboard.jsx'
import OfficeDashboard from './pages/OfficeDashboard.jsx'
import WorkbookUpload from './pages/WorkbookUpload.jsx'
import WorkbookLibrary from './pages/WorkbookLibrary.jsx'
import WorkbookViewer from './pages/WorkbookViewer.jsx'
import AiChat from './pages/AiChat.jsx'
import KitchenRecipes from './pages/KitchenRecipes.jsx'
import Briefings from './pages/Briefings.jsx'
import BriefingEditor from './pages/BriefingEditor.jsx'
import History from './pages/History.jsx'
import KitchenLayout from './components/KitchenLayout.jsx'
import OfficeLayout from './components/OfficeLayout.jsx'
import OfficeGate from './components/OfficeGate.jsx'
import SalesReports from './pages/SalesReports.jsx'
import SalesReportDetail from './pages/SalesReportDetail.jsx'
import ManagementBoardPage from './pages/ManagementBoardPage.jsx'
import EventsBanquetsPage from './pages/EventsBanquetsPage.jsx'
import RecipeCreator from './pages/RecipeCreator.jsx'

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<RoleSelect />} />

            {/* Kitchen routes */}
            <Route path="/kitchen" element={<KitchenLayout><Dashboard /></KitchenLayout>} />
            <Route path="/kitchen/recipes" element={<KitchenLayout><KitchenRecipes /></KitchenLayout>} />
            <Route path="/kitchen/recipes/create" element={<KitchenLayout><RecipeCreator /></KitchenLayout>} />
            <Route path="/kitchen/recipes/:id" element={<KitchenLayout><WorkbookViewer /></KitchenLayout>} />
            <Route path="/kitchen/chat" element={<KitchenLayout><AiChat /></KitchenLayout>} />
            <Route path="/kitchen/sales" element={<KitchenLayout><SalesReports /></KitchenLayout>} />
            <Route path="/kitchen/sales/:date" element={<KitchenLayout><SalesReportDetail /></KitchenLayout>} />

            {/* Office routes — password protected */}
            <Route path="/office" element={<OfficeGate><OfficeLayout><OfficeDashboard /></OfficeLayout></OfficeGate>} />
            <Route path="/office/briefings" element={<OfficeGate><OfficeLayout><Briefings /></OfficeLayout></OfficeGate>} />
            <Route path="/office/briefings/new" element={<OfficeGate><OfficeLayout><BriefingEditor /></OfficeLayout></OfficeGate>} />
            <Route path="/office/briefings/:id/edit" element={<OfficeGate><OfficeLayout><BriefingEditor /></OfficeLayout></OfficeGate>} />
            <Route path="/office/workbooks" element={<OfficeGate><OfficeLayout><WorkbookLibrary /></OfficeLayout></OfficeGate>} />
            <Route path="/office/workbooks/create" element={<OfficeGate><OfficeLayout><RecipeCreator /></OfficeLayout></OfficeGate>} />
            <Route path="/office/workbooks/upload" element={<OfficeGate><OfficeLayout><WorkbookUpload /></OfficeLayout></OfficeGate>} />
            <Route path="/office/workbooks/:id" element={<OfficeGate><OfficeLayout><WorkbookViewer /></OfficeLayout></OfficeGate>} />
            <Route path="/office/history" element={<OfficeGate><OfficeLayout><History /></OfficeLayout></OfficeGate>} />
            <Route path="/office/board" element={<OfficeGate><OfficeLayout><ManagementBoardPage /></OfficeLayout></OfficeGate>} />
            <Route path="/office/events" element={<OfficeGate><OfficeLayout><EventsBanquetsPage /></OfficeLayout></OfficeGate>} />
            <Route path="/office/chat" element={<OfficeGate><OfficeLayout><AiChat /></OfficeLayout></OfficeGate>} />
            <Route path="/office/sales" element={<OfficeGate><OfficeLayout><SalesReports /></OfficeLayout></OfficeGate>} />
            <Route path="/office/sales/:date" element={<OfficeGate><OfficeLayout><SalesReportDetail /></OfficeLayout></OfficeGate>} />
        </Routes>
    )
}

