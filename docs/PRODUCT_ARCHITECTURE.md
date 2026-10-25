# Arquitetura de produto — MárcIA

## Princípio

A MárcIA é uma secretária operacional, não um CRM genérico. Cada tela responde a uma pergunta simples:

- Hoje: o que precisa acontecer agora?
- Agenda: quando e com quem?
- OS: o que será ou foi executado?
- Conversas: o que o cliente pediu?
- Clientes: quem é e qual o histórico?

## Arquitetura de distribuição

```text
Projeto-mãe MárcIA na Lovable
             ↓ Public Remix
Clone independente do aluno
             ↓
Lovable Cloud próprio: banco + auth + funções + storage
             ↓
Bootstrap → marca → operação → provisionamento → teste
             ↓
Publicação do clone pelo próprio aluno
```

O aluno nunca configura Supabase externo. O Lovable Cloud usa a base open-source do Supabase internamente, mas criação, isolamento e operação ficam centralizados na Lovable.

O Remix leva código e schema do banco, não dados, usuários, segredos, conexões, domínio ou estado de publicação. Cada cópia é independente e precisa receber o bootstrap e o provisionamento de integrações.

Por exigência do Lovable Cloud, o repositório mantém um `.env` com URL, ID e publishable key nos nomes de runtime `SUPABASE_*` e nos equivalentes `VITE_SUPABASE_*`. São seis bindings públicos gerenciados, não Secrets: durante o Remix a Lovable os recria para a nova API e o novo banco. `SUPABASE_SERVICE_ROLE_KEY`, credenciais privadas e integrações externas nunca entram nesse arquivo.

O bootstrap seguro do responsável, da configuração inicial e dos planos está implementado como operação transacional e idempotente. Em 9 de outubro de 2026, um Remix externo confirmou editor/LP independentes, 53 tabelas sem registros, zero usuários, Secrets sem valores herdados e clone não publicado. A cópia e o isolamento estão comprovados; a ativação real do primeiro proprietário e os E2E de WhatsApp e Google ainda são gates de liberação.

## Autoridade dos dados

```text
WhatsApp / painel
       ↓
reserva transacional no Lovable Cloud
       ↓
confirmação + fila de automações
       ↓
Google Agenda / mensagens / avisos
```

A agenda interna é a autoridade. Google Agenda é espelho e fonte adicional de indisponibilidade. A integração externa nunca pode criar dois compromissos no mesmo intervalo.

## Camadas gerenciadas

- Lovable Cloud: persistência, autenticação, realtime, storage e funções;
- Lovable AI: interpretação da conversa e geração controlada de respostas;
- Lovable Hosting: preview, publicação e domínio;
- Lovable Secrets: credenciais exclusivamente no servidor;
- PWA: atalho na tela inicial e experiência móvel.

WhatsApp e Google são serviços externos autorizados por clone. Nenhuma credencial entra no código ou é transportada pelo Remix; os valores server-side ficam nos Secrets da Lovable daquele projeto.

## Decisão de WhatsApp

O projeto possui superadmin e arquitetura multiempresa. A implementação atual usa Evolution API multi-conta: cada tenant possui sua instância/número, enquanto o backend do app permanece no Lovable Cloud.

Cada clone precisa receber `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` nos Secrets antes de gerar QR ou código de pareamento. Esses valores não vêm no Remix. A tela de integração deve distinguir indisponível por falta de provisionamento, conectado e testado.

Uma futura adoção de conector nativo só pode substituir a Evolution se suportar o desenho multiempresa, com uma conexão por tenant. Agenda, clientes, OS, IA, autenticação e dados continuam no Lovable Cloud.

## Decisão de Google Agenda

A implementação atual usa OAuth próprio e exige `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` nos Secrets de cada clone. O callback `https://SEU-DOMINIO/api/public/google-callback` também precisa ser autorizado no provedor Google. O state é aleatório e persistido somente como hash no banco, sem Secret adicional.

A migração para o App User Connector da Lovable está planejada, mas ainda não foi implementada ou validada. A documentação de entrega deve continuar descrevendo o OAuth atual até essa migração ser comprovada.

## Estados principais

Agendamento:

```text
hold → pending_confirmation → confirmed → checked_in → in_progress → completed
                                          ↘ no_show
hold/pending/confirmed → cancelled
```

Ordem de serviço:

```text
draft → open → in_progress → completed
                    ↘ waiting_customer
qualquer estado aberto → cancelled
```

Integração:

```text
not_connected → connected → tested
                     ↘ error
```

“Conectado” nunca é apresentado como “testado”.

## Contrato do Remix

O projeto-mãe deve:

- conter zero dados reais de clientes;
- usar Lovable Cloud, nunca backend Supabase externo;
- manter segredos fora do código;
- receber bootstrap seguro de responsável, configuração e planos antes da liberação pública;
- funcionar sem BYOK de OpenAI/Claude no onboarding;
- apresentar implantação guiada e sem jargão técnico;
- estar estável na versão mais recente antes de habilitar Public remixing.

O clone deve:

- começar não publicado;
- manter banco, usuários e integrações isolados;
- exigir ativação do responsável antes da divulgação;
- exigir provisionamento dos Secrets e depois a conexão/autorização das contas externas;
- impedir operação quando faltarem serviço, profissional ou disponibilidade.

## Verificação antes de liberar o projeto-mãe

1. Remix real em uma segunda conta/projeto de teste.
2. Confirmação de que schema e políticas foram copiados, sem registros.
3. Bootstrap do responsável, configuração básica e planos.
4. Provisionamento dos Secrets da Evolution no clone.
5. Publicação de uma versão de teste e configuração do webhook na URL servida.
6. Conexão real do WhatsApp em número de teste, com mensagem recebida e resposta enviada.
7. Provisionamento do OAuth Google por clone e autorização do callback.
8. Google Agenda cria, atualiza e cancela sem duplicar.
9. Dois pedidos simultâneos para o mesmo horário produzem um sucesso e um conflito legível.
10. Uma agenda concluída gera apenas uma OS vinculada.
11. Um clone não lê nem altera dados de outro.
12. PWA, mobile e URL final conferidos em aparelho real.

## Manutenção

GitHub é apenas a camada técnica da equipe. A Lovable precisa criar e conectar seu próprio repositório antes das edições externas. Git Sync permite editar sem consumir créditos de edição, mas sincronização de código não comprova publicação, aplicação de banco ou deploy de funções.

Cloud/runtime, Lovable AI e serviços externos de WhatsApp/Meta/Evolution possuem limites e custos próprios. “Sem crédito de edição” não deve ser comunicado como “sem custo operacional”.
