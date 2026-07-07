import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('Verifying your email address...');
  const hasCalled = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification token.');
      return;
    }

    if (hasCalled.current) return;
    hasCalled.current = true;

    const verifyToken = async () => {
      try {
        const res = await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully. You can now log in.');
        toast.success('Email verified successfully!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The token may have expired.');
        toast.error('Email verification failed.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
      >
        <div className="flex justify-center mb-6">
          {status === 'loading' && (
            <div className="text-green-600 animate-spin">
              <FiLoader size={48} />
            </div>
          )}
          {status === 'success' && (
            <div className="text-green-600">
              <FiCheckCircle size={56} />
            </div>
          )}
          {status === 'error' && (
            <div className="text-red-500">
              <FiXCircle size={56} />
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {status === 'loading' && 'Verifying Email'}
          {status === 'success' && 'Email Verified'}
          {status === 'error' && 'Verification Failed'}
        </h2>
        
        <p className="text-gray-500 mb-8">{message}</p>

        <div className="flex flex-col gap-3">
          <Link
            to="/auth/login"
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            Go to Login
          </Link>
          
          {status === 'error' && (
            <Link
              to="/auth/register"
              className="w-full flex justify-center py-2.5 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Register Again
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}
