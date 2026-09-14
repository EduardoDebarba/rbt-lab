# Integracao Zoho Sheet

## Endpoint

`POST /api/integracoes/zoho/equipamentos`

Em producao:

`https://rbt-lab.onrender.com/api/integracoes/zoho/equipamentos`

## Autenticacao

Configure a variavel `ZOHO_INTEGRATION_TOKEN` no Render e use o mesmo valor no Zoho Flow.

O token pode ser enviado de uma das formas:

```http
x-zoho-integration-token: seu-token-secreto
```

ou:

```http
Authorization: Bearer seu-token-secreto
```

## Usuario executor

Configure `ZOHO_INTEGRATION_USER_EMAIL` com o e-mail do usuario que deve aparecer no historico das alteracoes.

Se essa variavel nao existir, o sistema usa `ADMIN_EMAIL`. Se esse usuario nao for encontrado, usa o primeiro `SUPER_ADMIN` ativo.

## Colunas recomendadas na planilha

- DATA
- MODELO
- QTD
- ORIGEM
- SN
- EQUIPE
- PROTOCOLO
- CIDADE
- STATUS
- SITUACAO FINAL
- MOTIVO
- RESOLVIDO
- RESPONSAVEL
- ID_SISTEMA
- SINCRONIZADO
- ERRO_SINCRONIZACAO
- LINHA_ZOHO_ID

`ID_SISTEMA`, `SINCRONIZADO`, `ERRO_SINCRONIZACAO` e `LINHA_ZOHO_ID` sao colunas tecnicas.

## Corpo da requisicao

Exemplo de JSON para o Zoho Flow enviar:

```json
{
  "linhaZohoId": "${ROW_ID}",
  "row": {
    "DATA": "2026-08-19",
    "MODELO": "Roteador ZTE H199A AC",
    "QTD": "1",
    "ORIGEM": "Recolhimento",
    "SN": "ABC123",
    "EQUIPE": "Equipe 01",
    "PROTOCOLO": "12345",
    "CIDADE": "Gramado",
    "STATUS": "Reset/Limpeza",
    "SITUACAO FINAL": "Reaproveitado",
    "MOTIVO": "Sem Defeito",
    "RESOLVIDO": "",
    "RESPONSAVEL": "Eduardo",
    "ID_SISTEMA": ""
  }
}
```

## Resposta de sucesso

```json
{
  "sincronizado": true,
  "linhaZohoId": "123",
  "idSistema": "uuid-do-equipamento",
  "avisos": [],
  "colunasPlanilha": {
    "ID_SISTEMA": "uuid-do-equipamento",
    "SINCRONIZADO": "SIM",
    "ERRO_SINCRONIZACAO": ""
  }
}
```

Use esses valores no Zoho Flow para atualizar a propria linha da planilha.

## Resposta de erro

O backend retorna uma mensagem clara e registra a falha na tabela `zoho_importacoes`.

Use o campo `message` da resposta para preencher `ERRO_SINCRONIZACAO` na Zoho Sheet.
