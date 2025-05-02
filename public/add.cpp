#include <stdio.h>
#include <emscripten/emscripten.h>

extern "C"
{
  EMSCRIPTEN_KEEPALIVE
  int add(int a, int b)
  {
    printf("%d", a + b);
    return a + b;
  }
}

/* najnowsze na ktorym dziala
source ~/emsdk/emsdk_env.sh

emcc add.cpp -o index.js   -sEXPORTED_FUNCTIONS=_add   -sEXPORTED_RUNTIME_METHODS=ccall   -sENVIRONMENT=web
*/