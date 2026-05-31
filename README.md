# 💰 Gastos Compartilhados

App mobile para controle de gastos em casal/família com sincronização em tempo real.

## Funcionalidades

- **Autenticação** — cadastro e login com e-mail/senha
- **Grupos compartilhados** — crie um grupo e compartilhe o código com sua namorada
- **Contas Fixas** — aluguel, internet, luz, etc. — visíveis para todos do grupo
- **Gastos Variáveis** — supermercado, lazer, saúde, etc.
- **Resumo mensal** — total geral, fixo vs variável, por categoria
- **Sincronização em tempo real** — qualquer alteração aparece instantaneamente para todos

## Tecnologias

- React Native + Expo (SDK 55)
- Expo Router (navegação por arquivos)
- Firebase Authentication
- Firebase Firestore (real-time)
- TypeScript

## Configuração do Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Crie um projeto novo
3. Ative **Authentication → E-mail/senha**
4. Ative **Firestore Database** (modo produção ou teste)
5. Crie o arquivo `services/firebase.ts` com suas credenciais:

```ts
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJECT.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_PROJECT.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID",
};
```

### Regras do Firestore (recomendadas)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    match /groups/{groupId} {
      allow read, write: if request.auth != null;
    }
    match /expenses/{expenseId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Como rodar

```bash
npm install
npm start
```

Abra no **Expo Go** (Android/iOS) ou emulador.

## Estrutura de pastas

```
app/
  _layout.tsx          # Root layout com AuthProvider
  group.tsx            # Tela de gerenciar grupo
  (auth)/
    login.tsx
    register.tsx
  (tabs)/
    index.tsx          # Dashboard / Resumo
    expenses.tsx       # Gastos variáveis
    bills.tsx          # Contas fixas
    profile.tsx        # Perfil e configurações
components/
  AddExpenseModal.tsx  # Modal para adicionar/editar gastos
context/
  AuthContext.tsx      # Context de autenticação
services/
  firebase.ts          # Config do Firebase ⚠️ preencher credenciais
  auth.ts              # Funções de auth e grupos
  expenses.ts          # Funções de gastos e Firestore
```
