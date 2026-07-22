import { BarChart3, Boxes, ClipboardList, DollarSign, LogOut, Menu, Moon, Settings, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import logoRbt from '../assets/logo-rbt-branco.png';
import { useAuth } from '../lib/auth.jsx';
import { useThemeMode } from '../lib/theme.js';

function AppLayout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleLogout() {
    setMobileMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-700 bg-slate-800 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-16 items-center justify-center overflow-hidden">
              <img className="h-12 w-16 object-contain" src={logoRbt} alt="RBT Internet" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight text-white">RBT Lab</h1>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            <HeaderNavLink to="/dashboard" icon={<BarChart3 size={16} aria-hidden="true" />}>
              Dashboard
            </HeaderNavLink>
            <HeaderNavLink to="/equipamentos" icon={<Boxes size={16} aria-hidden="true" />}>
              Equipamentos
            </HeaderNavLink>
            <HeaderNavLink to="/equipamentos-laboratorio" icon={<ClipboardList size={16} aria-hidden="true" />}>
              Laboratório
            </HeaderNavLink>
            <HeaderNavLink to="/vendas" icon={<DollarSign size={16} aria-hidden="true" />}>
              Vendas
            </HeaderNavLink>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">{user?.nome}</p>
              <p className="text-xs text-slate-300">{user?.perfil}</p>
            </div>
            <button
              className="btn btn-header h-10 w-10 px-0"
              type="button"
              onClick={toggleTheme}
              title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
              aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
            </button>
            {user?.perfil === 'ADMIN' && (
              <NavLink
                className={({ isActive }) =>
                  `btn hidden h-10 w-10 px-0 sm:inline-flex ${isActive ? 'btn-header-active' : 'btn-header'}`
                }
                to="/usuarios"
                title="Gerenciar usuários"
                aria-label="Gerenciar usuários"
              >
                <Settings size={16} aria-hidden="true" />
              </NavLink>
            )}
            <button className="btn btn-header hidden sm:inline-flex" type="button" onClick={handleLogout}>
              <LogOut size={16} aria-hidden="true" />
              Sair
            </button>
            <button
              className="btn btn-header h-10 w-10 px-0 md:hidden"
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              title={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {mobileMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-700 bg-slate-800 px-4 pb-4 md:hidden">
            <nav className="mx-auto grid max-w-7xl gap-2">
              <MobileNavLink to="/dashboard" icon={<BarChart3 size={16} aria-hidden="true" />} onClick={closeMobileMenu}>
                Dashboard
              </MobileNavLink>
              <MobileNavLink to="/equipamentos" icon={<Boxes size={16} aria-hidden="true" />} onClick={closeMobileMenu}>
                Equipamentos
              </MobileNavLink>
              <MobileNavLink to="/equipamentos-laboratorio" icon={<ClipboardList size={16} aria-hidden="true" />} onClick={closeMobileMenu}>
                Laboratório
              </MobileNavLink>
              <MobileNavLink to="/vendas" icon={<DollarSign size={16} aria-hidden="true" />} onClick={closeMobileMenu}>
                Vendas
              </MobileNavLink>
              {user?.perfil === 'ADMIN' && (
                <MobileNavLink to="/usuarios" icon={<Settings size={16} aria-hidden="true" />} onClick={closeMobileMenu}>
                  Usuários
                </MobileNavLink>
              )}
              <button className="btn btn-header w-full justify-start" type="button" onClick={handleLogout}>
                <LogOut size={16} aria-hidden="true" />
                Sair
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-5 pt-24">
        <Outlet />
      </main>
    </div>
  );
}

function HeaderNavLink({ to, icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `btn ${isActive ? 'btn-header-active' : 'btn-header'}`
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}

function MobileNavLink({ to, icon, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `btn w-full justify-start ${isActive ? 'btn-header-active' : 'btn-header'}`
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}

export default AppLayout;
