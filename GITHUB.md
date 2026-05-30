# Как залить проект на GitHub

## Что НЕ попадёт в репозиторий (см. `.gitignore`)

- `.env` с паролем PostgreSQL — **никогда не публикуйте**
- `app/node_modules/` — на экзамене: `npm install`

---

## Способ 1 — GitHub Desktop (проще всего)

1. Скачайте: https://desktop.github.com/
2. Установите, войдите в аккаунт GitHub.
3. **File → Add local repository** → папка `ZeleniySad`.
   - Если пишет «not a git repository» → **create a repository** здесь же.
4. Внизу **Summary** → Commit → **Publish repository**.
5. Снимите галочку **Keep this code private**, если нужен публичный репозиторий (для `git clone` без логина удобнее **Public** или запомните, что Private потребует вход в GitHub).
6. Скопируйте ссылку: **Repository → View on GitHub**.

### 3 команды на экзамене (если Git установлен)

```bash
git clone https://github.com/ВАШ_ЛОГИН/zeleniy-sad.git
cd zeleniy-sad\app
npm install
```

Дальше: создать `.env`, базу PostgreSQL, `npm run db:reset`, `zapusk.bat`.

---

## Способ 2 — через сайт github.com (без установки Git)

1. Зайдите на https://github.com → **New repository**.
2. Имя, например: `zeleniy-sad` → **Create repository**.
3. **Add file → Upload files** — перетащите **содержимое** папки `ZeleniySad`:
   - `app/` (без `node_modules`!)
   - `database/`
   - `prototype/`
   - `config.js`, `zapusk.bat`, `README.md`, `instruction.md`, `.env.example`, `.gitignore`
4. **Не загружайте:** `.env`, `app/node_modules`, `app/data/green_garden.db`
5. **Commit changes**.

На экзамене: **Code → HTTPS → copy** → скачать ZIP или `git clone`, если поставите Git.

---

## Способ 3 — Git в командной строке (рекомендуется)

Git уже установлен, локальный репозиторий и коммит созданы.

### Шаг 1 — войти в GitHub (один раз)

Откройте **PowerShell** или **Git Bash** и выполните:

```powershell
gh auth login
```

Выберите:
- **GitHub.com**
- **HTTPS**
- **Login with a web browser** — скопируйте код, откроется браузер, войдите в аккаунт

### Шаг 2 — создать репозиторий и залить проект

```powershell
cd "c:\Users\yusup\Desktop\Новая папка\ZeleniySad"
gh repo create zeleniy-sad --private --source=. --remote=origin --push
```

Имя `zeleniy-sad` можно заменить на своё. Флаг `--private` — только вы видите; для `git clone` без логина используйте `--public`.

### Альтернатива (если репозиторий уже создан на сайте)

1. На github.com → **New repository** → имя `zeleniy-sad` → **Create** (без README).
2. В терминале:

```powershell
cd "c:\Users\yusup\Desktop\Новая папка\ZeleniySad"
git remote add origin https://github.com/ВАШ_ЛОГИН/zeleniy-sad.git
git push -u origin main
```

При запросе пароля используйте **Personal Access Token** (не пароль от GitHub):  
Settings → Developer settings → Personal access tokens → Generate new token.

---

## После загрузки — запишите на листок

```
git clone https://github.com/ЛОГИН/ИМЯ_РЕПО.git
cd ИМЯ_РЕПО\app
npm install
```

+ не забыть: PostgreSQL, `CREATE DATABASE`, скопировать `.env.example` → `.env`, `npm run db:reset`.
