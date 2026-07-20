# RBT Lab Backend

Backend inicial em Node.js, Express, Prisma e PostgreSQL para controle de laboratorio tecnico.

## Requisitos

- Node.js 18+
- PostgreSQL 13+
- npm

## Instalação

```bash
npm install
```

Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edite `DATABASE_URL` no `.env` conforme seu PostgreSQL.

## Banco de dados

Subir PostgreSQL local com Docker:

```bash
docker compose up -d
```

Gerar o Prisma Client:

```bash
npm run prisma:generate
```

Criar as tabelas via migration:

```bash
npm run prisma:migrate -- --name init
```

Também existe o SQL equivalente em `database/schema.sql`.

## Execução

Ambiente de desenvolvimento:

```bash
npm run dev
```

Produção:

```bash
npm start
```

API:

```text
http://localhost:3000/api
```

Health check:

```text
GET /api/health
```

## Rotas iniciais

```text
GET    /api/health
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
GET    /api/dashboard
GET    /api/dashboard/export.csv
GET    /api/usuarios
GET    /api/usuarios/:id
POST   /api/usuarios
PATCH  /api/usuarios/:id
GET    /api/equipamentos
GET    /api/equipamentos/export.csv
POST   /api/equipamentos/import.csv
GET    /api/equipamentos/:id
POST   /api/equipamentos
PATCH  /api/equipamentos/:id
POST   /api/equipamentos/:id/finalizar
DELETE /api/equipamentos/:id
GET    /api/historico
GET    /api/historico/:id
POST   /api/historico
```

## Autenticacao

Cadastre um usuario:

```http
POST /api/auth/register
Content-Type: application/json

{
  "nome": "Administrador",
  "email": "admin@rbt.com",
  "senha": "123456",
  "perfil": "ADMIN"
}
```

Faça login:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@rbt.com",
  "senha": "123456"
}
```

Use o token retornado nas rotas protegidas:

```http
Authorization: Bearer <token>
```

Rotas publicas:

```text
GET  /api/health
POST /api/auth/register
POST /api/auth/login
```

Todas as demais rotas exigem JWT valido.

## Dashboard

Indicadores:

```http
GET /api/dashboard
Authorization: Bearer <token>
```

Exportacao CSV:

```http
GET /api/dashboard/export.csv
Authorization: Bearer <token>
```

Filtros aceitos:

```text
dataInicial
dataFinal
cidade
equipe
responsavel
responsavelId
modelo
status
situacaoFinal
```

## Importacao e exportacao de equipamentos

Exportar equipamentos, respeitando os filtros da listagem:

```http
GET /api/equipamentos/export.csv
Authorization: Bearer <token>
```

Importar CSV:

```http
POST /api/equipamentos/import.csv
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=<arquivo.csv>
```

Cabecalhos aceitos no CSV, nesta ordem:

```text
DATA,MODELO,QTD,ORIGEM,SN,EQUIPE,PROTOCOLO,CIDADE,STATUS,SITUAÇÃO FINAL,MOTIVO,RESOLVIDO,RESPONSAVEL
```

Valores aceitos:

```text
Origem: Recolhimento, Caixa de OS, Casa Velha
Status: Reset/Limpeza, Em Teste, Finalizado
Situacao Final: Reaproveitado, Descarte, RMA
Resolvido: Sim, Nao
Data: DD/MM/AAAA ou AAAA-MM-DD
```

O importador aceita separador por virgula ou ponto e virgula. A coluna `RESPONSAVEL` da planilha e exibida apenas como informacao exportada; na importacao, o responsavel gravado e sempre o usuario logado, para manter rastreabilidade.

Durante a importacao, inconsistencias como SN ausente, quantidade diferente de 1 para RMA/Descarte, equipe/cidade vazias ou `Resolvido` vazio em Caixa de OS nao bloqueiam a importacao. Elas retornam como avisos na tela para revisao posterior.

Linhas completamente em branco sao ignoradas com aviso. Linhas parcialmente preenchidas sem campos essenciais para gravacao (`MODELO`, `QTD`, `ORIGEM`, `STATUS` ou `SITUAÇÃO FINAL`) tambem sao ignoradas com aviso, sem bloquear as demais linhas da planilha.

## Usuario executor

O usuario executor das operacoes e identificado pelo JWT. Esse usuario e usado para registrar historico de alteracoes.

Na criacao de equipamento, se `responsavelId` nao for informado, o backend usa o usuario autenticado como responsavel.

## Regras implementadas

- `RMA` ou `DESCARTE` exigem `numeroSerie`, `quantidade = 1`, `motivo`, `equipe` e `cidade`.
- `REAPROVEITADO` pode ter `motivo`, quando o problema foi resolvido e o equipamento voltou para uso.
- `CAIXA_OS` exige `resolvido`.
- `RECOLHIMENTO` nao aceita `resolvido`.
- `responsavelId` e obrigatorio.
- `dataFinalizacao` nao pode ser enviada manualmente.
- `POST /api/equipamentos/:id/finalizar` grava `dataFinalizacao` automaticamente.
- Na finalizacao, `REAPROVEITADO` pode manter qualquer status tecnico valido.
- Na finalizacao, `DESCARTE` e `RMA` exigem status `FINALIZADO`.
- Toda criacao, alteracao, finalizacao e cancelamento gera historico por campo alterado.

## Estrutura

```text
src/
  config/
  controllers/
  middlewares/
  routes/
  services/
  utils/
  validators/
prisma/
  schema.prisma
database/
  schema.sql
```
