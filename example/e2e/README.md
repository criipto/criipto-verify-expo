# Example app end-to-end tests

[Maestro](https://maestro.mobile.dev) flows that drive the example app
against Criipto's public samples tenant (`samples.criipto.id`) to
smoke-test the library's login path.

## Prerequisites

- Maestro CLI: `curl -fsSL https://get.maestro.mobile.dev | bash`
- iOS: Xcode + an iOS Simulator.
- Android: Android Studio + an emulator with Google Play / Chrome.

## Running locally

Build and install the example app on your simulator/emulator first:

    cd example
    npm ci
    npx expo prebuild        # one-off; generates ios/ and android/
    npx expo run:ios         # or: npx expo run:android

Then, from `example/`:

    npm run test:e2e

Or invoke Maestro directly:

    maestro test e2e/maestro/smoke-mock-login.yaml

## What `smoke-mock-login.yaml` does

1. Launches the example app with clean state.
2. Taps **Login with Mock**, which starts an OIDC login with
   `acr_values=urn:grn:authn:mock`.
3. On iOS, accepts the `ASWebAuthenticationSession` system consent
   prompt. Android opens a Chrome Custom Tab directly — no dialog.
4. Waits for the mock flow to auto-complete and the app to render the
   decoded JWT claims; asserts that the `sub` claim is visible.
