#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
command -v emcc >/dev/null || { echo 'Activate Emscripten 4.0.22 first.'; exit 1; }
core_dir="$project_dir/build/FBNeo"
if [ ! -d "$core_dir/.git" ]; then
 mkdir -p "$project_dir/build"
 git clone https://github.com/libretro/FBNeo.git "$core_dir"
 git -C "$core_dir" checkout --detach 2b0c1c0679df115cada7df9199ea2762222e58fd
fi
if [ "$(git -C "$core_dir" rev-parse HEAD)" != 2b0c1c0679df115cada7df9199ea2762222e58fd ]; then echo 'Wrong core revision'; exit 1; fi
if ! git -C "$core_dir" apply --reverse --check "$project_dir/core-hud.patch" 2>/dev/null; then git -C "$core_dir" apply "$project_dir/core-hud.patch"; fi
python3 - "$core_dir" <<'PY'
import sys,pathlib
p=pathlib.Path(sys.argv[1])/'src/burner/libretro/Makefile.common'
s=p.read_text().replace('ifneq ($(STATIC_LINKING), 1)','ifneq ($(NEW_WORLD_SKIP_COMMON), 1)');p.write_text(s)
PY
make -C "$core_dir/src/burner/libretro" SUBSET=neogeo generate-files
emmake make -C "$core_dir/src/burner/libretro" SUBSET=neogeo platform=emscripten CC=emcc CXX=em++ AR=emar EXTERNAL_ZLIB=0 -j6
cp "$core_dir/src/burner/libretro/fbneo_neogeo_libretro_emscripten.bc" "$core_dir/fbneo.a"
em++ "$project_dir/web_host.cpp" "$core_dir/fbneo.a" -I"$core_dir/src/burner/libretro/libretro-common/include" -O3 -sMODULARIZE=1 -sEXPORT_NAME=createMS3 -sSINGLE_FILE=1 -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=268435456 -sMAXIMUM_MEMORY=2147483648 -sSTACK_SIZE=8388608 -sFORCE_FILESYSTEM=1 -sENVIRONMENT=web,node -sEXPORTED_RUNTIME_METHODS=FS,HEAPU8,HEAP16 -o "$project_dir/core.js"
python3 "$project_dir/package.py"
