# Developing

How to work on `@criipto/verify-expo` and test changes in the per-SDK
example apps under `examples/`.

## Build commands

- `npm run check` — typecheck `src/` (`tsc --noEmit`).
- `npm run build` — emit `dist/` (the published JS + type declarations).
- `npm run pack` — `npm run build`, then `npm pack` into a local `.tgz` tarball.

## Testing changes in the example apps

The example apps live under `examples/` — `expo54`, `expo55`, and `expo56`, each
pinned to that Expo SDK and its own lockfile. They depend on the **published**
`@criipto/verify-expo` from npm, so each builds and runs on its own (a fresh
clone, CI, the Maestro smoke tests). To test **unpublished** local changes you
must install a packed tarball of the library into the example — not a relative
path (`"file:.."`) or `npm link`.

### Why a tarball, and not `file:..` / `npm link`

Both `file:..` and `npm link` install the library as a **symlink to this
repository root**. Expo's Android autolinking follows that symlink and resolves
the library's peer dependencies — including `expo-modules-core` — from the
**repo root's** `node_modules`.

The repo root is not pinned to any example's Expo SDK. Its peer ranges
(`expo >=54`, `expo-modules-core >=3`) resolve to the newest published Expo when
you `npm install` here, so the root easily ends up on a newer SDK than an example
you are testing. When that happens, the root's newer `expo-modules-core` is used
to compile that example's modules, and the Android build fails with errors such
as:

```
e: ConstantsService.kt: Class 'ConstantsService' is not abstract and does not
   implement abstract members ...
e: 'getConstants' overrides nothing.
```

A packed tarball sidesteps this: npm extracts it into a **real directory** under
the example's `node_modules`, with nothing pointing back to the repo root, so
autolinking resolves `expo-modules-core` from the example's own SDK install.

### Workflow

```sh
# repo root — build and pack the library
npm run pack                       # → criipto-verify-expo-<version>.tgz

# pick an example (expo56 is the latest; substitute expo54/expo55 to
# reproduce an SDK-specific issue) and overlay the packed build
cd examples/expo56
npm ci
npm install ../../criipto-verify-expo-*.tgz --no-save
npx expo prebuild                  # regenerate android/ + ios/
npx expo run:android               # or: npx expo run:ios
```

`--no-save` overlays the local build into `node_modules`
without rewriting the example's `package.json` or its lockfile, so the committed
dependency stays pointed at the published version.

The tarball is a snapshot — there is no live reload of native or `dist/` code.
Re-run `npm run pack` and the overlay install after each library change.

### On EAS Build

EAS workers reinstall the example's dependencies from its lockfile, which points
at the published package — a locally overlaid tarball does not survive the
upload. The `eas-build-post-install` hook in each example's `package.json`
therefore repeats the overlay on the worker: it packs the library at the repo
root and installs the tarball into the example, so EAS builds (and the
[e2e workflow](e2e/README.md)) test the checked-out library code.
