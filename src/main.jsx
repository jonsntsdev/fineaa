import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// A URL da API pode ser sobrescrita com VITE_API_URL sem alterar o código.
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Formata todos os valores monetários no padrão brasileiro.
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Usa a data local para evitar que o navegador mostre o dia anterior em alguns fusos.
function today() {
  return new Date().toLocaleDateString('en-CA');
}

function App() {
  // O modo controla se o formulário cadastra ou autentica o usuário.
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('Entre para acessar seu espaço financeiro.');
  const [loading, setLoading] = useState(false);
  const [finance, setFinance] = useState({ monthlyIncome: 0, transactions: [], investments: [] });
  const [financeForm, setFinanceForm] = useState({ type: 'income', description: '', category: 'Geral', amount: '', transactionDate: today() });
  const [investmentForm, setInvestmentForm] = useState({ name: '', type: 'Renda fixa', amount: '', profitability: '' });
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [financeStatus, setFinanceStatus] = useState('');

  // Restaura a sessão salva quando o usuário recarrega a página.
  useEffect(() => {
    const token = window.sessionStorage.getItem('finea_token');

    if (!token) {
      return;
    }

    // A API valida o token e devolve os dados atuais do usuário autenticado.
    fetch(`${apiUrl}/api/protected`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Sessão expirada.');
        }

        setUser(data.user);
        setStatus('Sessão restaurada com sucesso.');
        await loadFinanceData(token);
      })
      .catch(() => {
        // Remove tokens inválidos para evitar que a aplicação fique presa em uma sessão vencida.
        window.sessionStorage.removeItem('finea_token');
      });
  }, []);

  // Centraliza o carregamento dos dados financeiros autenticados.
  async function loadFinanceData(token = window.sessionStorage.getItem('finea_token')) {
    if (!token) return;
    const response = await fetch(`${apiUrl}/api/finance/summary`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível carregar o dashboard.');
    setFinance(data);
    setMonthlyIncome(String(data.monthlyIncome || ''));
  }

  // Atualiza qualquer campo de formulário financeiro sem perder os demais valores.
  function updateFinanceField(event) {
    const { name, value } = event.target;
    setFinanceForm((current) => ({ ...current, [name]: value }));
  }

  // Atualiza o formulário de investimentos.
  function updateInvestmentField(event) {
    const { name, value } = event.target;
    setInvestmentForm((current) => ({ ...current, [name]: value }));
  }

  // Persiste a renda mensal do usuário.
  async function saveIncome(event) {
    event.preventDefault();
    await financeRequest('/api/finance/settings', { method: 'PUT', body: { monthlyIncome: Number(monthlyIncome || 0) } }, 'Renda mensal salva.');
  }

  // Persiste uma entrada, saída ou transferência e recarrega os totais.
  async function saveTransaction(event) {
    event.preventDefault();
    const saved = await financeRequest('/api/finance/transactions', { method: 'POST', body: { ...financeForm, amount: Number(financeForm.amount) } }, 'Lançamento salvo.');
    if (saved) setFinanceForm({ type: 'income', description: '', category: 'Geral', amount: '', transactionDate: today() });
  }

  // Persiste um investimento e recarrega a carteira.
  async function saveInvestment(event) {
    event.preventDefault();
    const saved = await financeRequest('/api/finance/investments', { method: 'POST', body: { ...investmentForm, amount: Number(investmentForm.amount), profitability: Number(investmentForm.profitability || 0) } }, 'Investimento adicionado.');
    if (saved) setInvestmentForm({ name: '', type: 'Renda fixa', amount: '', profitability: '' });
  }

  // Executa requisições financeiras com o JWT e apresenta erros no próprio painel.
  async function financeRequest(endpoint, options, successMessage) {
    try {
      const token = window.sessionStorage.getItem('finea_token');
      const response = await fetch(`${apiUrl}${endpoint}`, { method: options.method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(options.body) });
      const data = response.status === 204 ? null : await response.json();
      if (!response.ok) throw new Error(data?.error || 'Não foi possível concluir a operação.');
      await loadFinanceData(token);
      setFinanceStatus(successMessage);
      return true;
    } catch (error) {
      setFinanceStatus(error.message);
      return false;
    }
  }

  // Remove um lançamento ou investimento, mantendo a autorização no servidor.
  async function removeFinanceItem(endpoint) {
    await financeRequest(endpoint, { method: 'DELETE', body: undefined }, 'Item removido.');
  }

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
      setStatus('Backend indisponível. Execute npm run server:dev e tente novamente.');
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
    // Calcula os indicadores a partir dos lançamentos persistidos no banco.
    const incomeTotal = finance.transactions.filter((item) => item.type === 'income').reduce((total, item) => total + Number(item.amount), 0);
    const expenseTotal = finance.transactions.filter((item) => item.type === 'expense').reduce((total, item) => total + Number(item.amount), 0);
    const transferTotal = finance.transactions.filter((item) => item.type === 'transfer').reduce((total, item) => total + Number(item.amount), 0);
    const investmentTotal = finance.investments.reduce((total, item) => total + Number(item.amount), 0);
    const balance = finance.monthlyIncome + incomeTotal - expenseTotal - transferTotal;

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
          <div className="metric-grid">
            <article className="metric-card metric-highlight"><span>Saldo calculado</span><strong>{currency.format(balance)}</strong><small>Renda + entradas - saídas - transferências</small></article>
            <article className="metric-card"><span>Renda mensal</span><strong>{currency.format(finance.monthlyIncome)}</strong><small>Valor definido por você</small></article>
            <article className="metric-card"><span>Investimentos</span><strong>{currency.format(investmentTotal)}</strong><small>{finance.investments.length} posição(ões)</small></article>
          </div>

          <div className="dashboard-grid">
            <article className="panel">
              <p className="eyebrow">Minha renda</p>
              <h2>Quanto você ganha por mês?</h2>
              <form className="inline-form" onSubmit={saveIncome}>
                <label className="field">Renda mensal (R$)<input aria-label="Renda mensal" type="number" min="0" step="0.01" value={monthlyIncome} onChange={(event) => setMonthlyIncome(event.target.value)} required /></label>
                <button className="primary-button" type="submit">Salvar renda</button>
              </form>
            </article>
            <article className="panel panel-accent">
              <p className="eyebrow">Resumo</p>
              <h2>Movimente seu dinheiro</h2>
              <p className="status-line"><span className="status-dot" /> API e banco conectados</p>
              <p className="muted">Entradas {currency.format(incomeTotal)} · Saídas {currency.format(expenseTotal)} · Transferências {currency.format(transferTotal)}</p>
              <button className="secondary-button" type="button" onClick={checkProtectedRoute}>Verificar sessão</button>
            </article>
          </div>

          <div className="dashboard-grid">
            <article className="panel">
              <p className="eyebrow">Novo lançamento</p>
              <h2>Entrada, saída ou transferência</h2>
              <form className="form-stack" onSubmit={saveTransaction}>
                <div className="form-row"><label className="field">Tipo<select name="type" value={financeForm.type} onChange={updateFinanceField}><option value="income">Entrada</option><option value="expense">Saída</option><option value="transfer">Transferência</option></select></label><label className="field">Valor (R$)<input name="amount" type="number" min="0.01" step="0.01" value={financeForm.amount} onChange={updateFinanceField} required /></label></div>
                <div className="form-row"><label className="field">Descrição<input name="description" value={financeForm.description} onChange={updateFinanceField} placeholder="Ex.: salário, aluguel..." required /></label><label className="field">Categoria<input name="category" value={financeForm.category} onChange={updateFinanceField} /></label></div>
                <label className="field">Data<input name="transactionDate" type="date" value={financeForm.transactionDate} onChange={updateFinanceField} required /></label>
                <button className="primary-button" type="submit">Adicionar lançamento</button>
              </form>
            </article>
            <article className="panel">
              <p className="eyebrow">Investimentos</p>
              <h2>Monte sua carteira</h2>
              <form className="form-stack" onSubmit={saveInvestment}>
                <label className="field">Nome do investimento<input name="name" value={investmentForm.name} onChange={updateInvestmentField} placeholder="Ex.: Tesouro Selic" required /></label>
                <div className="form-row"><label className="field">Tipo<select name="type" value={investmentForm.type} onChange={updateInvestmentField}><option>Renda fixa</option><option>Ações</option><option>Fundos</option><option>Criptoativos</option></select></label><label className="field">Valor aplicado (R$)<input name="amount" type="number" min="0.01" step="0.01" value={investmentForm.amount} onChange={updateInvestmentField} required /></label></div>
                <label className="field">Rentabilidade (% ao ano)<input name="profitability" type="number" step="0.01" value={investmentForm.profitability} onChange={updateInvestmentField} placeholder="Opcional" /></label>
                <button className="primary-button" type="submit">Adicionar investimento</button>
              </form>
            </article>
          </div>

          <div className="dashboard-grid">
            <article className="panel list-panel"><p className="eyebrow">Últimos lançamentos</p><h2>Histórico financeiro</h2>{finance.transactions.length === 0 ? <p className="muted">Nenhum lançamento ainda.</p> : <div className="item-list">{finance.transactions.map((item) => <div className="list-item" key={item.id}><div><strong>{item.description}</strong><small>{item.category} · {new Date(`${item.transaction_date}T12:00:00`).toLocaleDateString('pt-BR')}</small></div><div className="item-actions"><strong className={item.type === 'expense' || item.type === 'transfer' ? 'negative' : 'positive'}>{item.type === 'expense' || item.type === 'transfer' ? '-' : '+'} {currency.format(item.amount)}</strong><button className="icon-button" type="button" aria-label={`Excluir ${item.description}`} onClick={() => removeFinanceItem(`/api/finance/transactions/${item.id}`)}>×</button></div></div>)}</div>}</article>
            <article className="panel list-panel"><p className="eyebrow">Carteira</p><h2>Seus investimentos</h2>{finance.investments.length === 0 ? <p className="muted">Nenhum investimento cadastrado.</p> : <div className="item-list">{finance.investments.map((item) => <div className="list-item" key={item.id}><div><strong>{item.name}</strong><small>{item.type} · Rentabilidade {Number(item.profitability).toFixed(2)}% a.a.</small></div><div className="item-actions"><strong className="positive">{currency.format(item.amount)}</strong><button className="icon-button" type="button" aria-label={`Excluir ${item.name}`} onClick={() => removeFinanceItem(`/api/finance/investments/${item.id}`)}>×</button></div></div>)}</div>}</article>
          </div>
          <p className="feedback success">{financeStatus || status}</p>
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
