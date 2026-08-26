import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { motion } from 'framer-motion';

export default function OAuthSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { fetchMe } = useAuthStore();
  const code = searchParams.get('code');
  const hasExchanged = useRef(false);

  useEffect(() => {
    if (!code) {
      toast.error('Invalid OAuth code.');
      navigate('/auth/login', { replace: true });
      return;
    }

    if (hasExchanged.current) return;
    hasExchanged.current = true;

    const exchangeCode = async () => {
      try {
        const res = await api.post('/auth/oauth-exchange', { code });
        if (res.data.success) {
          await fetchMe();
          toast.success('Successfully logged in with Google!');
          const currentUser = useAuthStore.getState().user;
          
          if (currentUser?.role === 'student' && !currentUser?.student_id) {
            navigate('/complete-profile', { replace: true });
          } else if (currentUser?.role === 'recruiter') {
            navigate('/projects', { replace: true });
          } else if (currentUser?.role === 'admin') {
            navigate('/admin/dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }
      } catch (err) {
        console.error(err);
        toast.error('OAuth exchange failed. Please try again.');
        navigate('/auth/login', { replace: true });
      }
    };

    exchangeCode();
  }, [code, navigate, fetchMe]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center"
      >
        <div className="w-12 h-12 border-4 border-gray-100 border-t-green-500 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Completing login...</h2>
        <p className="text-gray-500 text-sm mt-2">Please wait while we securely sign you in.</p>
      </motion.div>
    </div>
  );
}
