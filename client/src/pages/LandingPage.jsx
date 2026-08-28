import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { FiArrowRight, FiCode, FiUsers, FiBriefcase, FiStar, FiTrendingUp } from 'react-icons/fi';
import { useAuthContext } from '@asgardeo/auth-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import ProjectCard from '../components/ProjectCard';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

function CountUp({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 30);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function LandingPage() {
  const { user } = useAuthStore();
  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [stats, setStats] = useState([
    { value: 0, suffix: '+', label: 'Student Projects' },
    { value: 0, suffix: '+', label: 'Active Students' },
    { value: 0, suffix: '+', label: 'Companies' },
    { value: 0, suffix: '+', label: 'Connections Made' },
  ]);

  const { signIn } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (user.role === 'student') navigate('/dashboard', { replace: true });
      else if (user.role === 'recruiter') navigate('/projects', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    api.get('/projects?limit=6').then((res) => setFeaturedProjects(res.data.projects)).catch(() => {});
    api.get('/public/stats').then((res) => {
      if (res.data.success) {
        const { totalProjects, totalStudents, totalCompanies, totalConnections } = res.data.stats;
        setStats([
          { value: totalProjects || 0, suffix: '+', label: 'Student Projects' },
          { value: totalStudents || 0, suffix: '+', label: 'Active Students' },
          { value: totalCompanies || 0, suffix: '+', label: 'Companies' },
          { value: totalConnections || 0, suffix: '+', label: 'Connections Made' },
        ]);
      }
    }).catch(() => {});
  }, []);

  const features = [
    { icon: FiCode, title: 'Showcase Projects', desc: 'Share your academic and personal projects with the world.', color: 'text-green-600', bg: 'bg-green-50' },
    { icon: FiBriefcase, title: 'Get Discovered', desc: 'Companies browse and find talented students like you.', color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: FiUsers, title: 'Build Network', desc: 'Follow other students and grow your professional network.', color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: FiStar, title: 'Earn Recognition', desc: 'Get likes and appreciation for your hard work.', color: 'text-amber-600', bg: 'bg-amber-50' },
  ];



  return (
    <div className="overflow-hidden">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-green-100 rounded-full blur-3xl opacity-40" />
          <div className="absolute -bottom-20 -left-40 w-[500px] h-[500px] bg-purple-100 rounded-full blur-3xl opacity-30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-green-50/50 to-transparent rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded-full border border-green-200 mb-8">
                <FiTrendingUp size={13} />
                University of Kelaniya · Faculty of Computing
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 tracking-tight leading-tight mb-6"
            >
              Where Student{' '}
              <span className="relative">
                <span className="text-green-600">Projects</span>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="absolute -bottom-2 left-0 right-0 h-1 bg-green-200 rounded-full origin-left"
                />
              </span>
              {' '}Meet Opportunity
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Showcase your work, connect with companies, and build the future —
              all from one platform designed for UOK students.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              {user?.role !== 'recruiter' && (
                <button
                  onClick={() => signIn()}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-green-200 hover:shadow-green-300 hover:-translate-y-0.5 text-base"
                >
                  Add Your Project <FiArrowRight size={18} />
                </button>
              )}
              <Link
                to="/projects"
                className={`inline-flex items-center gap-2 px-7 py-3.5 font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 text-base ${
                  user?.role === 'recruiter' 
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                }`}
              >
                Browse Projects
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  <CountUp target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-sm font-medium text-green-600 uppercase tracking-wider mb-3">Why UOK Connect</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Everything you need to get noticed</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 max-w-xl mx-auto">
              One platform built specifically for UOK students to showcase talent and connect with industry.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-11 h-11 ${f.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <f.icon size={22} className={f.color} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Projects ─────────────────────────────────────────────────── */}
      {featuredProjects.length > 0 && (
        <section className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="text-sm font-medium text-green-600 uppercase tracking-wider mb-2">Latest Work</p>
                <h2 className="text-3xl font-bold text-gray-900">Featured Projects</h2>
              </div>
              <Link to="/projects" className="text-sm font-medium text-green-600 hover:text-green-700 flex items-center gap-1 transition-colors">
                View all <FiArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProjects.map((p, i) => (
                <ProjectCard key={p.id} project={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-green-600 to-green-700 rounded-3xl p-12 shadow-xl shadow-green-200/50"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {user?.role === 'recruiter' ? 'Ready to discover top talent?' : 'Ready to showcase your work?'}
            </h2>
            <p className="text-green-100 text-lg mb-8 max-w-xl mx-auto">
              {user?.role === 'recruiter'
                ? 'Browse hundreds of innovative projects built by UOK students.'
                : 'Join hundreds of UOK students who are already building their portfolios and getting discovered.'}
            </p>
            {user?.role === 'recruiter' ? (
              <Link
                to="/projects"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-green-700 font-bold rounded-xl hover:bg-green-50 transition-all duration-200 shadow-lg hover:-translate-y-0.5 text-base"
              >
                Browse Projects <FiArrowRight size={18} />
              </Link>
            ) : (
              <button
                onClick={() => signIn()}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-green-700 font-bold rounded-xl hover:bg-green-50 transition-all duration-200 shadow-lg hover:-translate-y-0.5 text-base"
              >
                Get Started Free <FiArrowRight size={18} />
              </button>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
