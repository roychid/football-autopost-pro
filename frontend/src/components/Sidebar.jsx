import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', icon: '◻' },
  { to: '/composer', label: 'Composer', icon: '✦' },
  { to: '/channels', label: 'Channels', icon: '▶' },
  { to: '/analytics', label: 'Analytics', icon: '◐' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        ⚽ Auto<span>Post</span> Pro
      </div>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/'}
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <span>{l.icon}</span>
          {l.label}
        </NavLink>
      ))}
    </aside>
  );
}
