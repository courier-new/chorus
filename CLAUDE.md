# What is Chorus?

Chorus is a native Mac AI chat app built with Tauri, React, TypeScript, TanStack
Query, Tailwind CSS, and SQLite. We use pnpm for dependencies.

Key features: MCP tools, ambient chats, project memory, branching conversations,
customizable shortcuts, BYOK (bring your own API keys).

# Common Commands

-   `pnpm run dev` - Start development server (runs `./script/dev-instance.sh`)
-   `pnpm run build` - Type check and build (runs `tsc && vite build`)
-   `pnpm run lint` - Run ESLint
-   `pnpm run format` - Format code with Prettier
-   `pnpm run validate` - Run all checks (lint + format check)
-   `pnpm run validate:fix` - Run all checks and fix issues
-   `pnpm run generate-schema` - Regenerate SCHEMA.md from database
-   `pnpm run delete-db` - Delete local database

# Your role

Your role is to write code. You do NOT have access to the running app, and we
don't maintain a test suite, so you cannot test the code. You MUST rely on me,
the user, to test the code. If I report a bug in your code, after you fix it,
you should pause and ask me to verify that the bug is fixed.

Don't be shy to ask questions -- You do not have full context on the project,
and I'm here to help you!

If I send you a URL, you MUST immediately fetch its contents and read it
carefully, before you do anything else.

# Workflow

1. **Setup**: Work off `expansion` branch (most recent stable). Create branches
   like `feat/kr/short-name` or `fix/kr/short-name`.

2. **Development**: Do NOT commit, push, or create PRs. Ask me to test drafts
   early and often. Always rebase or cherry-pick, never merge.

3. **Database Changes**: After modifying migrations, run `pnpm run generate-schema`
   to update SCHEMA.md.

# Project Structure

-   **UI:** `src/ui/components/`
-   **Core:** `src/core/chorus/`
-   **API:** `src/core/chorus/api/`
-   **Tauri:** `src-tauri/src/`
-   **Migrations:** `src-tauri/src/migrations.rs`
-   **Schema:** See SCHEMA.md for current database schema

# Coding style

Always look for existing code to determine conventions and style. When in doubt,
follow these rules:

-   **TypeScript:** Strict typing. Use `as` only with `satisfies` and a comment.
    Prefer inferred types.
-   **Paths:** Use `@ui/*`, `@core/*`, `@/*` aliases, not relative imports.
-   **API hooks:** Adapt existing hooks rather than writing new ones.
-   **Types:** Prefer types over interfaces.
-   **Nulls:** Prefer undefined. Convert DB nulls: `parentChatId: row.parent_chat_id ?? undefined`
-   **Dates:** Use `displayDate` in `src/ui/lib/utils.ts`. Convert DB dates with
    `convertDate` first.
-   **Database:** No foreign keys or constraints (hard to remove later).
-   **Comments:** Explain _why_, not _what_.

# Troubleshooting

Whenever I report that code you wrote doesn't work, or report a bug, you should:

1. Read any relevant code or documentation, looking for hypotheses about the root cause.
2. For each hypothesis, check whether it's consistent with the observations I've already reported.
3. For any remaining hypotheses, think about a test I could run or logging you
   could add that would tell me if that hypothesis is incorrect.
