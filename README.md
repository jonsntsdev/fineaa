finea

Aplicação web para organização da vida financeira: cadastro/login com JWT, registro de entradas, saídas, transferências e investimentos. Frontend em React (Vite) e API em Express com MySQL.

Status: projeto em desenvolvimento / uso acadêmico. Ver Limitações conhecidas antes de usar em produção.

Stack
Frontend: React 19, Vite
Backend: Node.js, Express 5
Banco de dados: MySQL 8
Autenticação: JWT (jsonwebtoken) + bcrypt para hash de senha
Requisitos
Node.js 20+
MySQL 8+
Configuração
Clone o repositório e instale as dependências:
bash
   npm install
Copie o arquivo de exemplo de variáveis de ambiente:
bash
   cp .env.example .env
Edite o .env com os dados do seu MySQL local e defina um JWT_SECRET forte e único (não reaproveite o valor de exemplo).
Crie o banco e as tabelas executando o script:
bash
   mysql -u root -p < db/schema.sql

Nunca commite o arquivo .env. Ele já está no .gitignore, mas confirme que não existe uma versão antiga dele no histórico do repositório antes de publicar.

Executando em desenvolvimento

Em dois terminais separados, na raiz do projeto:

bash
# Terminal 1 — API
npm run server:dev
bash
# Terminal 2 — Frontend
npm run dev
Frontend: http://localhost:5176
API: http://localhost:5003
Health check da API (valida também a conexão com o MySQL): GET http://localhost:5003/api/health
Scripts disponíveis
Comando	Descrição
npm run dev	Sobe o frontend com Vite
npm run server	Sobe a API uma vez
npm run server:dev	Sobe a API com reinício automático (--watch)
npm run build	Gera o build de produção do frontend
npm run lint	Roda o oxlint
npm run preview	Serve o build de produção localmente
Estrutura do projeto
├── db/
│   └── schema.sql        # criação do banco e tabelas
├── server/
│   └── index.js          # API Express (auth, transações, investimentos)
├── src/
│   ├── main.jsx           # aplicação React (login, cadastro, dashboard)
│   └── index.css
├── index.html
└── vite.config.js
Funcionalidades
Cadastro de usuário com senha em hash (bcrypt)
Login com emissão de token JWT (expira em 2h)
Restauração de sessão ao recarregar a página
Rate limiting nas rotas de autenticação
CRUD de transações (entrada / saída / transferência)
CRUD de investimentos com rentabilidade informativa
Cálculo de saldo a partir de renda mensal, transações e investimentos
Endpoints da API
Método	Rota	Autenticado	Descrição
GET	/api/health	não	Status da API e do banco
POST	/api/auth/register	não	Cria usuário
POST	/api/auth/login	não	Autentica e retorna token
GET	/api/finance/summary	sim	Renda, transações e investimentos do usuário
PUT	/api/finance/settings	sim	Atualiza renda mensal
POST	/api/finance/transactions	sim	Cria transação
DELETE	/api/finance/transactions/:id	sim	Remove transação
POST	/api/finance/investments	sim	Cria investimento
DELETE	/api/finance/investments/:id	sim	Remove investimento
Limitações conhecidas
/api/finance/summary retorna no máximo 50 transações, e os totais exibidos no dashboard são calculados sobre essa lista — para usuários com mais de 50 lançamentos, os totais ficam incorretos. Correção pendente: agregar os totais via SQL (SUM) em vez de somar no frontend.
As rotas DELETE não verificam se algo foi de fato removido antes de responder com sucesso.
Sem paginação nas listagens de transações e investimentos.
Sem testes automatizados.
Sessão baseada em JWT sem mecanismo de revogação (logout apenas remove o token do lado do cliente).
Licença

Defina uma licença antes de tornar o repositório público de forma definitiva (ex.: MIT). Sem licença explícita, os direitos de uso ficam reservados por padrão.
