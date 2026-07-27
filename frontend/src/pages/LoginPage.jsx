import { Eye, EyeOff, LoaderCircle, LogIn, Moon, ShieldPlus, Sun } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import ErrorAlert from '../components/ErrorAlert.jsx';
import { TextField } from '../components/FormFields.jsx';
import logoRbtBranco from '../assets/logo-rbt-branco.png';
import logoRbtVermelho from '../assets/logo-rbt-vermelho.png';
import api, { getBackendMessage } from '../lib/api';
import { useAuth } from '../lib/auth.jsx';
import { useThemeMode } from '../lib/theme.js';

const initialLogin = {
  email: '',
  senha: ''
};

const initialRegister = {
  email: '',
  senha: '',
  confirmarSenha: ''
};

const initialForgot = {
  email: ''
};

const initialReset = {
  email: '',
  codigo: '',
  senha: '',
  confirmarSenha: ''
};

function LoginPage() {
  const { token, login, register } = useAuth();
  const { isDark, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [forgotForm, setForgotForm] = useState(initialForgot);
  const [resetForm, setResetForm] = useState(initialReset);
  const [errors, setErrors] = useState({});
  const [backendError, setBackendError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({
    login: false,
    senha: false,
    confirmarSenha: false
  });

  if (token) return <Navigate to="/equipamentos" replace />;

  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';
  const currentForm = isLogin ? loginForm : isRegister ? registerForm : isForgot ? forgotForm : resetForm;
  const logoRbt = isDark ? logoRbtBranco : logoRbtVermelho;

  function updateField(field, value) {
    setBackendError('');
    setNotice('');
    setErrors((current) => ({ ...current, [field]: '' }));

    if (isLogin) {
      setLoginForm((current) => ({ ...current, [field]: value }));
      return;
    }

    if (isRegister) {
      setRegisterForm((current) => ({ ...current, [field]: value }));
      return;
    }

    if (isForgot) {
      setForgotForm((current) => ({ ...current, [field]: value }));
      return;
    }

    setResetForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validate(currentForm, mode);

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setLoading(true);
    setBackendError('');
    setNotice('');

    try {
      if (isLogin) {
        await login(currentForm);
        navigate('/equipamentos', { replace: true });
        return;
      }

      if (isRegister) {
        const data = await register({
          email: currentForm.email,
          senha: currentForm.senha
        });

        if (data.emailAviso) {
          setNotice(data.emailAviso);
        }

        navigate('/equipamentos', { replace: true });
        return;
      }

      if (isForgot) {
        const { data } = await api.post('/auth/forgot-password', currentForm);
        setResetForm((current) => ({ ...current, email: currentForm.email }));
        setMode('reset');
        setNotice(data.mensagem || 'Codigo enviado para o e-mail informado.');
        return;
      }

      const { data } = await api.post('/auth/reset-password', {
        email: currentForm.email,
        codigo: currentForm.codigo,
        senha: currentForm.senha
      });

      setMode('login');
      setLoginForm({ email: currentForm.email, senha: '' });
      setNotice(data.mensagem || 'Senha redefinida com sucesso.');
    } catch (error) {
      setBackendError(getBackendMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setErrors({});
    setBackendError('');
    setNotice('');
    setVisiblePasswords({
      login: false,
      senha: false,
      confirmarSenha: false
    });
  }

  function togglePasswordVisibility(field) {
    setVisiblePasswords((current) => ({
      ...current,
      [field]: !current[field]
    }));
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
            <p className="mt-1 text-sm text-slate-500">Acesso ao laboratorio tecnico</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-md bg-panel p-1">
          <button
            className={`h-9 rounded-md text-sm font-bold ${isLogin ? 'bg-white shadow-sm' : 'text-slate-600'}`}
            type="button"
            onClick={() => changeMode('login')}
          >
            Login
          </button>
          <button
            className={`h-9 rounded-md text-sm font-bold ${isRegister ? 'bg-white shadow-sm' : 'text-slate-600'}`}
            type="button"
            onClick={() => changeMode('register')}
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

          {isLogin && (
            <PasswordField
              label="Senha"
              value={currentForm.senha}
              error={errors.senha}
              visible={visiblePasswords.login}
              onToggle={() => togglePasswordVisibility('login')}
              onChange={(event) => updateField('senha', event.target.value)}
              autoComplete="current-password"
            />
          )}

          {(isRegister || isReset) && (
            <PasswordField
              label="Senha"
              value={currentForm.senha}
              error={errors.senha}
              visible={visiblePasswords.senha}
              onToggle={() => togglePasswordVisibility('senha')}
              onChange={(event) => updateField('senha', event.target.value)}
              autoComplete="new-password"
            />
          )}

          {(isRegister || isReset) && (
            <PasswordField
              label="Confirmar senha"
              value={currentForm.confirmarSenha}
              error={errors.confirmarSenha}
              visible={visiblePasswords.confirmarSenha}
              onToggle={() => togglePasswordVisibility('confirmarSenha')}
              onChange={(event) => updateField('confirmarSenha', event.target.value)}
              autoComplete="new-password"
            />
          )}

          {isReset && (
            <TextField
              label="Codigo recebido por e-mail"
              value={currentForm.codigo}
              error={errors.codigo}
              onChange={(event) => updateField('codigo', event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength="6"
            />
          )}

          <ErrorAlert message={backendError} />

          {notice && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              {notice}
            </div>
          )}

          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? (
              <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
            ) : isRegister ? (
              <ShieldPlus size={16} aria-hidden="true" />
            ) : (
              <LogIn size={16} aria-hidden="true" />
            )}
            {isLogin ? 'Entrar' : isRegister ? 'Cadastrar' : isForgot ? 'Enviar codigo' : 'Redefinir senha'}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm font-bold">
          {isLogin && (
            <button
              className="text-slate-600 underline hover:text-ink"
              type="button"
              onClick={() => {
                setForgotForm({ email: loginForm.email });
                changeMode('forgot');
              }}
            >
              Esqueci a senha
            </button>
          )}
          {(isForgot || isReset) && (
            <button
              className="text-slate-600 underline hover:text-ink"
              type="button"
              onClick={() => changeMode('login')}
            >
              Voltar ao login
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function PasswordField({ label, error, visible, onToggle, ...props }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <input
          className={`field pr-11 ${error ? 'border-red-400' : ''}`}
          type={visible ? 'text' : 'password'}
          {...props}
        />
        <button
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-panel hover:text-ink"
          type="button"
          onClick={onToggle}
          title={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      {error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
    </label>
  );
}

function validate(form, mode) {
  const errors = {};
  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isReset = mode === 'reset';

  if (!form.email.trim()) errors.email = 'Informe o e-mail.';
  if (!isLogin && form.email.trim() && !form.email.trim().toLowerCase().endsWith('@rbt.psi.br')) {
    errors.email = 'Use um e-mail com final @rbt.psi.br.';
  }
  if ((isLogin || isRegister || isReset) && !form.senha) errors.senha = 'Informe a senha.';
  if ((isLogin || isRegister || isReset) && form.senha && form.senha.length < 6) errors.senha = 'Use pelo menos 6 caracteres.';
  if ((isRegister || isReset) && form.senha !== form.confirmarSenha) errors.confirmarSenha = 'As senhas nao conferem.';
  if (isReset && !/^\d{6}$/.test(form.codigo)) errors.codigo = 'Informe o codigo de 6 digitos.';

  return errors;
}

export default LoginPage;
