# pyLiit

pyLiit is a lightweight offline Android Python playground. It uses a native Kotlin `WebView` to host a local HTML app and runs Python code with a bundled Brython runtime, which keeps the app small enough for low-end devices.

## What is included

- Native Android shell with a single `WebView`
- Offline HTML/CSS/JavaScript interface under `app/src/main/assets/www`
- Code editor, output panel, built-in example snippets, and recent-run restore
- Support for lightweight Brython-compatible modules such as `math` and `datetime`

## Project layout

- `app/src/main/java/com/example/pyliit/MainActivity.kt`: Android host activity
- `app/src/main/assets/www/index.html`: local UI entry point
- `app/src/main/assets/www/styles.css`: app styling
- `app/src/main/assets/www/runner.js`: Python execution bridge

## Runtime files

The repository already includes the Brython runtime files used by the app:

- `app/src/main/assets/www/brython.min.js`
- `app/src/main/assets/www/brython_stdlib.min.js`

If you upgrade Brython later, replace those two files together so the runtime and stdlib stay in sync.

## Build

1. Open a terminal in the project root.
2. Run `gradlew.bat tasks` to let the wrapper download the required Gradle distribution.
3. Open the project in Android Studio if the Android SDK is not configured yet.
4. Make sure `local.properties` points at your local Android SDK path.
5. Run the `app` configuration on an emulator or Android device.

## Optional release signing

Release signing is intentionally configured through Gradle properties instead of hardcoded secrets. Set these locally in your user `gradle.properties` before building a signed release:

- `PYLIIT_RELEASE_STORE_FILE`
- `PYLIIT_RELEASE_STORE_PASSWORD`
- `PYLIIT_RELEASE_KEY_ALIAS`
- `PYLIIT_RELEASE_KEY_PASSWORD`

If those properties are not present, release builds stay unsigned.

## App features

- Example snippets for math, datetime, prime generation, and pattern matching
- Local draft autosave in the browser storage used by Android WebView
- Run history with reload support for previous code and output
- Keyboard shortcut support for `Ctrl+Enter` / `Cmd+Enter`
- Offline runtime with no network dependency during execution

## Notes

- This is not full CPython. It is a Brython-based interpreter optimized for a lightweight offline experience.
- Brython supports many modern Python features, but exact Python 3.12 parity is not guaranteed.
- Saving writes to `Downloads/pyLiit` on Android 10+ and to the app-specific external files directory on older Android versions.
