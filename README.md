# WasmWebDistributed

### Description
- This project performs distributed numerical computations using web browsers as computing nodes. Web Workers run WebAssembly code in parallel, while a Node.js server manages task distribution via Socket.IO.

## Architecture

The platform consists of three main components:

### 🌐 Client (React + TypeScript)

![](/images/image.png)

- The user can choose between 1D and 2D integration modes, depending on the complexity of the task
- Supports both 1D and 2D computation modes, selectable by the user

![](/images/image-1.png)

- The user must upload two files: a .wasm file and a corresponding .js glue file
- ⚠️ The user is also required to provide all necessary variables (e.g., task parameters and any others required by the WASM logic)
- These files should be compiled using Emscripten with the following command:
```bash
emcc *.cpp -o *.js   -sEXPORTED_FUNCTIONS=_main_function,_getResult,_freeResult,_malloc,_free   -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,setValue,getValue,UTF8ToString   -sENVIRONMENT=web,node,worker   -sMODULARIZE=1   -sEXPORT_NAME="Module"   -sALLOW_MEMORY_GROWTH=1   -sINITIAL_MEMORY=67108864
```
- ⚠️ Omitting any of these flags will cause the system to malfunction or fail entirely

- These flags ensure full compatibility with the Web, Node.js, and Web Workers environment, and enable correct interaction between JavaScript and WebAssembly

![alt text](/images/image-2.png)

- Users can assign tasks to any available worker, with automatic queuing if the worker is occupied

![alt text](/images/image-3.png)

- The user receives the result through the getResult function implemented in the WASM module

## Instruction how to compile wasm
- All necessary steps for compiling .wasm and .js files will be provided in the /help section of the application.

### ⚙️ Workers (Web Workers + WASM + Socket.IO)

- All workers are linked to the central server through Socket.IO for real-time task coordination

![alt text](/images/image-4.png)

- The user can choose how many threads to allocate for computing. A benchmark is then executed, and the worker becomes ready to process tasks!

### 🖥️ Server (Node.js)

- **WebSocket Communication**: Manages real-time connections between clients and workers using Socket.IO

- **File Upload Handling**: Accepts and processes uploaded WebAssembly modules and their JavaScript glue code

- **Task Distribution**: Assigns computational tasks to available workers based on performance and availability

- **Result Aggregation**: Collects, aggregates, and forwards results from workers back to the client

### Installation

1. **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/wasmWebDistributed.git
    cd wasmWebDistributed
    ```

2. **Install server dependencies**
    ```bash
    cd server
    npm i
   ```

3. **Install client dependencies**
    ```bash
    cd ../client
    npm i
    ```

4. **Install RabbitMQ**
    - The installation command may vary depending on your operating system.
    - For example, on Arch-based systems:
    ```bash
    sudo pacman -S rabbitmq
    npm i
    ```

5. **Start the RabbitMQ and Worker server**
    ```bash
    ./start_servers.sh to start locally # Start all services locally
    ./shared_localhost_servers.sh #Start services with LAN port forwarding
    ```

6. **Start the server**
    ```bash
    cd ../server
    node server.js
    ```

7. **Start the client**
    ```bash
    cd ../client
    npm start
    ```

8. **Open workers**
    - Navigate to `http://localhost:8000` to set up your worker

9. **Client site**
    - Navigate to http://localhost:3000 to start a computation task.
    - Upload your .wasm and .js files, set parameters, and launch the distributed computation.