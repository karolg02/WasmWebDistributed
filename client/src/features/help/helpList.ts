export const helpList = [
    {
        id: 1,
        name: "Jak działa platforma?",
        description: `# Distributed WASM Computing Platform

## Przegląd
Platforma umożliwia dystrybucję obliczeń matematycznych wykorzystując WebAssembly (WASM) i przeglądarkę jako środowisko wykonawcze.

## Architektura

### 1. Klient (Ty)
- Wysyłasz zadanie obliczeniowe (np. całkowanie funkcji)
- Wczytujesz własny kod WASM z funkcją do obliczenia
- Określasz zakres obliczeń i metodę (Monte Carlo, Riemann, Simpson, Trapezoid)
- Otrzymujesz wynik po zakończeniu obliczeń

### 2. Serwer
- Dzieli zadanie na mniejsze części (batche)
- Dystrybuuje batche do dostępnych workerów przez RabbitMQ
- Monitoruje postęp wykonania (heartbeat)
- Agreguje wyniki i zwraca do klienta
- Obsługuje reassignment gdy worker się rozłączy

### 3. Workery (Przeglądarki użytkowników)
- Połączenie przez Socket.IO
- Odbierają batche z RabbitMQ
- Wykonują obliczenia w Web Worker (osobny wątek)
- Wysyłają wyniki z powrotem do serwera
- Benchmark przy starcie określa wydajność

## Przepływ działania

1. **Przesłanie zadania**: Klient wysyła zadanie z parametrami
2. **Podział**: Serwer dzieli na ~100 zadań per worker
3. **Dystrybucja**: Batche trafiają do kolejek RabbitMQ
4. **Wykonanie**: Workery pobierają, liczą, zwracają wyniki
5. **Monitoring**: Heartbeat co 5s, timeout 15s
6. **Reassignment**: Jeśli worker padnie, zadania idą do innego
7. **Agregacja**: Serwer sumuje wyniki i odsyła do klienta

## Heartbeat i odporność na awarie
- Worker wysyła heartbeat co 5s
- Serwer sprawdza co 10s
- Timeout po 15s bez heartbeat
- Automatyczny reassignment nieukończonych zadań
- Scheduler co 5 min czyści zadania bez workerów

## Baza danych
- **tasks_history**: Historia wszystkich zadań
- **task_batches**: Szczegóły batchy i reassignment
- **users**: Konta użytkowników

## Statystyki
- Profil klienta: Twoje zadania, success rate, średni czas
- Statystyki globalne: Wszystkie zadania w systemie`
    },
    {
        id: 2,
        name: "Jak skompilować plik C++ do WASM?",
        description: `# Kompilacja C++ do WebAssembly

## Wymagania
- **Emscripten SDK** (emcc compiler)
- Kod C++ z funkcją do eksportu

## Instalacja Emscripten

### Windows
\`\`\`bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
emsdk install latest
emsdk activate latest
emsdk_env.bat
\`\`\`

### Linux/Mac
\`\`\`bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
\`\`\`

## Przykładowy kod C++

\`\`\`cpp
// benchmark.cpp
#include <emscripten/emscripten.h>
#include <cmath>

extern "C" {
    // Funkcja do całkowania
    EMSCRIPTEN_KEEPALIVE
    double customFunction(double x) {
        return x * x + 2 * x + 1; // Przykład: f(x) = x² + 2x + 1
    }

    // Funkcja 2D
    EMSCRIPTEN_KEEPALIVE
    double customFunction2D(double x, double y) {
        return x * x + y * y;
    }
}
\`\`\`

## Kompilacja

### Podstawowa kompilacja
\`\`\`bash
emcc benchmark.cpp -o benchmark.js -s WASM=1 -s EXPORTED_FUNCTIONS="['_customFunction']" -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap']"
\`\`\`

### Z optymalizacją
\`\`\`bash
emcc benchmark.cpp -o benchmark.js \\
  -O3 \\
  -s WASM=1 \\
  -s EXPORTED_FUNCTIONS="['_customFunction', '_customFunction2D']" \\
  -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap']" \\
  -s ALLOW_MEMORY_GROWTH=1
\`\`\`

## Parametry kompilacji

- **-O3**: Maksymalna optymalizacja
- **-s WASM=1**: Generuj WASM zamiast asm.js
- **-s EXPORTED_FUNCTIONS**: Lista funkcji do eksportu (prefix \`_\`)
- **-s EXPORTED_RUNTIME_METHODS**: Metody runtime (ccall, cwrap)
- **-s ALLOW_MEMORY_GROWTH=1**: Dynamiczna alokacja pamięci

## Pliki wyjściowe
- **benchmark.js**: Loader JavaScript
- **benchmark.wasm**: Skompilowany kod binarny

## Użycie na platformie

1. Skompiluj swój kod C++ do WASM
2. Załaduj oba pliki (.js i .wasm) w panelu klienta
3. Podaj nazwę funkcji (np. \`customFunction\`)
4. Ustaw parametry całkowania (a, b, n)
5. Wybierz metodę i uruchom!

## Debugging

### Weryfikacja eksportu
\`\`\`bash
wasm-objdump -x benchmark.wasm | grep export
\`\`\`

### Testowanie w konsoli przeglądarki
\`\`\`javascript
Module.onRuntimeInitialized = () => {
    const result = Module.ccall('customFunction', 'number', ['number'], [5]);
    console.log('f(5) =', result);
};
\`\`\`

## Wskazówki
- Używaj \`extern "C"\` aby uniknąć name mangling
- \`EMSCRIPTEN_KEEPALIVE\` zapobiega usunięciu funkcji
- Zawsze eksportuj funkcje w EXPORTED_FUNCTIONS
- Testuj lokalnie przed wrzuceniem na platformę`
    }
]