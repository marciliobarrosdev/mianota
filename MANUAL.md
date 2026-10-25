# Manual de Remix — MárcIA

Este é o roteiro de entrega por Remix. O aluno não precisa entender GitHub, servidor, banco, Supabase, SQL, migration ou variável de ambiente. As integrações são preenchidas dentro do próprio sistema, em Master → Integrações, sem usar o chat ou créditos de edição.

> **Estado da prova em 9 de outubro de 2026:** o Remix externo “MárcIA Aluno QA Nathalia” abriu editor e LP, nasceu não publicado, mostrou 53 tabelas sem registros, zero usuários e nenhum valor de Secret herdado. A cópia e o isolamento externos deixaram de ser um bloqueio. Ainda faltam, no ensaio de liberação, o claim real de um proprietário e os testes E2E de WhatsApp e Google; este manual não os apresenta como concluídos.

## 1. Criar sua cópia

1. Abra o link oficial da MárcIA.
2. Entre na sua conta Lovable.
3. Clique em **Remix**.
4. Dê um nome ao projeto.
5. Aguarde a Lovable criar a cópia independente.

O clone nasce não publicado. O Remix copia código e schema do banco, mas não copia registros, usuários, segredos, domínios, estado de publicação, Git nem conexões do projeto-mãe.

O aluno não cria nem edita `.env`: o arquivo do projeto contém apenas os bindings públicos gerados pelo Lovable Cloud (sem service role), e a Lovable os recria apontando para o backend novo do Remix.

### Integrações sem usar créditos de edição

WhatsApp, Google Agenda e Stripe são preenchidos dentro do sistema, em **Master → Integrações**. Não é preciso abrir Cloud nem Secrets. As chaves ficam criptografadas e nunca são exibidas de novo.

## 2. Ativar e personalizar

Abra o clone e vá em **Entrar**. Enquanto o sistema não tem dono, a tela mostra **Crie seu sistema**: informe nome da empresa, e-mail e senha e clique em **Começar configuração**. Se o e-mail precisar ser confirmado, confirme e entre com a senha criada.

A primeira conta confirmada vira automaticamente proprietária (super admin), owner da primeira empresa e responsável pela implantação. Isso acontece uma única vez e de forma segura: depois, nenhuma outra conta consegue assumir o sistema. Se essa conta já existia, basta entrar novamente.

Em seguida, o aluno conclui:

1. nome, logo, cor e nome da assistente;
2. empresa e equipe;
3. serviços, duração e intervalo;
4. dias e horários reais de atendimento.

Em **Super Admin → Configurações**, logo, ícone e avatar podem ser enviados direto do celular ou computador (PNG, JPG ou WebP, até 5 MB). O ícone enviado precisa ser quadrado. Colar uma URL HTTPS continua disponível como alternativa.

A agenda interna é a fonte oficial. Sem horários cadastrados, a MárcIA não oferece disponibilidade. O responsável, a configuração inicial e os planos não podem depender de dados copiados, pois registros não acompanham o Remix.

## 3. Conectar o WhatsApp

O app atual é multiempresa e usa Evolution API multi-conta. Cada empresa recebe sua própria instância/número dentro do clone.

Antes de a tela gerar QR ou código de pareamento, o proprietário preenche o endereço do servidor e a API Key em **Master → Integrações → WhatsApp** e clica em **Testar**. Esses valores não são copiados pelo Remix. Sem eles, a tela não deve apresentar a integração como pronta. Depois do provisionamento, o aluno apenas abre **Integrações → WhatsApp**, gera o QR e conecta o número da empresa.

Confirme três estados diferentes:

- **Não conectado:** nenhuma conta vinculada;
- **Conectado:** a plataforma reconhece a integração e o número;
- **Testado:** uma mensagem real entrou no sistema e uma resposta chegou ao telefone.

O conector nativo de um único número por projeto não substitui esse desenho multiempresa. Uma futura troca de provedor precisa preservar uma credencial/instância por tenant.

## 4. Conectar o Google Agenda

A versão atual usa OAuth próprio. Antes de o aluno conectar sua conta, o proprietário preenche Client ID e Client Secret em **Master → Integrações → Google Agenda**.

O endereço de retorno `https://SEU-DOMINIO/api/public/google-callback` do domínio de teste/publicado também precisa estar autorizado no Google. A tela **Master → Integrações** monta a URL exata do domínio atual e oferece um botão para copiá-la. O state de cada autorização é aleatório e fica somente como hash no banco; não há terceiro Secret para ele. A migração para o App User Connector da Lovable está planejada, mas ainda não foi concluída.

Depois do provisionamento, conecte a conta Google que receberá os agendamentos e confirme que:

- o horário foi reservado na agenda interna;
- o evento apareceu no Google Agenda;
- remarcação e cancelamento não criaram duplicidade.

## 5. Preparar a IA

