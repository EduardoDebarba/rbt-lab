# Envio de e-mail com Resend

O sistema usa Resend para enviar e-mails transacionais.

## Fluxos com e-mail

- Cadastro de usuario:
  - envia confirmacao para o usuario cadastrado;
  - envia aviso para o admin configurado em `ADMIN_EMAIL`.
- Esqueci a senha:
  - gera codigo de 6 digitos;
  - envia o codigo para o e-mail do usuario;
  - o codigo expira em 15 minutos.

## Variaveis no Render

Configure estas variaveis no backend publicado no Render:

```env
RESEND_API_KEY=sua_chave_resend
EMAIL_FROM="RBT Lab <no-reply@seudominio.com>"
ADMIN_EMAIL=eduardo.scheuermann@rbt.psi.br
FRONTEND_URL=https://rbt-lab.eduardo-scheuermann.workers.dev
```

## Remetente

Para producao, valide o dominio no painel do Resend e use um remetente do dominio validado, por exemplo:

```env
EMAIL_FROM="RBT Lab <no-reply@rbt.psi.br>"
```

Enquanto o dominio nao estiver validado, o envio pode falhar ou ficar limitado pelo Resend.

## Seguranca

Nunca versionar `RESEND_API_KEY` no Git. A chave deve ficar apenas nas variaveis de ambiente locais ou da hospedagem.

Se a chave for compartilhada em local inseguro, gere uma nova chave no painel do Resend e substitua a antiga.
