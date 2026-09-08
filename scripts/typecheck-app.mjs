// Check the real application project and the generated API a client relies on.
// The five deliberately invalid calls exist only in the in-memory test source.
import ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const virtualPath = resolve(root, 'nodebench-api-contract.ts');
const contract = `import { api, internal } from './backend/convex/_generated/api';
import type { FunctionArgs, FunctionReturnType } from 'convex/server';
const publicRef = api.actions.coordinatorWorkflowActions.startCoordinatorWorkflow;
const privateRef = internal.domains.mcp.mcpSourcingDraft.generate;
type IsAny<T> = 0 extends (1 & T) ? true : false;
type IsNever<T> = [T] extends [never] ? true : false;
type AssertFalse<T extends false> = T;
type PublicApiNotAny = AssertFalse<IsAny<typeof api>>;
type PublicApiNotNever = AssertFalse<IsNever<typeof api>>;
type InternalApiNotAny = AssertFalse<IsAny<typeof internal>>;
type InternalApiNotNever = AssertFalse<IsNever<typeof internal>>;
type PublicReferenceNotAny = AssertFalse<IsAny<typeof publicRef>>;
type InternalReferenceNotAny = AssertFalse<IsAny<typeof privateRef>>;
type InternalArgsNotAny = AssertFalse<IsAny<FunctionArgs<typeof privateRef>>>;
type InternalResultNotAny = AssertFalse<IsAny<FunctionReturnType<typeof privateRef>>>;
const validPublic: FunctionArgs<typeof publicRef> = { threadId: 'review-session', prompt: 'Summarize supplied evidence' };
const validPrivate: FunctionArgs<typeof privateRef> = { userId: 'service-owner', requestId: 'draft-01', projectId: 'cotton-pouch', expectedRevision: 2, inputHash: 'a'.repeat(64), inputJson: '{}' };
const validPublicReturn: string = publicRef._returnType.runId;
const validPrivateReturn: string = privateRef._returnType.receipt.model;
const wrongPublicArgument: FunctionArgs<typeof publicRef> = { threadId: 42, prompt: 'Review' };
const wrongPrivateArgument: FunctionArgs<typeof privateRef> = { ...validPrivate, expectedRevision: 'two' };
const wrongPrivateReturn: number = privateRef._returnType.receipt.model;
const forbiddenPublic = api.domains.mcp.mcpSourcingDraft.generate;
const forbiddenInternal = internal.actions.coordinatorWorkflowActions.startCoordinatorWorkflow;
`;
const formatHost = {
  getCanonicalFileName: file => file,
  getCurrentDirectory: () => root,
  getNewLine: () => '\n',
};

try {
  const config = ts.readConfigFile(resolve(root, 'tsconfig.app.json'), ts.sys.readFile);
  if (config.error) throw new Error(ts.formatDiagnostics([config.error], formatHost));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  if (parsed.errors.length) throw new Error(ts.formatDiagnostics(parsed.errors, formatHost));
  if (!parsed.fileNames.some(file => resolve(file) === resolve(root, 'apps/web/src/App.tsx'))) {
    throw new Error('The application project must include apps/web/src/App.tsx.');
  }
  const options = { ...parsed.options, noEmit: true };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, ...args) => resolve(name) === virtualPath
    ? ts.createSourceFile(name, contract, ts.ScriptTarget.Latest, true)
    : getSourceFile(name, ...args);
  const program = ts.createProgram([...parsed.fileNames, virtualPath], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const fixtureDiagnostics = diagnostics.filter(d => d.file && resolve(d.file.fileName) === virtualPath);
  const appDiagnostics = diagnostics.filter(d => !d.file || resolve(d.file.fileName) !== virtualPath);
  const expected = new Map(contract.split('\n').flatMap((line, index) => {
    if (line.startsWith('const wrong')) return [[index, 2322]];
    if (line.startsWith('const forbidden')) return [[index, 2339]];
    return [];
  }));
  const negativeChecks = fixtureDiagnostics.map(d => ({
    line: d.file.getLineAndCharacterOfPosition(d.start).line,
    code: d.code,
    message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
  }));
  const shimFiles = program.getSourceFiles().map(file => file.fileName)
    .filter(file => file.replaceAll('\\', '/').includes('/_type_shims/'));
  const contractsPassed = shimFiles.length === 0
    && negativeChecks.length === expected.size
    && [...expected].every(([line, code]) => negativeChecks.some(d => d.line === line && d.code === code));
  const passed = contractsPassed && appDiagnostics.length === 0;
  const generated = readFileSync(resolve(root, 'backend/convex/_generated/api.d.ts'), 'utf8');
  const report = {
    status: passed ? 'PASS' : 'FAIL',
    project: 'tsconfig.app.json',
    rootSourceFiles: parsed.fileNames.length,
    programFiles: program.getSourceFiles().length,
    generatedModuleImports: [...generated.matchAll(/import type \* as /g)].length,
    apiCallContracts: contractsPassed ? 'PASS' : 'FAIL',
    expectedInvalidCalls: expected.size,
    observedInvalidCallErrors: negativeChecks,
    ambientShimFiles: shimFiles,
    applicationDiagnostics: appDiagnostics.length,
  };
  const output = resolve(root, '.tmp/app-typecheck');
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(resolve(output, 'diagnostics.log'), ts.formatDiagnostics(appDiagnostics, formatHost));
  console.log(`Generated API call contracts: ${report.apiCallContracts}. Application diagnostics: ${appDiagnostics.length}.`);
  if (!contractsPassed) console.error(ts.formatDiagnostics(fixtureDiagnostics, formatHost) || 'Expected invalid calls were accepted or ambient shims were included.');
  if (appDiagnostics.length) console.error(ts.formatDiagnostics(appDiagnostics, formatHost));
  if (!passed) process.exitCode = 1;
} catch (error) {
  console.error('[app-typecheck]', error.message);
  process.exitCode = 1;
}
