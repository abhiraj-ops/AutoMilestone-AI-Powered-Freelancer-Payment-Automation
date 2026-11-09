import { Routes, Route, Link, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import ClientDashboard from './pages/ClientDashboard';
import FreelancerDashboard from './pages/FreelancerDashboard';

function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">◆</span>
          <span className="text-lg font-bold tracking-tight text-white">AutoMilestone</span>
          <span className="hidden sm:inline text-xs font-medium text-gray-400 border border-gray-700 rounded-full px-2 py-0.5">AI · PayPal</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm font-medium">
          <NavLink to="/" className={({isActive}) => `rounded-lg px-3 py-1.5 ${isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}>
            Home
          </NavLink>
          <NavLink to="/client" className={({isActive}) => `rounded-lg px-3 py-1.5 ${isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}>
            Client
          </NavLink>
          <NavLink to="/freelancer" className={({isActive}) => `rounded-lg px-3 py-1.5 ${isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}>
            Freelancer
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/client" element={<ClientDashboard />} />
        <Route path="/freelancer" element={<FreelancerDashboard />} />
      </Routes>
    </div>
  );
}
