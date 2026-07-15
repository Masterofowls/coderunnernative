# Contributing

## Setup

```bash
npm install
npm run start
```

For device/native work use a development build (`expo-dev-client`), not Expo Go.

## Checks before PR

```bash
npm run typecheck
npm test
```

## Android release APK

```powershell
npm run apk:release
```

Never commit `credentials/android/*.keystore` or `keystore.properties`.

## Commit style

Use conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
