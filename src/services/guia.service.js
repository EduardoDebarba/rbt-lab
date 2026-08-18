const { prisma } = require('../config/prisma');

const DEFAULT_SECTIONS = [
  {
    titulo: '1. Primeiros Passos no Laboratorio',
    conteudo: `Objetivo Geral: Testar, reabilitar e catalogar equipamentos para reuso em futuras instalacoes.

Fluxo de Trabalho:
Categorizacao: Classifique o equipamento como REGULAR, RMA (REPARO) ou DESCARTE.
Teste Simples: Verifique fonte, energia e reinicie o aparelho.
Registro: Catalogue o equipamento, seu estado e quantidade no caderno de registros.
Destino: Redirecione o equipamento para o seu devido lugar.`
  },
  {
    titulo: '2. Tarefas Diarias e Mensais',
    conteudo: `Diariamente:
Organize a bancada e area de trabalho.
Teste, limpe e ensaque os equipamentos.
Registre as atividades no caderno.
Atualize a planilha do Dropbox.
Separe panos usados para lavagem.

Semanalmente:
Garanta que o laboratorio esta abastecido com insumos (adesivos, sacolas, tampas SFP).
Verifique se nao ha acumulo de equipamentos para teste, limpeza, RMA ou descarte.
Confira se todas as ferramentas estao em boas condicoes.`
  },
  {
    titulo: '3. Testes de ONTs e ONUs de Recolhimento',
    conteudo: `Objetivo: Verificar rapidamente equipamentos recolhidos antes de decidir se vao para RMA ou retorno ao estoque.

Testes Simples:
Ligar e LEDs: Conecte a tomada e verifique se todos os LEDs principais acendem corretamente.
Wi-Fi: Teste se a rede Wi-Fi esta ativa e funcionando.
Reset Fisico: Caso haja algum problema menor, realize um reset fisico seguindo o procedimento do equipamento.
Teste das Portas LAN: Teste cada porta LAN com um cabo de rede para garantir que todas estao funcionando.

Classificacao apos teste simples:
REGULAR: Equipamento liga normalmente, LEDs corretos, Wi-Fi funcional e portas LAN funcionais.
RMA: Equipamento apresenta falha de LEDs ou Wi-Fi.
DESCARTE: Nao liga ou apresenta defeito grave, incluindo porta(s) LAN queimada(s).`
  },
  {
    titulo: '4. Testes de ONU F601 (Placa Vermelha)',
    conteudo: `Teste Simples: A ONU F601 deve ligar e acender os LEDs correspondentes.
Teste de Link: O LED PON deve ligar e piscar indicando conexao. Se estiver sem link, classifique como RMA para que o setor de Redes verifique o problema.

Classificacao:
REGULAR: Liga, PON com link.
RMA: Liga, mas PON sem link, ou LAN sem link.
DESCARTE: Nao liga, ou qualquer porta LAN queimada.

Acesso para Configuracao (IP Fixo):
Endereco: 192.168.1.50
Mascara: 255.255.255.0
Gateway: 192.168.1.1

Fixando o IPV4 na placa dessa maneira, podemos acessar a F601 com 192.168.1.1.
Temos algumas senhas para poder acessa-la, onde podemos ver na parte do guia das senhas e usuarios.`
  },
  {
    titulo: '5. Testes de Antenas',
    conteudo: `Ligar e Conectar:
Ligue a fonte POE na tomada.
Conecte a entrada POE na antena e a entrada LAN no notebook.
Resete a antena: pressione o botao de reset por 30 segundos usando um clipe.

Definir IP Fixo no Notebook:
IP: 192.168.1.25
Mascara: 255.255.255.0
Gateway: 192.168.1.20

Verificar Ping:
Windows: ping -t 192.168.1.20
Ubuntu: ping 192.168.1.20 (Ctrl+C para parar)

Acessar Interface:
Navegador: https://192.168.1.20
Usuario: ubnt / Senha: ubnt
Regiao: Licensed / Idioma: Brasil

Validar Configuracoes:
LAN configurada para 100Mbps
Teste Wi-Fi e polarizacao
Verifique velocidade de upload e download

Classificacao:
REGULAR, RMA ou DESCARTE conforme desempenho e estado fisico.`
  },
  {
    titulo: '6. Testes de Roteadores',
    conteudo: `Ligue o roteador e conecte WAN/LAN corretamente.
Verifique LEDs (Power, WAN/Internet, LAN, Wi-Fi).
Acesse a interface via navegador (IP padrao 192.168.1.1 ou 192.168.0.1).
Teste a conectividade: cabo LAN e Wi-Fi.
Teste das Portas LAN: Teste cada porta LAN com um cabo de rede para garantir que todas estao funcionando. Se qualquer porta LAN estiver queimada, classifique como DESCARTE.
Classifique: REGULAR, RMA ou DESCARTE.
Se LED WAN vermelho: verifique cabos, modem, troque cabos ou faca reset de fabrica.`
  },
  {
    titulo: '7. Testes de Switches',
    conteudo: `Ligue o switch e verifique LED de energia.
Conecte cabos em cada porta LAN e teste o LED correspondente.
Classifique: REGULAR, RMA ou DESCARTE.`
  },
  {
    titulo: '8. Testes de Telefone IP Intelbras TIP 125i',
    conteudo: `Conecte ao computador via LAN/PoE.
Ligue e verifique display e LED de Power.
Acesse interface pelo IP mostrado no display, login padrao.
Teste registro SIP, chamadas e funcoes (volume, viva-voz).
Classifique: REGULAR, RMA ou DESCARTE.
Reset para Desconfigurar: Ao final dos testes, resete o telefone para que ele nao va para campo com nenhuma configuracao anterior.`
  },
  {
    titulo: '9. Testes de Access Points UniFi (UAP)',
    conteudo: `Conecte AP ao switch/fonte PoE.
Resete AP (5-10s).
Adote no controlador UniFi e aguarde mudanca de LED para verde/azul.
Teste Wi-Fi e verifique firmware.
Classifique: REGULAR, RMA ou DESCARTE.`
  },
  {
    titulo: '10. Testes Avancados de Equipamentos de OS (ONTs e Roteadores)',
    conteudo: `IMPORTANTE: Equipamentos com a porta LAN queimada devem ser classificados diretamente como DESCARTE. Nao inicie testes avancados nesses casos.

ONTs ZTE F670L / F6600P:
Conecte energia, fibra e cabo LAN.
Resete fisicamente.
Verifique LEDs (LOS, LAN) e sinal Wi-Fi.
Acesse interface para medir potencia de entrada do modulo optico (-19,22dBm).
Use OLTSoft: autorize ONT, configure script Router+WiFi, SSID Testes_Laboratorio e senha 12345678.
Apos teste, desaprove a ONT para remover conexao.

Roteadores IWR1000N/IWR3000N:
Conecte e acesse interface (IP 192.168.0.1).
Senhas: suporte@RBT*100, redebrasil ou admin
Atualize firmware conforme modelo.
Reset de fabrica se necessario.
Teste novamente e classifique: REGULAR, RMA ou DESCARTE.`
  },
  {
    titulo: '11. Tabela de Controle no Dropbox',
    conteudo: `Registre todos os equipamentos testados, limpos e encaminhados.
Inclua tipo, modelo, status (REGULAR, RMA, DESCARTE) e data.`
  },
  {
    titulo: '12. Vendas de Equipamento',
    conteudo: `Verifique detalhes da venda com equipe de estoque.
Separe produtos REGULAR, registre SN ou MAC na planilha.
Embale produtos com protecao, insira planilha impressa na caixa e entregue ao estoque.`
  },
  {
    titulo: '13. Descartes e RMA',
    conteudo: `Este processo garante que os equipamentos com defeito sejam separados corretamente.

Processo de Envio para RMA:
Identifique o defeito: Anote o problema (ex: "Wi-Fi nao funciona").
Etiquete: Coloque uma etiqueta no equipamento com o defeito anotado.
Registre: Anote na planilha de controle que o equipamento e RMA.
Embalagem: Coloque os itens de RMA em caixas. Conte os itens e cole uma lista do lado de fora.
Entregue: Leve a caixa para o estoque.

Processo de Descarte:
Regra de Descarte Direto: Qualquer equipamento com porta LAN queimada deve ser imediatamente classificado como DESCARTE.
Identifique: Separe os equipamentos sem conserto (nao ligam, quebrados, etc.).
Armazene: Deixe-os em um local separado no laboratorio.
Registre: Anote na planilha de controle que o equipamento e DESCARTE.
Embalagem: Coloque os itens de descarte em caixas. Conte os itens e cole uma lista do lado de fora.
Entregue: Leve a caixa para o estoque para a destinacao final.`
  },
  {
    titulo: '14. Procedimentos de Limpeza e Embalagem',
    conteudo: `A limpeza garante a boa aparencia e prolonga a vida util dos equipamentos.

Remocao de Adesivos:
Adesivos de papel: Use um pouco de WD-40, deixe agir por 5 a 10 minutos e remova com um pano.
Adesivos de plastico: Puxe com cuidado. Se sobrar cola, use o WD-40.

Limpeza Geral:
Use um pano com alcool para limpar a sujeira.
Para sujeira mais dificil, use pasta de limpeza com uma esponja.

Cuidados com a Porta de Fibra:
Retire o adesivo protetor com cuidado.
Limpe a parte interna da porta com uma caneta ou bastao de limpeza de fibra.
Coloque uma tampa protetora na porta apos a limpeza.

Embalagem Final:
Coloque cada equipamento em um saquinho individual.
Junte a fonte de energia correta e testada com o aparelho.
Guarde tudo em uma caixa grande para entregar ao estoque.`
  },
  {
    titulo: '15. Teste de Preparacao de Fibra Optica',
    conteudo: `Materiais:
Kit fibra (gabarito, alicates, clivador)
Cabo Drop
Power Meter
Alcool Isopropilico

Procedimento:
Pegue um pedaco de Cabo Drop.
Use o alicate para remover o elemento de sustentacao e a protecao do cabo.
Siga o video de instrucao para montar o conector: https://youtu.be/QXyzL8X0x7Y?si=F5KAajiWzO0f9TFb
Se o conector montado nao funcionar ou o Power Meter nao mostrar bons resultados, a fibra deve ser descartada.`
  },
  {
    titulo: '16. Procedimentos de Seguranca',
    conteudo: `Mantenha bancada organizada.
Nao sobrecarregue tomadas; inspecione cabos.
Nunca olhe diretamente para a ponta de fibra optica ativa.
Descarte cacos de fibra em recipiente apropriado.
Use luvas e oculos de protecao ao manusear fibra ou produtos quimicos.
Comunique acidentes imediatamente.`
  },
  {
    titulo: '17. Senhas Padrao',
    conteudo: `Credenciais internas gerais:
Usuario: multipro | Senha: multipro
Usuario: admin | Senha: suporte@RBT*100
Usuario: admin | Senha: admin
Usuario: user | Senha: user
Usuario: user | Senha: suporte@RBT*100

Credenciais especificas para roteadores Intelbras IWR1000N e IWR3000N:
Usuario: admin | Senha: suporte@RBT*100
Usuario: admin | Senha: redebrasil
Usuario: admin | Senha: admin
Usuario: redebrasil | Senha: redebrasil

Credenciais especificas para Antenas:
Usuario: ubnt / Senha: ubnt

Observacoes:
Utilizar apenas em ambiente de teste ou quando autorizado pela coordenacao.
Sempre registrar alteracoes no sistema interno.
Apos uso, retornar o equipamento as credenciais padrao.`
  }
];

const guiaService = {
  async list() {
    await ensureDefaultSections();

    return prisma.guiaSecao.findMany({
      where: { ativo: true },
      orderBy: [
        { ordem: 'asc' },
        { criadoEm: 'asc' }
      ]
    });
  },

  async create(data) {
    const ordem = data.ordem ?? await getNextOrder();

    return prisma.guiaSecao.create({
      data: {
        titulo: data.titulo,
        conteudo: data.conteudo,
        ordem
      }
    });
  },

  async update(id, data) {
    return prisma.guiaSecao.update({
      where: { id },
      data
    });
  }
};

async function ensureDefaultSections() {
  const count = await prisma.guiaSecao.count();
  if (count > 0) return;

  await prisma.guiaSecao.createMany({
    data: DEFAULT_SECTIONS.map((section, index) => ({
      ...section,
      ordem: index + 1
    }))
  });
}

async function getNextOrder() {
  const last = await prisma.guiaSecao.findFirst({
    orderBy: { ordem: 'desc' },
    select: { ordem: true }
  });

  return (last?.ordem || 0) + 1;
}

module.exports = { guiaService };
