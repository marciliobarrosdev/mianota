# Guia de Deploy em Produção com Docker Compose (Ubuntu 26.10)

> **Domínio Configurado**: `mianota.zapyer.io`  
> **IP da VPS**: `189.24.3.171`  
> **Status DNS**: Resolvido com sucesso (`mianota.zapyer.io -> 189.24.3.171`)  
> **Segurança SSL**: Automático via Let's Encrypt (Caddy)

---

## 1. Pré-requisitos na VPS (Ubuntu 26.10)

Acesse a VPS via SSH:
```bash
ssh root@189.24.3.171
```

### 1.1 Instalar Docker e Docker Compose
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker
```

### 1.2 Liberar Portas no Firewall (UFW)
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

---

## 2. Clonar o Repositório

```bash
mkdir -p /opt/mianota
git clone -b feat/mianota-ai-and-whatsapp https://github.com/marciliobarrosdev/mianota.git /opt/mianota
cd /opt/mianota
```

*(Se você já tem o código ou vai atualizar via `git pull`:)*
```bash
cd /opt/mianota
git pull origin feat/mianota-ai-and-whatsapp
```

---

## 3. Configurar o Arquivo `.env` na VPS

Crie o arquivo `/opt/mianota/.env` com as configurações de produção:

```bash
nano /opt/mianota/.env
```

Cole o conteúdo abaixo:

```env
# Supabase Project Credentials
SUPABASE_PROJECT_ID="abgsdnrfyivkwqwwlixf"
SUPABASE_URL="https://abgsdnrfyivkwqwwlixf.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_RWXTp9hAmErHvLLD72G1sg_1Ppabdcp"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZ3NkbnJmeWl2a3dxd3dsaXhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5Mzk4NTIxNSwiZXhwIjoyMTA5NTYxMjE1fQ.d2tNVyj4YxFc8NHWQyuWo9AFS16JtbsBPAtUuQomrRY"

# PostgreSQL Database Pooler (Supabase Porta 5432)
DATABASE_URL="postgres://postgres.abgsdnrfyivkwqwwlixf:!Socorr%40o013@aws-0-us-east-2.pooler.supabase.com:5432/postgres"

# Notificações Web Push (VAPID)
VAPID_PUBLIC_KEY="BNU7S6uUWADsreaeoW19xBsATtQIjbCR2qCH_c4_n6B8XjnvSGcWtGcjoKFRDNSqUL6LeYbCdbFShmOi3g5Jx3c"
VAPID_PRIVATE_KEY="JEgF8Vy_KvrY-oRx3n8nwLhbMFNzKJ0ApJ24_Gk741Q"
VAPID_SUBJECT="mailto:suporte@mianota.zapyer.io"

# Microserviço WhatsApp Go (whatsmeow)
WHATSAPP_PROVIDER=whatsmeow
WHATSAPP_GO_URL=http://whatsapp-go:8085
WHATSAPP_GO_API_KEY=mianota_whatsapp_go_secret_key
WHATSAPP_WEBHOOK_URL=http://app:8080/api/public/support-whatsapp-webhook
WHATSAPP_WEBHOOK_TOKEN=c15872bc-c40d-4be5-8f83-f1b823848d51

# Resend E-mails Transacionais
RESEND_API_KEY=""
RESEND_WEBHOOK_SECRET=""
RESEND_DEFAULT_FROM="MIAnota <onboarding@resend.dev>"
RESEND_REPLY_TO="mbarrosdev13@gmail.com"

# Provedores de Inteligência Artificial (MIA)
GEMINI_API_KEY=""
OPENROUTER_API_KEY=""
DEEPSEEK_API_KEY=""
XAI_API_KEY=""
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
```

Salve com `Ctrl + O` e saia com `Ctrl + X`.

---

## 4. Executar o Deploy com Docker Compose

Na pasta `/opt/mianota`, execute:

```bash
docker compose up -d --build
```

O Docker irá compilar:
1. `mianota-whatsapp-go`: Microserviço em Go com whatsmeow.
2. `mianota-app`: Aplicação Fullstack TanStack Start compilada para produção.
3. `mianota-caddy`: Servidor Web seguro com emissão automática de certificado SSL HTTPS Let's Encrypt para `mianota.zapyer.io`.

---

## 5. Verificar o Status dos Serviços

```bash
docker compose ps
```

Saída esperada:
```
NAME                 IMAGE                 STATUS                   PORTS
mianota-app          mianota-app           Up (healthy)             0.0.0.0:8080->8080/tcp
mianota-caddy        caddy:2.8-alpine      Up                       0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
mianota-whatsapp-go  mianota-whatsapp-go   Up (healthy)             0.0.0.0:8085->8085/tcp
```

Para inspecionar logs em tempo real:
```bash
docker compose logs -f
```

---

## 6. Acesso e Inicialização do Sistema

1. **Acessar o Painel**:  
   Abra no navegador: `https://mianota.zapyer.io`

2. **Conectar o WhatsApp Central**:  
   - Acesse: `https://mianota.zapyer.io/master/whatsapp-qr`
   - Escaneie o QR Code com o aplicativo do WhatsApp no aparelho do suporte/MIA.

3. **Verificar Central de Conversas**:  
   - Acesse: `https://mianota.zapyer.io/master/conversas`
   - O painel exibirá as mensagens recebidas, respostas da MIA e fila de atendimento em tempo real.

4. **Verificar IA e Provedores**:  
   - Acesse: `https://mianota.zapyer.io/master/ia-creditos`
   - Todos os 6 provedores estarão disponíveis com Google Gemini como principal e busca semântica vetorial ativa com pgvector.

---

## 7. Comandos de Manutenção

- **Parar o sistema**:
  ```bash
  docker compose down
  ```
- **Reiniciar o sistema**:
  ```bash
  docker compose restart
  ```
- **Atualizar código e recompilar**:
  ```bash
  git pull origin feat/mianota-ai-and-whatsapp
  docker compose up -d --build
  ```
