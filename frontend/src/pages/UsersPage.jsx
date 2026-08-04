import { ChevronDown, LoaderCircle, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import ErrorAlert from '../components/ErrorAlert.jsx';
import api, { getBackendMessage } from '../lib/api';
import { useAuth } from '../lib/auth.jsx';
import { labelFrom, PERFIS } from '../lib/constants';

function UsersPage() {
  const { user, updateUser } = useAuth();
  const perfilOptions = user?.perfil === 'SUPER_ADMIN' ? PERFIS : PERFIS.filter((perfil) => perfil.value !== 'SUPER_ADMIN');
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState(null);

  useEffect(() => {
    loadUsuarios();
  }, []);

  async function loadUsuarios() {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const { data } = await api.get('/usuarios');
      setUsuarios(data);
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function updatePerfil(usuario, perfil) {
    setSavingId(usuario.id);
    setError('');
    setNotice('');

    try {
      const { data } = await api.patch(`/usuarios/${usuario.id}`, { perfil });
      setUsuarios((current) => current.map((item) => (item.id === data.id ? data : item)));
      if (data.id === user?.id) updateUser(data);
      setNotice(`Perfil de ${data.nome} atualizado para ${labelFrom(PERFIS, data.perfil)}.`);
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    } finally {
      setSavingId('');
    }
  }

  async function activateUsuario(usuario) {
    setSavingId(usuario.id);
    setError('');
    setNotice('');

    try {
      const { data } = await api.patch(`/usuarios/${usuario.id}`, { ativo: true });
      setUsuarios((current) => current.map((item) => (item.id === data.id ? data : item)));
      setNotice(`Usuario ${data.nome} reativado com sucesso.`);
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    } finally {
      setSavingId('');
    }
  }

  async function deleteUsuario(usuario) {
    setUsuarioParaExcluir(usuario);
  }

  async function confirmDeleteUsuario() {
    const usuario = usuarioParaExcluir;
    if (!usuario) return;

    setSavingId(usuario.id);
    setError('');
    setNotice('');

    try {
      const { data } = await api.delete(`/usuarios/${usuario.id}`);

      if (data.excluido) {
        setUsuarios((current) => current.filter((item) => item.id !== usuario.id));
      } else if (data.usuario) {
        setUsuarios((current) => current.map((item) => (item.id === data.usuario.id ? data.usuario : item)));
      }

      setNotice(data.mensagem || 'Usuario atualizado.');
      setUsuarioParaExcluir(null);
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    } finally {
      setSavingId('');
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-bold">Usuários</h2>
        <button className="btn btn-secondary" type="button" onClick={loadUsuarios} disabled={loading}>
          <RefreshCw size={16} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      <ErrorAlert message={error} />

      {notice && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-panel">
              <tr>
                <th className="px-3 py-3 text-left font-bold">Nome</th>
                <th className="px-3 py-3 text-left font-bold">E-mail</th>
                <th className="px-3 py-3 text-left font-bold">Perfil</th>
                <th className="px-3 py-3 text-right font-bold"></th>
                <th className="px-3 py-3 text-right font-bold">Status</th>
                <th className="px-3 py-3 text-right font-bold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading && (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan="6">
                    Carregando usuários...
                  </td>
                </tr>
              )}

              {!loading && usuarios.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan="6">
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}

              {!loading &&
                usuarios.map((usuario) => {
                  const saving = savingId === usuario.id;
                  const profileLocked = usuario.perfil === 'SUPER_ADMIN' && user?.perfil !== 'SUPER_ADMIN';
                  const rowPerfilOptions = perfilOptions.some((perfil) => perfil.value === usuario.perfil)
                    ? perfilOptions
                    : [...perfilOptions, PERFIS.find((perfil) => perfil.value === usuario.perfil)].filter(Boolean);

                  return (
                    <tr key={usuario.id} className="hover:bg-panel/70">
                      <td className="px-3 py-3 font-semibold">{usuario.nome}</td>
                      <td className="px-3 py-3">{usuario.email}</td>
                      <td className="px-3 py-3">
                        <div className="relative w-40">
                          <select
                            className="field h-10 w-full appearance-none pl-3 pr-8"
                            value={usuario.perfil}
                            onChange={(event) => updatePerfil(usuario, event.target.value)}
                            disabled={saving || profileLocked}
                            aria-label={`Perfil de ${usuario.nome}`}
                          >
                            {rowPerfilOptions.map((perfil) => (
                              <option key={perfil.value} value={perfil.value}>
                                {perfil.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
                            size={16}
                            aria-hidden="true"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-500">
                          {saving && (
                            <>
                              <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
                              Salvando
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${usuario.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {usuario.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {!usuario.ativo && (
                            <button
                              className="btn btn-secondary h-9 w-9 px-0"
                              type="button"
                              onClick={() => activateUsuario(usuario)}
                              disabled={saving}
                              title="Reativar usuario"
                              aria-label={`Reativar usuario ${usuario.nome}`}
                            >
                              {saving ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}
                            </button>
                          )}
                          <button
                            className="btn btn-danger h-9 w-9 px-0"
                            type="button"
                            onClick={() => deleteUsuario(usuario)}
                            disabled={saving || usuario.id === user?.id}
                            title={usuario.id === user?.id ? 'Voce nao pode excluir o seu proprio usuario' : 'Excluir usuario'}
                            aria-label={`Excluir usuario ${usuario.nome}`}
                          >
                            {saving ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {usuarioParaExcluir && (
        <DeleteUserConfirmModal
          usuario={usuarioParaExcluir}
          loading={savingId === usuarioParaExcluir.id}
          onCancel={() => setUsuarioParaExcluir(null)}
          onConfirm={confirmDeleteUsuario}
        />
      )}
    </section>
  );
}

function DeleteUserConfirmModal({ usuario, loading, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-slate-950/60 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <div className="border-b border-line px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-800">
              <Trash2 size={18} aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-ink">Excluir usuário</h3>
              <p className="mt-1 text-sm text-slate-500">
                Confirme se deseja remover este usuário do sistema.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="rounded-lg border border-line bg-panel p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Usuário selecionado</p>
            <p className="mt-2 text-sm font-bold text-ink">{usuario.nome}</p>
            <p className="mt-1 break-words text-sm text-slate-600">{usuario.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-line px-4 py-3">
          <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button className="btn btn-danger" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
            Excluir usuário
          </button>
        </div>
      </div>
    </div>
  );
}

export default UsersPage;
