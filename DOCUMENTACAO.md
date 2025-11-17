## Autenticação

A maioria das rotas requer autenticação via token JWT no header:

```http
Authorization: Bearer <token>
```

Os tokens são obtidos através do endpoint de login e têm validade de 7 dias.

Algumas rotas requerem permissão de administrador (`role: "admin"`).

---

## Autenticação

### POST `/api/auth/register`

Registra um novo usuário no sistema.

**Autenticação:** Não requerida

**Body da Requisição:**

```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "senha123"
}
```

**Resposta de Sucesso (200):**

```json
{
  "id": "uuid-do-usuario",
  "email": "joao@example.com"
}
```

**Respostas de Erro:**

- `500`: Erro interno do servidor (inclui casos de e-mail já cadastrado ou falha ao salvar usuário)

---

### POST `/api/auth/login`

Autentica um usuário e retorna um token JWT.

**Autenticação:** Não requerida

**Body da Requisição:**

```json
{
  "email": "joao@example.com",
  "password": "senha123"
}
```

**Resposta de Sucesso (200):**

```json
{
  "token": "jwt-token-aqui",
  "user": {
    "id": "uuid-do-usuario",
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": null,
    "role": "user",
    "isActive": true
  }
}
```

**Respostas de Erro:**

- `500`: Erro interno do servidor (inclui casos de credenciais inválidas)

---

### POST `/api/auth/forgot-password`

Solicita redefinição de senha. Envia um e-mail com link para redefinição.

**Autenticação:** Não requerida

**Body da Requisição:**

```json
{
  "email": "joao@example.com"
}
```

**Resposta de Sucesso (200):**

```json
{
  "ok": true
}
```

**Nota:** A resposta é sempre `ok: true`, mesmo se o e-mail não existir no sistema (por segurança).

**Respostas de Erro:**

- `500`: Erro interno do servidor

---

### POST `/api/auth/reset-password`

Redefine a senha do usuário usando o token enviado por e-mail.

**Autenticação:** Não requerida

**Body da Requisição:**

```json
{
  "token": "jwt-token-do-email",
  "newPassword": "novaSenha123"
}
```

**Resposta de Sucesso (200):**

```json
{
  "ok": true
}
```

**Respostas de Erro:**

- `500`: Erro interno do servidor (inclui casos de token inválido ou expirado)

**Mensagens de Erro:**

- "Token expirado. Solicite um novo link de redefinição."
- "Token inválido."

---

### GET `/api/auth/me`

Retorna o perfil do usuário autenticado.

**Autenticação:** Bearer Token (requerida)

**Parâmetros:** Nenhum

**Resposta de Sucesso (200):**

```json
{
  "id": "uuid-do-usuario",
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "+5511999999999",
  "role": "user",
  "isActive": true
}
```

**Respostas de Erro:**

- `401`: Token ausente ou inválido
- `500`: Erro interno do servidor (inclui casos de usuário não encontrado)

---

### PUT `/api/auth/me`

Atualiza o perfil do usuário autenticado.

**Autenticação:** Bearer Token (requerida)

**Body da Requisição:**

```json
{
  "name": "João Silva Santos",
  "email": "novoemail@example.com",
  "phone": "+5511999999999"
}
```

**Campos permitidos:** `name`, `email`, `phone`

**Campos não permitidos:** `role`, `isActive`, `passwordHash`

**Resposta de Sucesso (200):**

```json
{
  "id": "uuid-do-usuario",
  "name": "João Silva Santos",
  "email": "novoemail@example.com",
  "phone": "+5511999999999",
  "role": "user",
  "isActive": true
}
```

**Respostas de Erro:**

- `401`: Token ausente ou inválido
- `500`: Erro interno do servidor (inclui casos de e-mail já cadastrado ou usuário não encontrado)

---

## Planos

### GET `/api/plans`

Lista todos os planos disponíveis.

**Autenticação:** Bearer Token (requerida)

**Parâmetros:** Nenhum

**Resposta de Sucesso (200):**

