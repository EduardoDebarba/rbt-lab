# Roteiro de apresentação do projeto

## 1. Abertura

Apresentar o contexto do estágio:

- Empresa: RBT Internet.
- Área: laboratório técnico.
- Processo analisado: controle de equipamentos de rede que retornam dos clientes.
- Problema inicial: uso de planilhas para registrar processamentos, dificultando padronização, validação e rastreabilidade.

Frase sugerida:

"O projeto foi desenvolvido para melhorar o controle dos equipamentos processados no laboratório técnico, substituindo o uso exclusivo de planilhas por um sistema web com validações, histórico e indicadores."

## 2. Problema identificado

Explicar os principais pontos do diagnóstico:

- Registros manuais em planilhas.
- Possibilidade de campos obrigatórios ficarem vazios.
- Dificuldade para controlar número de série, motivo, status e situação final.
- Falta de histórico detalhado de alterações.
- Dificuldade para gerar indicadores confiáveis.

## 3. Proposta de solução

Apresentar a proposta:

- Criar uma aplicação web para cadastro e acompanhamento dos equipamentos.
- Automatizar regras de negócio.
- Permitir importação dos dados antigos por CSV.
- Criar dashboard para apoio à tomada de decisão.
- Registrar histórico de alterações.

## 4. Arquitetura

Explicar a divisão do sistema:

- Frontend: React, Vite e TailwindCSS.
- Backend: Node.js, Express e Prisma.
- Banco de dados: PostgreSQL.

Frase sugerida:

"A arquitetura foi separada em frontend, backend e banco de dados para facilitar manutenção, segurança e evolução do sistema."

## 5. Demonstração das telas

Ordem sugerida:

1. Tela de login.
2. Listagem de equipamentos.
3. Filtros da listagem.
4. Cadastro de equipamento.
5. Edição de equipamento.
6. Importação e exportação CSV.
7. Dashboard.

Durante a demonstração, explicar que os filtros ajudam a localizar registros por cidade, equipe, modelo, status, situação final, SN, protocolo e resolvido.

## 6. Regras de negócio

Explicar as regras principais:

- RMA e descarte exigem número de série, quantidade igual a 1, motivo, equipe e cidade.
- O campo resolvido aparece apenas quando o equipamento está em teste.
- O responsável é identificado pelo usuário logado.
- O sistema registra histórico das alterações.

Trecho de código recomendado para mostrar:

- Arquivo: `src/utils/equipamentoRules.js`
- Função: `validateEquipamentoBusinessRules`

## 7. Banco de dados

Apresentar as principais tabelas:

- `usuarios`
- `equipamentos`
- `historico`
- `modelos_equipamento`
- `motivos_equipamento`

Explicar que o Prisma foi usado para modelar o banco, executar consultas e controlar migrations.

## 8. Dashboard

Apresentar os indicadores:

- Taxa de resolução.
- Taxa de descarte.
- Modelos mais recebidos.
- Cidades com mais problemas.
- Top motivos de defeito.
- Top motivos de descarte.
- Evolução por mês.

Destacar que os cálculos são feitos com dados reais do PostgreSQL e usam a soma da quantidade de equipamentos.

## 9. Dificuldades encontradas

Comentar dificuldades técnicas:

- Conversão dos dados da planilha para o banco.
- Padronização de nomes de modelos e motivos.
- Ajuste das regras de negócio conforme o processo real.
- Diferença entre contar registros e somar a quantidade de equipamentos.
- Criação de filtros e paginação para melhorar a usabilidade.

## 10. Encerramento

Concluir com os ganhos do projeto:

- Redução de inconsistências.
- Mais rastreabilidade.
- Consulta mais rápida.
- Indicadores gerenciais.
- Base para futuras melhorias.

Frase final sugerida:

"Com o sistema, o laboratório passa a ter um controle mais confiável, padronizado e rastreável sobre os equipamentos processados, reduzindo limitações do controle manual por planilhas."

