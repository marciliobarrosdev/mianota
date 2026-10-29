# IA e Créditos: Lovable AI, OpenAI e Anthropic prontos para uso

A página /master/ia-creditos já tem a base (escolha do provedor, campo de chave, modelo e "Modo otimizado"). O plano completa o que falta para cada opção funcionar de verdade quando ativada.

## O que você vai ver
- Três cartões de provedor: **Lovable AI** (padrão, sem chave), **OpenAI** e **Anthropic**, com selo "Ativo", "Chave salva, falta testar", "Testado" ou "Erro".
- Em OpenAI/Anthropic: campo **API Key** (mostrada só mascarada, ex. "••••1a2b"), botões **Salvar chave**, **Testar**, **Remover**.
- **Modelo da LLM**: lista atualizada de modelos atuais de cada provedor (rápido/econômico até maior qualidade), com dica de custo.
- **Modo otimizado** (liga/desliga): ligado usa o modelo econômico do provedor nas rotinas automáticas (classificar gastos, ler comprovantes) e o modelo escolhido só no chat MárcIA; desligado usa o modelo escolhido em tudo.
- Botão **Ativar este provedor**: só ativa depois de um teste bem-sucedido com a chave e o modelo escolhidos. Só um provedor fica ativo por vez.
- Se a chave própria falhar (chave inválida, sem saldo), a IA continua respondendo pela Lovable AI e a página mostra o último erro, para o assistente nunca ficar mudo.

## Detalhes técnicos
- `src/lib/ai-provider.server.ts`: atualizar `AI_MODEL_OPTIONS` com IDs atuais (Lovable: `openai/gpt-6-astra`, Gemini Flash atual, etc.; OpenAI e Anthropic: modelos atuais de cada um, conferidos na hora da implementação). Adicionar modelo "econômico" por provedor para o modo otimizado. Aplicar `optimized` também no BYOK (hoje é ignorado). Em caso de erro no BYOK, registrar `last_error` em `ai_provider_config` e cair para Lovable AI.
- `src/lib/ai-config.functions.ts`: o teste passa a usar o **modelo escolhido** (hoje testa sempre o primeiro); `saveMode` valida modelo contra a lista e exige `test_ok` para ativar OpenAI/Anthropic; limpar cache após salvar.
- OpenAI: trocar chamada para Responses API com `max_output_tokens`; Anthropic segue `/v1/messages`. Remover parâmetros não aceitos por modelos novos.
- `src/routes/master/ia-creditos.tsx`: reorganizar em cartões por provedor com os estados acima e exibir `last_error`.
- Chaves continuam guardadas criptografadas via `integration-secrets.server.ts`, nunca voltam ao navegador.
- Teste em `tests/` para a regra de escolha de modelo (otimizado x escolhido) e o retorno para Lovable AI quando o BYOK falha.
- Verificação: testar Lovable AI ao vivo; OpenAI/Anthropic só podem ser testados depois que você salvar suas chaves.
