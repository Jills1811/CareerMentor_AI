const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Core API request handler
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available
  const token = localStorage.getItem('careermentor_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw {
      status: response.status,
      message: data.message || 'Something went wrong',
      errors: data.errors || [],
    };
  }

  return data;
};

/**
 * Login user
 */
export const loginUser = async (email, password) => {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (data.data?.token) {
    localStorage.setItem('careermentor_token', data.data.token);
    localStorage.setItem('careermentor_user', JSON.stringify(data.data.user));
  }

  return data;
};

/**
 * Signup user
 */
export const signupUser = async (name, email, password, confirmPassword) => {
  const data = await apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, confirmPassword }),
  });

  if (data.data?.token) {
    localStorage.setItem('careermentor_token', data.data.token);
    localStorage.setItem('careermentor_user', JSON.stringify(data.data.user));
  }

  return data;
};

/**
 * Get current user profile
 */
export const getCurrentUser = async () => {
  return apiRequest('/auth/me');
};

/**
 * Logout user
 */
export const logoutUser = () => {
  localStorage.removeItem('careermentor_token');
  localStorage.removeItem('careermentor_user');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('careermentor_token');
};

/**
 * Get stored user data
 */
export const getStoredUser = () => {
  const user = localStorage.getItem('careermentor_user');
  return user ? JSON.parse(user) : null;
};

export default apiRequest;
