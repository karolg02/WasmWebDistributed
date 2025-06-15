#include <emscripten/emscripten.h>
extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    void benchmark()
    {
        volatile double sum = 0;
        for (int i = 0; i < 100000000; i++)
        {
            sum += i * 0.000001;
        }
    }
}