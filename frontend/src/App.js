import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'sonner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OccupancyEntry from './pages/OccupancyEntry';
import DailyReport from './pages/DailyReport';
import MonthlyReport from './pages/MonthlyReport';
import PMPerformance from './pages/PMPerformance';
import Properties from './pages/Properties';
import UserManagement from './pages/UserManagement';
import Layout from './components/Layout';
import './App.css';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#556B2F] border-t-transparent rounded-full animate-spin" />
        <p className="text-stone-500 text-sm">Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="occupancy-entry" element={<ProtectedRoute adminOnly><OccupancyEntry /></ProtectedRoute>} />
            <Route path="reports/daily" element={<DailyReport />} />
            <Route path="reports/monthly" element={<MonthlyReport />} />
            <Route path="performance" element={<PMPerformance />} />
            <Route path="properties" element={<Properties />} />
            <Route path="users" element={<ProtectedRoute adminOnly><UserManagement /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
