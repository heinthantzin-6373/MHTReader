# MHTReader

An [Expo](https://expo.dev) / React Native app (SDK 58).

## Hello World

The home screen is `src/app/index.tsx` and shows **Hello World**.

---

## Run on your phone with Expo Go (step by step)

### 1. Install Node.js

Install Node.js LTS from https://nodejs.org

Check in a terminal:

```bash
node -v
npm -v
```

### 2. Install project dependencies

Open a terminal in this project folder and run:

```bash
npm install
```

### 3. Install Expo Go on your phone

**Android:** Google Play Store → search **Expo Go**  
https://play.google.com/store/apps/details?id=host.exp.exponent

**iPhone:** App Store → search **Expo Go**  
https://apps.apple.com/app/expo-go/id982107779

Open Expo Go once so it finishes setup.

### 4. Same Wi-Fi (or use tunnel later)

Put your phone and computer on the **same Wi-Fi** (avoid guest/isolated networks).

### 5. Start the development server

In the project folder:

```bash
npx expo start
```

You should see a **QR code** in the terminal.

### 6. Open the app in Expo Go

**Android**

1. Open **Expo Go**.
2. Tap **Scan QR code**.
3. Scan the terminal QR code.
4. Wait for the project to load.

**iPhone**

1. Sign in to Expo Go with an Expo account (profile icon).
2. On your computer, run `npx expo login` and use the **same** account.
3. Open the Camera app (or Expo Go) and scan the QR code.
4. Tap the banner / open in Expo Go.
5. Wait for the project to load.

You should see **Hello World** and **Welcome to MHTReader**.

### 7. If the QR code will not connect

Use tunnel mode (works across networks; slower):

```bash
npx expo start --tunnel
```

Then scan the new QR code.

### 8. Try a quick edit (optional)

Change text in `src/app/index.tsx`, save, and the phone should refresh automatically.

---

## Build an Android APK with EAS

Expo Go is for development. To install a standalone **APK** on an Android phone (no Expo Go needed), use [EAS Build](https://docs.expo.dev/build/introduction/). This project’s `eas.json` already sets `android.buildType` to `"apk"` for the `development`, `preview`, and `production` profiles.

### 1. Keep the lockfile in sync

EAS runs `npm ci`, so `package.json` and `package-lock.json` must match:

```bash
npm install
```

If you change dependencies, commit the updated `package-lock.json` before building.

### 2. Log in to Expo

```bash
npx eas-cli@latest login
```

### 3. Start an APK build (cloud)

**Internal / shareable APK (recommended for testing):**

```bash
npx eas-cli@latest build --platform android --profile preview
```

**Production APK:**

```bash
npx eas-cli@latest build --platform android --profile production
```

The first Android build may ask you to create or reuse a keystore — follow the prompts (or use the Expo-managed keystore).

### 4. Download and install

1. Wait for the build to finish (link printed in the terminal, also on [expo.dev](https://expo.dev)).
2. Download the **.apk**.
3. On the phone, open the file and allow install from that source if asked.

### Optional: local APK (needs Android Studio / SDK)

```bash
npx expo run:android --variant release
```

Docs: [EAS Build](https://docs.expo.dev/build/introduction/) · [Android build types (APK vs AAB)](https://docs.expo.dev/build-reference/android-builds/)

---

## Troubleshooting

| Problem | What to try |
| --- | --- |
| Cannot connect / QR fails | Same Wi-Fi, or `npx expo start --tunnel` |
| Windows Firewall prompt | Allow Node.js / Expo |
| iPhone says sign in required | Same Expo account in CLI (`npx expo login`) and Expo Go |
| Expo Go version mismatch | Update Expo Go from the store |
| App does not refresh | Shake phone → developer menu → Fast Refresh on |
| Missing packages | `npm install`, then `npx expo start` |
| EAS `npm ci` lockfile error | Run `npm install`, ensure `package-lock.json` is updated, then rebuild |

---

## Other commands

```bash
npx expo start            # QR code / Expo Go
npx expo start --android  # emulator / USB (needs Android tools)
npx expo start --ios      # simulator (macOS + Xcode)
npx expo start --web      # browser
npx eas-cli@latest build --platform android --profile preview      # cloud APK (test)
npx eas-cli@latest build --platform android --profile production  # cloud APK (prod)
```

Docs: [Start developing](https://docs.expo.dev/get-started/start-developing/) · [Environment setup](https://docs.expo.dev/get-started/set-up-your-environment/)
