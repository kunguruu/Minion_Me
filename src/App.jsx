import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';

// Import pages
import Home from './pages/Home';
import SafariAI from '../SafariAI/frontend/SafariAI';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Register from './pages/Register';
import ClientSignUp from './pages/ClientSignUp';
import BecomeMinion from './pages/BecomeMinion';
import ClientDashboard from './pages/ClientDashboard';
import ClientProfileEdit from './pages/ClientProfileEdit';
import MinionDashboard from './pages/MinionDashboard';
import MinionProfileEdit from './pages/MinionProfileEdit';
import AdminDashboard from './pages/AdminDashboard';
import AdminDisputes from './pages/AdminDisputes';
import AdminUsers from './pages/AdminUsers';
import BrowseMinions from './pages/BrowseMinions';
import MinionProfile from './pages/MinionProfile';
import PostTask from './pages/PostTask';
import FindGigs from './pages/FindGigs';
import MyJobs from './pages/MyJobs';
import MyTasks from './pages/MyTasks';
import Notifications from './pages/Notifications';
import ProtectedRoute from './components/ProtectedRoute';
import ThemeToggle from './components/ThemeToggle';

function App() {
  return (
    <Router>
      <ThemeToggle />
      <Routes>
        {/* Safari AI standalone route (no Minion Me chrome) */}
        <Route path="/safari-ai" element={<SafariAI />} />

        {/* Routes with Layout (Header + Footer) */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        {/* Auth Routes (No Layout - full page) */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/client/forgot-password" element={<ForgotPassword audience="client" />} />
        <Route path="/minion/forgot-password" element={<ForgotPassword audience="minion" />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/sign-up" element={<ClientSignUp />} />
        <Route path="/become-minion" element={<BecomeMinion />} />
        
        {/* Dashboard Routes */}
        <Route path="/client-dashboard" element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientDashboard />
          </ProtectedRoute>
        } />
        <Route path="/client/profile/edit" element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientProfileEdit />
          </ProtectedRoute>
        } />
        <Route path="/minion-dashboard" element={
          <ProtectedRoute allowedRoles={['minion']}>
            <MinionDashboard />
          </ProtectedRoute>
        } />
        <Route path="/minion/profile/edit" element={
          <ProtectedRoute allowedRoles={['minion']}>
            <MinionProfileEdit />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/disputes" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDisputes />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUsers />
          </ProtectedRoute>
        } />

        {/* Task Routes */}
        <Route path="/post-task" element={
          <ProtectedRoute allowedRoles={['client']}>
            <PostTask />
          </ProtectedRoute>
        } />
        <Route path="/find-gigs" element={
          <ProtectedRoute allowedRoles={['minion']}>
            <FindGigs />
          </ProtectedRoute>
        } />
        <Route path="/my-jobs" element={
          <ProtectedRoute allowedRoles={['minion']}>
            <MyJobs />
          </ProtectedRoute>
        } />
        <Route path="/my-tasks" element={
          <ProtectedRoute allowedRoles={['client']}>
            <MyTasks />
          </ProtectedRoute>
        } />
        <Route path="/browse-minions" element={
          <ProtectedRoute allowedRoles={['client']}>
            <BrowseMinions />
          </ProtectedRoute>
        } />
        <Route path="/browse-minions/:id" element={
          <ProtectedRoute allowedRoles={['client']}>
            <MinionProfile />
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />

        {/* 404 */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center">
            <h1 className="text-3xl font-bold">404 - Page Not Found</h1>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
