# EduBoost

Tutor académico con IA para estudiantes. Permite resolver dudas escolares, generar quizzes personalizados y analizar el progreso de aprendizaje usando Gemini AI y Firebase.

## Funcionalidades

- **Tutor IA** — Resuelve dudas por materia y nivel educativo con respuestas paso a paso
- **Quiz** — Genera quizzes personalizados por tema y dificultad
- **Historial** — Guarda y revisa todas las consultas anteriores
- **Estadísticas** — Analiza el progreso académico con Gemini Insights
- **Ajustes** — Configura perfil, nivel educativo y API key personal de Gemini

## Stack

- **Frontend**: React 19 + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express + Node.js
- **IA**: Google Gemini (`@google/genai`)
- **Auth & DB**: Firebase (Authentication + Firestore)
- **Deploy**: Vercel

---

## Desarrollo local

### Requisitos

- Node.js >= 20
- Cuenta en [Firebase](https://console.firebase.google.com)
- API Key de [Google AI Studio](https://aistudio.google.com/app/apikey)

### Instalación

```bash
git clone https://github.com/tu-usuario/eduboost.git
cd eduboost
npm install
```

### Variables de entorno

Copiá `.env.example` a `.env` y completá los valores:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `GEMINI_API_KEY` | API Key de Google AI Studio (servidor) |
| `APP_URL` | URL de la app (`http://localhost:3000` en local) |
| `VITE_FIREBASE_API_KEY` | API Key de Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain del proyecto Firebase |
| `VITE_FIREBASE_PROJECT_ID` | ID del proyecto Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_FIREBASE_DATABASE_ID` | ID de la base de datos Firestore (vacío = default) |

### Correr el servidor

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Configuración de Firebase

### 1. Authentication

- Habilitar **Google** como proveedor en Authentication → Sign-in method
- Agregar `localhost` a Authentication → Settings → **Authorized domains**

### 2. Firestore — Reglas de seguridad

Publicar estas reglas en Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }

    function isSignedIn() { return request.auth != null; }
    function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }

    match /users/{userId} {
      allow get: if isOwner(userId);
      allow create: if isOwner(userId) && request.resource.data.uid == userId;
      allow update: if isOwner(userId) &&
                    request.resource.data.diff(resource.data).affectedKeys()
                      .hasOnly(['displayName', 'photoURL', 'grade', 'updatedAt', 'geminiApiKey']);
      allow delete: if isOwner(userId);

      match /history/{historyId} {
        allow read, create, delete: if isOwner(userId);
      }
      match /quizzes/{quizId} {
        allow read, create, update, delete: if isOwner(userId);
      }
    }
  }
}
```

---

## Deploy en Vercel

### 1. Subir a GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/tu-usuario/eduboost.git
git push -u origin main
```

### 2. Importar en Vercel

- Ir a [vercel.com](https://vercel.com) → **Add New Project**
- Seleccionar el repositorio de GitHub
- Vercel detecta la configuración de `vercel.json` automáticamente

### 3. Variables de entorno en Vercel

En el panel de Vercel → Settings → **Environment Variables**, agregar todas las variables del `.env` excepto `APP_URL` (esa la configurás después).

### 4. Deploy y URL final

- Hacer clic en **Deploy**
- Una vez finalizado, copiar la URL del deploy (ej: `https://eduboost.vercel.app`)
- Actualizar `APP_URL` en las variables de entorno de Vercel con esa URL
- Agregar esa URL en Firebase → Authentication → **Authorized domains**

Cada `git push` a `main` redespliega automáticamente.
