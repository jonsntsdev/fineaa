# FINEA

Aplicação web para autenticação e organização da vida financeira, com frontend React/Vite, API Express e banco MySQL.

## Requisitos

- Node.js 20 ou superior
- MySQL 8 ou superior
- Banco criado conforme `db/schema.sql`

## Configuração

1. Instale as dependências:

    ```bash
    npm install
    ```

2. Copie `.env.example` para `.env`.

3. Ajuste no `.env` o usuário, a senha e os dados do MySQL. Use um valor forte para `JWT_SECRET`.

4. Execute o script `db/schema.sql` no MySQL para criar o banco `financas` e a tabela `users`.

## Executar em desenvolvimento

Abra dois terminais na pasta do projeto:

```bash
npm run server:dev
```

```bash
npm run dev
```

A aplicação fica disponível em `http://localhost:5177/` e a API em `http://localhost:5003/`.

O endpoint `http://localhost:5003/api/health` confirma se a API e o MySQL estão disponíveis.

## Funcionalidades

- Cadastro de usuário com senha criptografada usando bcrypt
- Login com token JWT
- Sessão protegida e restauração após recarregar a página
- Logout limpando o token da sessão do navegador
- Limite de tentativas nas rotas de autenticação
- CORS configurado para o endereço do frontend
- Health check da API com verificação do banco

## Validar o projeto

```bash
npm run build
npm run lint
```

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

    # FINAA - Projeto da Turma
    Organização para apresentação
    - GitHub configurado
    - Kanban criado
    - Slides prontos
