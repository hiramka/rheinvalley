let rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api').trim().replace(/\/+$/, '');
const API_BASE_URL = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth_change'));
    }
    const errorMsg = data.error || data.message || `Server responded with status ${response.status}`;
    throw new Error(errorMsg);
  }
  return data;
};

const safeFetch = async (url, options = {}) => {
  try {
    const res = await fetch(url, options);
    return await handleResponse(res);
  } catch (err) {
    if (err.name === 'TypeError' || err.message?.toLowerCase().includes('fetch')) {
      throw new Error(
        `Unable to reach backend API at ${API_BASE_URL}. Render free instances may take 30 seconds to wake up on first visit. Please wait a moment and try again.`
      );
    }
    throw err;
  }
};


export const api = {
  // Auth
  login: async (username, password) => {
    return safeFetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  },
  register: async (userData) => {
    return safeFetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
  },
  getCurrentUser: async () => {
    return safeFetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
  },

  // Patients
  getPatients: async (search = '') => {
    return safeFetch(`${API_BASE_URL}/patients?search=${encodeURIComponent(search)}`, {
      headers: getAuthHeaders()
    });
  },
  getPatient: async (id) => {
    return safeFetch(`${API_BASE_URL}/patients/${id}`, {
      headers: getAuthHeaders()
    });
  },
  createPatient: async (patientData) => {
    return safeFetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(patientData)
    });
  },

  // Visits
  getVisits: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return safeFetch(`${API_BASE_URL}/visits?${params}`, {
      headers: getAuthHeaders()
    });
  },
  getVisit: async (id) => {
    return safeFetch(`${API_BASE_URL}/visits/${id}`, {
      headers: getAuthHeaders()
    });
  },
  createVisit: async (visitData) => {
    return safeFetch(`${API_BASE_URL}/visits`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(visitData)
    });
  },

  // Consultation Notes
  getNotes: async (visitId) => {
    return safeFetch(`${API_BASE_URL}/visit/${visitId}/notes`, {
      headers: getAuthHeaders()
    });
  },
  addNote: async (visitId, notes) => {
    return safeFetch(`${API_BASE_URL}/visit/${visitId}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes })
    });
  },

  // Pharmacy & Stock Movements
  getInventory: async (search = '') => {
    return safeFetch(`${API_BASE_URL}/pharmacy/inventory?search=${encodeURIComponent(search)}`, {
      headers: getAuthHeaders()
    });
  },
  addDrug: async (drugData) => {
    return safeFetch(`${API_BASE_URL}/pharmacy/inventory`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(drugData)
    });
  },
  getDrugMovements: async (drugId) => {
    return safeFetch(`${API_BASE_URL}/pharmacy/inventory/${drugId}/movements`, {
      headers: getAuthHeaders()
    });
  },
  recordStockMovement: async (drugId, movementData) => {
    return safeFetch(`${API_BASE_URL}/pharmacy/inventory/${drugId}/movement`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(movementData)
    });
  },
  getPharmacyAlerts: async () => {
    return safeFetch(`${API_BASE_URL}/pharmacy/alerts`, {
      headers: getAuthHeaders()
    });
  },
  dispenseDrug: async (visitId, drugId, quantity) => {
    return safeFetch(`${API_BASE_URL}/pharmacy/dispense`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ visit_id: visitId, drug_id: drugId, quantity })
    });
  },

  // Billing & Payments
  getBills: async (status = '') => {
    return safeFetch(`${API_BASE_URL}/billing/bills?status=${encodeURIComponent(status)}`, {
      headers: getAuthHeaders()
    });
  },
  getVisitBill: async (visitId) => {
    return safeFetch(`${API_BASE_URL}/billing/visit/${visitId}`, {
      headers: getAuthHeaders()
    });
  },
  addLabCharge: async (visitId, chargeData) => {
    return safeFetch(`${API_BASE_URL}/billing/visit/${visitId}/lab-charge`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(chargeData)
    });
  },
  processPayment: async (paymentData) => {
    return safeFetch(`${API_BASE_URL}/billing/pay`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(paymentData)
    });
  },
  getReceipt: async (billId) => {
    return safeFetch(`${API_BASE_URL}/billing/receipt/${billId}`, {
      headers: getAuthHeaders()
    });
  },

  // Admin & Staff
  getDashboardMetrics: async () => {
    return safeFetch(`${API_BASE_URL}/admin/dashboard`, {
      headers: getAuthHeaders()
    });
  },
  getUsers: async () => {
    return safeFetch(`${API_BASE_URL}/admin/users`, {
      headers: getAuthHeaders()
    });
  },
  createUser: async (userData) => {
    return safeFetch(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
  },
  getAuditLogs: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return safeFetch(`${API_BASE_URL}/admin/audit-logs?${params}`, {
      headers: getAuthHeaders()
    });
  }
};

