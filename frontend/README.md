# RBT Lab Frontend

Frontend em React, Vite, TailwindCSS e Axios para o sistema de laboratorio tecnico.

## Configuracao

```powershell
Copy-Item .env.example .env
npm install
```

Configure a API:

```text
VITE_API_URL=http://localhost:3000/api
```

## Desenvolvimento

```bash
npm run dev
```

URL padrao:

```text
http://localhost:5173
```

## Build

```bash
npm run build
```

## Telas

- Login e criacao de acesso
- Dashboard com indicadores, graficos e exportacao CSV
- Listagem de equipamentos com filtros
- Cadastro de equipamento
- Edicao, finalizacao e cancelamento de equipamento

## Integração

O token JWT retornado pelo backend e salvo no `localStorage` e enviado automaticamente em:

```http
Authorization: Bearer <token>
```
