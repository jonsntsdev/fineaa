import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// A URL da API pode ser sobrescrita com VITE_API_URL sem alterar o código.
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  // O modo controla se o formulário cadastra ou autentica o usuário.
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('Entre para acessar seu espaço financeiro.');
  const [loading, setLoading] = useState(false);

  // Atualiza somente o campo editado, preservando os demais valores do formulário.
  function updateField(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  // Envia cadastro ou login para a mesma API, mudando apenas a rota e a resposta esperada.
  async function submitForm(event) {
    event.preventDefault();
    setLoading(true);
    setStatus('Processando...');

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus(data.error || 'Não foi possível concluir a operação.');
        return;
      }

      if (mode === 'login') {
        // O sessionStorage mantém o token só enquanto a aba/sessão do navegador estiver ativa.
        window.sessionStorage.setItem('finea_token', data.token);
        setUser(data.user);
        setStatus('Login realizado com sucesso.');
      } else {
        setMode('login');
        setStatus('Cadastro realizado. Agora entre com sua senha.');
      }
    } catch {
      setStatus('Backend indisponível na porta 5000. Execute npm run server e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  // Consulta a rota protegida usando o token retornado no login.
  async function checkProtectedRoute() {
    const token = window.sessionStorage.getItem('finea_token');

    if (!token) {
      setStatus('Faça login novamente para renovar sua sessão.');
      return;
    }

    const response = await fetch(`${apiUrl}/api/protected`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setStatus(response.ok ? data.message : data.error);
  }

  // Limpa a sessão local e volta à tela de autenticação.
  function logout() {
    window.sessionStorage.removeItem('finea_token');
    setUser(null);
    setStatus('Sessão encerrada.');
  }

  if (user) {
    return (
      <main className="app-shell">
        <section className="dashboard-layout">
          <header className="dashboard-header">
            <div>
              <span className="brand-mark">F</span>
              <p className="eyebrow">Visão geral</p>
              <h1>Olá, {user.name}.</h1>
              <p className="muted">Seu espaço financeiro começa aqui.</p>
            </div>
            <button className="secondary-button" type="button" onClick={logout}>Sair</button>
          </header>
          <div className="dashboard-grid">
            <article className="panel panel-accent">
              <p className="eyebrow">Status da conta</p>
              <h2>Backend conectado</h2>
              <p className="status-line"><span className="status-dot" /> Sessão autenticada com JWT</p>
              <button className="primary-button" type="button" onClick={checkProtectedRoute}>
                Verificar sessão
              </button>
              <p className="muted">{status}</p>
            </article>
            <article className="panel">
              <p className="eyebrow">Próximo passo</p>
              <h2>Organize suas finanças</h2>
              <p className="muted">O dashboard está pronto para receber contas, categorias e lançamentos.</p>
            </article>
            <article className="panel">
              <p className="eyebrow">Conta</p>
              <h2>{user.email}</h2>
              <p className="muted">Usuário autenticado com segurança.</p>
            </article>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="auth-layout">
        <div className="auth-intro">
          <span className="brand-mark">F</span>
          <p className="eyebrow">finea / vida financeira</p>
          <h1>Mais clareza para cada escolha.</h1>
          <p className="subtitle">Uma base simples para acompanhar seu dinheiro com calma, contexto e intenção.</p>
        </div>
        <section className="auth-card">
          <div className="mode-switch" role="tablist" aria-label="Autenticação">
            <button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => setMode('login')}>
              Entrar
            </button>
            <button className={mode === 'register' ? 'active' : ''} type="button" onClick={() => setMode('register')}>
              Criar conta
            </button>
          </div>
          <h2>{mode === 'login' ? 'Bem-vindo de volta' : 'Comece sua conta'}</h2>
          <p className="muted">{mode === 'login' ? 'Acesse seu painel financeiro.' : 'Leva menos de um minuto.'}</p>
          <form className="form-stack" onSubmit={submitForm}>
            {mode === 'register' && (
              <label className="field">
                Nome
                <input name="name" value={form.name} onChange={updateField} required />
              </label>
            )}
            <label className="field">
              Email
              <input name="email" type="email" value={form.email} onChange={updateField} required />
            </label>
            <label className="field">
              Senha
              <input name="password" type="password" minLength="6" value={form.password} onChange={updateField} required />
            </label>
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar no finea' : 'Criar minha conta'}
            </button>
            <p className={`feedback ${status.includes('sucesso') || status.includes('Cadastro realizado') ? 'success' : ''}`}>
              {status}
            </p>
          </form>
        </section>
      </section>
    </main>
  );
}

// Monta a aplicação no elemento root definido no index.html.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
