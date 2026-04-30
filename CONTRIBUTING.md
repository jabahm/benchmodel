# Contributing to Benchmodel

Thanks for taking the time to contribute! This document covers everything you need to know to get a patch landed.

## Local setup

1. Make sure you have Node.js 20+ and pnpm 9+. Install pnpm with `corepack enable && corepack prepare pnpm@latest --activate` if it is not already on your path.
2. Fork and clone the repository.
3. Run `pnpm install` from the root.
4. Run `pnpm dev` and open `http://localhost:3737`. The local SQLite database is stored at `./data.db`.

## Conventions

### Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/). Examples:

- `feat(compare): add token per second metric`
- `fix(providers): handle missing api key for openai compat`
- `docs(readme): add docker quickstart`
- `chore(ci): bump pnpm to 9.15`

### Branch naming

Use a topic prefix that mirrors the commit type:

- `feat/short-description`
- `fix/short-description`
- `docs/short-description`
- `chore/short-description`

### Code style

- TypeScript strict mode is enforced. Avoid `any` unless it is justified by a comment on the same line.
- UI components use shadcn/ui exclusively. Do not add other component libraries.
- Comments are in English. User facing strings are in English.

## Pull request checklist

Before opening a pull request, please verify the following:

- [ ] `pnpm install && pnpm build` passes locally.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.
- [ ] You manually exercised any UI you changed.
- [ ] You updated the README or examples if you changed user facing behavior.
- [ ] Your commits follow Conventional Commits.

## Good first issues

If you are new to the project, look for issues labeled `good first issue`. They are scoped to be approachable without deep familiarity with the codebase. The `help wanted` label flags larger pieces of work where outside contributions are especially welcome.
