# Corrigir planos que voltam sozinhos para valores antigos

## Causa encontrada
Uma rotina interna de inicialização da instalação roda a cada login e a cada cadastro pela página principal. Ela regrava os planos à força: Basic R$ 49,00, Pro R$ 69,00 e desativa todos os outros (inclusive o Grátis). Por isso, logo após qualquer cadastro, o Grátis fica "Inativo" e o cadastro diz que o plano não está disponível. O registro de mudanças às 02:47 confirma: todos os planos foram alterados juntos, segundos após sua última edição no Master.

## Correção
1. Remover dessa rotina toda escrita na tabela de planos (preços, nomes, ativo/inativo, ordem). Ela continua só fazendo o que deve: reconhecer o dono da instalação e preparar a empresa.
2. Restaurar os valores corretos: Grátis ativo, sem custo, 7 dias; Basic R$ 29,90/mês ativo; Pro R$ 49,90/mês ativo; Business continua inativo.
3. Proteção extra: a trava de planos só aceitará alterações vindas das ações do Master (sem exceção para rotinas internas), para nada mais conseguir mudar planos por fora.
4. Teste automático que garante que a rotina de inicialização não contém escrita em planos.
5. Validar: cadastrar pelo site no Grátis (formulário abre e avança), depois conferir em /master/planos que os valores continuaram iguais.

## Detalhes técnicos
- Migration recria `bootstrap_remix_instance` sem os `UPDATE public.plan` (mantendo a migração de company/subscription business→pro só quando ainda aplicável, sem tocar em plan).
- `guard_plan_write`: remover bypass por papel postgres/supabase_admin dentro de funções SECURITY DEFINER; permitir apenas a flag `app.plan_admin_write` (setada por `master_save_plan`/`master_delete_plan`) e migrações.
- Correção de dados via SQL com a flag ativa.
- Teste Vitest lendo a definição/migração e verificando ausência de `UPDATE public.plan`.
