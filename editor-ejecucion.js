const EXECUTION_TIMEOUT = 3000;
// const editors = {}; // Eliminar la variable local 'editors'
const pyodideStatus = document.getElementById('pyodide-status');
const runButtons = document.querySelectorAll('.run-button');
let pyWorker = null;
let workerReady = false;
let currentRun = null;

window.codeMirrorEditors = {}; // Inicializar el objeto global para los editores

const pythonKeywords = [
  "for", "while", "if", "else", "elif", "def", "return", "True", "False",
  "None", "import", "from", "as", "in", "not", "and", "or", "break", "continue",
  "class", "try", "except", "finally", "with", "pass", "global", "nonlocal",
  "assert", "lambda", "yield", "raise", "is", "del", "print()", "input()",
  "str()", "int()", "float()", "bool()", "list()", "dict()", "set()", "tuple()", "len()",
  "range()", "open()", "close()", "read()", "write()", "replace()", "lower()", "upper()",
  "append()", "extend()", "pop()", "remove()", "sort()", "reverse()", "split()", "join()"
];

CodeMirror.registerHelper("hint", "python_combined", function(cm) {
    const cur = cm.getCursor();
    const token = cm.getTokenAt(cur);
    const start = token.start;
    const end = cur.ch;
    const word = token.string.slice(0, end - start).toLowerCase();

    // 1. Filtrar palabras clave que empiezan igual
    const fromKeyword = pythonKeywords.filter(kw => kw.toLowerCase().startsWith(word));

    // 2. Buscar palabras en el documento que empiecen igual (sin repetidos)
    const regex = /\b\w+\b/g;
    const wordsInDoc = new Set();
    cm.eachLine(line => {
        let lineText = line.text.toLowerCase();
        let match;
        while ((match = regex.exec(lineText)) !== null) {
            if (match[0].startsWith(word)) {
                wordsInDoc.add(match[0]);
            }
        }
    });

    // 3. Combinar ambas listas y eliminar repetidos
    const combined = [...new Set([...fromKeyword, ...wordsInDoc])].sort();

    return {
        list: combined,
        from: CodeMirror.Pos(cur.line, start),
        to: CodeMirror.Pos(cur.line, end)
    };
});


document.querySelectorAll('textarea[id^="code-"]').forEach(textarea => {
    const editor = CodeMirror.fromTextArea(textarea, {
        lineNumbers: true,
        mode: 'python',
        theme: 'dracula',
        indentUnit: 4,
        smartIndent: true,
        tabSize: 4,
        indentWithTabs: false,
        matchBrackets: true,
        autoCloseBrackets: true,
        lineWrapping: true,
        extraKeys: {
            "Ctrl-Space": "autocomplete"
        },
        hintOptions: {
            completeSingle: false,
            hint: CodeMirror.hint.python_combined
        }
    });

    window.codeMirrorEditors[textarea.id] = editor;

    editor.on('inputRead', function(cm, change) {
        if (!cm.state.completionActive && /[\w.]/.test(change.text[0])) {
            CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
        }
    });
});


