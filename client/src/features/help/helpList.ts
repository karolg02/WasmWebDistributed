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
    }
]