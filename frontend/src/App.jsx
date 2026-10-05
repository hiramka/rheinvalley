import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoginPage from './pages/LoginPage';
import PatientRegistrationPage from './pages/PatientRegistrationPage';
import VisitBillingPage from './pages/VisitBillingPage';
import PharmacyPage from './pages/PharmacyPage';
import BillingPaymentPage from './pages/BillingPaymentPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import Spinner from './components/Spinner';
import { api } from './api';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [initializing, setInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [alerts, setAlerts] = useState(null);
  const [search, setSearch] = useState('');

  // Inter-tab cross navigation state
  const [preselectedPatient, setPreselectedPatient] = useState(null);
  const [targetVisitId, setTargetVisitId] = useState(null);

  useEffect(() => {
    // Quick startup initialization check
    const timer = setTimeout(() => {
      setInitializing(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);


  useEffect(() => {
    if (user) {
      // Set default tab by role
      if (user.role === 'Receptionist') setActiveTab('patients');
      else if (user.role === 'Doctor') setActiveTab('visits');
      else if (user.role === 'Pharmacist') setActiveTab('pharmacy');
      else if (user.role === 'Cashier') setActiveTab('billing');
      else setActiveTab('dashboard');

      loadAlerts();
    }
  }, [user]);

  const loadAlerts = async () => {
    try {
      const res = await api.getPharmacyAlerts();
      setAlerts(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleStartVisitForPatient = (patient) => {
    setPreselectedPatient(patient);
    setActiveTab('visits');
  };

  const handleGoToPharmacy = (visitId) => {
    setTargetVisitId(visitId);
    setActiveTab('pharmacy');
  };

  const handleGoToBilling = (visitId) => {
    setTargetVisitId(visitId);
    setActiveTab('billing');
  };

  if (initializing) {
    return <Spinner fullScreen text="Initializing CityCare Hospital POS & Billing System..." />;
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }


  const tabTitles = {
    dashboard: 'Admin Executive Dashboard',
    patients: 'Patient Registration & Registry',
    visits: 'Outpatient Visits & Doctor Consultations',
    pharmacy: 'Pharmacy Inventory & Drug Dispensing',
    billing: 'Billing, Payments & Invoicing',
    audit: 'System Audit Logs & Security'
  };

  return (
    <div className="app-container">
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alerts={alerts}
        onLogout={handleLogout}
      />

      <div className="main-wrapper">
        <Topbar
          user={user}
          activeTitle={tabTitles[activeTab] || 'Hospital POS'}
          search={search}
          setSearch={setSearch}
          alerts={alerts}
        />

        <main className="content-area">
          {activeTab === 'dashboard' && <AdminDashboardPage user={user} />}
          
          {activeTab === 'patients' && (
            <PatientRegistrationPage
              user={user}
              onStartVisit={handleStartVisitForPatient}
            />
          )}

          {activeTab === 'visits' && (
            <VisitBillingPage
              user={user}
              preselectedPatient={preselectedPatient}
              onGoToBilling={handleGoToBilling}
              onGoToPharmacy={handleGoToPharmacy}
            />
          )}

          {activeTab === 'pharmacy' && (
            <PharmacyPage
              user={user}
              defaultVisitId={targetVisitId}
            />
          )}

          {activeTab === 'billing' && (
            <BillingPaymentPage
              user={user}
              defaultVisitId={targetVisitId}
            />
          )}

          {activeTab === 'audit' && (
            <AdminDashboardPage user={user} />
          )}
        </main>
      </div>
    </div>
  );
}
