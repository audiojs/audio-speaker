# Release Plan: audio-speaker 2.0.0-alpha.0

## Binaries built

| Package | Binary | Size |
|---|---|---|
| @audio/speaker-darwin-arm64 | ready | 388K |
| @audio/speaker-darwin-x64 | ready | 364K |
| @audio/speaker-linux-x64 | ready | 433K |
| @audio/speaker-linux-arm64 | ready | 379K |
| @audio/speaker-win32-x64 | **needs CI** | - |

## Publish order

Platform packages must exist on npm before the main package, since `npm install audio-speaker` will try to resolve them.

### Step 1: Platform packages (from each repo)

```sh
cd ~/projects/@audiojs/speaker-darwin-arm64 && npm publish --access public
cd ~/projects/@audiojs/speaker-darwin-x64 && npm publish --access public
cd ~/projects/@audiojs/speaker-linux-x64 && npm publish --access public
cd ~/projects/@audiojs/speaker-linux-arm64 && npm publish --access public
# win32-x64: skip for alpha, or build from Windows / CI first
```

### Step 2: Main package

```sh
cd ~/projects/audio-speaker && npm publish --tag alpha
```

`--tag alpha` so `npm install audio-speaker` still gets v1.x, and `npm install audio-speaker@alpha` gets v2.

### Step 3: Windows (later)

Option A: From a Windows machine:
```sh
git clone https://github.com/audiojs/audio-speaker
npm install --ignore-scripts
npx node-gyp@latest rebuild
# copy build/Release/speaker.node to @audiojs/speaker-win32-x64/
```

Option B: Push to GitHub, CI builds it:
- The `prebuild.yml` workflow runs on `windows-latest`
- Download the artifact, copy to `@audiojs/speaker-win32-x64/`
- Publish

Option C: Docker (not possible — no Windows containers on macOS Docker Desktop)

## Rebuilding platform binaries

```sh
# macOS arm64 (native)
npx node-gyp@latest rebuild
cp build/Release/speaker.node ~/projects/@audiojs/speaker-darwin-arm64/speaker.node

# macOS x64 (cross-compile)
npx node-gyp@latest rebuild --arch=x64
cp build/Release/speaker.node ~/projects/@audiojs/speaker-darwin-x64/speaker.node

# Linux x64 (Docker)
docker run --rm --platform linux/amd64 \
  -v $(pwd):/src:ro -v ~/projects/@audiojs/speaker-linux-x64:/out \
  node:22-slim bash -c '
    apt-get update -qq && apt-get install -y -qq python3 make g++ > /dev/null 2>&1
    cp -r /src /build && cd /build
    npx node-gyp@latest rebuild 2>&1 | tail -3
    cp build/Release/speaker.node /out/speaker.node'

# Linux arm64 (Docker)
docker run --rm --platform linux/arm64 \
  -v $(pwd):/src:ro -v ~/projects/@audiojs/speaker-linux-arm64:/out \
  node:22-slim bash -c '
    apt-get update -qq && apt-get install -y -qq python3 make g++ > /dev/null 2>&1
    cp -r /src /build && cd /build
    npx node-gyp@latest rebuild 2>&1 | tail -3
    cp build/Release/speaker.node /out/speaker.node'
```

## Fallback for users without prebuild

If `@audio/speaker-*` for their platform isn't published, `npm install` will:
1. Fail to install the optional dep (silent)
2. `gypfile: true` triggers `node-gyp rebuild` as install script
3. The addon compiles from source (miniaudio.h + speaker.c included in tarball)
4. Requires: C compiler, Python 3, make

This matches the fallback strategy of packages like `sharp`, `better-sqlite3`, etc.
