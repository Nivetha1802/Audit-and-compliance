import React, { useState } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiGrid, FiDatabase, FiFileText, FiUsers, FiLayers, FiAlertCircle,
  FiSettings, FiChevronLeft, FiChevronRight, FiLogOut, FiMenu, FiBell, FiSearch,
  FiBox, FiActivity, FiBriefcase, FiClipboard, FiShield, FiUploadCloud
} from 'react-icons/fi';

const SIDEBAR_BG = '#0f172a';
const SIDEBAR_HOVER = '#1e293b';
const SIDEBAR_ACTIVE = '#1d4ed8';

const MENU_GROUPS = [
  {
    label: null,
    items: [
      { to: '/', icon: <FiGrid />, label: 'Dashboard' },
    ],
  },
  {
    label: 'AUDIT MANAGEMENT',
    items: [
      { to: '/projects', icon: <FiLayers />, label: 'Projects' },
      { to: '/transactions', icon: <FiDatabase />, label: 'Transactions' },
      { to: '/evidence', icon: <FiUploadCloud />, label: 'Evidence Mgmt' },
      { to: '/findings', icon: <FiAlertCircle />, label: 'Findings' },
      { to: '/tasks', icon: <FiFileText />, label: 'Tasks' },
    ],
  },
  {
    label: 'CONFIGURATION',
    items: [
      { to: '/checklist-templates', icon: <FiClipboard />, label: 'Checklists' },
      { to: '/ai-validation', icon: <FiShield />, label: 'AI Analysis' },
      { to: '/org-setup', icon: <FiSettings />, label: 'Org Settings', adminOnly: true },
      { to: '/vendors', icon: <FiBox />, label: 'Vendors' },
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
        <div style={{ padding: '24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '32px', height: '32px', backgroundColor: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiShield style={{ color: 'white' }} />
          </div>
          {!collapsed && <span style={{ marginLeft: '12px', fontWeight: 'bold', color: 'white', fontSize: '1.1rem' }}>AuditPro</span>}
        </div>

        {/* Menu Groups */}
        <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          {MENU_GROUPS.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: '24px' }}>
              {!collapsed && group.label && (
                <div style={{ padding: '0 24px 8px', fontSize: '10px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.05em' }}>
                  {group.label}
                </div>
              )}
              {group.items.map((item, iIdx) => {
                if (item.adminOnly && user?.role !== 'ADMIN') return null;
                const active = isActive(item.to);
                return (
                  <NavLink
                    key={iIdx}
                    to={item.to}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 24px',
                      color: active ? 'white' : '#94a3b8',
                      backgroundColor: active ? SIDEBAR_ACTIVE : 'transparent',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: active ? '600' : '500',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { if(!active) e.currentTarget.style.backgroundColor = SIDEBAR_HOVER; e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={(e) => { if(!active) e.currentTarget.style.backgroundColor = 'transparent'; if(!active) e.currentTarget.style.color = '#94a3b8'; }}
                  >
                    <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                    {!collapsed && <span style={{ marginLeft: '16px' }}>{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Info */}
        <div style={{ padding: '16px', borderTop: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: 'white' }}>
              {initials}
            </div>
            {!collapsed && (
              <div style={{ marginLeft: '12px', overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.fullName}</div>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>{user?.role?.toLowerCase().replace('_', ' ')}</div>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '8px', border: 'none', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', borderRadius: '4px' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ef444422'; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <FiLogOut />
            {!collapsed && <span style={{ marginLeft: '12px' }}>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ 
        flex: 1, 
        marginLeft: collapsed ? '64px' : '240px', 
        transition: 'margin-left 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }}>
        
        {/* Header */}
        <header style={{ height: '64px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 90 }}>
          <button onClick={() => setCollapsed(!collapsed)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', fontSize: '20px' }}>
            <FiMenu />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input type="text" placeholder="Search..." style={{ padding: '8px 12px 8px 36px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', width: '200px' }} />
            </div>
            <button style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#64748b', fontSize: '20px', position: 'relative' }}>
              <FiBell />
              <span style={{ position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid white' }}></span>
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
