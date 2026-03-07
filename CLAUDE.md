# Atlasb Mobile

## Project Overview

Atlasb Mobile is a React Native mobile application built with React Native `0.84` and React `19`.

Primary technologies used in the app:

- TypeScript
- Firebase
- MapLibre
- `react-native-maps`
- Zustand
- Zod

## Development Commands

- `yarn start`
- `yarn start:local`
- `yarn start:staging`
- `yarn start:prod`
- `yarn android`
- `yarn ios`
- `yarn lint`
- `yarn test`

## Project Conventions

- Prefer TypeScript for app code.
- New source files should use `.ts` or `.tsx`.
- Favor typed props, typed helpers, and explicit interfaces over untyped code.
- Keep JavaScript only where the React Native toolchain or project config already expects it, such as existing config or script files.
- Follow the existing project structure and make focused changes instead of broad rewrites.

## Map Environment Notes

The app supports map environment switching through startup scripts.

Available map environments:

- `local`
- `staging`
- `prod`

The default development entrypoint uses the map environment startup wrapper rather than a plain Metro start command.

## Notes For Agents

- Check existing patterns before introducing new abstractions.
- Preserve existing environment and config behavior.
- Prefer minimal, maintainable changes that fit the current codebase.
