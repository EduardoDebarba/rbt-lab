# Relatório de desenvolvimento

## 1. Objetivo do projeto

O projeto teve como objetivo desenvolver um sistema web para apoiar o controle dos equipamentos processados no laboratório técnico da RBT Internet. A solução busca substituir o uso exclusivo de planilhas por uma aplicação com validações, autenticação, histórico, importação de dados e indicadores gerenciais.

## 2. Decisões técnicas

### 2.1 Separação entre frontend e backend

O sistema foi dividido em frontend e backend para organizar melhor as responsabilidades. O frontend cuida da interface e da experiência do usuário. O backend centraliza as regras de negócio, a autenticação e a comunicação com o banco de dados.

### 2.2 Uso de Node.js e Express

Node.js e Express foram escolhidos para o backend por permitirem a construção de uma API REST simples, organizada e adequada ao porte do sistema. A estrutura foi separada em rotas, controllers, services, validators, middlewares e utilitários.

### 2.3 Uso de Prisma e PostgreSQL

O PostgreSQL foi utilizado como banco de dados relacional por oferecer integridade, consultas SQL e boa capacidade de organização dos dados. O Prisma foi usado como ORM para facilitar a modelagem, as consultas e o versionamento do banco por migrations.

### 2.4 Uso de React, Vite e TailwindCSS

O frontend foi desenvolvido com React para permitir componentização das telas. O Vite foi utilizado pela rapidez no ambiente de desenvolvimento. O TailwindCSS foi adotado para facilitar a criação de uma interface limpa, responsiva e produtiva.

### 2.5 Autenticação com JWT

A autenticação foi implementada com JWT. Após o login, o usuário recebe um token usado nas requisições protegidas. As senhas são armazenadas com hash usando bcrypt.

### 2.6 Histórico de alterações

Foi criada uma estrutura de histórico para registrar mudanças nos equipamentos. Essa decisão foi importante para atender à necessidade de rastreabilidade do processo, permitindo identificar alterações, usuários e datas.

## 3. Funcionalidades desenvolvidas

- Cadastro e login de usuários.
- Controle de perfis ADMIN e TECNICO.
- CRUD de equipamentos.
- Validação de regras de negócio no backend.
- Cadastro e consulta de modelos de equipamentos.
- Cadastro e consulta de motivos.
- Importação de planilhas CSV.
- Exportação CSV da listagem de equipamentos.
- Dashboard com gráficos e filtros.
- Exportação CSV dos dados do dashboard.
- Registro de histórico de alterações.
- Paginação e filtros na listagem de equipamentos.

## 4. Dificuldades encontradas

### 4.1 Adaptação das regras reais do processo

Uma das principais dificuldades foi transformar as regras usadas no laboratório em validações do sistema. Algumas regras precisaram ser ajustadas conforme o uso real, como a possibilidade de equipamentos reaproveitados possuírem motivo informado.

### 4.2 Importação de planilhas

A importação CSV exigiu tratamento de diferentes situações, como linhas em branco, campos vazios, separadores diferentes e inconsistências nos dados. A solução adotada foi permitir a importação dos registros válidos e exibir avisos para revisão.

### 4.3 Padronização de modelos e motivos

Como os dados vinham de planilhas, havia variações nos nomes dos equipamentos e motivos. Para melhorar o cadastro, foram criadas listas de modelos e motivos com autocomplete, além da possibilidade de cadastrar novos itens.

### 4.4 Cálculo dos indicadores

No dashboard, foi necessário ajustar os cálculos para considerar a quantidade real de equipamentos. Em alguns casos, uma linha da planilha representa mais de um equipamento. Por isso, os indicadores passaram a usar a soma do campo QTD, e não apenas a contagem de registros.

### 4.5 Usabilidade da listagem

A listagem precisou ser ajustada para não exibir informações demais ao mesmo tempo. Foram adicionados filtros, paginação, ordenação por data e uma tela de edição para consulta detalhada dos registros.

## 5. Aprendizados

O desenvolvimento do projeto permitiu aplicar conceitos de análise de processo, modelagem de dados, desenvolvimento full stack, autenticação, validação de regras de negócio e criação de dashboards.

Também foi possível compreender melhor a importância da rastreabilidade em processos operacionais. Ao registrar quem fez cada alteração e quais campos foram modificados, o sistema aumenta a confiabilidade das informações e facilita auditorias internas.

Outro aprendizado importante foi a diferença entre simplesmente digitalizar uma planilha e realmente melhorar o processo. O sistema não apenas armazena os dados em outro local, mas também aplica regras, organiza cadastros, gera indicadores e reduz inconsistências.

## 6. Resultados alcançados

Com o sistema desenvolvido, o laboratório passou a contar com uma solução capaz de:

- Centralizar registros de equipamentos.
- Reduzir erros de preenchimento.
- Padronizar modelos e motivos.
- Facilitar consultas e filtros.
- Importar dados anteriores.
- Exportar dados para análise externa.
- Gerar indicadores visuais.
- Registrar histórico de alterações.

## 7. Possíveis melhorias futuras

- Controle mais detalhado de permissões por perfil.
- Relatórios em PDF.
- Anexos de imagens ou laudos técnicos por equipamento.
- Integração com sistemas internos da empresa.
- Tela específica para auditoria do histórico.
- Indicadores comparativos por período.

