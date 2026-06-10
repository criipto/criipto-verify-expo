# Example app end-to-end tests

[Maestro](https://maestro.mobile.dev) flows that drive the example app
against Criipto's public samples tenant (`samples.criipto.id`) to
smoke-test the library's login path.

## Prerequisites

- Maestro CLI: `curl -fsSL https://get.maestro.mobile.dev | bash`
- iOS: Xcode + an iOS Simulator.
- Android: Android Studio + an emulator with Google Play / Chrome.

Mock login can be run on a simulator, but other eID tests require the corresponding authenticator app to be installed and set up on a physical device.

## Running locally

The example application builds against the **published** `@criipto/verify-expo` package by default. To
smoke-test **local, unpublished** library changes, pack the library and overlay it
before `expo prebuild` — see [DEVELOPING.md](../DEVELOPING.md):

```bash
npm run build && npm run pack       # in the repo root
cd example
npm install ../criipto-verify-expo-*.tgz --no-save
```

Build and install the example app on your simulator/emulator first:

```bash
cd example
npx expo prebuild        # one-off; generates ios/ and android/
npx expo run:android  --variant release
```

Then invoke maestro:

```bash
maestro test e2e/maestro
```

Currently, e2e tests can only run on android, since maestro does not work well with physical iOS devices.
