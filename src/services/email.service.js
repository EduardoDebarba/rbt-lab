const { Resend } = require('resend');

const { env } = require('../config/env');
const { HttpError } = require('../utils/httpError');

let resendClient = null;

function getClient() {
  if (!env.resendApiKey) {
    throw new HttpError(500, 'Envio de e-mail nao configurado.');
  }

  if (!resendClient) {
    resendClient = new Resend(env.resendApiKey);
  }

  return resendClient;
}

const emailService = {
  async sendAccountCreated(usuario) {
    const results = await Promise.allSettled([
      sendEmail({
        to: usuario.email,
        subject: 'Acesso criado no RBT Lab',
        html: accountCreatedUserTemplate(usuario)
      }),
      sendEmail({
        to: env.adminEmail,
        subject: 'Novo usuario cadastrado no RBT Lab',
        html: accountCreatedAdminTemplate(usuario)
      })
    ]);

    const errors = results
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason?.message || 'Falha ao enviar e-mail.');

    if (errors.length > 0) {
      throw new HttpError(502, errors.join(' '));
    }
  },

  async sendPasswordResetCode(usuario, code) {
    await sendEmail({
      to: usuario.email,
      subject: 'Codigo para redefinir sua senha do RBT Lab',
      html: passwordResetTemplate(usuario, code)
    });
  }
};

async function sendEmail({ to, subject, html }) {
  try {
    const client = getClient();
    const { error } = await client.emails.send({
      from: env.emailFrom,
      to,
      subject,
      html
    });

    if (error) {
      throw new Error(error.message || 'Falha ao enviar e-mail.');
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, `Nao foi possivel enviar e-mail: ${error.message}`);
  }
}

function accountCreatedUserTemplate(usuario) {
  return baseTemplate(`
    <h2>Seu acesso ao RBT Lab foi criado</h2>
    <p>O usuario <strong>${escapeHtml(usuario.email)}</strong> foi cadastrado com sucesso.</p>
    <p>Use o e-mail e a senha definida no cadastro para acessar o sistema.</p>
    <p><a href="${escapeHtml(env.frontendUrl)}">Acessar RBT Lab</a></p>
  `);
}

function accountCreatedAdminTemplate(usuario) {
  return baseTemplate(`
    <h2>Novo usuario cadastrado</h2>
    <p>Um novo acesso foi criado no RBT Lab.</p>
    <p><strong>Nome:</strong> ${escapeHtml(usuario.nome)}</p>
    <p><strong>E-mail:</strong> ${escapeHtml(usuario.email)}</p>
    <p><strong>Perfil inicial:</strong> ${escapeHtml(usuario.perfil)}</p>
  `);
}

function passwordResetTemplate(usuario, code) {
  return baseTemplate(`
    <h2>Redefinicao de senha</h2>
    <p>Use o codigo abaixo para criar uma nova senha no RBT Lab.</p>
    <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 24px 0;">${escapeHtml(code)}</p>
    <p>O codigo expira em 15 minutos. Se voce nao solicitou essa alteracao, ignore este e-mail.</p>
    <p><a href="${escapeHtml(env.frontendUrl)}/login">Voltar ao login</a></p>
  `);
}

function baseTemplate(content) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1f2933; line-height: 1.5;">
      ${content}
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      <p style="font-size: 12px; color: #64748b;">RBT Lab - Laboratorio tecnico</p>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { emailService };
