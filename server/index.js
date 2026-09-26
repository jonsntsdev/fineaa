import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';

// Cria a aplicação HTTP e centraliza a configuração que vem do ambiente.
const app = express();
const port = Number(process.env.PORT || 5000);
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
const jwtSecret = process.env.JWT_SECRET;

// Sem uma chave JWT, emitir tokens seria inseguro; por isso o servidor para cedo.
if (!jwtSecret) {
  console.error('JWT_SECRET não foi definido no arquivo .env.');
  process.exit(1);
}

// O pool reutiliza conexões e evita abrir uma nova conexão a cada requisição.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Garante as tabelas da aplicação ao iniciar, facilitando a primeira execução do projeto.
async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS financial_settings (
      user_id INT UNSIGNED NOT NULL PRIMARY KEY,
      monthly_income DECIMAL(12, 2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE = InnoDB
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      type ENUM('income', 'expense', 'transfer') NOT NULL,
      description VARCHAR(160) NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'Geral',
      amount DECIMAL(12, 2) NOT NULL,
      transaction_date DATE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_transactions_user_date (user_id, transaction_date),
      CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE = InnoDB
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS investments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      name VARCHAR(120) NOT NULL,
      type VARCHAR(80) NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      profitability DECIMAL(6, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_investments_user (user_id),
      CONSTRAINT fk_investments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE = InnoDB
  `);
}

// Aceita somente a origem do frontend definida no .env e interpreta corpos JSON.
app.use(cors({ origin: frontendUrl }));
app.use(express.json());

// Limita tentativas de login/cadastro para reduzir abuso acidental ou automatizado.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

// Extrai o token no formato padrão "Authorization: Bearer <token>".
function getTokenFromRequest(request) {
  const authorization = request.headers.authorization || '';
  return authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;
}

// Middleware compartilhado que valida o JWT antes de liberar uma rota protegida.
function authenticate(request, response, next) {
  const token = getTokenFromRequest(request);

  if (!token) {
    return response.status(401).json({ error: 'Token de autenticação ausente.' });
  }

  try {
    request.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return response.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

// Health check também testa o banco, permitindo diferenciar API viva de banco disponível.
app.get('/api/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    return response.json({ ok: true, database: 'connected' });
  } catch (error) {
    console.error(`MySQL indisponível no health check: ${error.message}`);
    return response.status(503).json({ ok: false, database: 'unavailable' });
  }
});

// Cria um usuário somente depois de validar email, senha e duplicidade no banco.
app.post('/api/auth/register', authLimiter, async (request, response) => {
  const { name, email, password } = request.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (typeof name !== 'string' || !name.trim() || !normalizedEmail || typeof password !== 'string' || password.length < 6) {
    return response.status(400).json({
      error: 'Informe nome, email e uma senha com pelo menos 6 caracteres.',
    });
  }

  try {
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail],
    );

    if (existingUsers.length > 0) {
      return response.status(409).json({ error: 'Este email já está cadastrado.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), normalizedEmail, passwordHash],
    );

    return response.status(201).json({ id: result.insertId, name: name.trim(), email: normalizedEmail });
  } catch (error) {
    console.error(`Erro ao cadastrar usuário: ${error.message}`);
    return response.status(503).json({ error: 'Não foi possível acessar o banco de dados.' });
  }
});

// Compara a senha recebida com o hash e emite um token que expira em duas horas.
app.post('/api/auth/login', authLimiter, async (request, response) => {
  const { email, password } = request.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || typeof password !== 'string') {
    return response.status(400).json({ error: 'Informe email e senha.' });
  }

  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail],
    );
    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return response.status(401).json({ error: 'Email ou senha inválidos.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, jwtSecret, {
      expiresIn: '2h',
    });

    return response.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error(`Erro ao fazer login: ${error.message}`);
    return response.status(503).json({ error: 'Não foi possível acessar o banco de dados.' });
  }
});

// Rota mínima para provar que o middleware de autenticação está funcionando.
app.get('/api/protected', authenticate, (request, response) => {
  response.json({ message: 'Você acessou uma rota protegida.', user: request.user });
});

// Retorna todos os dados necessários para montar o dashboard em uma única chamada.
app.get('/api/finance/summary', authenticate, async (request, response) => {
  try {
    const userId = request.user.id;
    const [[settings]] = await pool.execute('SELECT monthly_income FROM financial_settings WHERE user_id = ?', [userId]);
    const [transactions] = await pool.execute(
      'SELECT id, type, description, category, amount, transaction_date FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC, id DESC LIMIT 50',
      [userId],
    );
    const [investments] = await pool.execute(
      'SELECT id, name, type, amount, profitability FROM investments WHERE user_id = ? ORDER BY id DESC',
      [userId],
    );
    return response.json({ monthlyIncome: Number(settings?.monthly_income || 0), transactions, investments });
  } catch (error) {
    console.error(`Erro ao carregar dashboard: ${error.message}`);
    return response.status(503).json({ error: 'Não foi possível carregar seus dados financeiros.' });
  }
});

// Salva ou atualiza a renda mensal informada pelo usuário.
app.put('/api/finance/settings', authenticate, async (request, response) => {
  const monthlyIncome = Number(request.body.monthlyIncome);
  if (!Number.isFinite(monthlyIncome) || monthlyIncome < 0) {
    return response.status(400).json({ error: 'Informe uma renda mensal válida.' });
  }
  try {
    await pool.execute(
      'INSERT INTO financial_settings (user_id, monthly_income) VALUES (?, ?) ON DUPLICATE KEY UPDATE monthly_income = VALUES(monthly_income)',
      [request.user.id, monthlyIncome],
    );
    return response.json({ monthlyIncome });
  } catch (error) {
    console.error(`Erro ao salvar renda: ${error.message}`);
    return response.status(503).json({ error: 'Não foi possível salvar sua renda.' });
  }
});

// Registra uma entrada, saída ou transferência financeira.
app.post('/api/finance/transactions', authenticate, async (request, response) => {
  const { type, description, category = 'Geral', amount, transactionDate } = request.body;
  const numericAmount = Number(amount);
  if (!['income', 'expense', 'transfer'].includes(type) || typeof description !== 'string' || !description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate || '')) {
    return response.status(400).json({ error: 'Preencha tipo, descrição, valor e data corretamente.' });
  }
  try {
    const [result] = await pool.execute(
      'INSERT INTO transactions (user_id, type, description, category, amount, transaction_date) VALUES (?, ?, ?, ?, ?, ?)',
      [request.user.id, type, description.trim(), String(category).trim() || 'Geral', numericAmount, transactionDate],
    );
    return response.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error(`Erro ao salvar transação: ${error.message}`);
    return response.status(503).json({ error: 'Não foi possível salvar a transação.' });
  }
});

// Exclui somente uma transação pertencente ao usuário autenticado.
app.delete('/api/finance/transactions/:id', authenticate, async (request, response) => {
  await pool.execute('DELETE FROM transactions WHERE id = ? AND user_id = ?', [request.params.id, request.user.id]);
  return response.status(204).end();
});

// Salva um investimento com valor aplicado e rentabilidade informativa.
app.post('/api/finance/investments', authenticate, async (request, response) => {
  const { name, type, amount, profitability = 0 } = request.body;
  const numericAmount = Number(amount);
  const numericProfitability = Number(profitability);
  if (typeof name !== 'string' || !name.trim() || typeof type !== 'string' || !type.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0 || !Number.isFinite(numericProfitability)) {
    return response.status(400).json({ error: 'Preencha investimento, tipo e valor corretamente.' });
  }
  try {
    const [result] = await pool.execute(
      'INSERT INTO investments (user_id, name, type, amount, profitability) VALUES (?, ?, ?, ?, ?)',
      [request.user.id, name.trim(), type.trim(), numericAmount, numericProfitability],
    );
    return response.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error(`Erro ao salvar investimento: ${error.message}`);
    return response.status(503).json({ error: 'Não foi possível salvar o investimento.' });
  }
});

// Exclui somente um investimento pertencente ao usuário autenticado.
app.delete('/api/finance/investments/:id', authenticate, async (request, response) => {
  await pool.execute('DELETE FROM investments WHERE id = ? AND user_id = ?', [request.params.id, request.user.id]);
  return response.status(204).end();
});

// Converte erros não tratados em uma resposta JSON sem expor detalhes internos.
app.use((error, _request, response, _next) => {
  console.error(`Erro inesperado no servidor: ${error.message}`);
  response.status(500).json({ error: 'Erro interno do servidor.' });
});

// O backend usa 5002, enquanto o Vite continua em 5176 durante o desenvolvimento.
app.listen(port, () => {
  console.log(`Servidor API iniciado em http://localhost:${port}`);
});

// Testa a conexão logo após iniciar e mantém a API disponível para mostrar erros claros.
try {
  await initializeDatabase();
  const connection = await pool.getConnection();
  console.log(`Conexão com MySQL estabelecida em ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  connection.release();
} catch (error) {
  console.error(`Não foi possível conectar ao MySQL. Verifique host, porta, usuário, senha e banco: ${error.message}`);
}
