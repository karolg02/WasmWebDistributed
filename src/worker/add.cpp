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
    // Better seeding technique (using time and seedOffset)
    srand(time(NULL) + seedOffset * 10000);

    int hits = 0;

    // Better sampling loop - use multiple iterations for better randomness
    for (int i = 0; i < samples; i++)
    {
      // Force re-randomization every 1000 samples
      if (i % 1000 == 0)
      {
        srand(time(NULL) + seedOffset * 10000 + i);
      }

      double x = a + ((double)rand() / RAND_MAX) * (b - a);
      double y = ((double)rand() / RAND_MAX) * y_max;

      if (y <= funkcja(x))
      {
        hits++;
      }
    }

    return hits;
  }
}

/* Compilation command:
source ~/emsdk/emsdk_env.sh
emcc add.cpp -o index.js -sEXPORTED_FUNCTIONS=_add,_monte_carlo -sEXPORTED_RUNTIME_METHODS=ccall -sENVIRONMENT=web
*/