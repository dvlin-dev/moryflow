#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const projectRoot = path.resolve(__dirname, '..')
const basePath = path.join(projectRoot, 'lib', 'tokens', 'base.ts')
const outputPath = path.join(projectRoot, 'global.css')

const source = fs.readFileSync(basePath, 'utf8')

const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
    esModuleInterop: true,
  },
  fileName: basePath,
})

const moduleStub = { exports: {} }
const sandbox = {
  module: moduleStub,
  exports: moduleStub.exports,
  require: (moduleName) => {
    throw new Error(`Token build script does not support importing "${moduleName}" from base.ts`)
  },
  __dirname: path.dirname(basePath),
  __filename: basePath,
  console,
}

sandbox.global = sandbox

vm.runInNewContext(transpiled.outputText, sandbox, { filename: basePath })

const tokensModule = sandbox.module.exports

if (!tokensModule || !tokensModule.cssVariablesByMode) {
  throw new Error('Unable to read cssVariablesByMode from lib/tokens/base.ts')
}

const { cssVariablesByMode } = tokensModule

const formatVariables = (variables) =>
  Object.entries(variables)
    .map(([name, value]) => `    --${name}: ${value};`)
    .join('\n')

const fileContent = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n@layer base {\n  :root {\n${formatVariables(cssVariablesByMode.light)}\n  }\n\n  .dark:root {\n${formatVariables(cssVariablesByMode.dark)}\n  }\n}\n`

fs.writeFileSync(outputPath, fileContent)
process.stdout.write('Generated global.css from design tokens.\n')
