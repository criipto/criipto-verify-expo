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

Currently, local e2e tests can only run on android, since maestro does not work well with physical iOS devices.

## Running on CI (EAS Workflows)

The [`e2e` workflow](../example/.eas/workflows/e2e.yml) builds the example app
on [EAS Build](https://docs.expo.dev/build/introduction/) (iOS simulator build
and Android APK) and runs `mock-login.yaml` on EAS-managed simulators/emulators
via the [`maestro` job](https://docs.expo.dev/eas/workflows/examples/e2e-tests/).
Only the mock flow runs on CI — the other flows need eID authenticator apps on
physical devices.

The build uses the `e2e-test` profile in [`eas.json`](../example/eas.json), and
an `eas-build-post-install` hook overlays the locally packed library before
prebuild (the same tarball overlay described in
[DEVELOPING.md](../DEVELOPING.md)), so CI tests the checked-out library code,
not the published package.

The [GitHub Actions `e2e` workflow](../.github/workflows/e2e.yml) starts the
EAS workflow on pull requests and pushes to master with `eas workflow:run`
(uploading the local checkout) and gates on its result. The repo is
deliberately **not** linked to the Expo GitHub app; authentication uses the
`EXPO_TOKEN` repository secret. Forked PRs cannot read the secret, so the job
only runs for same-repo events.

Trigger manually with:

```bash
cd example
eas workflow:run .eas/workflows/e2e.yml
```
