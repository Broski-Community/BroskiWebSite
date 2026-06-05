import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import SmoothScroll from './components/SmoothScroll'
import { TransitionProvider } from './context/TransitionContext'
import { AuthProvider } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import Home from './pages/Home'
import TierList from './pages/TierList'
import Social from './pages/Social'
import Projects from './pages/Projects'
import Wiki from './pages/Wiki'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import VerifyEmail from './pages/VerifyEmail'
import AdminSetup from './pages/AdminSetup'
import AdminPanel from './pages/AdminPanel'
import RequireAdmin from './components/RequireAdmin'
import Countdown from './pages/Countdown'
import NotFound from './pages/NotFound'
import Store from './pages/Store'
import TermsOfUse from './pages/TermsOfUse'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Contacts from './pages/Contacts'
import Mods from './pages/Mods'
import ModDetail from './pages/ModDetail'
import ModUpload from './pages/ModUpload'
import ModEdit from './pages/ModEdit'
import ModVersionCreate from './pages/ModVersionCreate'
import MyMods from './pages/MyMods'
import FollowedCreators from './pages/FollowedCreators'
import SavedProjects from './pages/SavedProjects'
import CreatorProfile from './pages/CreatorProfile'
import IdeaSubmit from './pages/IdeaSubmit'
import MyIdeas from './pages/MyIdeas'

function App() {
  return (
    <Router>
      <AuthProvider>
        <TransitionProvider>
          <SmoothScroll>
            <ScrollToTop />
            <div className="dark min-h-screen font-body-lg text-body-lg flex flex-col">
              <Header />
              <div className="flex-grow flex flex-col">
                <Routes>
                  {/* Public routes — accessible without login */}
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/tou" element={<TermsOfUse />} />
                  <Route path="/pp" element={<PrivacyPolicy />} />

                  {/* Protected routes — require login + accepted terms */}
                  <Route path="/" element={<Home />} />
                  <Route path="/tierlist" element={<TierList />} />
                  <Route path="/social" element={<Social />} />
                  <Route path="/progetti" element={<Projects />} />
                  <Route path="/wiki" element={<Wiki />} />
                  <Route path="/countdown" element={<Countdown />} />
                  <Route path="/store" element={<RequireAuth><Store /></RequireAuth>} />
                  <Route path="/contatti" element={<Contacts />} />
                  <Route path="/mods" element={<Mods />} />
                  <Route path="/mods/upload" element={<RequireAuth><ModUpload /></RequireAuth>} />
                  <Route path="/mods/my" element={<RequireAuth><MyMods /></RequireAuth>} />
                  <Route path="/mods/:id" element={<RequireAuth><ModDetail /></RequireAuth>} />
                  <Route path="/mods/:id/edit" element={<RequireAuth><ModEdit /></RequireAuth>} />
                  <Route path="/mods/:id/version/new" element={<RequireAuth><ModVersionCreate /></RequireAuth>} />
                  <Route path="/mods/followed" element={<RequireAuth><FollowedCreators /></RequireAuth>} />
                  <Route path="/mods/saved" element={<RequireAuth><SavedProjects /></RequireAuth>} />
                  <Route path="/mods/creator/:creatorId" element={<RequireAuth><CreatorProfile /></RequireAuth>} />
                  <Route path="/progetti/idea" element={<RequireAuth><IdeaSubmit /></RequireAuth>} />
                  <Route path="/mie-idee" element={<RequireAuth><MyIdeas /></RequireAuth>} />
                  <Route path="/admin/setup" element={<RequireAuth><AdminSetup /></RequireAuth>} />
                  <Route path="/admin" element={<RequireAuth><RequireAdmin><AdminPanel /></RequireAdmin></RequireAuth>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              <Footer />
            </div>
          </SmoothScroll>
        </TransitionProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
