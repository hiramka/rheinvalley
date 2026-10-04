const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth_change'));
    }
    const errorMsg = data.error || data.message || 'An error occurred';
    throw new Error(errorMsg);
  }
  return data;
};

export const api = {
  // Auth
  login: async (username, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return handleResponse(res);
  },
  getCurrentUser: async () => {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Patients
  getPatients: async (search = '') => {
    const res = await fetch(`${API_BASE_URL}/patients?search=${encodeURIComponent(search)}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },
  getPatient: async (id) => {
    const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },
  createPatient: async (patientData) => {
    const res = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(patientData)
    });
    return handleResponse(res);
  },

  // Visits
  getVisits: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_BASE_URL}/visits?${params}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },
  getVisit: async (id) => {
    const res = await fetch(`${API_BASE_URL}/visits/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },
  createVisit: async (visitData) => {
    const res = await fetch(`${API_BASE_URL}/visits`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(visitData)
    });
    return handleResponse(res);
  },

  // Consultation Notes
  getNotes: async (visitId) => {
    const res = await fetch(`${API_BASE_URL}/visit/${visitId}/notes`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },
  addNote: async (visitId, notes) => {
    const res = await fetch(`${API_BASE_URL}/visit/${visitId}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes })
    });
    return handleResponse(res);
  },

  // Pharmacy & Stock Movements
  getInventory: async (search = '') => {
    const res = await fetch(`${API_BASE_URL}/pharmacy/inventory?search=${encodeURIComponent(search)}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },
  addDrug: async (drugData) => {
    const res = await fetch(`${API_BASE_URL}/pharmacy/inventory`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(drugData)
    });
    return handleResponse(res);
  },
  getDrugMovements: async (drugId) => {
    const res = await fetch(`${API_BASE_URL}/pharmacy/inventory/${drugId}/movements`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },
  recordStockMovement: async (drugId, movementData) => {
    const res = await fetch(`${API_BASE_URL}/pharmacy/inventory/${drugId}/movement`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(movementData)
    });
    return handleResponse(res);
  },
  getPharmacyAlerts: async () => {
    const res = await fetch(`${API_BASE_URL}/pharmacy/alerts`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },
  dispenseDrug: async (visitId, drugId, quantity) => {
    const res = await fetch(`${API_BASE_URL}/pharmacy/dispense`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ visit_id: visitId, drug_id: drugId, quantity })
    });
    return handleResponse(res);
  },

  // Billing & Payments
  getBills: async (status = '') => {
    const res = await fetch(`${API_BASE_URL}/billing/bills?status=${encodeURIComponent(status)}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },
  getVisitBill: async (visitId) => {
    const res = await fetch(`${API_BASE_URL}/billing/visit/${visitId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },
  addLabCharge: async (visitId, chargeData) => {
    const res = await fetch(`${API_BASE_URL}/billing/visit/${visitId}/lab-charge`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(chargeData)
    });
    return handleResponse(res);
  },
  processPayment: async (paymentData) => {
    const res = await fetch(`${API_BASE_URL}/billing/pay`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(paymentData)
    });
    return handleResponse(res);
  },
  getReceipt: async (billId) => {
    const res = await fetch(`${API_BASE_URL}/billing/receipt/${billId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Admin & Staff
  getDashboardMetrics: async () => {
    const res = await fetch(`${API_BASE_URL}/admin/dashboard`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },
  getUsers: async () => {
    const res = await fetch(`${API_BASE_URL}/admin/users`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },
  createUser: async (userData) => {
    const res = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  },
  getAuditLogs: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_BASE_URL}/admin/audit-logs?${params}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  }
};
