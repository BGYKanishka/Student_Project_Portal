import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowRight, FiEye, FiEyeOff, FiCheck, FiX, FiUser, FiBriefcase } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

// Password strength checker
function usePasswordStrength(password) {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'One number', pass: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  return { checks, score, isStrong: score === checks.length };
}

export default function RegisterPage() {
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [touched, setTouched] = useState({});
  const navigate = useNavigate();
  const { fetchMe } = useAuthStore();
  const { checks: pwChecks, isStrong: pwStrong } = usePasswordStrength(password);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const studentIdValid = role !== 'student' || /^[A-Za-z0-9/\-]{3,20}$/.test(studentId.trim());

  const isFormValid =
    name.trim().length > 0 &&
    emailValid &&
    pwStrong &&
    passwordsMatch &&
    studentIdValid;

  const handleRegister = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirmPassword: true, studentId: true });
    if (!isFormValid) return;

    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name: name.trim(),
        email,
        password,
        role,
        student_id: role === 'student' ? studentId.trim() : undefined,
      });

      if (res.data.requireVerification) {
        setRegistrationSuccess(true);
      } else {
        await fetchMe();
        toast.success('Account created successfully!');
        if (role === 'recruiter') {
          navigate('/projects', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const mark = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ──────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-10 pt-24
        bg-gradient-to-br from-green-700 via-green-600 to-emerald-500"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid2" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid2)" />
          </svg>
        </div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative flex items-center gap-3"
        >
          <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <path d="M2 11 L7 3 L12 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 8.5 H10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-bold text-white text-lg tracking-tight">UOK Connect</span>
        </motion.div>

        <div className="relative space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Join the<br />community.
            </h1>
            <p className="text-white/70 text-base mt-4 max-w-xs leading-relaxed">
              {role === 'student'
                ? 'Showcase your projects, get discovered by top companies, and grow your career.'
                : 'Discover talented students, explore cutting-edge projects, and hire the best.'}
            </p>
          </motion.div>

          <div className="space-y-3 max-w-xs">
            {[
              role === 'student' ? 'Showcase your university projects' : 'Browse student talent',
              role === 'student' ? 'Get noticed by recruiters' : 'Connect with top graduates',
              role === 'student' ? 'Build your portfolio' : 'Post opportunities',
            ].map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <FiCheck size={11} className="text-white" />
                </div>
                <span className="text-white/80 text-sm">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="relative text-white/40 text-xs">Faculty of Computing · University of Kelaniya</p>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-10 py-10 bg-white overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 11 L7 3 L12 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 8.5 H10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-bold text-gray-900">UOK <span className="text-green-600">Connect</span></span>
          </Link>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Create account</h2>
          <p className="text-gray-500 text-sm mb-6">Choose your role to get started</p>

          {registrationSuccess ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCheck size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Check your email</h3>
              <p className="text-gray-500 mb-6">
                We've sent a verification link to <span className="font-semibold text-gray-900">{email}</span>. 
                Please verify your email address to activate your account.
              </p>
              <Link to="/auth/login" className="inline-block px-6 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors">
                Go to Login
              </Link>
            </div>
          ) : (
            <>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { value: 'student', label: 'Student', sub: 'University student', Icon: FiUser },
              { value: 'recruiter', label: 'Recruiter', sub: 'Company / Employer', Icon: FiBriefcase },
            ].map(({ value, label, sub, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setRole(value); setStudentId(''); }}
                className={`flex flex-col items-center gap-1.5 py-4 px-3 rounded-xl border-2 text-center transition-all ${
                  role === value
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                }`}
              >
                <Icon size={20} className={role === value ? 'text-green-600' : 'text-gray-400'} />
                <span className="font-semibold text-sm">{label}</span>
                <span className="text-xs opacity-70">{sub}</span>
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-3" noValidate>
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={mark('name')}
                placeholder="John Doe"
                autoComplete="name"
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-shadow ${
                  touched.name && !name.trim()
                    ? 'border-red-300 bg-red-50 focus:ring-red-200'
                    : 'border-gray-200 focus:ring-green-200 focus:border-green-400'
                }`}
              />
              {touched.name && !name.trim() && (
                <p className="mt-1 text-xs text-red-500">Full name is required.</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={mark('email')}
                placeholder="you@example.com"
                autoComplete="email"
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-shadow ${
                  touched.email && !emailValid
                    ? 'border-red-300 bg-red-50 focus:ring-red-200'
                    : 'border-gray-200 focus:ring-green-200 focus:border-green-400'
                }`}
              />
              {touched.email && !emailValid && (
                <p className="mt-1 text-xs text-red-500">Enter a valid email address.</p>
              )}
            </div>

            {/* Student ID (students only) */}
            <AnimatePresence>
              {role === 'student' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    onBlur={mark('studentId')}
                    placeholder="e.g. 2020/CS/001"
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-shadow ${
                      touched.studentId && !studentIdValid
                        ? 'border-red-300 bg-red-50 focus:ring-red-200'
                        : 'border-gray-200 focus:ring-green-200 focus:border-green-400'
                    }`}
                  />
                  {touched.studentId && !studentIdValid && (
                    <p className="mt-1 text-xs text-red-500">Invalid format (e.g. 2020/CS/001).</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={mark('password')}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
              {/* Strength indicators */}
              {(touched.password || password.length > 0) && (
                <div className="mt-2 space-y-1">
                  {pwChecks.map((c) => (
                    <div key={c.label} className="flex items-center gap-1.5">
                      {c.pass
                        ? <FiCheck size={11} className="text-green-500 flex-shrink-0" />
                        : <FiX size={11} className="text-gray-300 flex-shrink-0" />}
                      <span className={`text-xs ${c.pass ? 'text-green-600' : 'text-gray-400'}`}>{c.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={mark('confirmPassword')}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className={`w-full px-4 py-2.5 pr-11 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-shadow ${
                    touched.confirmPassword && confirmPassword && !passwordsMatch
                      ? 'border-red-300 bg-red-50 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-green-200 focus:border-green-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirm ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
              {touched.confirmPassword && confirmPassword && !passwordsMatch && (
                <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className={`w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 mt-1 ${
                isFormValid && !isLoading
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm cursor-pointer'
                  : 'bg-green-100 text-green-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  Create Account
                  {isFormValid && <FiArrowRight size={15} />}
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-300">or sign up with</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Google register — passes the selected role as state */}
          <button
            type="button"
            onClick={() =>
              (window.location.href = `${API_BASE}/auth/google/${role}`)
            }
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-all duration-200 shadow-sm"
          >
            <GoogleIcon />
            Continue with Google as {role === 'student' ? 'Student' : 'Recruiter'}
          </button>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-green-600 hover:text-green-700 font-medium">
              Log in
            </Link>
          </p>
          </>
          )}
        </motion.div>
      </div>
    </div>
  );
}