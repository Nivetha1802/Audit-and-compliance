import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Transactions from './pages/Transactions';
import Findings from './pages/Findings';
import OrganizationSetup from './pages/OrganizationSetup';
import EvidenceChecklists from './pages/EvidenceChecklists';
import Tasks from './pages/Tasks';
import AiValidation from './pages/AiValidation';
import Vendors from './pages/Vendors';
import Layout from './components/Layout';
import Evidence from './pages/Evidence';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Layout><Transactions /></Layout></ProtectedRoute>} />
          <Route path="/findings" element={<ProtectedRoute><Layout><Findings /></Layout></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><Layout><Tasks /></Layout></ProtectedRoute>} />
          <Route path="/vendors" element={<ProtectedRoute><Layout><Vendors /></Layout></ProtectedRoute>} />
          <Route path="/evidence-checklist" element={<ProtectedRoute><Layout><EvidenceChecklists /></Layout></ProtectedRoute>} />
          <Route path="/ai-validation" element={<ProtectedRoute><Layout><AiValidation /></Layout></ProtectedRoute>} />
          <Route path="/org-setup" element={<ProtectedRoute><Layout><OrganizationSetup /></Layout></ProtectedRoute>} />
          <Route path="/evidence" element={<ProtectedRoute><Layout><Evidence /></Layout></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
