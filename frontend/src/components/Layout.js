import React, { useState } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SIDEBAR_BG   = '#0f172a';
const SIDEBAR_HOVER = '#1e293b';
const SIDEBAR_ACTIVE = '#1d4ed8';
const SIDEBAR_TEXT  = '#94a3b8';
const SIDEBAR_TEXT_ACTIVE = '#ffffff';
const SIDEBAR_BORDER = '#1e293b';

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { to: '/',          icon: '⊞',  label: 'Dashboard' },
    ],
  },
  {
    label: 'AUDIT MANAGEMENT',
    items: [
      { to: '/projects',            icon: '📁', label: 'Projects' },
      { to: '/transactions',        icon: '📊', label: 'Transactions' },
      { to: '/findings',            icon: '⚠️', label: 'Findings' },
      { to: '/tasks',               icon: '✅', label: 'Tasks' },
    ],
  },
  {
    label: 'CONFIGURATION',
    items: [
      { to: '/checklist-templates', icon: '📋', label: 'Checklists' },
      { to: '/org-setup',           icon: '⚙️', label: 'Org Settings', adminOnly: true },
    ],
  },
];

export default function Layout({ children }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (to) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: collapsed ? '64px' : '240px',
        backgroundColor: SIDEBAR_BG,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 100,
      }}>

        {/* Logo */}
        <div style={{ padding: collapsed ? '1rem 0' : '1.25rem 1rem', borderBottom: `1px solid ${SIDEBAR_BORDER}`, display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
            ☀️
          </div>
          {!collapsed && (
            <div>
              <div style={{ color: '#ffffff', fontWeight: '700', fontSize: '0.9rem', lineHeight: 1.2 }}>Sun Realty</div>
              <div style={{ color: '#64748b', fontSize: '0.62rem', lineHeight: 1.2 }}>Building Trust, Delivering Value.</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0', scrollbarWidth: 'none' }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} style={{ marginBottom: '0.25rem' }}>
              {group.label && !collapsed && (
                <div style={{ padding: '0.75rem 1rem 0.25rem', fontSize: '0.6rem', fontWeight: '700', color: '#475569', letterSpacing: '0.08em' }}>
                  {group.label}
                </div>
              )}
              {group.items.map(item => {
                if (item.adminOnly && user?.role !== 'ADMIN') return null;
                const active = isActive(item.to);
                return (
                  <NavLink key={item.to} to={item.to}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: collapsed ? '0.625rem 0' : '0.625rem 1rem',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      textDecoration: 'none',
                      borderRadius: '0',
                      margin: '0.1rem 0.5rem',
                      borderRadius: '0.375rem',
                      backgroundColor: active ? SIDEBAR_ACTIVE : 'transparent',
                      color: active ? SIDEBAR_TEXT_ACTIVE : SIDEBAR_TEXT,
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = SIDEBAR_HOVER; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <span style={{ fontSize: '1rem', flexShrink: 0, width: '20px', textAlign: 'center' }}>{item.icon}</span>
                    {!collapsed && <span style={{ fontSize: '0.8rem', fontWeight: active ? '600' : '400', whiteSpace: 'nowrap' }}>{item.label}</span>}
                    {!collapsed && active && <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#60a5fa', flexShrink: 0 }} />}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Need Help */}
        {!collapsed && (
          <div style={{ padding: '0.875rem 1rem', borderTop: `1px solid ${SIDEBAR_BORDER}`, backgroundColor: '#0a1628' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.4rem' }}>Need Help?</div>
            <div style={{ fontSize: '0.68rem', color: '#475569', lineHeight: 1.6 }}>
              <div>Contact Support</div>
              <div style={{ color: '#60a5fa' }}>support@auditpro.com</div>
              <div style={{ color: '#475569' }}>+91 44 1234 5678</div>
            </div>
          </div>
        )}

        {/* User + Collapse toggle */}
        <div style={{ padding: collapsed ? '0.75rem 0' : '0.75rem 1rem', borderTop: `1px solid ${SIDEBAR_BORDER}`, display: 'flex', alignItems: 'center', gap: '0.625rem', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: SIDEBAR_ACTIVE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: '700', flexShrink: 0 }}>
            {initials}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName || 'User'}</div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{user?.role}</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} title="Logout"
              style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem', padding: '0.2rem', flexShrink: 0 }}>
              ⏻
            </button>
          )}
        </div>

        {/* Collapse button */}
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ position: 'absolute', top: '1.1rem', right: collapsed ? '50%' : '-12px', transform: collapsed ? 'translateX(50%)' : 'none', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#1e293b', border: `1px solid ${SIDEBAR_BORDER}`, color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', zIndex: 101 }}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: collapsed ? '64px' : '240px', transition: 'margin-left 0.2s ease', minWidth: 0 }}>

        {/* Top bar */}
        <header style={{ height: '56px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 1.5rem', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Breadcrumb placeholder */}
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Home</span>
            <span style={{ color: '#cbd5e1' }}>›</span>
            <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: '500' }}>
              {NAV_GROUPS.flatMap(g => g.items).find(i => isActive(i.to))?.label || 'Dashboard'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Notification bell */}
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <span style={{ fontSize: '1.1rem' }}>🔔</span>
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '14px', height: '14px', backgroundColor: '#dc2626', borderRadius: '50%', fontSize: '0.55rem', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>3</span>
            </div>
            {/* User avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: SIDEBAR_ACTIVE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: '700' }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#111827' }}>{user?.fullName || 'User'}</div>
                <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>{user?.role}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