Na tela da assistente, descreva o negócio em linguagem simples. O sistema usa Lovable AI. Cada Remix recebe automaticamente uma chave gerenciada pela Lovable: não peça nem cadastre `LOVABLE_API_KEY` para o aluno. Antes do teste, confira apenas os créditos e limites de IA disponíveis no plano do clone.

O aluno não informa chave OpenAI, Claude ou Gemini. A Lovable gerencia a inteligência padrão do projeto. A MárcIA nunca deve inventar preço, política ou horário ausente.

## 6. Preparar cobrança automática (opcional)

Esta etapa não é necessária para o proprietário ativar e usar o clone. Ela é necessária somente quando o clone venderá planos e deverá liberar clientes automaticamente.

1. Em **Mais → Cloud → Secrets**, cadastre o token do provedor escolhido: `KIWIFY_WEBHOOK_TOKEN`, `CAKTO_WEBHOOK_TOKEN` ou `PERFECTPAY_WEBHOOK_TOKEN`.
2. Em **Master → Planos**, cadastre a `checkout_url` de cada plano vendido.
3. Em **Master → Configurações**, copie a URL de webhook do provedor e siga o roteiro de eventos.
4. Faça uma compra de teste e confirme o evento antes de anunciar liberação automática.

Não é preciso configurar os três tokens quando apenas um checkout será usado. Sem token ou sem `checkout_url`, a ativação do proprietário continua disponível, mas o fluxo comercial automático fica incompleto.

## 7. Publicar a versão de teste

O webhook do WhatsApp precisa de uma URL pública alcançável. Portanto, publique primeiro uma versão de teste na Lovable e configure a Evolution para apontar para a URL desse clone. Essa publicação ainda não significa que o produto está aprovado para divulgação.

## 8. Validar o fluxo real

Com a versão de teste publicada:

1. envie uma mensagem real de outro telefone;
2. peça um serviço e um dia;
3. confirme um horário disponível;
4. verifique **Hoje** e **Agenda**;
5. transforme o atendimento em ordem de serviço;
6. conclua a OS;
7. instale o PWA na tela inicial;
8. confira a URL servida e os logs do clone;
9. somente depois libere a versão final para uso.

## O que o Remix copia

- aplicação e identidade padrão;
- componentes e avatar;
- schema do banco;
- regras, funções e fluxos que pertencem ao código.

## O que não é copiado

- clientes, conversas e outros registros;
- usuários do projeto-mãe;
- segredos e credenciais;
- domínio e estado publicado;
- conexão Git;
- conexões de WhatsApp, Google ou outros serviços.

## Checklist de entrega

- [ ] Remix criado na conta Lovable do aluno;
- [ ] primeira conta confirmada entrou e virou proprietária automaticamente;
- [x] Remix externo criado sem dados, usuários ou publicação herdados; os nomes dos Secrets reapareceram para novo preenchimento, sem valores copiados;
- [ ] claim real do proprietário validado pela rota protegida;
- [ ] responsável ativado pela rota de setup; cadastro comum confirmado sem super admin;
- [ ] identidade e empresa configuradas;
- [ ] serviços, profissionais e horários cadastrados;
- [ ] WhatsApp preenchido e testado em Master → Integrações;
- [ ] versão de teste publicada e webhook apontado para sua URL;
- [ ] WhatsApp conectado e testado nos dois sentidos com mensagem real;
- [ ] Google Agenda preenchido em Master → Integrações e URL de retorno autorizada no Google;
- [ ] Google Agenda conectado e testado;
- [ ] se houver venda de planos, token do provedor, URLs de checkout e webhook testados;
- [ ] Lovable AI disponível e testada sem BYOK do aluno;
- [ ] cliente e agendamento aparecem no clone correto;
- [ ] conflito de horário é bloqueado;
- [ ] OS criada e concluída;
- [ ] permissões de dono, administrador e equipe testadas;
- [ ] PWA instalado em aparelho real;
- [ ] URL final publicada e conferida após os testes.

## Orientação interna para a TurboSaaS

O projeto-mãe precisa permanecer Lovable-native e sem dados reais. A prova externa já confirmou que o clone nasce separado e vazio; antes de liberar o link, ainda valide o claim do proprietário e a versão mais recente no clone de ensaio. O fato de código e schema terem sido copiados não comprova que usuários, planos ou integrações foram inicializados.

Git Sync serve para manutenção técnica sem créditos de edição. Ele não faz parte da jornada do aluno, não publica sozinho e não aplica mudanças de banco ou funções automaticamente. Essas etapas devem ser verificadas na Lovable do projeto-mãe antes da liberação.

Editar via Git Sync não elimina custos de operação. Cloud/runtime, Lovable AI e serviços externos de WhatsApp/Meta/Evolution seguem limites e cobranças próprios.

## Uso responsável do WhatsApp

- use somente contatos com consentimento;
- respeite opt-out e a janela de atendimento aplicável;
- acompanhe falhas, qualidade e bloqueios;
- nenhuma integração elimina o risco de restrição quando há abuso.
