# Atlasb Mobile

## Project Overview

Atlasb Mobile is a React Native mobile application built with React Native `0.84` and React `19`.

Primary technologies used in the app:

- TypeScript
- NativeWind / Tailwind
- React Navigation
- Lucide React Native
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
- `yarn typecheck`
- `yarn test`

## Project Conventions

- Prefer TypeScript for app code, test helpers, and Jest mocks.
- New source files should use `.ts` or `.tsx` unless the toolchain explicitly expects JavaScript/CommonJS.
- Favor typed props, typed helpers, and explicit interfaces over untyped code.
- Prefer NativeWind `className` utilities for app UI. Keep object styles where React Navigation or native/third-party components still expect `style` objects.
- Follow the existing React Navigation structure and tab configuration patterns when adding or updating navigation UI.
- Keep JavaScript only where the React Native toolchain or project config explicitly expects it, such as CommonJS config entrypoints.
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
- Run `yarn typecheck` after meaningful TypeScript changes, alongside relevant lint/tests.
- Prefer minimal, maintainable changes that fit the current codebase.