```json
[
  {
    "id": "uuid-do-plano",
    "title": "Plano Mensal",
    "price": "29.90",
    "currency": "BRL",
    "frequency": 1,
    "frequency_type": "months",
    "mpPlanId": "id-do-mercadopago",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Respostas de Erro:**

- `401`: Token ausente ou inválido
- `500`: Erro interno do servidor

---

### POST `/api/plans`

Cria um novo plano de assinatura.

**Autenticação:** Bearer Token + Admin (requerida)

**Body da Requisição:**

```json
{
  "title": "Plano Mensal",
  "price": 29.9,
  "currency": "BRL",
  "frequency": 1,
  "frequency_type": "months"
}
```

**Campos obrigatórios:** `title`, `price`

**Campos opcionais:** `currency` (padrão: "BRL"), `frequency` (padrão: 1), `frequency_type` (padrão: "months")

**Valores válidos para `frequency_type`:** `"days"`, `"months"`, `"years"`

**Resposta de Sucesso (200):**

```json
{
  "id": "uuid-do-plano",
  "title": "Plano Mensal",
  "price": "29.90",
  "currency": "BRL",
  "frequency": 1,
  "frequency_type": "months",
  "mpPlanId": "id-do-mercadopago",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Respostas de Erro:**

- `400`: Campos obrigatórios ausentes (`title` ou `price`)
- `401`: Token ausente ou inválido
- `403`: Acesso negado (não é admin)
- `500`: Erro interno do servidor (inclui casos de `price` menor ou igual a zero, falha ao criar plano no MercadoPago ou falha ao salvar no banco)

**Mensagens de Erro:**

- "title e price são obrigatórios"
- "price deve ser maior que zero"
- "Falha ao criar plano no MercadoPago: [mensagem]"
- "Falha ao salvar plano no banco: [mensagem]"

---

### PUT `/api/plans/:id`

Atualiza um plano existente.

**Autenticação:** Bearer Token + Admin (requerida)

**Parâmetros de URL:**

- `id`: UUID do plano

**Body da Requisição:**

```json
{
  "title": "Plano Mensal Atualizado",
  "price": 39.9,
  "isActive": false
}
```

**Resposta de Sucesso (200):**

```json
{
  "id": "uuid-do-plano",
  "title": "Plano Mensal Atualizado",
  "price": "39.90",
  "currency": "BRL",
  "frequency": 1,
  "frequency_type": "months",
  "mpPlanId": "id-do-mercadopago",
  "isActive": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Respostas de Erro:**

- `401`: Token ausente ou inválido
- `403`: Acesso negado (não é admin)
- `500`: Erro interno do servidor (inclui casos de plano não encontrado)

---

### DELETE `/api/plans/:id`

Desativa um plano (soft delete).

**Autenticação:** Bearer Token + Admin (requerida)

**Parâmetros de URL:**

- `id`: UUID do plano

**Resposta de Sucesso (200):**

```json
{
  "id": "uuid-do-plano",
  "title": "Plano Mensal",
  "price": "29.90",
  "currency": "BRL",
  "frequency": 1,
  "frequency_type": "months",
  "mpPlanId": "id-do-mercadopago",
  "isActive": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Respostas de Erro:**

- `401`: Token ausente ou inválido
- `403`: Acesso negado (não é admin)
- `500`: Erro interno do servidor (inclui casos de plano não encontrado)

---

## Assinaturas

### POST `/api/subscriptions/subscribe`

Inicia o processo de assinatura de um plano. Retorna uma URL de checkout do MercadoPago.

**Autenticação:** Bearer Token (requerida)

**Body da Requisição:**

```json
{
  "planId": "uuid-do-plano",
  "externalReference": "opcional-identificador-externo"
}
```

**Campos obrigatórios:** `planId`

**Campos opcionais:** `externalReference` (identificador externo para rastrear a assinatura)

**Resposta de Sucesso (200):**

```json
{
  "subscriptionId": "id-da-assinatura-mercadopago",
  "status": "pending",
  "checkoutUrl": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
  "initPoint": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=..."
}
```

**Respostas de Erro:**

- `400`: planId é obrigatório
- `401`: Token ausente ou inválido
- `500`: Erro interno do servidor (inclui casos de plano inválido ou falha ao criar assinatura no MercadoPago)

**Mensagens de Erro:**

- "planId é obrigatório"
- "Plano inválido"

**Nota:** Qualquer assinatura pendente do usuário será cancelada antes de criar uma nova.

---

### GET `/api/subscriptions/me`

Retorna a assinatura ativa do usuário autenticado.

**Autenticação:** Bearer Token (requerida)

**Parâmetros:** Nenhum

**Resposta de Sucesso (200) - Com assinatura:**

```json
{
  "status": "premium",
  "subscription": {
    "id": "uuid-da-assinatura",
    "planId": "uuid-do-plano",
    "planTitle": "Plano Mensal",
    "status": "active",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-02-01T00:00:00.000Z"
  }
}
```

**Resposta de Sucesso (200) - Sem assinatura:**

```json
{
  "status": "free",
  "subscription": null
}
```

**Possíveis valores de `status`:**

- `"free"`: Sem assinatura
- `"premium"`: Assinatura ativa
- `"pending"`: Assinatura pendente
- `"canceled"`: Assinatura cancelada
- `"expired"`: Assinatura expirada

**Respostas de Erro:**

- `401`: Token ausente ou inválido
- `500`: Erro interno do servidor

---

### POST `/api/subscriptions/webhook`

Webhook do MercadoPago para notificar sobre mudanças em assinaturas.

**Autenticação:** Não requerida

**Body da Requisição:**

```json
{
  "action": "preapproval.created",
  "data": {
    "id": "id-da-assinatura-mercadopago"
  }
}
```

**Ações suportadas:**

- `preapproval.created`: Nova assinatura criada
- `preapproval.updated`: Assinatura atualizada
- `preapproval.paused`: Assinatura pausada
- `preapproval.cancelled`: Assinatura cancelada

**Resposta de Sucesso (200):**

```text
Status: 200 OK
```

**Respostas de Erro:**

- `400`: Payload inválido
- `500`: Erro interno do servidor

**Nota:** Este endpoint é chamado automaticamente pelo MercadoPago. Quando uma assinatura é ativada, o sistema atualiza automaticamente o status e calcula as datas de início e fim baseado na frequência do plano.

---

## Partidas

### GET `/api/matches/live`

Lista as partidas em andamento, com dados já normalizados para o formato interno utilizado também nas mensagens MQTT.

**Autenticação:** Não requerida

**Parâmetros:** Nenhum

**Resposta de Sucesso (200):**

```json
[
  {
    "id": "k82rekhxeo6zrep",
    "status": 2,
    "homeScore": 0,
    "awayScore": 1,
    "score": [
      "k82rekhxeo6zrep",
      2,
      [0, 0, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 1, 0, 0],
      1617356761,
      ""
    ],
    "stats": [
      {
        "type": 3,
        "home": 1,
        "away": 3
      }
    ],
    "incidents": [
      {
        "type": 1,
        "position": 2,
        "time": 3,
        "home_score": 1,
        "away_score": 0,
        "player_name": "Krivska K."
      }
    ],
    "tlive": []
  }
]
```

**Respostas de Erro:**

- `500`: Erro interno do servidor ou falha ao consultar o provedor de dados

---

### GET `/api/matches/:id/stats`

Retorna estatísticas completas de uma partida específica, no mesmo formato normalizado utilizado em `GET /api/matches/live`.

**Autenticação:** Bearer Token + Plano ativo (requer `requiresPremium`)

**Parâmetros de URL:**

- `id`: ID da partida

**Resposta de Sucesso (200):**

```json
{
  "id": "k82rekhxeo6zrep",
  "score": [
    "k82rekhxeo6zrep",
    2,
    [0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 1, 0, 0],
    1617356761,
    ""
  ],
  "stats": [
    {
      "type": 3,
      "home": 1,
      "away": 3
    }
  ],
  "incidents": [
    {
      "type": 1,
      "position": 2,
      "time": 3,
      "home_score": 1,
      "away_score": 0,
      "player_name": "Krivska K."
    }
  ],
  "tlive": []
}
```

**Respostas de Erro:**

- `401`: Token ausente ou inválido
- `402`: Plano ativo necessário (requer assinatura premium)
- `500`: Erro interno do servidor ou falha ao consultar o provedor de dados

---

## Administração

Todas as rotas de administração requerem autenticação e permissão de administrador.

### GET `/api/admin/users`

Lista todos os usuários do sistema (máximo 200, ordenados por ID decrescente).

**Autenticação:** Bearer Token + Admin (requerida)

**Parâmetros:** Nenhum

**Resposta de Sucesso (200):**

```json
[
  {
    "id": "uuid-do-usuario",
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "+5511999999999",
    "role": "user",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Respostas de Erro:**

- `401`: Token ausente ou inválido
- `403`: Acesso negado (não é admin)
- `500`: Erro interno do servidor

---

### PUT `/api/admin/users/:id`

Atualiza os dados de um usuário.

**Autenticação:** Bearer Token + Admin (requerida)

**Parâmetros de URL:**

- `id`: UUID do usuário

**Body da Requisição:**

```json
{
  "name": "João Silva Santos",
  "email": "novoemail@example.com",
  "phone": "+5511999999999",
  "role": "admin",
  "isActive": true
}
```

**Resposta de Sucesso (200):**

```json
{
  "ok": true
}
```

**Respostas de Erro:**

- `401`: Token ausente ou inválido
- `403`: Acesso negado (não é admin)
- `500`: Erro interno do servidor

---

### GET `/api/admin/subscriptions`

Lista todas as assinaturas do sistema (máximo 200, ordenadas por ID decrescente).

**Autenticação:** Bearer Token + Admin (requerida)

**Parâmetros:** Nenhum

**Resposta de Sucesso (200):**

```json
[
  {
    "id": "uuid-da-assinatura",
    "userId": "uuid-do-usuario",
    "planId": "uuid-do-plano",
    "status": "active",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-02-01T00:00:00.000Z",
    "paymentId": "id-do-mercadopago",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Respostas de Erro:**

- `401`: Token ausente ou inválido
- `403`: Acesso negado (não é admin)
- `500`: Erro interno do servidor

---

### GET `/api/admin/notifications`

Lista todas as notificações do sistema (máximo 200, ordenadas por ID decrescente).

**Autenticação:** Bearer Token + Admin (requerida)

**Parâmetros:** Nenhum

**Resposta de Sucesso (200):**

```json
[
  {
    "id": "uuid-da-notificacao",
    "userId": "uuid-do-usuario",
    "type": "websocket",
    "message": "Mensagem de alerta",
    "status": "sent",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Tipos de notificação:**

- `"websocket"`: Enviada via WebSocket
- `"whatsapp"`: Enviada via WhatsApp

**Status possíveis:**

- `"pending"`: Pendente
- `"sent"`: Enviada
- `"failed"`: Falhou

**Respostas de Erro:**

- `401`: Token ausente ou inválido
- `403`: Acesso negado (não é admin)
- `500`: Erro interno do servidor

---

### POST `/api/admin/alerts`

Envia um alerta/notificação para um usuário específico.

**Autenticação:** Bearer Token + Admin (requerida)

**Body da Requisição:**

```json
{
  "userId": "uuid-do-usuario",
  "message": "Mensagem de alerta",
  "via": ["websocket", "whatsapp"]
}
```

**Campos obrigatórios:** `userId`, `message`

**Campos opcionais:** `via` (padrão: `["websocket"]`)

**Valores válidos para `via`:**

- `"websocket"`: Envia via WebSocket
- `"whatsapp"`: Envia via WhatsApp (requer telefone cadastrado)

**Resposta de Sucesso (200):**

```json
{
  "ok": true,
  "result": [
    {
      "id": "uuid-da-notificacao",
      "userId": "uuid-do-usuario",
      "type": "websocket",
      "message": "Mensagem de alerta",
      "status": "sent",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Respostas de Erro:**

- `401`: Token ausente ou inválido
- `403`: Acesso negado (não é admin)
- `500`: Erro interno do servidor (inclui casos de campos obrigatórios ausentes ou falha ao enviar notificações)

**Nota:**

- Se `via` incluir `"whatsapp"` e o usuário não tiver telefone cadastrado, a notificação será criada com status `"failed"`.
- As notificações via WebSocket são enviadas em tempo real através do Socket.IO.
- Cada canal de notificação (websocket, whatsapp) cria um registro separado na tabela de notificações.

---

## Códigos de Erro

### Códigos HTTP

| Código | Descrição                                          |
| ------ | -------------------------------------------------- |
| `200`  | Sucesso                                            |
| `400`  | Erro de validação ou dados inválidos               |
| `401`  | Token ausente ou inválido                          |
| `402`  | Plano ativo necessário (requer assinatura premium) |
| `403`  | Acesso negado (requer permissão de admin)          |
| `404`  | Recurso não encontrado                             |
| `500`  | Erro interno do servidor                           |

### Formato de Resposta de Erro

Todas as respostas de erro seguem o formato:

```json
{
  "error": "Mensagem de erro descritiva"
}
```

### Exemplos de Mensagens de Erro

**401 - Token ausente:**

```json
{
  "error": "Token ausente"
}
```

**401 - Token inválido:**

```json
{
  "error": "Token inválido"
}
```

**403 - Acesso negado:**

```json
{
  "error": "Acesso negado"
}
```

**402 - Plano ativo necessário:**

```json
{
  "error": "Plano ativo necessário"
}
```

**400 - Validação:**

```json
{
  "error": "planId é obrigatório"
}
```

**500 - Erro interno:**

```json
{
  "error": "Erro interno"
}
```

---

## Middleware de Autenticação

### `auth`

Verifica se o token JWT é válido e anexa os dados do usuário em `req.user`.

**Erro:** Retorna `401` se o token estiver ausente ou inválido.

### `isAdmin`

Verifica se o usuário autenticado tem permissão de administrador (`role: "admin"`).

**Erro:** Retorna `403` se o usuário não for admin.

**Pré-requisito:** Requer que o middleware `auth` seja executado antes.

### `requiresPremium`

Verifica se o usuário tem uma assinatura ativa.

**Erros:**

- `401`: Retornado quando o usuário não está autenticado (`Autenticação necessária`).
- `402`: Retornado quando o usuário não possui plano ativo (`Plano ativo necessário`).
- `500`: Retornado quando ocorre falha inesperada ao verificar o plano (`Falha ao verificar plano`).

**Pré-requisito:** Requer que o middleware `auth` seja executado antes.

**Cache:** Utiliza Redis para cachear o status de premium por 5 minutos.

---

## Utilitários

### GET `/api/health`

Endpoint de health check da API.

**Autenticação:** Não requerida

**Parâmetros:** Nenhum

**Resposta de Sucesso (200):**

```json
{
  "ok": true
}
```

**Respostas de Erro:**

- `500`: Erro interno do servidor

---
