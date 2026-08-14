export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

function parseApiError(data, response) {
  if (data?.message) {
    return data.message;
  }

  if (typeof data?.detail === 'string') {
    return data.detail;
  }

  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((item) => item?.msg || item?.message || String(item))
      .join(', ');
  }

  if (response.status === 401) {
    return 'Invalid email or password';
  }

  if (response.status >= 500) {
    return 'Server error. Please try again in a moment.';
  }

  return 'Something went wrong';
}

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

  const token = localStorage.getItem('careermentor_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch {
    throw {
      status: 0,
      message: `Cannot reach the server at ${API_BASE_URL}. Make sure the backend is running.`,
    };
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw {
      status: response.status,
      message: parseApiError(data, response),
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
 * Login/register user with Google
 */
export const googleLogin = async (credential) => {
  const data = await apiRequest('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });

  if (data.data?.token) {
    localStorage.setItem('careermentor_token', data.data.token);
    localStorage.setItem(
      'careermentor_user',
      JSON.stringify(data.data.user)
    );
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
