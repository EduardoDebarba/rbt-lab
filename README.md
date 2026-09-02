# RBT Lab

Sistema web para controle do laboratório técnico da RBT Internet, utilizado no registro, acompanhamento e análise de equipamentos de rede que retornam dos clientes.

Link de acesso: [https://rbt-lab.rbt-lab.workers.dev/](https://rbt-lab.rbt-lab.workers.dev/)

## Sobre o projeto

O RBT Lab substitui o controle por planilhas no processamento de roteadores, ONUs, antenas, switches, telefones, TV Box e demais equipamentos de rede. A aplicação centraliza os registros do laboratório, aplica validações, mantém rastreabilidade das alterações e gera indicadores operacionais e financeiros.

O sistema foi desenvolvido para uso interno, com foco em produtividade, filtros rápidos, importação de CSV e dashboards para análise dos equipamentos processados.

## Principais funcionalidades

- Autenticação com JWT.
- Cadastro, edição, visualização e exclusão lógica de equipamentos.
- Importação de equipamentos via arquivo CSV.
- Exportação de equipamentos em CSV.
- Listagem paginada com filtros por período, SN, protocolo, cidade, equipe, origem, modelo, marca, função, motivo, status, situação final e resolvido.
- Cadastro e manutenção de modelos e motivos.
- Renomeio em massa de modelos e motivos, atualizando ocorrências existentes.
- Exclusão de modelos e motivos do catálogo.
- Dashboard com indicadores e gráficos.
- Análise de SN recorrentes.
- Controle de cabos de rede por metragem.
- Cadastro de equipes, cidades e supervisores.
- Aba de vendas com filtros e indicadores.
- Aba de laboratório com ranking de equipamentos movimentados.
- Aba financeira com valores de reposição por modelo, economia estimada, perdas, RMA e vendas.
- Guia interno do laboratório com seções editáveis.
- Modo claro e escuro.
- Interface responsiva com menu mobile.
- Recuperação de senha por e-mail.
- Controle de permissões por perfil de usuário.

## Stack utilizada

### Backend

- Node.js
- Express
- Prisma ORM
- PostgreSQL
- JWT para autenticação
- bcrypt para hash de senha
- Multer para upload de CSV
- csv-parse para processamento de planilhas
- Resend para envio de e-mails

### Frontend

- React
- Vite
- TailwindCSS
- Axios
- Chart.js
- React Chart.js 2
- Lucide React
- React Router

### Banco e hospedagem

- PostgreSQL em nuvem, configurável por `DATABASE_URL`
- Backend preparado para Render
- Frontend publicado na Cloudflare Workers/Assets
- Prisma Migrate para versionamento do banco

## Perfis de usuário

O sistema possui três perfis:

- `USER`: pode visualizar informações e editar cabos de rede.
- `ADMIN`: pode gerenciar equipamentos, modelos, motivos, usuários comuns e valores dos modelos, mas não acessa os indicadores completos da aba financeira.
- `SUPER_ADMIN`: possui acesso completo, incluindo a aba Financeiro e alteração de perfis para `SUPER_ADMIN`.

Novos usuários são criados inicialmente como `USER`. Apenas administradores podem alterar permissões, respeitando os limites de cada perfil.

## Regras principais de equipamentos

- Todo equipamento precisa ter modelo, quantidade, origem, status, situação final e responsável.
- A quantidade deve ser maior que zero.
- Para `RMA` ou `DESCARTE`, a quantidade deve ser exatamente `1`.
- Para `RMA` ou `DESCARTE`, o motivo é obrigatório.
- Para `REAPROVEITADO` e `VENDA`, é permitido registrar vários SNs no mesmo cadastro.
- Para `RMA` e `DESCARTE`, deve ser informado apenas um SN por registro quando houver SN.
- O campo `resolvido` só deve ser usado quando a origem for `CAIXA_OS`.
- Quando a origem for `CAIXA_OS`, o status inicial esperado é `EM_TESTE`.
- Quando o status for `FINALIZADO`, a situação final é tratada como `DESCARTE`.
- Quando a situação final for `RMA`, o status é `EM_TESTE`.
- Vendas só entram nos dashboards de venda quando `vendaConfirmada = true`.
- Alterações relevantes geram histórico para rastreabilidade.

## Módulos do sistema

### Dashboard

Mostra indicadores gerais do laboratório:

- Equipamentos processados.
- Reaproveitados.
- RMA.
- Taxa de descarte.
- Taxa de resolução.
- Modelos mais recebidos.
- Modelos com mais problemas.
- Motivos de defeito e descarte.
- Cidades com mais problemas.
- Equipes com mais atendimentos.
- Evolução mensal.
- SN recorrentes.
- Cabos de rede.
- Equipes/cidades.
- Guia do laboratório.

### Equipamentos

Área principal de operação. Permite cadastrar, listar, filtrar, editar, visualizar detalhes, importar CSV, exportar CSV, gerenciar modelos, gerenciar motivos e adicionar marca/função.

### Laboratório

Lista os modelos que passaram pelo laboratório, em ordem de maior quantidade para menor, com filtros por período, modelo, marca, função e situação final.

### Vendas

Apresenta indicadores de vendas confirmadas:

- Valor vendido.
- Modelo mais vendido.
- Mês com mais vendas.
- Quantidade vendida por mês.
- Modelos mais vendidos.

### Financeiro

Disponível para `SUPER_ADMIN`, com controle de valores de reposição e indicadores financeiros:

- Economia estimada por reaproveitamento.
- Perda estimada por descarte.
- Valor em RMA.
- Receita com vendas confirmadas.
- Evolução financeira mensal.
- Perda por modelo.
- Perda por motivo.
- Cidades com maior perda.
- Modelos sem valor de reposição cadastrado.

### Usuários

Permite listar usuários, alterar perfil, ativar/inativar e excluir usuários, conforme permissões.

### Guia

Guia operacional interno do laboratório com seções editáveis, formatação básica, links clicáveis e busca por conteúdo.

## Estrutura de pastas

```text
.
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── validators/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   └── pages/
│   ├── public/
│   └── package.json
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── database/
│   └── schema.sql
├── docs/
├── package.json
├── wrangler.toml
└── netlify.toml
```

## Entidades principais

- `Usuario`: usuários do sistema e permissões.
- `Equipamento`: registros de equipamentos processados.
- `Historico`: rastreabilidade de alterações.
- `ModeloEquipamento`: catálogo de modelos.
- `MotivoEquipamento`: catálogo de motivos.
- `OpcaoFiltroEquipamento`: marcas e funções usadas nos filtros.
- `CaboRede`: controle de cabos por metragem.
- `EquipeCidade`: equipes, suportes, cidades e supervisores.
- `ApelidoModeloDashboard`: nomes alternativos somente para gráficos.
- `ApelidoCidadeDashboard`: nomes alternativos somente para gráficos.
- `GuiaSecao`: conteúdo editável do guia interno.

## Requisitos para rodar localmente

- Node.js 18 ou superior.
- npm.
- PostgreSQL local ou banco PostgreSQL em nuvem.
- Prisma CLI via dependência do projeto.

## Configuração do ambiente

Crie o arquivo `.env` na raiz do projeto com base em `.env.example`.

Exemplo:

```env
DATABASE_URL="postgresql://usuario:senha@host:porta/banco?schema=public"
DIRECT_URL="postgresql://usuario:senha@host:porta/banco"
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,https://rbt-lab.rbt-lab.workers.dev
JWT_SECRET="troque-este-segredo"
JWT_EXPIRES_IN="10h"
FRONTEND_URL=http://localhost:5173
RESEND_API_KEY=
EMAIL_FROM="RBT Lab <onboarding@resend.dev>"
ADMIN_EMAIL=eduardo.scheuermann@rbt.psi.br
AI_PROVIDER=rules
```

No frontend, crie `frontend/.env` quando necessário:

```env
VITE_API_URL=http://localhost:3000/api
```

Em produção, `VITE_API_URL` deve apontar para a URL pública do backend.

## Instalação

Na raiz do projeto:

```bash
npm install
```

No frontend:

```bash
cd frontend
npm install
```

## Banco de dados

Gerar Prisma Client:

```bash
npm run prisma:generate
```

Aplicar migrations:

```bash
npm run prisma:migrate
```

Abrir Prisma Studio:

```bash
npm run prisma:studio
```

Se estiver usando PostgreSQL local com Docker:

```bash
docker compose up -d
```

## Execução local

### Backend

Na raiz do projeto:

```bash
npm run dev
```

API local:

```text
http://localhost:3000/api
```

Health check:

```text
http://localhost:3000/api/health
```

### Frontend

Em outro terminal:

```bash
cd frontend
npm run dev
```

Frontend local:

```text
http://localhost:5173
```

## Scripts disponíveis

### Raiz

```bash
npm run dev
npm start
npm run build:frontend:cloudflare
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

## Importação CSV

A importação aceita arquivos `.csv` com separador por vírgula ou ponto e vírgula.

Colunas esperadas:

```text
DATA, MODELO, QTD, ORIGEM, SN, EQUIPE, PROTOCOLO, CIDADE, STATUS, SITUAÇÃO FINAL, MOTIVO, RESOLVIDO, RESPONSAVEL
```

Também há suporte a campos adicionais de venda, como valor vendido, comprador, CPF/CNPJ e venda confirmada, quando disponíveis.

Linhas em branco são ignoradas. Inconsistências de importação são tratadas como avisos quando possível, para permitir que os dados sejam revisados depois.

## Rotas principais da API

Rotas públicas:

```text
GET  /api/health
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

Rotas protegidas:

```text
GET    /api/dashboard
GET    /api/dashboard/vendas
GET    /api/dashboard/financeiro
GET    /api/dashboard/equipamentos-laboratorio
GET    /api/dashboard/relatorio-diario/export.csv
GET    /api/equipamentos
GET    /api/equipamentos/export.csv
POST   /api/equipamentos/import.csv
GET    /api/equipamentos/sn-recorrentes
POST   /api/equipamentos
PATCH  /api/equipamentos/:id
DELETE /api/equipamentos/:id
GET    /api/modelos-equipamento
POST   /api/modelos-equipamento
PATCH  /api/modelos-equipamento/:id/renomear
PATCH  /api/modelos-equipamento/:id/valor
DELETE /api/modelos-equipamento/:id
GET    /api/motivos-equipamento
POST   /api/motivos-equipamento
PATCH  /api/motivos-equipamento/:id/renomear
DELETE /api/motivos-equipamento/:id
GET    /api/cabos-rede
POST   /api/cabos-rede
PATCH  /api/cabos-rede/:id
DELETE /api/cabos-rede/:id
GET    /api/equipes-cidades
POST   /api/equipes-cidades
PATCH  /api/equipes-cidades/:id
DELETE /api/equipes-cidades/:id
GET    /api/usuarios
POST   /api/usuarios
PATCH  /api/usuarios/:id
DELETE /api/usuarios/:id
GET    /api/guia
POST   /api/guia
PATCH  /api/guia/:id
DELETE /api/guia/:id
```

## Deploy

### Frontend na Cloudflare

O projeto possui `wrangler.toml` configurado para publicar os assets gerados em `frontend/dist`.

Build usado:

```bash
npm run build:frontend:cloudflare
```

Deploy:

```bash
npx wrangler deploy
```

URL de produção:

[https://rbt-lab.rbt-lab.workers.dev/](https://rbt-lab.rbt-lab.workers.dev/)

### Backend no Render

Configuração recomendada:

- Build command: `npm install && npx prisma generate && npx prisma migrate deploy`
- Start command: `npm start`
- Environment: Node.js
- Variáveis obrigatórias:
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `JWT_SECRET`
  - `CORS_ORIGIN`
  - `FRONTEND_URL`

### Banco PostgreSQL

O sistema usa PostgreSQL com Prisma. Pode ser executado com banco local, Supabase, Neon ou outro provedor compatível.

Em provedores com pooler, use:

- `DATABASE_URL` para execução da aplicação.
- `DIRECT_URL` para migrations.

## Monitoramento

O endpoint `/api/health` pode ser chamado por serviços externos, como cron-job.org, para verificar disponibilidade e manter o backend aquecido.

Exemplo:

```text
https://seu-backend.com/api/health
```

Há documentação complementar em:

```text
docs/monitoramento-backend.md
```

## E-mail

O envio de e-mails é usado para avisos de novo usuário e recuperação de senha. A integração está preparada para Resend.

Variáveis relacionadas:

```env
RESEND_API_KEY=
EMAIL_FROM=
ADMIN_EMAIL=
FRONTEND_URL=
```

Documentação complementar:

```text
docs/envio-email-resend.md
```

## Segurança

- Senhas são armazenadas com hash usando bcrypt.
- Autenticação via JWT.
- Sessão configurada para expirar após 10 horas.
- Rotas sensíveis protegidas por perfil.
- Dados financeiros disponíveis somente para `SUPER_ADMIN`.
- Não versionar arquivos `.env` com credenciais reais.

## Observações de desenvolvimento

- O backend usa camada de controllers, services, validators, middlewares e utils.
- As regras de negócio ficam centralizadas no backend.
- O frontend consome a API por Axios.
- Os filtros aceitam múltiplas seleções em campos pesquisáveis.
- Alguns nomes podem ser abreviados apenas na visualização de gráficos, preservando o nome completo nos registros.

## Documentação complementar

```text
docs/explicacao-tecnica.md
docs/roteiro-de-apresentacao.md
docs/relatorio-de-desenvolvimento.md
docs/monitoramento-backend.md
docs/envio-email-resend.md
```

## Licença

Projeto desenvolvido para uso interno da RBT Internet.
