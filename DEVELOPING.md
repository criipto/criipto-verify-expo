# Developing

How to work on `@criipto/verify-expo` and test changes in the bundled
`example/` app.

## Build commands

- `npm run check` — typecheck `src/` (`tsc --noEmit`).
- `npm run build` — emit `dist/` (the published JS + type declarations).
- `npm run pack` — `npm run build`, then `npm pack` into a local `.tgz` tarball.

## Testing changes in the example app

The `example/` app depends on the **published** `@criipto/verify-expo` from npm,
so it builds and runs on its own (a fresh clone, CI, the Maestro smoke tests).
To test **unpublished** local changes you must install a packed tarball of the
library into the example — not a relative path (`"file:.."`) or `npm link`.

### Why a tarball, and not `file:..` / `npm link`

Both `file:..` and `npm link` install the library as a **symlink to this
repository root**. Expo's Android autolinking follows that symlink and resolves
the library's peer dependencies — including `expo-modules-core` — from the
**repo root's** `node_modules`.

The repo root is not pinned to the example's Expo SDK. Its peer ranges
(`expo >=54`, `expo-modules-core >=3`) resolve to the newest published Expo when
you `npm install` here, so the root easily ends up on a newer SDK (e.g. 55/56)
than the SDK 54 example. When that happens, the root's newer `expo-modules-core`
is used to compile the example's SDK-54 modules, and the Android build fails with
errors such as:

```
e: ConstantsService.kt: Class 'ConstantsService' is not abstract and does not
   implement abstract members ...
e: 'getConstants' overrides nothing.
```

A packed tarball sidesteps this: npm extracts it into a **real directory** under
`example/node_modules`, with nothing pointing back to the repo root, so
autolinking resolves `expo-modules-core` from the example's own SDK-54 install.

### Workflow

```sh
# repo root — build and pack the library
npm run pack                       # → criipto-verify-expo-<version>.tgz

# example — overlay the packed build over the published dependency
cd example
npm ci
npm install ../criipto-verify-expo-*.tgz --no-save
npx expo prebuild                  # regenerate android/ + ios/
npx expo run:android               # or: npx expo run:ios
```

`--no-save` overlays the local build into `node_modules`
without rewriting `example/package.json` or its lockfile, so the committed
dependency stays pointed at the published version.

The tarball is a snapshot — there is no live reload of native or `dist/` code.
Re-run `npm run pack` and the overlay install after each library change.
