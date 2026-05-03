import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'ADMIN',
    organizationName: '',
  });
  const [organizations, setOrganizations] = useState([]);
  const [isNewOrg, setIsNewOrg] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/v1/organizations/public/list');
        setOrganizations(response.data);
      } catch (err) {
        console.error("Failed to fetch organizations", err);
      }
    };
    fetchOrgs();
  }, []);

  const validatePassword = (pass) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!regex.test(pass)) {
      setPasswordError('Password must be at least 8 characters long, include uppercase, lowercase, number and special character (@$!%*?&)');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'role' && value !== 'ADMIN') {
      setIsNewOrg(false);
    }
    if (name === 'password') {
      validatePassword(value);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validatePassword(formData.password)) {
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:8080/api/v1/auth/register', formData);
      setSuccess(true);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/login');
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: '1rem' }}>
      <div style={{ maxWidth: '450px', width: '100%', backgroundColor: 'white', padding: '2rem', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '1.5rem', color: '#111827' }}>Create your account</h2>
        
        {success ? (
          <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '0.5rem' }}>
            <h3 style={{ fontWeight: 'bold' }}>Registration Successful!</h3>
            <p>Redirecting to login in {countdown} seconds...</p>
          </div>
        ) : (
          <form onSubmit={handleRegister}>
            {error && <div style={{ marginBottom: '1rem', color: '#ef4444', textAlign: 'center', fontSize: '0.875rem' }}>{error}</div>}
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Full Name</label>
              <input name="fullName" type="text" required value={formData.fullName} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Email Address</label>
              <input name="email" type="email" required value={formData.email} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Password</label>
              <input name="password" type="password" required value={formData.password} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              {passwordError && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{passwordError}</p>}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Role</label>
              <select name="role" value={formData.role} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                <option value="ADMIN">Admin</option>
                <option value="FINANCE_MANAGER">Finance Manager</option>
                <option value="AUDITOR">Auditor</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                {formData.role === 'ADMIN' ? 'Organization Management' : 'Select Organization'}
              </label>
              
              {formData.role === 'ADMIN' && (
                <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" checked={isNewOrg} onChange={() => setIsNewOrg(!isNewOrg)} style={{ marginRight: '0.5rem' }} />
                  <span style={{ fontSize: '0.875rem' }}>Create a new organization</span>
                </div>
              )}

              {isNewOrg && formData.role === 'ADMIN' ? (
                <input name="organizationName" type="text" required value={formData.organizationName} onChange={handleChange} placeholder="New Organization Name" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              ) : (
                <select name="organizationName" required value={formData.organizationName} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                  <option value="">Select an organization</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.name}>{org.name}</option>
                  ))}
                </select>
              )}
            </div>

            <button type="submit" disabled={loading || passwordError} style={{ width: '100%', padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Processing...' : 'Sign Up'}
            </button>
          </form>
        )}
        
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#4b5563' }}>
          Already have an account? <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>Log in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
