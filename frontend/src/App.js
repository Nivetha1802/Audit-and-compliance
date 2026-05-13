import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Risks from './pages/Risks';
import Tasks from './pages/Tasks';
import EvidenceManagement from './pages/EvidenceManagement';
import Evidence from './pages/Evidence';
import GeneralLedger from './pages/GeneralLedger';
import BankTransactionData from './pages/BankTransactionData';
import ConductAuditAnalysis from './pages/ConductAuditAnalysis';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
          <Route path="/risks" element={<PrivateRoute><Risks /></PrivateRoute>} />
          <Route path="/tasks" element={<PrivateRoute><Tasks /></PrivateRoute>} />
          <Route path="/evidence-management" element={<PrivateRoute><EvidenceManagement /></PrivateRoute>} />
          <Route path="/evidence/:projectId/:transactionId" element={<PrivateRoute><Evidence /></PrivateRoute>} />
          <Route path="/general-ledger" element={<PrivateRoute><GeneralLedger /></PrivateRoute>} />
          <Route path="/bank-transactions" element={<PrivateRoute><BankTransactionData /></PrivateRoute>} />
          <Route path="/analysis" element={<PrivateRoute><ConductAuditAnalysis /></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
