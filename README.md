# MárcIA Finance

Assistente financeira pessoal white-label com inteligência artificial. O assinante registra e consulta a vida financeira por voz, texto, foto ou WhatsApp; a MárcIA entende o contexto, pergunta apenas o que faltar e pede confirmação antes de salvar.

```text
voz / texto / foto / WhatsApp → entendimento → pergunta curta → confirmação → dashboard
```

## Modelo TurboSaaS

A MárcIA é entregue como um projeto **Lovable-native** para o aluno clonar, personalizar e vender com sua própria marca.

O fluxo do aluno é:

1. abrir o projeto oficial na Lovable e clicar em **Remix**;
2. criar a primeira conta do clone, que assume uma única vez o papel de proprietário e super admin;
3. voltar à TurboSaaS Academy para definir nome, logo, cores, público e oferta;
4. copiar o prompt de personalização e aplicar no projeto clonado;
5. configurar planos, trial, créditos, Stripe e WhatsApp no painel Master;
6. publicar a versão de teste, conferir os fluxos reais e então lançar.

O Remix leva o código e a estrutura do banco, mas não leva usuários, dados financeiros, segredos, conexões, domínios ou estado de publicação do projeto-mãe. Cada clone é independente.

## Experiência do assinante

- **Início:** visão consolidada, saldo, entradas, saídas, projeção e leitura da MárcIA;
- **Movimentações:** receitas, despesas, contas futuras, anexos e recorrências;
- **Contas e cartões:** saldos, limites, faturas e vencimentos;
- **Orçamentos:** limites por categoria com alertas de consumo;
- **Metas:** objetivo, prazo, progresso e valor mensal sugerido;
- **Relatórios:** tendências e explicações em linguagem simples;
- **MárcIA:** central de comando por voz ou texto;
- **WhatsApp financeiro:** acesso vinculado ao celular autorizado por código temporário;
- **PWA:** instalação na tela inicial e experiência responsiva.

A IA nunca deve salvar uma ação financeira silenciosamente. Quando faltarem dados relevantes, ela faz uma pergunta objetiva e só executa depois da confirmação do usuário.

## Painel do proprietário

O super admin configura o produto sem expor complexidade técnica ao assinante:

- marca e identidade do clone;
- planos, preços, recursos, trial e créditos de IA;
- empresas e assinaturas;
- Stripe integrado ou checkout externo;
- servidor Evolution e API Key do WhatsApp;
- diagnóstico de implantação e publicação.

Um crédito corresponde a uma resposta enviada pela IA. O painel controla a franquia do trial e dos planos, enquanto o assinante vê apenas saldo, validade e opção de ativação.

## Integrações

### WhatsApp

O proprietário configura uma vez o servidor Evolution em **Master → Integrações**. O assinante conecta o número da assistente pelo QR Code e vincula o próprio celular com um código temporário de oito dígitos. Apenas identidades autorizadas podem consultar ou alterar dados financeiros por WhatsApp.

### Stripe

O proprietário cadastra as credenciais no Master e associa cada plano a um `price_id`. Checkout, trial e webhooks são tratados pelo servidor. Links externos continuam disponíveis como alternativa.

### Calendário financeiro

Contas futuras e recorrências entram no calendário financeiro. O sistema avisa sobre vencimentos próximos e o assinante pode criar novos lembretes falando ou escrevendo para a MárcIA.

## Stack

- Lovable + TanStack Start;
- React 19 + TypeScript;
- Tailwind CSS + Radix/shadcn;
- Lovable Cloud para banco, autenticação, storage e funções;
- Lovable AI para entendimento e organização financeira;
- Evolution API para WhatsApp;
- Stripe para assinaturas;
- service worker e Web App Manifest.

## Segurança e isolamento

- dados financeiros são isolados por empresa/conta com RLS;
- credenciais do proprietário são processadas apenas no servidor e armazenadas criptografadas;
- o navegador nunca recebe chaves secretas;
- o celular do WhatsApp precisa ser vinculado ao usuário correto;
- confirmações financeiras são explícitas;
- imagens de comprovantes ficam vinculadas à conta protegida;
- o Remix não copia dados nem segredos do projeto original.

## Desenvolvimento sem gastar créditos de edição

O projeto nasce na Lovable e depois conecta o Git Sync. Mudanças de código podem ser feitas neste repositório e enviadas ao branch sincronizado sem usar o chat de edição da Lovable. A publicação continua sendo feita pela Lovable.

```bash
npm install
npm run test:finance-rebuild
npm run test:clone-security
npx tsc --noEmit
npm run build
```

## Checklist antes de liberar o Remix

- projeto-mãe sem usuários ou dados financeiros reais;
- nenhum segredo versionado;
- primeira conta direcionada ao Master;
- marca e prompt de personalização revisados;
- planos, trial e créditos configurados;
- Stripe testado, quando usado;
- Evolution testado e QR Code disponível;
- cadastro, login, comando financeiro e isolamento validados;
- versão pública conferida no desktop e no celular;
- **Public remixing** habilitado somente depois da validação final.

Build, commit e status “publicado” não bastam: a URL servida e os fluxos relevantes precisam ser conferidos depois de cada deploy.
