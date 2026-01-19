import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProjectsPage } from './pages/ProjectsPage';
import { GeneratePage } from './pages/GeneratePage';
import { RealtimePreviewPage } from './pages/RealtimePreviewPage';
import { VoiceCloningPage } from './pages/VoiceCloningPage';
import { LibraryPage } from './pages/LibraryPage';
import { SettingsPage } from './pages/SettingsPage';
import { Toaster } from './components/ui/toaster';

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/generate/:projectId?" element={<GeneratePage />} />
          <Route path="/preview" element={<RealtimePreviewPage />} />
          <Route path="/voice-cloning" element={<VoiceCloningPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
      <Toaster />
    </HashRouter>
  );
}

export default App;
