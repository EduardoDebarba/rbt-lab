import { LoaderCircle, LogIn, ShieldPlus } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import ErrorAlert from '../components/ErrorAlert.jsx';
import { SelectField, TextField } from '../components/FormFields.jsx';
import { getBackendMessage } from '../lib/api';
import { useAuth } from '../lib/auth.jsx';
import { PERFIS } from '../lib/constants';

const initialLogin = {
  email: '',
  senha: ''
};

const initialRegister = {
  nome: '',
  email: '',
  senha: '',
  perfil: 'TECNICO'
};

function LoginPage() {
  const { token, login, register } = useAuth();
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
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-ink">RBT Lab</h1>
          <p className="mt-1 text-sm text-slate-500">Acesso ao laboratório técnico</p>
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
          {!isLogin && (
            <TextField
              label="Nome"
              value={registerForm.nome}
              error={errors.nome}
              onChange={(event) => updateField('nome', event.target.value)}
              autoComplete="name"
            />
          )}

          <TextField
            label="E-mail"
            value={currentForm.email}
            error={errors.email}
            onChange={(event) => updateField('email', event.target.value)}
            autoComplete="email"
          />

          <TextField
            label="Senha"
            type="password"
            value={currentForm.senha}
            error={errors.senha}
            onChange={(event) => updateField('senha', event.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />

          {!isLogin && (
            <SelectField
              label="Perfil"
              value={registerForm.perfil}
              error={errors.perfil}
              options={PERFIS}
              onChange={(event) => updateField('perfil', event.target.value)}
            />
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

  if (!isLogin && !form.nome.trim()) errors.nome = 'Informe o nome.';
  if (!form.email.trim()) errors.email = 'Informe o e-mail.';
  if (!form.senha) errors.senha = 'Informe a senha.';
  if (form.senha && form.senha.length < 6) errors.senha = 'Use pelo menos 6 caracteres.';
  if (!isLogin && !form.perfil) errors.perfil = 'Selecione o perfil.';

  return errors;
}

export default LoginPage;
