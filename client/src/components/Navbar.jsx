import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMenu, FiX, FiBell, FiUser, FiLogOut, FiGrid, FiChevronDown,
} from 'react-icons/fi';
import { useAuthContext } from '@asgardeo/auth-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';

export default function Navbar() {
  const { signIn, signOut } = useAuthContext();
  const { user, clearUser } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    api.get('/notifications')
      .then((res) => {
        const count = res.data.notifications.filter((n) => !n.is_read).length;
        setUnreadCount(count);
      })
      .catch(() => {});
  }, [user, location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (!e.target.closest('[data-dropdown]')) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  let navLinks = [];
  if (user?.role === 'admin') {
    navLinks = [
      { to: '/admin/dashboard', label: 'Dashboard' },
      { to: '/projects', label: 'All Projects' },
    ];
  } else if (user?.role !== 'recruiter') {
    navLinks = [
      { to: '/projects', label: 'Projects' },
      { to: '/students', label: 'Students' },
    ];
  }

  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed top-4 left-4 right-4 z-50 flex justify-center pointer-events-none"
    >
      <div className="w-full max-w-6xl pointer-events-auto">
        {/* Main bar */}
        <div className="relative flex items-center justify-between h-14 px-4 sm:px-5
          bg-white/80 backdrop-blur-xl
          border border-gray-200/60
          rounded-2xl
          shadow-lg shadow-gray-900/[0.06]"
        >
          {/* Logo */}
          <Link to={user?.role === 'admin' ? '/admin/dashboard' : '/'} className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-green-700 transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 11 L7 3 L12 11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 8.5 H10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-[15px] tracking-tight flex items-center">
              UOK <span className="text-green-600 ml-1">Connect</span>
              {user?.role && (
                <span className="ml-2 px-1.5 py-0.5 bg-gray-900 text-white text-[10px] rounded uppercase tracking-wider">{user.role}</span>
              )}
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `relative px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-green-700 bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                {/* Notifications */}
                <Link
                  to="/notifications"
                  className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <FiBell size={17} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full ring-2 ring-white" />
                  )}
                </Link>

                {/* User dropdown */}
                <div className="relative" data-dropdown>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl hover:bg-gray-100 transition-all"
                  >
                    {user.profile_pic ? (
                      <img
                        src={user.profile_pic}
                        alt={user.name}
                        className="w-6 h-6 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                        <FiUser size={13} className="text-green-700" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {user.name.split(' ')[0]}
                    </span>
                    <FiChevronDown
                      size={13}
                      className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.13 }}
                        className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100 py-1.5 overflow-hidden"
                      >
                        <div className="px-3 py-2 border-b border-gray-50 mb-1">
                          <p className="text-xs font-semibold text-gray-800 truncate">{user.name}</p>
                          {user.student_id && (
                            <p className="text-xs text-green-600 mt-0.5">{user.student_id}</p>
                          )}
                        </div>
                        {user.role !== 'recruiter' && (
                          <Link
                            to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <FiGrid size={14} className="text-gray-400" /> Dashboard
                          </Link>
                        )}
                        <Link
                          to={`/profile/${user.id}`}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <FiUser size={14} className="text-gray-400" /> My Profile
                        </Link>
                        {unreadCount > 0 && (
                          <Link
                            to="/notifications"
                            className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <span className="flex items-center gap-2.5">
                              <FiBell size={14} className="text-gray-400" /> Notifications
                            </span>
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                              {unreadCount}
                            </span>
                          </Link>
                        )}
                        <div className="border-t border-gray-50 mt-1 pt-1">
                          <button
                            onClick={() => { clearUser(); signOut(); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <FiLogOut size={14} /> Sign out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => signIn()}
                  className="px-4 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
                >
                  Sign in
                </button>
                <button
                  onClick={() => signIn()}
                  className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-green-200"
                >
                  Add Project
                </button>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={menuOpen ? 'close' : 'open'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {menuOpen ? <FiX size={19} /> : <FiMenu size={19} />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>

        {/* Mobile dropdown panel */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="mt-2 bg-white/95 backdrop-blur-xl border border-gray-200/60 rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-3 space-y-0.5">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}

                <div className="border-t border-gray-100 pt-2 mt-2 space-y-0.5">
                  {user ? (
                    <>
                      <div className="px-4 py-2">
                        <p className="text-xs font-semibold text-gray-800">{user.name}</p>
                        {user.student_id && <p className="text-xs text-green-600">{user.student_id}</p>}
                      </div>
                      {user.role !== 'recruiter' && (
                        <Link to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} className="block px-4 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Dashboard</Link>
                      )}
                      <Link to={`/profile/${user.id}`} className="block px-4 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50">My Profile</Link>
                      <Link to="/notifications" className="block px-4 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                        Notifications
                        {unreadCount > 0 && (
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                        )}
                      </Link>
                      <button
                        onClick={() => { clearUser(); signOut(); }}
                        className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50"
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => signIn()} className="w-full text-left block px-4 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Sign in</button>
                      <button onClick={() => signIn()} className="w-full block px-4 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white text-center hover:bg-green-700">
                        Add Your Project
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
