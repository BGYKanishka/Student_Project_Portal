import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBookOpen, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function CompleteProfilePage() {
  const { syncUser } = useAuthStore();
  const navigate = useNavigate();
  
  const [role, setRole] = useState('student');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    if (role === 'student') {
      if (!studentId.trim()) return 'Student ID is required';
      if (!/^[A-Za-z0-9/\-]{3,20}$/.test(studentId.trim())) return 'Invalid format (e.g. 2020/CS/001)';
    }
    return '';
  };

  const submitProfile = async () => {
    setSubmitting(true);
    try {
      await api.post('/auth/complete-profile', { 
        role, 
        student_id: role === 'student' ? studentId.trim().toUpperCase() : '' 
      });
      toast.success('Profile setup successfully!');
      await syncUser();
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
      setError(err.response?.data?.message || 'Could not save profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    submitProfile();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gray-50">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
            <FiBookOpen size={28} className="text-green-600" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome!</h1>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Please complete your profile to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              I am a...
            </label>
            <div className="flex gap-4">
              <label className="flex-1">
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={role === 'student'}
                  onChange={() => { setRole('student'); setError(''); }}
                  className="sr-only peer"
                />
                <div className="px-4 py-3 border rounded-xl text-center cursor-pointer peer-checked:border-green-600 peer-checked:bg-green-50 peer-checked:text-green-700 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Student
                </div>
              </label>
              <label className="flex-1">
                <input
                  type="radio"
                  name="role"
                  value="recruiter"
                  checked={role === 'recruiter'}
                  onChange={() => { setRole('recruiter'); setError(''); }}
                  className="sr-only peer"
                />
                <div className="px-4 py-3 border rounded-xl text-center cursor-pointer peer-checked:border-green-600 peer-checked:bg-green-50 peer-checked:text-green-700 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Recruiter
                </div>
              </label>
            </div>
          </div>

          <AnimatePresence>
            {role === 'student' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Student ID
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => {
                      setStudentId(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="e.g. 2020/CS/001"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-shadow ${
                      error
                        ? 'border-red-300 bg-red-50 focus:ring-red-200'
                        : 'border-gray-200 focus:ring-green-200 focus:border-green-400'
                    }`}
                  />
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1.5 text-xs text-red-600"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-200 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-sm mt-4"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <FiCheckCircle size={16} />
                Complete Profile
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
