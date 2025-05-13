#include <stdio.h>
#include <cmath>
#include <stdlib.h>
#include <time.h>
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

  EMSCRIPTEN_KEEPALIVE
  double monte_carlo(double a, double b, int samples, double y_max, int seedOffset = 0)
  {
    // CRITICAL: Force y_max to 1.0 for sin(x) which has max value of 1.0
    if (y_max > 1.1) y_max = 1.0;
    
    double area = (b - a) * y_max;
    int hits = 0;
    
    // Use simple seed that works reliably in WebAssembly
    srand(seedOffset + 12345);
    
    // Ensure we actually process enough samples
    if (samples <= 0) samples = 10000;
    
    for (int i = 0; i < samples; i++)
    {
      double x = a + ((double)rand() / RAND_MAX) * (b - a);
      double y = ((double)rand() / RAND_MAX) * y_max;
      if (y <= funkcja(x))
      {
        hits++;
      }
    }
    
    return ((double)hits / samples) * area;
  }
}

/* Compilation command:
source ~/emsdk/emsdk_env.sh
emcc add.cpp -o index.js -sEXPORTED_FUNCTIONS=_add,_monte_carlo -sEXPORTED_RUNTIME_METHODS=ccall -sENVIRONMENT=web
*/