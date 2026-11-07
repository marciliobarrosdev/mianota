# Organização geral do MIAnota

Objetivo: deixar o sistema mais limpo, organizado e documentado, com o nome **MIAnota** e a assistente **MIA** em todo lugar visível — sem mudar como nada funciona e sem perder dados de clientes.

## O que será feito (em etapas, cada uma deixando o app funcionando)

1. **Remover o que não é usado**
   - Arquivos, funções, componentes e imagens que nenhuma página usa mais.
   - Códigos antigos/duplicados que ficaram de mudanças anteriores.
   - Páginas antigas continuam apenas redirecionando (links antigos seguem funcionando).

2. **Nome MIAnota / MIA em todo o sistema**
   - Trocar todos os textos, nomes de arquivos, funções e comentários que ainda dizem "marcIA"/"Marcia" (cerca de 316 ocorrências em ~50 arquivos).
   - **Preservados de propósito:** nomes internos que guardam dados no banco ou no celular do cliente (ex.: chaves de dados salvos, colunas do banco), para ninguém perder informação nem sair do app.

3. **Juntar códigos repetidos**
   - Funções de apoio copiadas em vários lugares passam a existir uma única vez.

4. **Dividir arquivos grandes demais** (mais de ~700 linhas)
   - Telas: Notificações, Planos (Master), Configurações (Master), Movimentações, Planejamento, Visão geral.
   - Regras do servidor: comandos financeiros, painel financeiro, funções do Master, WhatsApp financeiro.
   - Cada arquivo fica com uma única responsabilidade clara.

5. **Comentários claros**
   - Cabeçalho explicando o propósito de cada arquivo e comentários nas regras importantes (preços, planos, pagamentos, WhatsApp, segurança). Sem comentários óbvios.

6. **Documentação**
   - **README.md**: visão geral, estrutura de pastas, como rodar.
   - **MANUAL.md**: guia de uso para assinante e proprietário (Master).
   - **NOVAS-IMPLEMENTAÇÕES.md**: registro datado de tudo que foi alterado nesta organização.

## Como vou confirmar que nada quebrou
- Rodar os testes existentes após cada etapa.
- Verificar que o sistema compila sem erros.
- Abrir no navegador: página inicial, /entrar, /app (painel, MIA, movimentações, notificações) e /master, conferindo que abrem sem erros.

## O que NÃO muda
- Preços, planos, pagamentos InfinitePay, regras do plano grátis, WhatsApp, e-mails.
- Visual das páginas.
- Dados salvos de clientes.

## Detalhes técnicos
- Respeitar regras de `AGENTS.md` (pastas por domínio em src/lib, realms de auth verificados por `scripts/verify-auth-realms.mjs`, rotas redirect-only).
- Não editar arquivos gerados (`routeTree.gen.ts`, `integrations/supabase/*`).
- Identificadores `marcia_*` em storage/DB e keyframes mantidos ou migrados com fallback de leitura.
- Remoção de código morto guiada por busca de imports (rg) antes de excluir.
- Atualizar `AGENTS.md` com as novas divisões de módulos.
