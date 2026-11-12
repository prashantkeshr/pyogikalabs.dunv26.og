import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import LabsPage from './pages/LabsPage';
import LabPage from './pages/LabPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-bg">
        <Header />
        <div className="flex-1">
          <Routes>
            <Route path="/"           element={<Home />} />
            <Route path="/labs"       element={<LabsPage />} />
            <Route path="/lab/:id"    element={<LabPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
