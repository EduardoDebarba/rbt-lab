import { LoaderCircle, LogIn, Moon, ShieldPlus, Sun } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import ErrorAlert from '../components/ErrorAlert.jsx';
import { TextField } from '../components/FormFields.jsx';
import logoRbtBranco from '../assets/logo-rbt-branco.png';
import logoRbtVermelho from '../assets/logo-rbt-vermelho.png';
import { getBackendMessage } from '../lib/api';
import { useAuth } from '../lib/auth.jsx';
import { useThemeMode } from '../lib/theme.js';

const initialLogin = {
  email: '',
  senha: ''
};

const initialRegister = {
  email: ''
};

function LoginPage() {
  const { token, login, register } = useAuth();
  const { isDark, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [errors, setErrors] = useState({});
  const [backendError, setBackendError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/equipamentos" replace />;

  const isLogin = mode === 'login';
  const currentForm = isLogin ? loginForm : registerForm;
  const logoRbt = isDark ? logoRbtBranco : logoRbtVermelho;

  function updateField(field, value) {
    setBackendError('');
    setErrors((current) => ({ ...current, [field]: '' }));

    if (isLogin) {
      setLoginForm((current) => ({ ...current, [field]: value }));
    } else {
      setRegisterForm((current) => ({ ...current, [field]: value }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validate(currentForm, isLogin);

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setLoading(true);
    setBackendError('');

    try {
      if (isLogin) {
        await login(currentForm);
      } else {
        await register(currentForm);
      }

      navigate('/equipamentos', { replace: true });
    } catch (error) {
      setBackendError(getBackendMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-panel px-4 py-8">
      <button
        className="btn btn-secondary fixed right-4 top-4 h-10 w-10 px-0"
        type="button"
        onClick={toggleTheme}
        title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
        aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      >
        {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
      </button>
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden">
            <img className="h-10 w-14 object-contain" src={logoRbt} alt="RBT Internet" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">RBT Lab</h1>
            <p className="mt-1 text-sm text-slate-500">Acesso ao laboratório técnico</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-md bg-panel p-1">
          <button
            className={`h-9 rounded-md text-sm font-bold ${isLogin ? 'bg-white shadow-sm' : 'text-slate-600'}`}
            type="button"
            onClick={() => {
              setMode('login');
              setErrors({});
              setBackendError('');
            }}
          >
            Login
          </button>
          <button
            className={`h-9 rounded-md text-sm font-bold ${!isLogin ? 'bg-white shadow-sm' : 'text-slate-600'}`}
            type="button"
            onClick={() => {
              setMode('register');
              setErrors({});
              setBackendError('');
            }}
          >
            Criar acesso
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <TextField
            label="E-mail"
            value={currentForm.email}
            error={errors.email}
            onChange={(event) => updateField('email', event.target.value)}
            autoComplete="email"
            placeholder={isLogin ? '' : 'nome@rbt.psi.br'}
          />

          {isLogin ? (
            <TextField
              label="Senha"
              type="password"
              value={currentForm.senha}
              error={errors.senha}
              onChange={(event) => updateField('senha', event.target.value)}
              autoComplete="current-password"
            />
          ) : (
            <p className="rounded-md border border-line bg-panel px-3 py-2 text-xs font-semibold text-slate-600">
              A senha inicial será gerada automaticamente no formato usuario@rbt.
            </p>
          )}

          <ErrorAlert message={backendError} />

          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? (
              <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
            ) : isLogin ? (
              <LogIn size={16} aria-hidden="true" />
            ) : (
              <ShieldPlus size={16} aria-hidden="true" />
            )}
            {isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>
      </section>
    </main>
  );
}

function validate(form, isLogin) {
  const errors = {};

  if (!form.email.trim()) errors.email = 'Informe o e-mail.';
  if (!isLogin && form.email.trim() && !form.email.trim().toLowerCase().endsWith('@rbt.psi.br')) {
    errors.email = 'Use um e-mail com final @rbt.psi.br.';
  }
  if (isLogin && !form.senha) errors.senha = 'Informe a senha.';
  if (isLogin && form.senha && form.senha.length < 6) errors.senha = 'Use pelo menos 6 caracteres.';

  return errors;
}

export default LoginPage;
