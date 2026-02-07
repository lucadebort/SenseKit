# Piano: Auth, Registrazione e Organizzazioni

## Situazione attuale

### Firebase
- **3 progetti Firebase separati**: `stake-mapping`, `sem-diff`, `comp-scape`
- Ogni app ha il suo `.env` con credenziali diverse
- Non si parlano tra loro

### Auth
- **Admin**: email/password pre-creati manualmente nella console Firebase
- **Partecipanti**: auth anonima (`signInAnonymously`) via link `?session=xxx`
- Nessuna registrazione, nessuna organizzazione, nessuna verifica email

---

## Obiettivo

Un unico sistema di autenticazione per tutta la suite SenseKit, con:
- Registrazione utente con verifica email
- Account legati a un'organizzazione
- Accesso a tutti e 3 i tool con un unico account

---

## 1. Un unico progetto Firebase

Migrare tutto sotto un unico progetto Firebase (es. `sensekit`).

Il Realtime Database avrà namespace separati per tool:
```
stakemap_projects/{projectId}/...
stakemap_sessions/{sessionId}/...
semdiff_projects/{projectId}/...
semdiff_sessions/{sessionId}/...
compscape_projects/{projectId}/...
compscape_sessions/{sessionId}/...
```

Le 3 app condivideranno le stesse credenziali Firebase (stesso `.env` o variabili Vercel).

---

## 2. Registrazione

### Form di registrazione
- Nome completo
- Email
- Password
- Nome organizzazione

### Flusso
1. `createUserWithEmailAndPassword(auth, email, password)`
2. `sendEmailVerification(user)` — email di conferma (built-in Firebase)
3. Alla conferma, l'utente risulta `emailVerified: true`
4. Salva profilo utente in DB: `users/{uid}`
5. Crea organizzazione in DB: `organizations/{orgId}`
6. Blocca accesso alla dashboard finché `emailVerified === false`

### Login
- `signInWithEmailAndPassword(auth, email, password)`
- Redirect a dashboard se `emailVerified`, altrimenti mostra messaggio "Controlla la tua email"

---

## 3. Modello dati

```
organizations/{orgId}
  name: string
  createdAt: number
  plan: "free" | "pro" | "enterprise"
  members/
    {uid}: { role: "owner" | "admin" | "member", joinedAt: number }

users/{uid}
  name: string
  email: string
  orgId: string
  createdAt: number

stakemap_projects/{projectId}
  orgId: string
  createdBy: string (uid)
  name, description, config, createdAt, ...

semdiff_projects/{projectId}
  orgId: string
  createdBy: string (uid)
  ...

compscape_projects/{projectId}
  orgId: string
  createdBy: string (uid)
  ...
```

### Relazioni
- Un utente appartiene a una organizzazione (`users/{uid}/orgId`)
- Un'organizzazione ha N membri (`organizations/{orgId}/members`)
- I progetti appartengono a un'organizzazione (`projects/{id}/orgId`)
- Le sessioni appartengono a un progetto

---

## 4. Firebase Rules

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth.uid === $uid",
        ".write": "auth.uid === $uid"
      }
    },
    "organizations": {
      "$orgId": {
        ".read": "root.child('organizations/' + $orgId + '/members/' + auth.uid).exists()",
        ".write": "root.child('organizations/' + $orgId + '/members/' + auth.uid).child('role').val() === 'owner' || root.child('organizations/' + $orgId + '/members/' + auth.uid).child('role').val() === 'admin'"
      }
    },
    "stakemap_projects": {
      ".read": "auth !== null && auth.provider !== 'anonymous'",
      ".write": "auth !== null && auth.provider !== 'anonymous'",
      ".indexOn": ["orgId"]
    },
    "stakemap_sessions": {
      "$sessionId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

(Stesse regole per `semdiff_*` e `compscape_*`)

---

## 5. Modifiche necessarie per app

### Shared (packages/shared-ui o nuovo package)
- Creare `packages/firebase/` con config condivisa + auth helpers
- Oppure: config Firebase condivisa via variabili d'ambiente identiche in tutte le app

### Per ogni app (stake-mapping, semantic-differential, comp-scape)
- Aggiornare `firebase.ts` per puntare al nuovo progetto unico
- Aggiornare `.env` / variabili Vercel con le nuove credenziali
- Aggiungere form di registrazione (o link a pagina registrazione condivisa)
- Aggiungere verifica `emailVerified` prima di mostrare la dashboard
- Filtrare progetti per `orgId` dell'utente corrente

### Login screen
- Aggiungere link "Registrati" sotto il form di login
- Form di registrazione: nome, email, password, nome organizzazione
- Stato post-registrazione: "Controlla la tua email per confermare l'account"

---

## 6. Migrazione

### Step
1. Creare nuovo progetto Firebase `sensekit` con Realtime Database in `europe-west1`
2. Abilitare auth Email/Password
3. Configurare email template per verifica
4. Aggiornare `.env` di tutte le app
5. Deployare le rules
6. Migrare i dati esistenti (se necessario) dai 3 DB separati al nuovo DB unico
7. Disattivare i vecchi progetti Firebase

### Rischi
- Downtime durante la migrazione
- Dati esistenti nei 3 DB separati da migrare
- Session link `?session=xxx` devono continuare a funzionare

---

## 7. Fasi di implementazione suggerite

### Fase 1: Firebase unico (senza cambiare UX)
- Creare progetto `sensekit` su Firebase
- Migrare tutte le app al nuovo progetto
- Verificare che tutto funzioni come prima

### Fase 2: Registrazione
- Form signup con email verification
- Profilo utente in DB
- Login con controllo `emailVerified`

### Fase 3: Organizzazioni
- Modello organizzazione in DB
- Progetti filtrati per `orgId`
- Inviti a membri
- Rules basate su organizzazione

### Fase 4: Dashboard cross-tool (opzionale)
- Una dashboard unica dove l'utente vede tutti i suoi progetti (StakeMap, SemDiff, CompScape)
- Potrebbe vivere su `sensekit.eu/dashboard` o su un sottodominio dedicato
