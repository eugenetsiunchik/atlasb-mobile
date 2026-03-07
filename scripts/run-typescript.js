const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const scriptCache = new Map();
const projectRoot = path.resolve(__dirname, '..');
const EXTENSIONS_TO_TRY = ['', '.ts', '.tsx', '.js', '.cjs', '.mjs'];

function resolveLocalModule(parentFilePath, specifier) {
  const basePath = path.resolve(path.dirname(parentFilePath), specifier);
  const candidates = [
    ...EXTENSIONS_TO_TRY.map(extension => `${basePath}${extension}`),
    ...EXTENSIONS_TO_TRY.map(extension =>
      path.join(basePath, `index${extension}`),
    ),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return require.resolve(basePath);
}

function executeScript(filePath, args = []) {
  if (scriptCache.has(filePath)) {
    return scriptCache.get(filePath).exports;
  }

  const source = fs.readFileSync(filePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
    fileName: filePath,
  });

  const module = { exports: {} };
  scriptCache.set(filePath, module);
  const localRequire = specifier => {
    if (specifier.startsWith('.')) {
      const resolvedPath = resolveLocalModule(filePath, specifier);

      if (/\.(ts|tsx)$/.test(resolvedPath)) {
        return executeScript(resolvedPath);
      }

      return require(resolvedPath);
    }
    return require(specifier);
  };

  const context = vm.createContext({
    exports: module.exports,
    module,
    require: localRequire,
    __dirname: path.dirname(filePath),
    __filename: filePath,
    console,
    process: {
      ...process,
      argv: [process.argv[0], filePath, ...args],
    },
    URL,
  });

  new vm.Script(outputText, { filename: filePath }).runInContext(context);
  return module.exports;
}

function runTypeScriptFile(relativePath, args) {
  const filePath = path.resolve(projectRoot, relativePath);
  executeScript(filePath, args);
}

const [, , relativePath, ...args] = process.argv;

if (!relativePath) {
  console.error('Usage: node scripts/run-typescript.js <file.ts> [...args]');
  process.exit(1);
}

runTypeScriptFile(relativePath, args);
