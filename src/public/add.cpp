#include <stdio.h>
#include <cmath>
#include <emscripten/emscripten.h>
extern "C"
{
  double funkcja(double x)
  {
    return sin(x);
  }

  EMSCRIPTEN_KEEPALIVE
  double add(double a, double b, double dx)
  {
    int N = ceil((b - a) / dx);
    double dx_adjust = (b - a) / N;
    int i;
    double calka = 0.0;
    for (i = 0; i < N; i++)
    {
      double x1 = a + i * dx_adjust;
      calka += 0.5 * dx_adjust * (funkcja(x1) + funkcja(x1 + dx_adjust));
    }
    return (calka);
  }
}

/* najnowsze na ktorym dziala
source ~/emsdk/emsdk_env.sh

emcc add.cpp -o index.js   -sEXPORTED_FUNCTIONS=_add   -sEXPORTED_RUNTIME_METHODS=ccall   -sENVIRONMENT=web
*/