function createWorker() {
    console.log("Creating new Pyodide worker...");
    workerReady = false;
    updateStatus('⚙️ Inicializando Entorno Python...', 'warning');
    runButtons.forEach(btn => btn.disabled = true);

    // Crear el script del worker como un Blob para mantenerlo en un solo archivo
    const workerScript = `
        self.pyodide = null;
        self.pyodideLoading = false; // Flag to prevent multiple loads
        self.outputBuffer = "";
        self.errorBuffer = "";

        async function loadPyodideOnce() {
                if (self.pyodide || self.pyodideLoading) return; // Ya cargado o cargando
                self.pyodideLoading = true;
                console.log("Worker: Loading Pyodide...");
                try {
                importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js");
                self.pyodide = await loadPyodide();
                self.pyodide.setStdout({ batched: (msg) => self.outputBuffer += msg + "\\n" });
                self.pyodide.setStderr({ batched: (msg) => self.errorBuffer += msg + "\\n" });
                console.log("Worker: Pyodide loaded.");
                postMessage({ type: 'ready' });
                } catch (e) {
                    console.error("Worker: Pyodide load failed:", e);
                    postMessage({ type: 'error', data: 'Failed to load Python environment: ' + e.toString() });
                } finally {
                self.pyodideLoading = false;
                }
        }

        self.onmessage = async (event) => {
            const { code } = event.data;
            
            if (!self.pyodide) {
                await loadPyodideOnce();
                if (!self.pyodide) return; // Si falló la carga, no continuar
            }

            console.log("Worker: Running code...");
            self.outputBuffer = "";
            self.errorBuffer = "";

            try {
                await self.pyodide.runPythonAsync(code);
                postMessage({ type: 'result', output: self.outputBuffer, error: self.errorBuffer });
            } catch (e) {
                self.errorBuffer += e.toString();
                postMessage({ type: 'result', output: self.outputBuffer, error: self.errorBuffer });
            }
        };
        
        // Cargar Pyodide al iniciar el worker
        loadPyodideOnce();
    `;
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    pyWorker = new Worker(URL.createObjectURL(blob));

    pyWorker.onmessage = (event) => {
        const { type, output, error, data } = event.data;

        if (type === 'ready') {
            workerReady = true;
            updateStatus('✅ Entorno Python Listo.', 'success');
            runButtons.forEach(btn => btn.disabled = false);
            console.log("Worker reported ready.");
        } else if (type === 'result' && currentRun) {
            clearTimeout(currentRun.timeoutId);
            const outputElement = document.getElementById(currentRun.outputId);
            outputElement.className = 'output-box';
            if (error) {
                outputElement.textContent = error;
                outputElement.classList.add('error');
            } else {
                outputElement.textContent = output || '(No hubo salida)';
            }
            currentRun.button.disabled = false;
            currentRun.button.textContent = '▶️ Ejecutar';
            currentRun.button.classList.remove('running');
            currentRun = null;
        } else if (type === 'error' && currentRun) {
                clearTimeout(currentRun.timeoutId);
                const outputElement = document.getElementById(currentRun.outputId);
                outputElement.textContent = data;
                outputElement.className = 'output-box error';
                currentRun.button.disabled = false;
                currentRun.button.textContent = '▶️ Ejecutar';
                currentRun.button.classList.remove('running');
                currentRun = null;
        } else if (type === 'error') {
                updateStatus(`❌ Error del Worker: ${data}`, 'error');
        }
    };

    pyWorker.onerror = (error) => {
        console.error("Worker error:", error);
        updateStatus(`❌ Error Crítico del Worker: ${error.message}. Recarga la página.`, 'error');
        if (currentRun) {
            const outputElement = document.getElementById(currentRun.outputId);
            outputElement.textContent = `Error del Worker: ${error.message}`;
            outputElement.className = 'output-box error';
            currentRun.button.disabled = false;
            currentRun.button.textContent = '▶️ Ejecutar';
            currentRun.button.classList.remove('running');
            currentRun = null;
        }
            pyWorker.terminate(); // Terminar el worker dañado
            pyWorker = null;
            workerReady = false;
    };
}


function updateStatus(message, type = 'warning') {
    pyodideStatus.textContent = message;
    pyodideStatus.style.backgroundColor = type === 'success' ? '#d4edda' :
                                          type === 'error' ? '#f8d7da' : '#fff3cd';
    pyodideStatus.style.color = type === 'success' ? '#155724' :
                                type === 'error' ? '#721c24' : '#856404';
}

function handleTimeout() {
    if (!currentRun) return;

    const outputElement = document.getElementById(currentRun.outputId);
    outputElement.textContent = `❌ ¡Tiempo Límite Excedido!`;
    outputElement.className = 'output-box timeout';
    currentRun.button.disabled = false;
    currentRun.button.textContent = '▶️ Ejecutar';
    currentRun.button.classList.remove('running');

    pyWorker.terminate();
    pyWorker = null;
    currentRun = null;
    createWorker();
}

function runCode(codeId, button) {
    if (!workerReady || currentRun || !pyWorker) {
        alert("Espera a que el entorno esté listo.");
        return;
    }

    const editor = window.codeMirrorEditors[codeId]; // Acceder al objeto global
    if (!editor) {
        console.error(`No se encontró el editor con ID: ${codeId}`);
        alert(`Error: No se encontró el editor de código.`);
        return;
    }
    const code = editor.getValue();
    const outputId = `output-${codeId.split('-')[1]}-${codeId.split('-')[2]}`;
    const outputElement = document.getElementById(outputId);

    outputElement.textContent = 'Ejecutando...';
    outputElement.className = 'output-box loading';
    button.disabled = true;
    button.textContent = '🔄';
    button.classList.add('running');

    const timeoutId = setTimeout(handleTimeout, EXECUTION_TIMEOUT);
    currentRun = { codeId, outputId, button, timeoutId };

    pyWorker.postMessage({ code });
}

runButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const codeId = e.target.dataset.codeId;
        runCode(codeId, e.target);
    });
});

createWorker();
