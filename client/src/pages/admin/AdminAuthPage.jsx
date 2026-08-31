import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiShield, FiArrowRight, FiActivity, FiAlertTriangle, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function AdminStatCard({ icon: Icon, label, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="flex items-center gap-3 bg-white/8 border border-white/15 rounded-xl px-4 py-3"
    >
      <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
        <Icon size={16} className="text-white/80" />
      </div>
      <span className="text-white/70 text-sm">{label}</span>
    </motion.div>
  );
}

export default function AdminAuthPage() {
  const [searchParams] = useSearchParams();

  // Show errors redirected back from the OIDC flow (e.g. not a pre-provisioned admin)
  useEffect(() => {
    const err = searchParams.get('error');
    if (err) toast.error(decodeURIComponent(err));
  }, [searchParams]);

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ──*/}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative overflow-hidden flex-col justify-between p-10
        bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-72 h-72 bg-green-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/3 rounded-full blur-3xl" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="admin-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#admin-grid)" />
          </svg>
        </div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative flex items-center gap-3"
        >
          <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <path d="M2 11 L7 3 L12 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 8.5 H10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-bold text-white text-lg tracking-tight">UOK Connect</span>
        </motion.div>

        <div className="relative space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full mb-4">
              <FiShield size={13} className="text-green-400" />
              <span className="text-white/80 text-xs font-medium">Restricted Access</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Admin<br />Portal
            </h1>
            <p className="text-white/50 text-sm mt-4 max-w-xs leading-relaxed">
              Authorised administrators only. Sign-in is only granted to accounts
              pre-provisioned as admin in the database.
            </p>
          </motion.div>

          <div className="space-y-2.5">
            <AdminStatCard icon={FiUsers} label="Manage users and roles" delay={0.4} />
            <AdminStatCard icon={FiActivity} label="Monitor platform activity" delay={0.5} />
            <AdminStatCard icon={FiAlertTriangle} label="Remove inappropriate content" delay={0.6} />
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="relative text-white/30 text-xs"
        >
          This page is not publicly listed · For authorised personnel only
        </motion.p>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-10 py-16 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[380px]"
        >
          {/* Mobile brand */}
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 11 L7 3 L12 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 8.5 H10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-bold text-gray-900">UOK <span className="text-green-600">Connect</span></span>
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <FiShield size={20} className="text-gray-700" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Admin Access</h2>
          </div>
          <p className="text-gray-500 text-sm mb-8">
            Sign in with the identity your admin account was provisioned under.
          </p>

          <a
            href={`${API_BASE}/auth/login?role=admin`}
            className="flex items-center justify-center gap-2.5 w-full py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
          >
            Sign in as Admin <FiArrowRight size={15} />
          </a>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <Link to="/auth/login" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← Back to login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
