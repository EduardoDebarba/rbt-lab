# Monitoramento do backend

O backend pode demorar para responder quando fica muito tempo sem uso, principalmente em hospedagens gratuitas como Render e bancos serverless como Neon. Para reduzir esse problema, configure um monitor externo chamando o endpoint de saúde da API a cada 5 minutos.

## Endpoint

Use este endereço:

```text
https://rbt-lab.onrender.com/api/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "service": "rbt-lab-api",
  "timestamp": "2026-07-24T00:00:00.000Z"
}
```

## Opção 1: UptimeRobot

1. Acesse `https://uptimerobot.com`.
2. Crie uma conta gratuita.
3. Clique em `New Monitor`.
4. Em `Monitor Type`, selecione `HTTP(s)`.
5. Em `Friendly Name`, informe `RBT Lab Backend`.
6. Em `URL`, informe `https://rbt-lab.onrender.com/api/health`.
7. Em `Monitoring Interval`, selecione `5 minutes`.
8. Salve o monitor.

## Opção 2: cron-job.org

1. Acesse `https://cron-job.org`.
2. Crie uma conta gratuita.
3. Clique em `Create cronjob`.
4. Em `Title`, informe `RBT Lab Backend Health`.
5. Em `URL`, informe `https://rbt-lab.onrender.com/api/health`.
6. Em `Schedule`, configure execução a cada `5 minutes`.
7. Salve o cronjob.

## Variáveis opcionais do retry Prisma

O backend possui retry automático para falhas temporárias de conexão com o banco em operações de leitura e consultas do dashboard.

Estas variáveis podem ser adicionadas no Render, se quiser ajustar o comportamento:

```env
PRISMA_RETRY_ATTEMPTS=3
PRISMA_RETRY_BASE_DELAY_MS=400
```

Com essa configuração, uma falha temporária será tentada novamente até 3 vezes, com pequenos intervalos progressivos.

## Observação

Esse monitor ajuda a manter o backend e o banco mais responsivos, mas não substitui um plano pago. Em planos gratuitos, ainda pode existir algum atraso após longos períodos sem uso.
