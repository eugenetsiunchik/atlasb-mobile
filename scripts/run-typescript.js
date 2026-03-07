const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

function runTypeScriptFile(relativePath, args) {
  const filePath = path.resolve(__dirname, '..', relativePath);
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
  const localRequire = specifier => {
    if (specifier.startsWith('.')) {
      return require(path.resolve(path.dirname(filePath), specifier));
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
}

const [, , relativePath, ...args] = process.argv;

if (!relativePath) {
  console.error('Usage: node scripts/run-typescript.js <file.ts> [...args]');
  process.exit(1);
}

runTypeScriptFile(relativePath, args);
