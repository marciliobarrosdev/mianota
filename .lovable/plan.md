# Editar assinante e foto do assinante

## 1. "Editar assinante" no menu de ações
- Nova opção **Editar assinante** no menu "…" de cada linha em `/master/assinantes`.
- Abre um formulário (janela lateral) já preenchido com os dados atuais: foto, nome da empresa, CPF/CNPJ, telefone, e-mail de contato, endereço completo e demais campos do cadastro "Novo assinante".
- Mesmas máscaras e validações do cadastro (CPF/CNPJ, telefone BR, e-mail). Botão **Salvar** grava, mostra confirmação e atualiza a lista na hora; erros aparecem em português no campo.
- Plano, trial e créditos continuam nas ações já existentes (não mudam aqui).

## 2. Foto do assinante
- Primeiro campo do "Novo assinante" (e do "Editar"): **Inserir imagem do assinante**.
- Aceita JPEG, PNG ou WebP, até 2 MB, e precisa ser quadrada (1:1). Fora disso, mostra o motivo e não envia.
- Pré-visualização redonda, com opção de trocar ou remover.
- A foto passa a aparecer em todos os lugares com o ícone do assinante: lista e ficha em Assinantes, Assinaturas, Conversas do Master, e no topo/menu da área do assinante (`/app`). Sem foto, continua aparecendo as iniciais.

## Detalhes técnicos
- Usa a coluna existente `company.logo_url`; sem mudança de tabela.
- Novo bucket público `subscriber-avatars` (limite 2 MB, tipos image/jpeg, png, webp); upload feito por server function Master (verifica super-admin, valida tipo, tamanho e proporção lendo dimensões no servidor), salva em `<company_id>/<uuid>.ext` e apaga a anterior.
- Regras puras em `src/lib/master/subscriber-avatar-rules.ts` (tipo, 2 MB, 1:1) + testes Vitest.
- Nova server function `updateCompanyProfile` em `master.functions.ts` (super-admin, normaliza telefone E.164/e-mail/CPF-CNPJ) + `getCompanyDetails` passa a retornar todos os campos editáveis.
- `createCompanyWithOwner` recebe a foto opcional (enviada após criar a empresa).
- Componente compartilhado `SubscriberAvatar` (foto ou `InitialsAvatar`) usado em todas as telas citadas; `listCompanies` e dados de sessão do `/app` incluem `logo_url`.
