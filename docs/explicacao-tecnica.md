# Explicação técnica para defesa do projeto

## Visão geral

O projeto RBT Lab é um sistema web desenvolvido para substituir o controle manual por planilhas no laboratório técnico da RBT Internet. O objetivo principal é registrar, consultar, validar e acompanhar o processamento de equipamentos de rede que retornam dos clientes, como roteadores, antenas, ONUs e switches.

A aplicação foi dividida em três camadas principais:

- Frontend em React, responsável pelas telas e interação com o usuário.
- Backend em Node.js com Express, responsável pelas regras de negócio e pela API.
- Banco de dados PostgreSQL, acessado pelo Prisma ORM.

Essa divisão facilita manutenção, evolução e rastreabilidade, pois cada parte do sistema possui uma responsabilidade bem definida.

## Backend

O backend foi desenvolvido com Node.js e Express. Ele disponibiliza uma API REST para autenticação, cadastro de usuários, controle de equipamentos, histórico de alterações, importação/exportação CSV e dashboard.

As regras de negócio ficam centralizadas no backend para evitar que registros inválidos sejam gravados. Isso é importante porque a interface pode mudar, mas a validação principal continua protegendo o banco de dados.

Exemplos de regras implementadas:

- Equipamentos em RMA ou descarte exigem número de série, motivo, cidade, equipe e quantidade igual a 1.
- O campo resolvido só é aceito quando o status está em teste.
- Todo cadastro, alteração, importação e exclusão registra histórico.
- Operações protegidas exigem autenticação por token JWT.

## Frontend

O frontend foi desenvolvido com React, Vite e TailwindCSS. A interface foi pensada para uso operacional, com telas objetivas e rápidas para o laboratório.

As principais telas são:

- Login.
- Listagem de equipamentos com filtros.
- Cadastro e edição de equipamentos.
- Dashboard com indicadores.

O frontend se comunica com o backend por meio do Axios. O token JWT é armazenado no navegador e enviado automaticamente nas requisições protegidas.

## Banco de dados

O banco utilizado é PostgreSQL. A modelagem foi feita com Prisma ORM, permitindo versionamento da estrutura por migrations.

As principais entidades são:

- Usuários: armazenam dados de acesso e perfil.
- Equipamentos: representam os registros processados no laboratório.
- Histórico: registra alterações feitas nos equipamentos.
- Modelos de equipamento: controla os modelos aceitos no cadastro.
- Motivos de equipamento: controla os motivos aceitos no cadastro.

## Segurança e rastreabilidade

O sistema utiliza autenticação JWT e hash de senha com bcrypt. Dessa forma, senhas não são armazenadas em texto puro.

A rastreabilidade é garantida pelo histórico de alterações. Sempre que um equipamento é criado ou alterado, o sistema registra:

- Campo alterado.
- Valor anterior.
- Valor novo.
- Usuário responsável.
- Data da alteração.

Esse recurso melhora a confiabilidade do processo, pois permite identificar quem realizou cada operação.

## Dashboard

O dashboard apresenta indicadores calculados diretamente a partir do banco de dados. Entre os indicadores estão:

- Taxa de resolução.
- Taxa de descarte.
- Modelos mais recebidos.
- Cidades com mais problemas.
- Top motivos de defeito.
- Top motivos de descarte.
- Evolução por mês.

Os cálculos consideram a quantidade real de equipamentos, usando o campo QTD, e não apenas a quantidade de linhas cadastradas.

## Importação e exportação

O sistema permite importar arquivos CSV com registros vindos da planilha utilizada anteriormente. Durante a importação, linhas em branco são ignoradas e inconsistências são apresentadas como avisos para revisão.

Também existe exportação CSV dos equipamentos e dos dados do dashboard, permitindo que a empresa continue usando planilhas quando necessário, mas com dados centralizados e mais confiáveis.

