import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBookOpen, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function CompleteProfilePage() {
  const { fetchMe, user } = useAuthStore();
  const navigate = useNavigate();
  const isRecruiter = user?.role === 'recruiter';

  const [studentId, setStudentId] = useState('');
  const [organization, setOrganization] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next = {};
    if (!isRecruiter && !studentId.trim()) {
      next.studentId = 'Student ID is required';
    } else if (!isRecruiter && !/^[A-Za-z0-9/\-]{3,20}$/.test(studentId.trim())) {
      next.studentId = 'Invalid format (e.g. 2020/CS/001)';
    }
    if (isRecruiter && !organization.trim()) {
      next.organization = 'Organization / business name is required';
    }
    if (contactNumber.trim() && !/^[0-9+\-()\s]{7,20}$/.test(contactNumber.trim())) {
      next.contactNumber = 'Invalid contact number format';
    }
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await api.post('/auth/complete-profile', {
        student_id: isRecruiter ? undefined : studentId.trim().toUpperCase(),
        organization: isRecruiter ? organization.trim() : undefined,
        contact_number: contactNumber.trim() || undefined,
      });
      toast.success('Profile set up successfully!');
      await fetchMe();
      navigate(isRecruiter ? '/projects' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gray-50">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
            <FiBookOpen size={28} className="text-green-600" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">One last step</h1>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            {isRecruiter
              ? 'Tell us a bit about your organization to complete your profile.'
              : 'Enter your university student ID to complete your profile.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isRecruiter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Student ID</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => { setStudentId(e.target.value); if (errors.studentId) setErrors((p) => ({ ...p, studentId: '' })); }}
                placeholder="e.g. 2020/CS/001"
                autoFocus
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-shadow ${
                  errors.studentId ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-gray-200 focus:ring-green-200 focus:border-green-400'
                }`}
              />
              {errors.studentId && <p className="mt-1.5 text-xs text-red-600">{errors.studentId}</p>}
            </div>
          )}

          {isRecruiter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization / Business Name</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => { setOrganization(e.target.value); if (errors.organization) setErrors((p) => ({ ...p, organization: '' })); }}
                placeholder="e.g. Acme Corp"
                autoFocus
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-shadow ${
                  errors.organization ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-gray-200 focus:ring-green-200 focus:border-green-400'
                }`}
              />
              {errors.organization && <p className="mt-1.5 text-xs text-red-600">{errors.organization}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="tel"
              value={contactNumber}
              onChange={(e) => { setContactNumber(e.target.value); if (errors.contactNumber) setErrors((p) => ({ ...p, contactNumber: '' })); }}
              placeholder="e.g. +94 71 234 5678"
              className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-shadow ${
                errors.contactNumber ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-gray-200 focus:ring-green-200 focus:border-green-400'
              }`}
            />
            {errors.contactNumber && <p className="mt-1.5 text-xs text-red-600">{errors.contactNumber}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-200 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-sm"
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
