import { useNavigate } from 'react-router-dom';

// Inside your login component
const navigate = useNavigate();

const handleLogin = async (credentials) => {
  try {
    const response = await loginUser(credentials);
    if (response.success) {
      showSuccessMessage('Login successful');
      navigate('/dashboard');
    }
  } catch (error) {
    showErrorMessage(error.message);
  }
}; 