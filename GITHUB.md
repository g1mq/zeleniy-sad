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

## Способ 3 — Git в командной строке

1. Установите: https://git-scm.com/download/win
2. В PowerShell:

```powershell
cd "c:\Users\yusup\Desktop\Новая папка\ZeleniySad"
git init
git add .
git commit -m "Initial commit: demo exam IS Zeleniy Sad"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/zeleniy-sad.git
git push -u origin main
```

Репозиторий на GitHub создайте заранее (пустой, без README).

---

## После загрузки — запишите на листок

```
git clone https://github.com/ЛОГИН/ИМЯ_РЕПО.git
cd ИМЯ_РЕПО\app
npm install
```

+ не забыть: PostgreSQL, `CREATE DATABASE`, скопировать `.env.example` → `.env`, `npm run db:reset`.
