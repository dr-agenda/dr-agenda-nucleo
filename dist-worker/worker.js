var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = /* @__PURE__ */ __name((arrayBuffer, contentType) => {
  return new Response(arrayBuffer, { headers: { "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase()) } }).formData();
}, "bufferToFormData");

// node_modules/hono/dist/utils/body.js
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = /* @__PURE__ */ __name((request) => "headers" in request, "isRawRequest");
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const mediaType = (isRawRequest(request) ? request.headers : request.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") return parseFormData(request, {
    all,
    dot
  });
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) return convertFormDataToBodyData(await request.bodyCache.formData, options);
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) request.bodyCache.formData = formDataPromise;
  const formData = await formDataPromise;
  if (formData) return convertFormDataToBodyData(formData, options);
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value, key) => {
    if (!(options.all || key.endsWith("[]"))) form[key] = value;
    else handleParsingAllValues(form, key, value);
  });
  if (options.dot) Object.entries(form).forEach(([key, value]) => {
    if (key.includes(".")) {
      handleParsingNestedValues(form, key, value, nestingState);
      delete form[key];
    }
  });
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) form[key].push(value);
    else form[key] = [form[key], value];
  } else if (!key.endsWith("[]")) form[key] = value;
  else form[key] = [value];
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value, state) => {
  if (/(?:^|\.)__proto__\./.test(key)) return;
  let nestedForm = form;
  const keys = key.split(".", 34);
  if (keys.length > 33) throwNestingLimitExceeded();
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) nestedForm[key2] = value;
    else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) throwNestingLimitExceeded();
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");
var throwNestingLimitExceeded = /* @__PURE__ */ __name(() => {
  throw new Error("Nesting limit exceeded");
}, "throwNestingLimitExceeded");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") paths.shift();
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return {
    groups,
    path
  };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) if (paths[j].includes(mark)) {
      paths[j] = paths[j].replace(mark, groups[i][1]);
      break;
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") return "*";
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [
        cacheKey,
        match2[1],
        new RegExp(`^${match2[2]}(?=/${next})`)
      ] : [
        label,
        match2[1],
        new RegExp(`^${match2[2]}$`)
      ];
      else patternCache[cacheKey] = [
        label,
        match2[1],
        true
      ];
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) break;
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) sub = mergePath(sub, ...rest);
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) return null;
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) basePath += "/" + segment;
    else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") results.push("/");
        else results.push(basePath);
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else basePath += "/" + segment;
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str, "tryDecodeURIComponent");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (value.indexOf("+") !== -1) value = value.replace(/\+/g, " ");
  return tryDecodeURIComponent(value);
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  const hashIndex = url.indexOf("#", 8);
  if (hashIndex !== -1) url = url.slice(0, hashIndex);
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) return;
    if (!url.startsWith(key, keyIndex2 + 1)) keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) return "";
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) return;
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) valueIndex = -1;
    let name = url.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex);
    if (encoded) name = _decodeURI(name);
    keyIndex = nextKeyIndex;
    if (name === "") continue;
    let value;
    if (valueIndex === -1) value = "";
    else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) value = _decodeURI(value);
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) results[name] = [];
      results[name].push(value);
    } else results[name] ??= value;
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
  * `.raw` can get the raw Request object.
  *
  * @see {@link https://hono.dev/docs/api/request#raw}
  *
  * @example
  * ```ts
  * // For Cloudflare Workers
  * app.post('/', async (c) => {
  *   const metadata = c.req.raw.cf?.hostMetadata?
  *   ...
  * })
  * ```
  */
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  /**
  * `.path` can get the pathname of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#path}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const pathname = c.req.path // `/about/me`
  * })
  * ```
  */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) decoded[key] = tryDecodeURIComponent(value);
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) return this.raw.headers.get(name) ?? void 0;
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) return cachedBody;
    for (const anyCachedKey in bodyCache) return bodyCache[anyCachedKey].then((body) => {
      if (anyCachedKey === "json") body = JSON.stringify(body);
      const contentType = anyCachedKey === "formData" ? void 0 : raw2.headers.get("content-type");
      return new Response(body, { headers: contentType ? { "Content-Type": contentType } : void 0 })[key]();
    });
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
  * `.json()` can parse Request body of type `application/json`
  *
  * @see {@link https://hono.dev/docs/api/request#json}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.json()
  * })
  * ```
  */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
  * `.text()` can parse Request body of type `text/plain`
  *
  * @see {@link https://hono.dev/docs/api/request#text}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.text()
  * })
  * ```
  */
  text() {
    return this.#cachedBody("text");
  }
  /**
  * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
  *
  * @see {@link https://hono.dev/docs/api/request#arraybuffer}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.arrayBuffer()
  * })
  * ```
  */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
  * `.bytes()` parses the request body as a `Uint8Array`.
  *
  * @see {@link https://hono.dev/docs/api/request#bytes}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.bytes()
  * })
  * ```
  */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer2) => new Uint8Array(buffer2));
  }
  /**
  * Parses the request body as a `Blob`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.blob();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#blob
  */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
  * Parses the request body as `FormData`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.formData();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#formdata
  */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
  * Adds validated data to the request.
  *
  * @param target - The target of the validation.
  * @param data - The validated data to add.
  */
  addValidatedData(target, data) {
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
  * `.url` can get the request url strings.
  *
  * @see {@link https://hono.dev/docs/api/request#url}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const url = c.req.url // `http://localhost:8787/about/me`
  *   ...
  * })
  * ```
  */
  get url() {
    return this.raw.url;
  }
  /**
  * `.method` can get the method name of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#method}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const method = c.req.method // `GET`
  * })
  * ```
  */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
  * `.matchedRoutes` can return a matched route in the handler
  *
  * @deprecated
  *
  * Use matchedRoutes helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#matchedroutes}
  *
  * @example
  * ```ts
  * app.use('*', async function logger(c, next) {
  *   await next()
  *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
  *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
  *     console.log(
  *       method,
  *       ' ',
  *       path,
  *       ' '.repeat(Math.max(10 - path.length, 0)),
  *       name,
  *       i === c.req.routeIndex ? '<- respond from here' : ''
  *     )
  *   })
  * })
  * ```
  */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
  * `.routePath` can retrieve the path registered within the handler
  *
  * @deprecated
  *
  * Use routePath helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#routepath}
  *
  * @example
  * ```ts
  * app.get('/posts/:id', (c) => {
  *   return c.json({ path: c.req.routePath })
  * })
  * ```
  */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context2, buffer2) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) str = str.toString();
    if (str instanceof Promise) str = await str;
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) return Promise.resolve(str);
  if (buffer2) buffer2[0] += str;
  else buffer2 = [str];
  const resStr = Promise.all(callbacks.map((c) => c({
    phase,
    buffer: buffer2,
    context: context2
  }))).then((res) => Promise.all(res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context2, buffer2))).then(() => buffer2[0]));
  if (preserveCallbacks) return raw(await resStr, callbacks);
  else return resStr;
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
  * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
  *
  * @see {@link https://hono.dev/docs/api/context#env}
  *
  * @example
  * ```ts
  * // Environment object for Cloudflare Workers
  * app.get('*', async c => {
  *   const counter = c.env.COUNTER
  * })
  * ```
  */
  env = {};
  #var;
  finalized = false;
  /**
  * `.error` can get the error object from the middleware if the Handler throws an error.
  *
  * @see {@link https://hono.dev/docs/api/context#error}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   await next()
  *   if (c.error) {
  *     // do something...
  *   }
  * })
  * ```
  */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
  * Creates an instance of the Context class.
  *
  * @param req - The Request object.
  * @param options - Optional configuration options for the context.
  */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
  * `.req` is the instance of {@link HonoRequest}.
  */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#event}
  * The FetchEvent associated with the current request.
  *
  * @throws Will throw an error if the context does not have a FetchEvent.
  */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no FetchEvent");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#executionctx}
  * The ExecutionContext associated with the current request.
  *
  * @throws Will throw an error if the context does not have an ExecutionContext.
  */
  get executionCtx() {
    if (this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no ExecutionContext");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#res}
  * The Response object for the current request.
  */
  get res() {
    return this.#res ||= createResponseInstance(null, { headers: this.#preparedHeaders ??= new Headers() });
  }
  /**
  * Sets the Response object for the current request.
  *
  * @param _res - The Response object to set.
  */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") continue;
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) _res.headers.append("set-cookie", cookie);
        } else _res.headers.set(k, v);
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
  * `.render()` can create a response within a layout.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   return c.render('Hello!')
  * })
  * ```
  */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
  * Sets the layout for the response.
  *
  * @param layout - The layout to set.
  * @returns The layout function.
  */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
  * Gets the current layout for the response.
  *
  * @returns The current layout function.
  */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
  * `.setRenderer()` can set the layout in the custom middleware.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```tsx
  * app.use('*', async (c, next) => {
  *   c.setRenderer((content) => {
  *     return c.html(
  *       <html>
  *         <body>
  *           <p>{content}</p>
  *         </body>
  *       </html>
  *     )
  *   })
  *   await next()
  * })
  * ```
  */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
  * `.header()` can set headers.
  *
  * @see {@link https://hono.dev/docs/api/context#header}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *
  *   // Append multiple headers using the append option (e.g. Vary)
  *   c.header('Vary', 'Accept-Encoding', { append: true })
  *   c.header('Vary', 'User-Agent', { append: true })
  *
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) this.#res = createResponseInstance(this.#res.body, this.#res);
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) headers.delete(name);
    else if (options?.append) headers.append(name, value);
    else headers.set(name, value);
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
  * `.set()` can set the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   c.set('message', 'Hono is hot!!')
  *   await next()
  * })
  * ```
  */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
  * `.get()` can use the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   const message = c.get('message')
  *   return c.text(`The message is "${message}"`)
  * })
  * ```
  */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
  * `.var` can access the value of a variable.
  *
  * @see {@link https://hono.dev/docs/api/context#var}
  *
  * @example
  * ```ts
  * const result = c.var.client.oneMethod()
  * ```
  */
  get var() {
    if (!this.#var) return {};
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) if (key === "set-cookie") responseHeaders.append(key, value);
      else responseHeaders.set(key, value);
    }
    if (headers) {
      if (!responseHeaders) {
        let count3 = 0;
        for (const k in headers) if (++count3 > 1 || typeof headers[k] !== "string") {
          responseHeaders = new Headers();
          break;
        }
      }
      if (responseHeaders) for (const k in headers) {
        const v = headers[k];
        if (typeof v === "string") responseHeaders.set(k, v);
        else {
          responseHeaders.delete(k);
          for (const v2 of v) responseHeaders.append(k, v2);
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
  * `.body()` can return the HTTP response.
  * You can set headers with `.header()` and set HTTP status code with `.status`.
  * This can also be set in `.text()`, `.json()` and so on.
  *
  * @see {@link https://hono.dev/docs/api/context#body}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *   // Set HTTP status code
  *   c.status(201)
  *
  *   // Return the response body
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
  * `.text()` can render text as `Content-Type:text/plain`.
  *
  * @see {@link https://hono.dev/docs/api/context#text}
  *
  * @example
  * ```ts
  * app.get('/say', (c) => {
  *   return c.text('Hello!')
  * })
  * ```
  */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(text, arg, setDefaultContentType(TEXT_PLAIN, headers));
  }, "text");
  /**
  * `.json()` can render JSON as `Content-Type:application/json`.
  *
  * @see {@link https://hono.dev/docs/api/context#json}
  *
  * @example
  * ```ts
  * app.get('/api', (c) => {
  *   return c.json({ message: 'Hello!' })
  * })
  * ```
  */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(JSON.stringify(object), arg, setDefaultContentType("application/json", headers));
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
  * `.redirect()` can Redirect, default status code is 302.
  *
  * @see {@link https://hono.dev/docs/api/context#redirect}
  *
  * @example
  * ```ts
  * app.get('/redirect', (c) => {
  *   return c.redirect('/')
  * })
  * app.get('/redirect-permanently', (c) => {
  *   return c.redirect('/', 301)
  * })
  * ```
  */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header("Location", !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString));
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
  * `.notFound()` can return the Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/context#notfound}
  *
  * @example
  * ```ts
  * app.get('/notfound', (c) => {
  *   return c.notFound()
  * })
  * ```
  */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context2, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context2.req.routeIndex = i;
      } else handler = i === middleware.length && next || void 0;
      if (handler) try {
        res = await handler(context2, () => dispatch(i + 1));
      } catch (err) {
        if (err instanceof Error && onError) {
          context2.error = err;
          res = await onError(err, context2);
          isError = true;
        } else throw err;
      }
      else if (context2.finalized === false && onNotFound) res = await onNotFound(context2);
      if (res && (context2.finalized === false || isError)) context2.res = res;
      return context2;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/router.js
var METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "options",
  "patch",
  "query"
];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class Hono2 {
  static {
    __name(this, "Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    [...METHODS, "all"].forEach((method) => {
      this[method] = (args1, ...args) => {
        const methodName = method.toUpperCase();
        if (typeof args1 === "string") this.#path = args1;
        else this.#addRoute(methodName, this.#path, args1);
        args.forEach((handler) => {
          this.#addRoute(methodName, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          const methodName = m.toUpperCase();
          for (const handler of handlers) this.#addRoute(methodName, this.#path, handler);
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") this.#path = arg1;
      else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute("ALL", this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono2({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  /**
  * `.route()` allows grouping other Hono instance in routes.
  *
  * @see {@link https://hono.dev/docs/api/routing#grouping}
  *
  * @param {string} path - base Path
  * @param {Hono} app - other Hono instance
  * @returns {Hono} routed Hono instance
  *
  * @example
  * ```ts
  * const app = new Hono()
  * const app2 = new Hono()
  *
  * app2.get("/user", (c) => c.text("user"))
  * app.route("/api", app2) // GET /api/user
  * ```
  */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) handler = r.handler;
      else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
  * `.basePath()` allows base paths to be specified.
  *
  * @see {@link https://hono.dev/docs/api/routing#base-path}
  *
  * @param {string} path - base Path
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * const api = new Hono().basePath('/api')
  * ```
  */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
  * `.onError()` handles an error and returns a customized Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#error-handling}
  *
  * @param {ErrorHandler} handler - request Handler for error
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.onError((err, c) => {
  *   console.error(`${err}`)
  *   return c.text('Custom Error Message', 500)
  * })
  * ```
  */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
  * `.notFound()` allows you to customize a Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#not-found}
  *
  * @param {NotFoundHandler} handler - request handler for not-found
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.notFound((c) => {
  *   return c.text('Custom 404 Message', 404)
  * })
  * ```
  */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
  * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
  *
  * @deprecated Use `mount()` from `hono/mount` instead. `.mount()` will be removed in v5.
  *
  * @see {@link https://hono.dev/docs/api/hono#mount}
  *
  * @param {string} path - base Path
  * @param {Function} applicationHandler - other Request Handler
  * @param {MountOptions} [options] - options of `.mount()`
  * @returns {Hono} mounted Hono instance
  *
  * @example
  * ```ts
  * import { Router as IttyRouter } from 'itty-router'
  * import { Hono } from 'hono'
  * // Create itty-router application
  * const ittyRouter = IttyRouter()
  * // GET /itty-router/hello
  * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
  *
  * const app = new Hono()
  * app.mount('/itty-router', ittyRouter.handle)
  * ```
  *
  * @example
  * ```ts
  * const app = new Hono()
  * // Send the request to another application without modification.
  * app.mount('/app', anotherApp, {
  *   replaceRequest: (req) => req,
  * })
  * ```
  */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") optionHandler = options;
      else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        else replaceRequest = options.replaceRequest;
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) return res;
      await next();
    }, "handler");
    this.#addRoute("ALL", mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) return this.errorHandler(err, c);
    throw err;
  }
  #dispatch(request, executionCtx, env2, method) {
    if (method === "HEAD") return (async () => new Response(null, await this.#dispatch(request, executionCtx, env2, "GET")))();
    const path = this.getPath(request, { env: env2 });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env: env2,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context2 = await composed(c);
        if (!context2.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
        return context2.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
  * `.fetch()` will be entry point of your app.
  *
  * @see {@link https://hono.dev/docs/api/hono#fetch}
  *
  * @param {Request} request - request Object of request
  * @param {Env} env - env Object
  * @param {ExecutionContext} executionCtx - context of execution
  * @returns {Response | Promise<Response>} response of request
  *
  */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
  * `.request()` is a useful method for testing.
  * You can pass a URL or pathname to send a GET request.
  * app will return a Response object.
  * ```ts
  * test('GET /hello is ok', async () => {
  *   const res = await app.request('/hello')
  *   expect(res.status).toBe(200)
  * })
  * ```
  * @see https://hono.dev/docs/api/hono#request
  */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    input = input.toString();
    return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`, requestInit), Env, executionCtx);
  }, "request");
  /**
  * `.fire()` automatically adds a global fetch event listener.
  * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
  * @deprecated
  * Use `fire` from `hono/service-worker` instead.
  * ```ts
  * import { Hono } from 'hono'
  * import { fire } from 'hono/service-worker'
  *
  * const app = new Hono()
  * // ...
  * fire(app)
  * ```
  * @see https://hono.dev/docs/api/hono#fire
  * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
  * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
  */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/utils.js
var createNullObject = /* @__PURE__ */ __name(() => /* @__PURE__ */ Object.create(null), "createNullObject");

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers["ALL"];
    const staticMatch = matcher[2][path2];
    if (staticMatch) return staticMatch;
    const match3 = path2.match(matcher[0]);
    if (!match3) return [[], emptyParam];
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = /* @__PURE__ */ new Set(".\\+*[^]$()");
function compareKey(a, b2) {
  if (a.length === 1) return b2.length === 1 ? a < b2 ? -1 : 1 : -1;
  if (b2.length === 1) return 1;
  if (a === ".*" || a === "(?:|/.*)") return b2 === "(?:|/.*)" ? -1 : 1;
  else if (b2 === ".*" || b2 === "(?:|/.*)") return -1;
  if (a === "[^/]+") return 1;
  else if (b2 === "[^/]+") return -1;
  return a.length === b2.length ? a < b2 ? -1 : 1 : b2.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class Node2 {
  static {
    __name(this, "Node");
  }
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context2, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? [
        "",
        "",
        ".*"
      ] : [
        "",
        "",
        LABEL_REG_EXP_STR
      ] : null : token === "/*" ? [
        "",
        "",
        TAIL_WILDCARD_REG_EXP_STR
      ] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || "[^/]+";
        if (name && pattern[2]) {
          if (regexpStr === ".*") throw PATH_ERROR;
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) throw PATH_ERROR;
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) throw PATH_ERROR;
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ".*" && regexpStr !== "(?:|/.*)") {
            for (const k in node.#children) if ((regexpStr.length > 1 || k.length > 1) && k !== ".*" && k !== "(?:|/.*)") throw PATH_ERROR;
          }
          nextNode = node.#children[regexpStr] = new Node2();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context2.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) if (k.length > 1 && k !== ".*" && k !== "(?:|/.*)") throw PATH_ERROR;
          nextNode = node.#children[token] = new Node2();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) throw PATH_ERROR;
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const strList = Object.keys(this.#children).sort(compareKey).map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) strList.unshift(`#${this.#index}`);
    if (strList.length === 0) return "";
    if (strList.length === 1) return strList[0];
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  paths = createNullObject();
  insert(path, isStatic) {
    if (isStatic) {
      this.#root.insert(path.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) break;
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) if (tokens[j].indexOf(mark) !== -1) {
        tokens[j] = tokens[j].replace(mark, groups[i][1]);
        break;
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") return [
      /^$/,
      [],
      []
    ];
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [
      new RegExp(`^${regexp}`),
      indexReplacementMap,
      paramReplacementMap
    ];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = createNullObject();
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(`^${path.replace(/\/:[^/{}]+(?:\{\[\^\/]\+})?(?=[/{]|$)|\/?\*$|([.\\+*[^\]$()?{}|])/g, (match2, metaChar) => metaChar ? `\\${metaChar}` : match2 === "/*" ? TAIL_WILDCARD_REG_EXP_STR : match2 === "*" ? ".*" : `/:${LABEL_REG_EXP_STR}`)}$`);
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function findMiddleware(middleware, path) {
  for (const k of Object.keys(middleware).sort((a, b2) => b2.length - a.length)) if (buildWildcardRegExp(k).test(path)) return [...middleware[k]];
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { ["ALL"]: createNullObject() };
    this.#routes = { ["ALL"]: createNullObject() };
    this.#tries = { ["ALL"]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      for (const handlerMap of [middleware, routes]) {
        handlerMap[method] = createNullObject();
        for (const p in handlerMap["ALL"]) {
          handlerMap[method][p] = [...handlerMap["ALL"][p]];
          this.#insertPath(method, p);
        }
      }
    }
    if (path === "/*") path = "*";
    const methods = method === "ALL" ? Object.keys(middleware) : [method];
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      for (const m of methods) if (!middleware[m][path]) {
        this.#insertPath(m, path);
        middleware[m][path] = findMiddleware(middleware[m], path) || findMiddleware(middleware["ALL"], path) || [];
      }
      for (const handlerMap of [middleware, routes]) for (const m of methods) for (const p in handlerMap[m]) re.test(p) && handlerMap[m][p].push([handler, path]);
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (const path2 of paths) for (const m of methods) {
      if (!routes[m][path2]) {
        this.#insertPath(m, path2);
        routes[m][path2] = findMiddleware(middleware[m], path2) || findMiddleware(middleware["ALL"], path2) || [];
      }
      routes[m][path2].push([handler, path2]);
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#routes)) matchers[method] = this.#buildMatcher(method);
    this.#middleware = this.#routes = this.#tries = void 0;
    wildcardRegExpCache = createNullObject();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (const r of [middleware, routes]) for (const path in r) {
      const handlers = r[path];
      const pathData = trie.paths[path];
      if (!pathData) {
        staticMap[path] = [handlers.map(([h]) => [h, createNullObject()]), emptyParam];
        continue;
      }
      handlerData[pathData[0]] = handlers.map(([h, handlerPath]) => [h, trie.paths[handlerPath][1].reduceRight((map, [key], i) => {
        map[key] = paramReplacementMap[pathData[1][i][1]];
        return map;
      }, createNullObject())]);
    }
    return [
      regexp,
      indexReplacementMap.map((i) => handlerData[i]),
      staticMap
    ];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    this.#routes.push([
      method,
      path,
      handler
    ]);
  }
  match(method, path) {
    if (!this.#routes) throw new Error("Fatal error");
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) router.add(...routes[i2]);
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) continue;
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) throw new Error("Fatal error");
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) throw new Error("No active router has been determined yet.");
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node3 = class Node4 {
  static {
    __name(this, "Node");
  }
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new Node4();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) possibleKeys.add(pattern[1]);
    }
    curNode.#methods.push({ [method]: {
      handler,
      possibleKeys: [...possibleKeys],
      score: ++order
    } });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m["ALL"];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    let curNodes = [this];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else tempNodes.push(nextNode);
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) continue;
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, node.#params, params);
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                (curNodesQueue[componentCount] ||= []).push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, params, node.#params);
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) handlerSets.sort((a, b2) => {
      return a.score - b2.score;
    });
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node = new Node3();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) this.#node.insert(method, result, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono3 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
  * Creates an instance of the Hono class.
  *
  * @param options - Optional configuration options for the Hono instance.
  */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const opts = {
    origin: "*",
    allowMethods: [
      "GET",
      "HEAD",
      "PUT",
      "POST",
      "DELETE",
      "PATCH",
      "QUERY"
    ],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const exposeHeadersStr = opts.exposeHeaders?.length ? opts.exposeHeaders.join(",") : void 0;
  const allowHeadersStr = opts.allowHeaders?.length ? opts.allowHeaders.join(",") : void 0;
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") return () => optsOrigin;
      else return (origin) => optsOrigin === origin ? origin : null;
    } else if (typeof optsOrigin === "function") return optsOrigin;
    else return (origin) => optsOrigin.includes(origin) ? origin : null;
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") return async (origin, c) => (await optsAllowMethods(origin, c)).join(",");
    else if (Array.isArray(optsAllowMethods)) {
      const methodsStr = optsAllowMethods.join(",");
      return () => methodsStr;
    } else return () => "";
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) set("Access-Control-Allow-Origin", allowOrigin);
    if (opts.credentials) set("Access-Control-Allow-Credentials", "true");
    if (exposeHeadersStr) set("Access-Control-Expose-Headers", exposeHeadersStr);
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") c.res.headers.append("Vary", "Origin");
      if (opts.maxAge != null) set("Access-Control-Max-Age", opts.maxAge.toString());
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods) set("Access-Control-Allow-Methods", allowMethods);
      let headersStr = allowHeadersStr;
      if (!headersStr) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) headersStr = requestHeaders.split(",").map((h) => h.trim()).join(",");
      }
      if (headersStr) {
        set("Access-Control-Allow-Headers", headersStr);
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") c.header("Vary", "Origin", { append: true });
  }, "cors");
}, "cors");

// src/server/auth.ts
import crypto3 from "node:crypto";

// node_modules/postgres/cf/polyfills.js
import { EventEmitter as EventEmitter2 } from "node:events";
import { Buffer as Buffer2 } from "node:buffer";
var Crypto = globalThis.crypto;
var ids = 1;
var tasks = /* @__PURE__ */ new Set();
var v4Seg = "(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])";
var v4Str = `(${v4Seg}[.]){3}${v4Seg}`;
var IPv4Reg = new RegExp(`^${v4Str}$`);
var v6Seg = "(?:[0-9a-fA-F]{1,4})";
var IPv6Reg = new RegExp(
  `^((?:${v6Seg}:){7}(?:${v6Seg}|:)|(?:${v6Seg}:){6}(?:${v4Str}|:${v6Seg}|:)|(?:${v6Seg}:){5}(?::${v4Str}|(:${v6Seg}){1,2}|:)|(?:${v6Seg}:){4}(?:(:${v6Seg}){0,1}:${v4Str}|(:${v6Seg}){1,3}|:)|(?:${v6Seg}:){3}(?:(:${v6Seg}){0,2}:${v4Str}|(:${v6Seg}){1,4}|:)|(?:${v6Seg}:){2}(?:(:${v6Seg}){0,3}:${v4Str}|(:${v6Seg}){1,5}|:)|(?:${v6Seg}:){1}(?:(:${v6Seg}){0,4}:${v4Str}|(:${v6Seg}){1,6}|:)|(?::((?::${v6Seg}){0,5}:${v4Str}|(?::${v6Seg}){1,7}|:)))(%[0-9a-zA-Z-.:]{1,})?$`
);
var textEncoder = new TextEncoder();
var crypto2 = {
  randomBytes: /* @__PURE__ */ __name((l) => Crypto.getRandomValues(Buffer2.alloc(l)), "randomBytes"),
  pbkdf2Sync: /* @__PURE__ */ __name(async (password, salt, iterations, keylen) => Crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations
    },
    await Crypto.subtle.importKey(
      "raw",
      textEncoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    ),
    keylen * 8,
    ["deriveBits"]
  ), "pbkdf2Sync"),
  createHash: /* @__PURE__ */ __name((type) => ({
    update: /* @__PURE__ */ __name((x) => ({
      digest: /* @__PURE__ */ __name((encoding) => {
        if (!(x instanceof Uint8Array)) {
          x = textEncoder.encode(x);
        }
        let prom;
        if (type === "sha256") {
          prom = Crypto.subtle.digest("SHA-256", x);
        } else if (type === "md5") {
          prom = Crypto.subtle.digest("md5", x);
        } else {
          throw Error("createHash only supports sha256 or md5 in this environment, not ${type}.");
        }
        if (encoding === "hex") {
          return prom.then((arrayBuf) => Buffer2.from(arrayBuf).toString("hex"));
        } else if (encoding) {
          throw Error(`createHash only supports hex encoding or unencoded in this environment, not ${encoding}`);
        } else {
          return prom;
        }
      }, "digest")
    }), "update")
  }), "createHash"),
  createHmac: /* @__PURE__ */ __name((type, key) => ({
    update: /* @__PURE__ */ __name((x) => ({
      digest: /* @__PURE__ */ __name(async () => Buffer2.from(
        await Crypto.subtle.sign(
          "HMAC",
          await Crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
          textEncoder.encode(x)
        )
      ), "digest")
    }), "update")
  }), "createHmac")
};
var performance2 = globalThis.performance;
var process2 = {
  env: {}
};
var os = {
  userInfo() {
    return { username: "postgres" };
  }
};
var fs = {
  readFile() {
    throw new Error("Reading files not supported on CloudFlare");
  }
};
var net = {
  isIP: /* @__PURE__ */ __name((x) => IPv4Reg.test(x) ? 4 : IPv6Reg.test(x) ? 6 : 0, "isIP"),
  Socket
};
var tls = {
  connect({ socket: tcp, servername }) {
    tcp.writer.releaseLock();
    tcp.reader.releaseLock();
    tcp.readyState = "upgrading";
    tcp.raw = tcp.raw.startTls({ servername });
    tcp.raw.closed.then(
      () => tcp.emit("close"),
      (e) => tcp.emit("error", e)
    );
    tcp.writer = tcp.raw.writable.getWriter();
    tcp.reader = tcp.raw.readable.getReader();
    tcp.writer.ready.then(() => {
      tcp.read();
      tcp.readyState = "upgrade";
    });
    return tcp;
  }
};
function Socket() {
  const tcp = Object.assign(new EventEmitter2(), {
    readyState: "open",
    raw: null,
    writer: null,
    reader: null,
    connect,
    write,
    end,
    destroy,
    read
  });
  return tcp;
  async function connect(port, host) {
    try {
      tcp.readyState = "opening";
      const { connect: connect2 } = await import("cloudflare:sockets");
      tcp.raw = connect2(host + ":" + port, tcp.ssl ? { secureTransport: "starttls" } : {});
      tcp.raw.closed.then(
        () => {
          tcp.readyState !== "upgrade" ? close() : (tcp.readyState = "open", tcp.emit("secureConnect"));
        },
        (e) => tcp.emit("error", e)
      );
      tcp.writer = tcp.raw.writable.getWriter();
      tcp.reader = tcp.raw.readable.getReader();
      tcp.ssl ? readFirst() : read();
      tcp.writer.ready.then(() => {
        tcp.readyState = "open";
        tcp.emit("connect");
      });
    } catch (err) {
      error3(err);
    }
  }
  __name(connect, "connect");
  function close() {
    if (tcp.readyState === "closed")
      return;
    tcp.readyState = "closed";
    tcp.emit("close");
  }
  __name(close, "close");
  function write(data, cb) {
    tcp.writer.write(data).then(cb, error3);
    return true;
  }
  __name(write, "write");
  function end(data) {
    return data ? tcp.write(data, () => tcp.raw.close()) : tcp.raw.close();
  }
  __name(end, "end");
  function destroy() {
    tcp.destroyed = true;
    tcp.end();
  }
  __name(destroy, "destroy");
  async function read() {
    try {
      let done, value;
      while ({ done, value } = await tcp.reader.read(), !done)
        tcp.emit("data", Buffer2.from(value));
    } catch (err) {
      error3(err);
    }
  }
  __name(read, "read");
  async function readFirst() {
    const { value } = await tcp.reader.read();
    tcp.emit("data", Buffer2.from(value));
  }
  __name(readFirst, "readFirst");
  function error3(err) {
    tcp.emit("error", err);
    tcp.emit("close");
  }
  __name(error3, "error");
}
__name(Socket, "Socket");
function setImmediate(fn) {
  const id = ids++;
  tasks.add(id);
  queueMicrotask(() => {
    if (tasks.has(id)) {
      fn();
      tasks.delete(id);
    }
  });
  return id;
}
__name(setImmediate, "setImmediate");
function clearImmediate(id) {
  tasks.delete(id);
}
__name(clearImmediate, "clearImmediate");

// node_modules/postgres/cf/src/types.js
import { Buffer as Buffer3 } from "node:buffer";

// node_modules/postgres/cf/src/query.js
var originCache = /* @__PURE__ */ new Map();
var originStackCache = /* @__PURE__ */ new Map();
var originError = /* @__PURE__ */ Symbol("OriginError");
var CLOSE = {};
var Query = class extends Promise {
  static {
    __name(this, "Query");
  }
  constructor(strings, args, handler, canceller, options = {}) {
    let resolve, reject;
    super((a, b2) => {
      resolve = a;
      reject = b2;
    });
    this.tagged = Array.isArray(strings.raw);
    this.strings = strings;
    this.args = args;
    this.handler = handler;
    this.canceller = canceller;
    this.options = options;
    this.state = null;
    this.statement = null;
    this.resolve = (x) => (this.active = false, resolve(x));
    this.reject = (x) => (this.active = false, reject(x));
    this.active = false;
    this.cancelled = null;
    this.executed = false;
    this.signature = "";
    this[originError] = this.handler.debug ? new Error() : this.tagged && cachedError(this.strings);
  }
  get origin() {
    return (this.handler.debug ? this[originError].stack : this.tagged && originStackCache.has(this.strings) ? originStackCache.get(this.strings) : originStackCache.set(this.strings, this[originError].stack).get(this.strings)) || "";
  }
  static get [Symbol.species]() {
    return Promise;
  }
  cancel() {
    return this.canceller && (this.canceller(this), this.canceller = null);
  }
  simple() {
    this.options.simple = true;
    this.options.prepare = false;
    return this;
  }
  async readable() {
    this.simple();
    this.streaming = true;
    return this;
  }
  async writable() {
    this.simple();
    this.streaming = true;
    return this;
  }
  cursor(rows = 1, fn) {
    this.options.simple = false;
    if (typeof rows === "function") {
      fn = rows;
      rows = 1;
    }
    this.cursorRows = rows;
    if (typeof fn === "function")
      return this.cursorFn = fn, this;
    let prev;
    return {
      [Symbol.asyncIterator]: () => ({
        next: /* @__PURE__ */ __name(() => {
          if (this.executed && !this.active)
            return { done: true };
          prev && prev();
          const promise = new Promise((resolve, reject) => {
            this.cursorFn = (value) => {
              resolve({ value, done: false });
              return new Promise((r) => prev = r);
            };
            this.resolve = () => (this.active = false, resolve({ done: true }));
            this.reject = (x) => (this.active = false, reject(x));
          });
          this.execute();
          return promise;
        }, "next"),
        return() {
          prev && prev(CLOSE);
          return { done: true };
        }
      })
    };
  }
  describe() {
    this.options.simple = false;
    this.onlyDescribe = this.options.prepare = true;
    return this;
  }
  stream() {
    throw new Error(".stream has been renamed to .forEach");
  }
  forEach(fn) {
    this.forEachFn = fn;
    this.handle();
    return this;
  }
  raw() {
    this.isRaw = true;
    return this;
  }
  values() {
    this.isRaw = "values";
    return this;
  }
  async handle() {
    !this.executed && (this.executed = true) && await 1 && this.handler(this);
  }
  execute() {
    this.handle();
    return this;
  }
  then() {
    this.handle();
    return super.then.apply(this, arguments);
  }
  catch() {
    this.handle();
    return super.catch.apply(this, arguments);
  }
  finally() {
    this.handle();
    return super.finally.apply(this, arguments);
  }
};
function cachedError(xs) {
  if (originCache.has(xs))
    return originCache.get(xs);
  const x = Error.stackTraceLimit;
  Error.stackTraceLimit = 4;
  originCache.set(xs, new Error());
  Error.stackTraceLimit = x;
  return originCache.get(xs);
}
__name(cachedError, "cachedError");

// node_modules/postgres/cf/src/errors.js
var PostgresError = class extends Error {
  static {
    __name(this, "PostgresError");
  }
  constructor(x) {
    super(x.message);
    this.name = this.constructor.name;
    Object.assign(this, x);
  }
};
var Errors = {
  connection,
  postgres,
  generic,
  notSupported
};
function connection(x, options, socket) {
  const { host, port } = socket || options;
  const error3 = Object.assign(
    new Error("write " + x + " " + (options.path || host + ":" + port)),
    {
      code: x,
      errno: x,
      address: options.path || host
    },
    options.path ? {} : { port }
  );
  Error.captureStackTrace(error3, connection);
  return error3;
}
__name(connection, "connection");
function postgres(x) {
  const error3 = new PostgresError(x);
  Error.captureStackTrace(error3, postgres);
  return error3;
}
__name(postgres, "postgres");
function generic(code, message) {
  const error3 = Object.assign(new Error(code + ": " + message), { code });
  Error.captureStackTrace(error3, generic);
  return error3;
}
__name(generic, "generic");
function notSupported(x) {
  const error3 = Object.assign(
    new Error(x + " (B) is not supported"),
    {
      code: "MESSAGE_NOT_SUPPORTED",
      name: x
    }
  );
  Error.captureStackTrace(error3, notSupported);
  return error3;
}
__name(notSupported, "notSupported");

// node_modules/postgres/cf/src/types.js
var types = {
  string: {
    to: 25,
    from: null,
    // defaults to string
    serialize: /* @__PURE__ */ __name((x) => "" + x, "serialize")
  },
  number: {
    to: 0,
    from: [21, 23, 26, 700, 701],
    serialize: /* @__PURE__ */ __name((x) => "" + x, "serialize"),
    parse: /* @__PURE__ */ __name((x) => +x, "parse")
  },
  json: {
    to: 114,
    from: [114, 3802],
    serialize: /* @__PURE__ */ __name((x) => JSON.stringify(x), "serialize"),
    parse: /* @__PURE__ */ __name((x) => JSON.parse(x), "parse")
  },
  boolean: {
    to: 16,
    from: 16,
    serialize: /* @__PURE__ */ __name((x) => x === true ? "t" : "f", "serialize"),
    parse: /* @__PURE__ */ __name((x) => x === "t", "parse")
  },
  date: {
    to: 1184,
    from: [1082, 1114, 1184],
    serialize: /* @__PURE__ */ __name((x) => (x instanceof Date ? x : new Date(x)).toISOString(), "serialize"),
    parse: /* @__PURE__ */ __name((x) => new Date(x), "parse")
  },
  bytea: {
    to: 17,
    from: 17,
    serialize: /* @__PURE__ */ __name((x) => "\\x" + Buffer3.from(x).toString("hex"), "serialize"),
    parse: /* @__PURE__ */ __name((x) => Buffer3.from(x.slice(2), "hex"), "parse")
  }
};
var NotTagged = class {
  static {
    __name(this, "NotTagged");
  }
  then() {
    notTagged();
  }
  catch() {
    notTagged();
  }
  finally() {
    notTagged();
  }
};
var Identifier = class extends NotTagged {
  static {
    __name(this, "Identifier");
  }
  constructor(value) {
    super();
    this.value = escapeIdentifier(value);
  }
};
var Parameter = class extends NotTagged {
  static {
    __name(this, "Parameter");
  }
  constructor(value, type, array) {
    super();
    this.value = value;
    this.type = type;
    this.array = array;
  }
};
var Builder = class extends NotTagged {
  static {
    __name(this, "Builder");
  }
  constructor(first, rest) {
    super();
    this.first = first;
    this.rest = rest;
  }
  build(before, parameters, types2, options) {
    const keyword = builders.map(([x, fn]) => ({ fn, i: before.search(x) })).sort((a, b2) => a.i - b2.i).pop();
    return keyword.i === -1 ? escapeIdentifiers(this.first, options) : keyword.fn(this.first, this.rest, parameters, types2, options);
  }
};
function handleValue(x, parameters, types2, options) {
  let value = x instanceof Parameter ? x.value : x;
  if (value === void 0) {
    x instanceof Parameter ? x.value = options.transform.undefined : value = x = options.transform.undefined;
    if (value === void 0)
      throw Errors.generic("UNDEFINED_VALUE", "Undefined values are not allowed");
  }
  return "$" + types2.push(
    x instanceof Parameter ? (parameters.push(x.value), x.array ? x.array[x.type || inferType(x.value)] || x.type || firstIsString(x.value) : x.type) : (parameters.push(x), inferType(x))
  );
}
__name(handleValue, "handleValue");
var defaultHandlers = typeHandlers(types);
function stringify(q, string, value, parameters, types2, options) {
  for (let i = 1; i < q.strings.length; i++) {
    string += stringifyValue(string, value, parameters, types2, options) + q.strings[i];
    value = q.args[i];
  }
  return string;
}
__name(stringify, "stringify");
function stringifyValue(string, value, parameters, types2, o) {
  return value instanceof Builder ? value.build(string, parameters, types2, o) : value instanceof Query ? fragment(value, parameters, types2, o) : value instanceof Identifier ? value.value : value && value[0] instanceof Query ? value.reduce((acc, x) => acc + " " + fragment(x, parameters, types2, o), "") : handleValue(value, parameters, types2, o);
}
__name(stringifyValue, "stringifyValue");
function fragment(q, parameters, types2, options) {
  q.fragment = true;
  return stringify(q, q.strings[0], q.args[0], parameters, types2, options);
}
__name(fragment, "fragment");
function valuesBuilder(first, parameters, types2, columns, options) {
  return first.map(
    (row) => "(" + columns.map(
      (column) => stringifyValue("values", row[column], parameters, types2, options)
    ).join(",") + ")"
  ).join(",");
}
__name(valuesBuilder, "valuesBuilder");
function values(first, rest, parameters, types2, options) {
  const multi = Array.isArray(first[0]);
  const columns = rest.length ? rest.flat() : Object.keys(multi ? first[0] : first);
  return valuesBuilder(multi ? first : [first], parameters, types2, columns, options);
}
__name(values, "values");
function select(first, rest, parameters, types2, options) {
  typeof first === "string" && (first = [first].concat(rest));
  if (Array.isArray(first))
    return escapeIdentifiers(first, options);
  let value;
  const columns = rest.length ? rest.flat() : Object.keys(first);
  return columns.map((x) => {
    value = first[x];
    return (value instanceof Query ? fragment(value, parameters, types2, options) : value instanceof Identifier ? value.value : handleValue(value, parameters, types2, options)) + " as " + escapeIdentifier(options.transform.column.to ? options.transform.column.to(x) : x);
  }).join(",");
}
__name(select, "select");
var builders = Object.entries({
  values,
  in: /* @__PURE__ */ __name((...xs) => {
    const x = values(...xs);
    return x === "()" ? "(null)" : x;
  }, "in"),
  select,
  as: select,
  returning: select,
  "\\(": select,
  update(first, rest, parameters, types2, options) {
    return (rest.length ? rest.flat() : Object.keys(first)).map(
      (x) => escapeIdentifier(options.transform.column.to ? options.transform.column.to(x) : x) + "=" + stringifyValue("values", first[x], parameters, types2, options)
    );
  },
  insert(first, rest, parameters, types2, options) {
    const columns = rest.length ? rest.flat() : Object.keys(Array.isArray(first) ? first[0] : first);
    return "(" + escapeIdentifiers(columns, options) + ")values" + valuesBuilder(Array.isArray(first) ? first : [first], parameters, types2, columns, options);
  }
}).map(([x, fn]) => [new RegExp("((?:^|[\\s(])" + x + "(?:$|[\\s(]))(?![\\s\\S]*\\1)", "i"), fn]);
function notTagged() {
  throw Errors.generic("NOT_TAGGED_CALL", "Query not called as a tagged template literal");
}
__name(notTagged, "notTagged");
var serializers = defaultHandlers.serializers;
var parsers = defaultHandlers.parsers;
function firstIsString(x) {
  if (Array.isArray(x))
    return firstIsString(x[0]);
  return typeof x === "string" ? 1009 : 0;
}
__name(firstIsString, "firstIsString");
var mergeUserTypes = /* @__PURE__ */ __name(function(types2) {
  const user = typeHandlers(types2 || {});
  return {
    serializers: Object.assign({}, serializers, user.serializers),
    parsers: Object.assign({}, parsers, user.parsers)
  };
}, "mergeUserTypes");
function typeHandlers(types2) {
  return Object.keys(types2).reduce((acc, k) => {
    types2[k].from && [].concat(types2[k].from).forEach((x) => acc.parsers[x] = types2[k].parse);
    if (types2[k].serialize) {
      acc.serializers[types2[k].to] = types2[k].serialize;
      types2[k].from && [].concat(types2[k].from).forEach((x) => acc.serializers[x] = types2[k].serialize);
    }
    return acc;
  }, { parsers: {}, serializers: {} });
}
__name(typeHandlers, "typeHandlers");
function escapeIdentifiers(xs, { transform: { column } }) {
  return xs.map((x) => escapeIdentifier(column.to ? column.to(x) : x)).join(",");
}
__name(escapeIdentifiers, "escapeIdentifiers");
var escapeIdentifier = /* @__PURE__ */ __name(function escape(str) {
  return '"' + str.replace(/"/g, '""').replace(/\./g, '"."') + '"';
}, "escape");
var inferType = /* @__PURE__ */ __name(function inferType2(x) {
  return x instanceof Parameter ? x.type : x instanceof Date ? 1184 : x instanceof Uint8Array ? 17 : x === true || x === false ? 16 : typeof x === "bigint" ? 20 : Array.isArray(x) ? inferType2(x[0]) : 0;
}, "inferType");
var escapeBackslash = /\\/g;
var escapeQuote = /"/g;
function arrayEscape(x) {
  return x.replace(escapeBackslash, "\\\\").replace(escapeQuote, '\\"');
}
__name(arrayEscape, "arrayEscape");
var arraySerializer = /* @__PURE__ */ __name(function arraySerializer2(xs, serializer, options, typarray) {
  if (Array.isArray(xs) === false)
    return xs;
  if (!xs.length)
    return "{}";
  const first = xs[0];
  const delimiter = typarray === 1020 ? ";" : ",";
  if (Array.isArray(first) && !first.type)
    return "{" + xs.map((x) => arraySerializer2(x, serializer, options, typarray)).join(delimiter) + "}";
  return "{" + xs.map((x) => {
    if (x === void 0) {
      x = options.transform.undefined;
      if (x === void 0)
        throw Errors.generic("UNDEFINED_VALUE", "Undefined values are not allowed");
    }
    return x === null ? "null" : '"' + arrayEscape(serializer ? serializer(x.type ? x.value : x) : "" + x) + '"';
  }).join(delimiter) + "}";
}, "arraySerializer");
var arrayParserState = {
  i: 0,
  char: null,
  str: "",
  quoted: false,
  last: 0
};
var arrayParser = /* @__PURE__ */ __name(function arrayParser2(x, parser, typarray) {
  arrayParserState.i = arrayParserState.last = 0;
  return arrayParserLoop(arrayParserState, x, parser, typarray);
}, "arrayParser");
function arrayParserLoop(s, x, parser, typarray) {
  const xs = [];
  const delimiter = typarray === 1020 ? ";" : ",";
  for (; s.i < x.length; s.i++) {
    s.char = x[s.i];
    if (s.quoted) {
      if (s.char === "\\") {
        s.str += x[++s.i];
      } else if (s.char === '"') {
        xs.push(parser ? parser(s.str) : s.str);
        s.str = "";
        s.quoted = x[s.i + 1] === '"';
        s.last = s.i + 2;
      } else {
        s.str += s.char;
      }
    } else if (s.char === '"') {
      s.quoted = true;
    } else if (s.char === "{") {
      s.last = ++s.i;
      xs.push(arrayParserLoop(s, x, parser, typarray));
    } else if (s.char === "}") {
      s.quoted = false;
      s.last < s.i && xs.push(parser ? parser(x.slice(s.last, s.i)) : x.slice(s.last, s.i));
      s.last = s.i + 1;
      break;
    } else if (s.char === delimiter && s.p !== "}" && s.p !== '"') {
      xs.push(parser ? parser(x.slice(s.last, s.i)) : x.slice(s.last, s.i));
      s.last = s.i + 1;
    }
    s.p = s.char;
  }
  s.last < s.i && xs.push(parser ? parser(x.slice(s.last, s.i + 1)) : x.slice(s.last, s.i + 1));
  return xs;
}
__name(arrayParserLoop, "arrayParserLoop");
var toCamel = /* @__PURE__ */ __name((x) => {
  let str = x[0];
  for (let i = 1; i < x.length; i++)
    str += x[i] === "_" ? x[++i].toUpperCase() : x[i];
  return str;
}, "toCamel");
var toPascal = /* @__PURE__ */ __name((x) => {
  let str = x[0].toUpperCase();
  for (let i = 1; i < x.length; i++)
    str += x[i] === "_" ? x[++i].toUpperCase() : x[i];
  return str;
}, "toPascal");
var toKebab = /* @__PURE__ */ __name((x) => x.replace(/_/g, "-"), "toKebab");
var fromCamel = /* @__PURE__ */ __name((x) => x.replace(/([A-Z])/g, "_$1").toLowerCase(), "fromCamel");
var fromPascal = /* @__PURE__ */ __name((x) => (x.slice(0, 1) + x.slice(1).replace(/([A-Z])/g, "_$1")).toLowerCase(), "fromPascal");
var fromKebab = /* @__PURE__ */ __name((x) => x.replace(/-/g, "_"), "fromKebab");
function createJsonTransform(fn) {
  return /* @__PURE__ */ __name(function jsonTransform(x, column) {
    return typeof x === "object" && x !== null && (column.type === 114 || column.type === 3802) ? Array.isArray(x) ? x.map((x2) => jsonTransform(x2, column)) : Object.entries(x).reduce((acc, [k, v]) => Object.assign(acc, { [fn(k)]: jsonTransform(v, column) }), {}) : x;
  }, "jsonTransform");
}
__name(createJsonTransform, "createJsonTransform");
toCamel.column = { from: toCamel };
toCamel.value = { from: createJsonTransform(toCamel) };
fromCamel.column = { to: fromCamel };
var camel = { ...toCamel };
camel.column.to = fromCamel;
toPascal.column = { from: toPascal };
toPascal.value = { from: createJsonTransform(toPascal) };
fromPascal.column = { to: fromPascal };
var pascal = { ...toPascal };
pascal.column.to = fromPascal;
toKebab.column = { from: toKebab };
toKebab.value = { from: createJsonTransform(toKebab) };
fromKebab.column = { to: fromKebab };
var kebab = { ...toKebab };
kebab.column.to = fromKebab;

// node_modules/postgres/cf/src/connection.js
import { Buffer as Buffer5 } from "node:buffer";
import Stream from "node:stream";

// node_modules/postgres/cf/src/result.js
var Result = class extends Array {
  static {
    __name(this, "Result");
  }
  constructor() {
    super();
    Object.defineProperties(this, {
      count: { value: null, writable: true },
      state: { value: null, writable: true },
      command: { value: null, writable: true },
      columns: { value: null, writable: true },
      statement: { value: null, writable: true }
    });
  }
  static get [Symbol.species]() {
    return Array;
  }
};

// node_modules/postgres/cf/src/queue.js
var queue_default = Queue;
function Queue(initial = []) {
  let xs = initial.slice();
  let index = 0;
  return {
    get length() {
      return xs.length - index;
    },
    remove: /* @__PURE__ */ __name((x) => {
      const index2 = xs.indexOf(x);
      return index2 === -1 ? null : (xs.splice(index2, 1), x);
    }, "remove"),
    push: /* @__PURE__ */ __name((x) => (xs.push(x), x), "push"),
    shift: /* @__PURE__ */ __name(() => {
      const out = xs[index++];
      if (index === xs.length) {
        index = 0;
        xs = [];
      } else {
        xs[index - 1] = void 0;
      }
      return out;
    }, "shift")
  };
}
__name(Queue, "Queue");

// node_modules/postgres/cf/src/bytes.js
import { Buffer as Buffer4 } from "node:buffer";
var size = 256;
var buffer = Buffer4.allocUnsafe(size);
var messages = "BCcDdEFfHPpQSX".split("").reduce((acc, x) => {
  const v = x.charCodeAt(0);
  acc[x] = () => {
    buffer[0] = v;
    b.i = 5;
    return b;
  };
  return acc;
}, {});
var b = Object.assign(reset, messages, {
  N: String.fromCharCode(0),
  i: 0,
  inc(x) {
    b.i += x;
    return b;
  },
  str(x) {
    const length = Buffer4.byteLength(x);
    fit(length);
    b.i += buffer.write(x, b.i, length, "utf8");
    return b;
  },
  i16(x) {
    fit(2);
    buffer.writeUInt16BE(x, b.i);
    b.i += 2;
    return b;
  },
  i32(x, i) {
    if (i || i === 0) {
      buffer.writeUInt32BE(x, i);
      return b;
    }
    fit(4);
    buffer.writeUInt32BE(x, b.i);
    b.i += 4;
    return b;
  },
  z(x) {
    fit(x);
    buffer.fill(0, b.i, b.i + x);
    b.i += x;
    return b;
  },
  raw(x) {
    buffer = Buffer4.concat([buffer.subarray(0, b.i), x]);
    b.i = buffer.length;
    return b;
  },
  end(at = 1) {
    buffer.writeUInt32BE(b.i - at, at);
    const out = buffer.subarray(0, b.i);
    b.i = 0;
    buffer = Buffer4.allocUnsafe(size);
    return out;
  }
});
var bytes_default = b;
function fit(x) {
  if (buffer.length - b.i < x) {
    const prev = buffer, length = prev.length;
    buffer = Buffer4.allocUnsafe(length + (length >> 1) + x);
    prev.copy(buffer);
  }
}
__name(fit, "fit");
function reset() {
  b.i = 0;
  return b;
}
__name(reset, "reset");

// node_modules/postgres/cf/src/connection.js
var connection_default = Connection;
var uid = 1;
var Sync = bytes_default().S().end();
var Flush = bytes_default().H().end();
var SSLRequest = bytes_default().i32(8).i32(80877103).end(8);
var ExecuteUnnamed = Buffer5.concat([bytes_default().E().str(bytes_default.N).i32(0).end(), Sync]);
var DescribeUnnamed = bytes_default().D().str("S").str(bytes_default.N).end();
var noop = /* @__PURE__ */ __name(() => {
}, "noop");
var retryRoutines = /* @__PURE__ */ new Set([
  "FetchPreparedStatement",
  "RevalidateCachedQuery",
  "transformAssignedExpr"
]);
var errorFields = {
  83: "severity_local",
  // S
  86: "severity",
  // V
  67: "code",
  // C
  77: "message",
  // M
  68: "detail",
  // D
  72: "hint",
  // H
  80: "position",
  // P
  112: "internal_position",
  // p
  113: "internal_query",
  // q
  87: "where",
  // W
  115: "schema_name",
  // s
  116: "table_name",
  // t
  99: "column_name",
  // c
  100: "data type_name",
  // d
  110: "constraint_name",
  // n
  70: "file",
  // F
  76: "line",
  // L
  82: "routine"
  // R
};
function Connection(options, queues = {}, { onopen = noop, onend = noop, onclose = noop } = {}) {
  const {
    sslnegotiation,
    ssl,
    max,
    user,
    host,
    port,
    database,
    parsers: parsers2,
    transform,
    onnotice,
    onnotify,
    onparameter,
    max_pipeline,
    keep_alive,
    backoff: backoff2,
    target_session_attrs
  } = options;
  const sent = queue_default(), id = uid++, backend = { pid: null, secret: null }, idleTimer = timer(end, options.idle_timeout), lifeTimer = timer(end, options.max_lifetime), connectTimer = timer(connectTimedOut, options.connect_timeout);
  let socket = null, cancelMessage, errorResponse = null, result = new Result(), incoming = Buffer5.alloc(0), needsTypes = options.fetch_types, backendParameters = {}, statements = {}, statementId = Math.random().toString(36).slice(2), statementCount = 1, closedTime = 0, remaining = 0, hostIndex = 0, retries = 0, length = 0, delay = 0, rows = 0, serverSignature = null, nextWriteTimer = null, terminated = false, incomings = null, results = null, initial = null, ending = null, stream = null, chunk = null, ended = null, nonce = null, query = null, final = null;
  const connection2 = {
    queue: queues.closed,
    idleTimer,
    connect(query2) {
      initial = query2;
      reconnect();
    },
    terminate,
    execute,
    cancel,
    end,
    count: 0,
    id
  };
  queues.closed && queues.closed.push(connection2);
  return connection2;
  async function createSocket() {
    let x;
    try {
      x = options.socket ? await Promise.resolve(options.socket(options)) : new net.Socket();
    } catch (e) {
      error3(e);
      return;
    }
    x.on("error", error3);
    x.on("close", closed);
    x.on("drain", drain);
    return x;
  }
  __name(createSocket, "createSocket");
  async function cancel({ pid: pid2, secret }, resolve, reject) {
    try {
      cancelMessage = bytes_default().i32(16).i32(80877102).i32(pid2).i32(secret).end(16);
      await connect();
      socket.once("error", reject);
      socket.once("close", resolve);
    } catch (error4) {
      reject(error4);
    }
  }
  __name(cancel, "cancel");
  function execute(q) {
    if (terminated)
      return queryError(q, Errors.connection("CONNECTION_DESTROYED", options));
    if (stream)
      return queryError(q, Errors.generic("COPY_IN_PROGRESS", "You cannot execute queries during copy"));
    if (q.cancelled)
      return;
    try {
      q.state = backend;
      query ? sent.push(q) : (query = q, query.active = true);
      build(q);
      return write(toBuffer(q)) && !q.describeFirst && !q.cursorFn && sent.length < max_pipeline && (!q.options.onexecute || q.options.onexecute(connection2));
    } catch (error4) {
      sent.length === 0 && write(Sync);
      errored(error4);
      return true;
    }
  }
  __name(execute, "execute");
  function toBuffer(q) {
    if (q.parameters.length >= 65534)
      throw Errors.generic("MAX_PARAMETERS_EXCEEDED", "Max number of parameters (65534) exceeded");
    return q.options.simple ? bytes_default().Q().str(q.statement.string + bytes_default.N).end() : q.describeFirst ? Buffer5.concat([describe(q), Flush]) : q.prepare ? q.prepared ? prepared(q) : Buffer5.concat([describe(q), prepared(q)]) : unnamed(q);
  }
  __name(toBuffer, "toBuffer");
  function describe(q) {
    return Buffer5.concat([
      Parse(q.statement.string, q.parameters, q.statement.types, q.statement.name),
      Describe("S", q.statement.name)
    ]);
  }
  __name(describe, "describe");
  function prepared(q) {
    return Buffer5.concat([
      Bind(q.parameters, q.statement.types, q.statement.name, q.cursorName),
      q.cursorFn ? Execute("", q.cursorRows) : ExecuteUnnamed
    ]);
  }
  __name(prepared, "prepared");
  function unnamed(q) {
    return Buffer5.concat([
      Parse(q.statement.string, q.parameters, q.statement.types),
      DescribeUnnamed,
      prepared(q)
    ]);
  }
  __name(unnamed, "unnamed");
  function build(q) {
    const parameters = [], types2 = [];
    const string = stringify(q, q.strings[0], q.args[0], parameters, types2, options);
    !q.tagged && q.args.forEach((x) => handleValue(x, parameters, types2, options));
    q.prepare = options.prepare && ("prepare" in q.options ? q.options.prepare : true);
    q.string = string;
    q.signature = q.prepare && types2 + string;
    q.onlyDescribe && delete statements[q.signature];
    q.parameters = q.parameters || parameters;
    q.prepared = q.prepare && q.signature in statements;
    q.describeFirst = q.onlyDescribe || parameters.length && !q.prepared;
    q.statement = q.prepared ? statements[q.signature] : { string, types: types2, name: q.prepare ? statementId + statementCount++ : "" };
    typeof options.debug === "function" && options.debug(id, string, parameters, types2);
  }
  __name(build, "build");
  function write(x, fn) {
    chunk = chunk ? Buffer5.concat([chunk, x]) : Buffer5.from(x);
    if (fn || chunk.length >= 1024)
      return nextWrite(fn);
    nextWriteTimer === null && (nextWriteTimer = setImmediate(nextWrite));
    return true;
  }
  __name(write, "write");
  function nextWrite(fn) {
    const x = socket.write(chunk, fn);
    nextWriteTimer !== null && clearImmediate(nextWriteTimer);
    chunk = nextWriteTimer = null;
    return x;
  }
  __name(nextWrite, "nextWrite");
  function connectTimedOut() {
    errored(Errors.connection("CONNECT_TIMEOUT", options, socket));
    socket.destroy();
  }
  __name(connectTimedOut, "connectTimedOut");
  async function secure() {
    if (sslnegotiation !== "direct") {
      write(SSLRequest);
      const canSSL = await new Promise((r) => socket.once("data", (x) => r(x[0] === 83)));
      if (!canSSL && ssl === "prefer")
        return connected2();
    }
    const options2 = {
      socket,
      servername: net.isIP(socket.host) ? void 0 : socket.host
    };
    if (sslnegotiation === "direct")
      options2.ALPNProtocols = ["postgresql"];
    if (ssl === "require" || ssl === "allow" || ssl === "prefer")
      options2.rejectUnauthorized = false;
    else if (typeof ssl === "object")
      Object.assign(options2, ssl);
    socket.removeAllListeners();
    socket = tls.connect(options2);
    socket.on("secureConnect", connected2);
    socket.on("error", error3);
    socket.on("close", closed);
    socket.on("drain", drain);
  }
  __name(secure, "secure");
  function drain() {
    !query && onopen(connection2);
  }
  __name(drain, "drain");
  function data(x) {
    if (incomings) {
      incomings.push(x);
      remaining -= x.length;
      if (remaining > 0)
        return;
    }
    incoming = incomings ? Buffer5.concat(incomings, length - remaining) : incoming.length === 0 ? x : Buffer5.concat([incoming, x], incoming.length + x.length);
    while (incoming.length > 4) {
      length = incoming.readUInt32BE(1);
      if (length >= incoming.length) {
        remaining = length - incoming.length;
        incomings = [incoming];
        break;
      }
      try {
        handle(incoming.subarray(0, length + 1));
      } catch (e) {
        query && (query.cursorFn || query.describeFirst) && write(Sync);
        errored(e);
      }
      incoming = incoming.subarray(length + 1);
      remaining = 0;
      incomings = null;
    }
  }
  __name(data, "data");
  async function connect() {
    terminated = false;
    backendParameters = {};
    socket || (socket = await createSocket());
    if (!socket)
      return;
    connectTimer.start();
    if (options.socket)
      return ssl ? secure() : connected2();
    socket.on("connect", ssl ? secure : connected2);
    if (options.path)
      return socket.connect(options.path);
    socket.ssl = ssl;
    socket.connect(port[hostIndex], host[hostIndex]);
    socket.host = host[hostIndex];
    socket.port = port[hostIndex];
    hostIndex = (hostIndex + 1) % port.length;
  }
  __name(connect, "connect");
  function reconnect() {
    setTimeout(connect, closedTime ? Math.max(0, closedTime + delay - performance2.now()) : 0);
  }
  __name(reconnect, "reconnect");
  function connected2() {
    try {
      statements = {};
      needsTypes = options.fetch_types;
      statementId = Math.random().toString(36).slice(2);
      statementCount = 1;
      lifeTimer.start();
      socket.on("data", data);
      keep_alive && socket.setKeepAlive && socket.setKeepAlive(true, 1e3 * keep_alive);
      const s = StartupMessage();
      write(s);
    } catch (err) {
      error3(err);
    }
  }
  __name(connected2, "connected");
  function error3(err) {
    if (connection2.queue === queues.connecting && options.host[retries + 1])
      return;
    errored(err);
    while (sent.length)
      queryError(sent.shift(), err);
  }
  __name(error3, "error");
  function errored(err) {
    stream && (stream.destroy(err), stream = null);
    query && queryError(query, err);
    initial && (queryError(initial, err), initial = null);
  }
  __name(errored, "errored");
  function queryError(query2, err) {
    if (query2.reserve)
      return query2.reject(err);
    if (!err || typeof err !== "object")
      err = new Error(err);
    "query" in err || "parameters" in err || Object.defineProperties(err, {
      stack: { value: err.stack + query2.origin.replace(/.*\n/, "\n"), enumerable: options.debug },
      query: { value: query2.string, enumerable: options.debug },
      parameters: { value: query2.parameters, enumerable: options.debug },
      args: { value: query2.args, enumerable: options.debug },
      types: { value: query2.statement && query2.statement.types, enumerable: options.debug }
    });
    query2.reject(err);
  }
  __name(queryError, "queryError");
  function end() {
    return ending || (!connection2.reserved && onend(connection2), !connection2.reserved && !initial && !query && sent.length === 0 ? (terminate(), new Promise((r) => socket && socket.readyState !== "closed" ? socket.once("close", r) : r())) : ending = new Promise((r) => ended = r));
  }
  __name(end, "end");
  function terminate() {
    terminated = true;
    if (stream || query || initial || sent.length)
      error3(Errors.connection("CONNECTION_DESTROYED", options));
    clearImmediate(nextWriteTimer);
    if (socket) {
      socket.removeListener("data", data);
      socket.removeListener("connect", connected2);
      socket.readyState === "open" && socket.end(bytes_default().X().end());
    }
    ended && (ended(), ending = ended = null);
  }
  __name(terminate, "terminate");
  async function closed(hadError) {
    incoming = Buffer5.alloc(0);
    remaining = 0;
    incomings = null;
    clearImmediate(nextWriteTimer);
    socket.removeListener("data", data);
    socket.removeListener("connect", connected2);
    idleTimer.cancel();
    lifeTimer.cancel();
    connectTimer.cancel();
    socket.removeAllListeners();
    socket = null;
    if (initial)
      return reconnect();
    !hadError && (query || sent.length) && error3(Errors.connection("CONNECTION_CLOSED", options, socket));
    closedTime = performance2.now();
    hadError && options.shared.retries++;
    delay = (typeof backoff2 === "function" ? backoff2(options.shared.retries) : backoff2) * 1e3;
    onclose(connection2, Errors.connection("CONNECTION_CLOSED", options, socket));
  }
  __name(closed, "closed");
  function handle(xs, x = xs[0]) {
    (x === 68 ? DataRow : (
      // D
      x === 100 ? CopyData : (
        // d
        x === 65 ? NotificationResponse : (
          // A
          x === 83 ? ParameterStatus : (
            // S
            x === 90 ? ReadyForQuery : (
              // Z
              x === 67 ? CommandComplete : (
                // C
                x === 50 ? BindComplete : (
                  // 2
                  x === 49 ? ParseComplete : (
                    // 1
                    x === 116 ? ParameterDescription : (
                      // t
                      x === 84 ? RowDescription : (
                        // T
                        x === 82 ? Authentication : (
                          // R
                          x === 110 ? NoData : (
                            // n
                            x === 75 ? BackendKeyData : (
                              // K
                              x === 69 ? ErrorResponse : (
                                // E
                                x === 115 ? PortalSuspended : (
                                  // s
                                  x === 51 ? CloseComplete : (
                                    // 3
                                    x === 71 ? CopyInResponse : (
                                      // G
                                      x === 78 ? NoticeResponse : (
                                        // N
                                        x === 72 ? CopyOutResponse : (
                                          // H
                                          x === 99 ? CopyDone : (
                                            // c
                                            x === 73 ? EmptyQueryResponse : (
                                              // I
                                              x === 86 ? FunctionCallResponse : (
                                                // V
                                                x === 118 ? NegotiateProtocolVersion : (
                                                  // v
                                                  x === 87 ? CopyBothResponse : (
                                                    // W
                                                    /* c8 ignore next */
                                                    UnknownMessage
                                                  )
                                                )
                                              )
                                            )
                                          )
                                        )
                                      )
                                    )
                                  )
                                )
                              )
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    ))(xs);
  }
  __name(handle, "handle");
  function DataRow(x) {
    let index = 7;
    let length2;
    let column;
    let value;
    const row = query.isRaw ? new Array(query.statement.columns.length) : {};
    for (let i = 0; i < query.statement.columns.length; i++) {
      column = query.statement.columns[i];
      length2 = x.readInt32BE(index);
      index += 4;
      value = length2 === -1 ? null : query.isRaw === true ? x.subarray(index, index += length2) : column.parser === void 0 ? x.toString("utf8", index, index += length2) : column.parser.array === true ? column.parser(x.toString("utf8", index + 1, index += length2)) : column.parser(x.toString("utf8", index, index += length2));
      query.isRaw ? row[i] = query.isRaw === true ? value : transform.value.from ? transform.value.from(value, column) : value : row[column.name] = transform.value.from ? transform.value.from(value, column) : value;
    }
    query.forEachFn ? query.forEachFn(transform.row.from ? transform.row.from(row) : row, result) : result[rows++] = transform.row.from ? transform.row.from(row) : row;
  }
  __name(DataRow, "DataRow");
  function ParameterStatus(x) {
    const [k, v] = x.toString("utf8", 5, x.length - 1).split(bytes_default.N);
    backendParameters[k] = v;
    if (options.parameters[k] !== v) {
      options.parameters[k] = v;
      onparameter && onparameter(k, v);
    }
  }
  __name(ParameterStatus, "ParameterStatus");
  function ReadyForQuery(x) {
    if (query) {
      if (errorResponse) {
        query.retried ? errored(query.retried) : query.prepared && retryRoutines.has(errorResponse.routine) ? retry(query, errorResponse) : errored(errorResponse);
      } else {
        query.resolve(results || result);
      }
    } else if (errorResponse) {
      errored(errorResponse);
    }
    query = results = errorResponse = null;
    result = new Result();
    connectTimer.cancel();
    if (initial) {
      if (target_session_attrs) {
        if (!backendParameters.in_hot_standby || !backendParameters.default_transaction_read_only)
          return fetchState();
        else if (tryNext(target_session_attrs, backendParameters))
          return terminate();
      }
      if (needsTypes) {
        initial.reserve && (initial = null);
        return fetchArrayTypes();
      }
      initial && !initial.reserve && execute(initial);
      options.shared.retries = retries = 0;
      initial = null;
      return;
    }
    while (sent.length && (query = sent.shift()) && (query.active = true, query.cancelled))
      Connection(options).cancel(query.state, query.cancelled.resolve, query.cancelled.reject);
    if (query)
      return;
    connection2.reserved ? !connection2.reserved.release && x[5] === 73 ? ending ? terminate() : (connection2.reserved = null, onopen(connection2)) : connection2.reserved() : ending ? terminate() : onopen(connection2);
  }
  __name(ReadyForQuery, "ReadyForQuery");
  function CommandComplete(x) {
    rows = 0;
    for (let i = x.length - 1; i > 0; i--) {
      if (x[i] === 32 && x[i + 1] < 58 && result.count === null)
        result.count = +x.toString("utf8", i + 1, x.length - 1);
      if (x[i - 1] >= 65) {
        result.command = x.toString("utf8", 5, i);
        result.state = backend;
        break;
      }
    }
    final && (final(), final = null);
    if (result.command === "BEGIN" && max !== 1 && !connection2.reserved)
      return errored(Errors.generic("UNSAFE_TRANSACTION", "Only use sql.begin, sql.reserved or max: 1"));
    if (query.options.simple)
      return BindComplete();
    if (query.cursorFn) {
      result.count && query.cursorFn(result);
      write(Sync);
    }
  }
  __name(CommandComplete, "CommandComplete");
  function ParseComplete() {
    query.parsing = false;
  }
  __name(ParseComplete, "ParseComplete");
  function BindComplete() {
    !result.statement && (result.statement = query.statement);
    result.columns = query.statement.columns;
  }
  __name(BindComplete, "BindComplete");
  function ParameterDescription(x) {
    const length2 = x.readUInt16BE(5);
    for (let i = 0; i < length2; ++i)
      !query.statement.types[i] && (query.statement.types[i] = x.readUInt32BE(7 + i * 4));
    query.prepare && (statements[query.signature] = query.statement);
    query.describeFirst && !query.onlyDescribe && (write(prepared(query)), query.describeFirst = false);
  }
  __name(ParameterDescription, "ParameterDescription");
  function RowDescription(x) {
    if (result.command) {
      results = results || [result];
      results.push(result = new Result());
      result.count = null;
      query.statement.columns = null;
    }
    const length2 = x.readUInt16BE(5);
    let index = 7;
    let start;
    query.statement.columns = Array(length2);
    for (let i = 0; i < length2; ++i) {
      start = index;
      while (x[index++] !== 0) ;
      const table3 = x.readUInt32BE(index);
      const number = x.readUInt16BE(index + 4);
      const type = x.readUInt32BE(index + 6);
      query.statement.columns[i] = {
        name: transform.column.from ? transform.column.from(x.toString("utf8", start, index - 1)) : x.toString("utf8", start, index - 1),
        parser: parsers2[type],
        table: table3,
        number,
        type
      };
      index += 18;
    }
    result.statement = query.statement;
    if (query.onlyDescribe)
      return query.resolve(query.statement), write(Sync);
  }
  __name(RowDescription, "RowDescription");
  async function Authentication(x, type = x.readUInt32BE(5)) {
    (type === 3 ? AuthenticationCleartextPassword : type === 5 ? AuthenticationMD5Password : type === 10 ? SASL : type === 11 ? SASLContinue : type === 12 ? SASLFinal : type !== 0 ? UnknownAuth : noop)(x, type);
  }
  __name(Authentication, "Authentication");
  async function AuthenticationCleartextPassword() {
    const payload = await Pass();
    write(
      bytes_default().p().str(payload).z(1).end()
    );
  }
  __name(AuthenticationCleartextPassword, "AuthenticationCleartextPassword");
  async function AuthenticationMD5Password(x) {
    const payload = "md5" + await md5(
      Buffer5.concat([
        Buffer5.from(await md5(await Pass() + user)),
        x.subarray(9)
      ])
    );
    write(
      bytes_default().p().str(payload).z(1).end()
    );
  }
  __name(AuthenticationMD5Password, "AuthenticationMD5Password");
  async function SASL() {
    nonce = (await crypto2.randomBytes(18)).toString("base64");
    bytes_default().p().str("SCRAM-SHA-256" + bytes_default.N);
    const i = bytes_default.i;
    write(bytes_default.inc(4).str("n,,n=*,r=" + nonce).i32(bytes_default.i - i - 4, i).end());
  }
  __name(SASL, "SASL");
  async function SASLContinue(x) {
    const res = x.toString("utf8", 9).split(",").reduce((acc, x2) => (acc[x2[0]] = x2.slice(2), acc), {});
    const saltedPassword = await crypto2.pbkdf2Sync(
      await Pass(),
      Buffer5.from(res.s, "base64"),
      parseInt(res.i),
      32,
      "sha256"
    );
    const clientKey = await hmac(saltedPassword, "Client Key");
    const auth = "n=*,r=" + nonce + ",r=" + res.r + ",s=" + res.s + ",i=" + res.i + ",c=biws,r=" + res.r;
    serverSignature = (await hmac(await hmac(saltedPassword, "Server Key"), auth)).toString("base64");
    const payload = "c=biws,r=" + res.r + ",p=" + xor(
      clientKey,
      Buffer5.from(await hmac(await sha2562(clientKey), auth))
    ).toString("base64");
    write(
      bytes_default().p().str(payload).end()
    );
  }
  __name(SASLContinue, "SASLContinue");
  function SASLFinal(x) {
    if (x.toString("utf8", 9).split(bytes_default.N, 1)[0].slice(2) === serverSignature)
      return;
    errored(Errors.generic("SASL_SIGNATURE_MISMATCH", "The server did not return the correct signature"));
    socket.destroy();
  }
  __name(SASLFinal, "SASLFinal");
  function Pass() {
    return Promise.resolve(
      typeof options.pass === "function" ? options.pass() : options.pass
    );
  }
  __name(Pass, "Pass");
  function NoData() {
    result.statement = query.statement;
    result.statement.columns = [];
    if (query.onlyDescribe)
      return query.resolve(query.statement), write(Sync);
  }
  __name(NoData, "NoData");
  function BackendKeyData(x) {
    backend.pid = x.readUInt32BE(5);
    backend.secret = x.readUInt32BE(9);
  }
  __name(BackendKeyData, "BackendKeyData");
  async function fetchArrayTypes() {
    needsTypes = false;
    const types2 = await new Query([`
      select b.oid, b.typarray
      from pg_catalog.pg_type a
      left join pg_catalog.pg_type b on b.oid = a.typelem
      where a.typcategory = 'A'
      group by b.oid, b.typarray
      order by b.oid
    `], [], execute);
    types2.forEach(({ oid, typarray }) => addArrayType(oid, typarray));
  }
  __name(fetchArrayTypes, "fetchArrayTypes");
  function addArrayType(oid, typarray) {
    if (!!options.parsers[typarray] && !!options.serializers[typarray]) return;
    const parser = options.parsers[oid];
    options.shared.typeArrayMap[oid] = typarray;
    options.parsers[typarray] = (xs) => arrayParser(xs, parser, typarray);
    options.parsers[typarray].array = true;
    options.serializers[typarray] = (xs) => arraySerializer(xs, options.serializers[oid], options, typarray);
  }
  __name(addArrayType, "addArrayType");
  function tryNext(x, xs) {
    return x === "read-write" && xs.default_transaction_read_only === "on" || x === "read-only" && xs.default_transaction_read_only === "off" || x === "primary" && xs.in_hot_standby === "on" || x === "standby" && xs.in_hot_standby === "off" || x === "prefer-standby" && xs.in_hot_standby === "off" && options.host[retries];
  }
  __name(tryNext, "tryNext");
  function fetchState() {
    const query2 = new Query([`
      show transaction_read_only;
      select pg_catalog.pg_is_in_recovery()
    `], [], execute, null, { simple: true });
    query2.resolve = ([[a], [b2]]) => {
      backendParameters.default_transaction_read_only = a.transaction_read_only;
      backendParameters.in_hot_standby = b2.pg_is_in_recovery ? "on" : "off";
    };
    query2.execute();
  }
  __name(fetchState, "fetchState");
  function ErrorResponse(x) {
    if (query) {
      (query.cursorFn || query.describeFirst) && write(Sync);
      errorResponse = Errors.postgres(parseError(x));
    } else {
      errored(Errors.postgres(parseError(x)));
    }
  }
  __name(ErrorResponse, "ErrorResponse");
  function retry(q, error4) {
    delete statements[q.signature];
    q.retried = error4;
    execute(q);
  }
  __name(retry, "retry");
  function NotificationResponse(x) {
    if (!onnotify)
      return;
    let index = 9;
    while (x[index++] !== 0) ;
    onnotify(
      x.toString("utf8", 9, index - 1),
      x.toString("utf8", index, x.length - 1)
    );
  }
  __name(NotificationResponse, "NotificationResponse");
  async function PortalSuspended() {
    try {
      const x = await Promise.resolve(query.cursorFn(result));
      rows = 0;
      x === CLOSE ? write(Close(query.portal)) : (result = new Result(), write(Execute("", query.cursorRows)));
    } catch (err) {
      write(Sync);
      query.reject(err);
    }
  }
  __name(PortalSuspended, "PortalSuspended");
  function CloseComplete() {
    result.count && query.cursorFn(result);
    query.resolve(result);
  }
  __name(CloseComplete, "CloseComplete");
  function CopyInResponse() {
    stream = new Stream.Writable({
      autoDestroy: true,
      write(chunk2, encoding, callback) {
        socket.write(bytes_default().d().raw(chunk2).end(), callback);
      },
      destroy(error4, callback) {
        callback(error4);
        socket.write(bytes_default().f().str(error4 + bytes_default.N).end());
        stream = null;
      },
      final(callback) {
        socket.write(bytes_default().c().end());
        final = callback;
        stream = null;
      }
    });
    query.resolve(stream);
  }
  __name(CopyInResponse, "CopyInResponse");
  function CopyOutResponse() {
    stream = new Stream.Readable({
      read() {
        socket.resume();
      }
    });
    query.resolve(stream);
  }
  __name(CopyOutResponse, "CopyOutResponse");
  function CopyBothResponse() {
    stream = new Stream.Duplex({
      autoDestroy: true,
      read() {
        socket.resume();
      },
      /* c8 ignore next 11 */
      write(chunk2, encoding, callback) {
        socket.write(bytes_default().d().raw(chunk2).end(), callback);
      },
      destroy(error4, callback) {
        callback(error4);
        socket.write(bytes_default().f().str(error4 + bytes_default.N).end());
        stream = null;
      },
      final(callback) {
        socket.write(bytes_default().c().end());
        final = callback;
      }
    });
    query.resolve(stream);
  }
  __name(CopyBothResponse, "CopyBothResponse");
  function CopyData(x) {
    stream && (stream.push(x.subarray(5)) || socket.pause());
  }
  __name(CopyData, "CopyData");
  function CopyDone() {
    stream && stream.push(null);
    stream = null;
  }
  __name(CopyDone, "CopyDone");
  function NoticeResponse(x) {
    onnotice ? onnotice(parseError(x)) : console.log(parseError(x));
  }
  __name(NoticeResponse, "NoticeResponse");
  function EmptyQueryResponse() {
  }
  __name(EmptyQueryResponse, "EmptyQueryResponse");
  function FunctionCallResponse() {
    errored(Errors.notSupported("FunctionCallResponse"));
  }
  __name(FunctionCallResponse, "FunctionCallResponse");
  function NegotiateProtocolVersion() {
    errored(Errors.notSupported("NegotiateProtocolVersion"));
  }
  __name(NegotiateProtocolVersion, "NegotiateProtocolVersion");
  function UnknownMessage(x) {
    console.error("Postgres.js : Unknown Message:", x[0]);
  }
  __name(UnknownMessage, "UnknownMessage");
  function UnknownAuth(x, type) {
    console.error("Postgres.js : Unknown Auth:", type);
  }
  __name(UnknownAuth, "UnknownAuth");
  function Bind(parameters, types2, statement = "", portal = "") {
    let prev, type;
    bytes_default().B().str(portal + bytes_default.N).str(statement + bytes_default.N).i16(0).i16(parameters.length);
    parameters.forEach((x, i) => {
      if (x === null)
        return bytes_default.i32(4294967295);
      type = types2[i];
      parameters[i] = x = type in options.serializers ? options.serializers[type](x) : "" + x;
      prev = bytes_default.i;
      bytes_default.inc(4).str(x).i32(bytes_default.i - prev - 4, prev);
    });
    bytes_default.i16(0);
    return bytes_default.end();
  }
  __name(Bind, "Bind");
  function Parse(str, parameters, types2, name = "") {
    bytes_default().P().str(name + bytes_default.N).str(str + bytes_default.N).i16(parameters.length);
    parameters.forEach((x, i) => bytes_default.i32(types2[i] || 0));
    return bytes_default.end();
  }
  __name(Parse, "Parse");
  function Describe(x, name = "") {
    return bytes_default().D().str(x).str(name + bytes_default.N).end();
  }
  __name(Describe, "Describe");
  function Execute(portal = "", rows2 = 0) {
    return Buffer5.concat([
      bytes_default().E().str(portal + bytes_default.N).i32(rows2).end(),
      Flush
    ]);
  }
  __name(Execute, "Execute");
  function Close(portal = "") {
    return Buffer5.concat([
      bytes_default().C().str("P").str(portal + bytes_default.N).end(),
      bytes_default().S().end()
    ]);
  }
  __name(Close, "Close");
  function StartupMessage() {
    return cancelMessage || bytes_default().inc(4).i16(3).z(2).str(
      Object.entries(Object.assign(
        {
          user,
          database,
          client_encoding: "UTF8"
        },
        options.connection
      )).filter(([, v]) => v).map(([k, v]) => k + bytes_default.N + v).join(bytes_default.N)
    ).z(2).end(0);
  }
  __name(StartupMessage, "StartupMessage");
}
__name(Connection, "Connection");
function parseError(x) {
  const error3 = {};
  let start = 5;
  for (let i = 5; i < x.length - 1; i++) {
    if (x[i] === 0) {
      error3[errorFields[x[start]]] = x.toString("utf8", start + 1, i);
      start = i + 1;
    }
  }
  return error3;
}
__name(parseError, "parseError");
function md5(x) {
  return crypto2.createHash("md5").update(x).digest("hex");
}
__name(md5, "md5");
function hmac(key, x) {
  return crypto2.createHmac("sha256", key).update(x).digest();
}
__name(hmac, "hmac");
function sha2562(x) {
  return crypto2.createHash("sha256").update(x).digest();
}
__name(sha2562, "sha256");
function xor(a, b2) {
  const length = Math.max(a.length, b2.length);
  const buffer2 = Buffer5.allocUnsafe(length);
  for (let i = 0; i < length; i++)
    buffer2[i] = a[i] ^ b2[i];
  return buffer2;
}
__name(xor, "xor");
function timer(fn, seconds) {
  seconds = typeof seconds === "function" ? seconds() : seconds;
  if (!seconds)
    return { cancel: noop, start: noop };
  let timer2;
  return {
    cancel() {
      timer2 && (clearTimeout(timer2), timer2 = null);
    },
    start() {
      timer2 && clearTimeout(timer2);
      timer2 = setTimeout(done, seconds * 1e3, arguments);
    }
  };
  function done(args) {
    fn.apply(null, args);
    timer2 = null;
  }
  __name(done, "done");
}
__name(timer, "timer");

// node_modules/postgres/cf/src/subscribe.js
import { Buffer as Buffer6 } from "node:buffer";
var noop2 = /* @__PURE__ */ __name(() => {
}, "noop");
function Subscribe(postgres2, options) {
  const subscribers = /* @__PURE__ */ new Map(), slot = "postgresjs_" + Math.random().toString(36).slice(2), state = {};
  let connection2, stream, ended = false;
  const sql = subscribe.sql = postgres2({
    ...options,
    transform: { column: {}, value: {}, row: {} },
    max: 1,
    fetch_types: false,
    idle_timeout: null,
    max_lifetime: null,
    connection: {
      ...options.connection,
      replication: "database"
    },
    onclose: /* @__PURE__ */ __name(async function() {
      if (ended)
        return;
      stream = null;
      state.pid = state.secret = void 0;
      connected2(await init(sql, slot, options.publications));
      subscribers.forEach((event) => event.forEach(({ onsubscribe }) => onsubscribe()));
    }, "onclose"),
    no_subscribe: true
  });
  const end = sql.end, close = sql.close;
  sql.end = async () => {
    ended = true;
    stream && await new Promise((r) => (stream.once("close", r), stream.end()));
    return end();
  };
  sql.close = async () => {
    stream && await new Promise((r) => (stream.once("close", r), stream.end()));
    return close();
  };
  return subscribe;
  async function subscribe(event, fn, onsubscribe = noop2, onerror = noop2) {
    event = parseEvent(event);
    if (!connection2)
      connection2 = init(sql, slot, options.publications);
    const subscriber = { fn, onsubscribe };
    const fns = subscribers.has(event) ? subscribers.get(event).add(subscriber) : subscribers.set(event, /* @__PURE__ */ new Set([subscriber])).get(event);
    const unsubscribe = /* @__PURE__ */ __name(() => {
      fns.delete(subscriber);
      fns.size === 0 && subscribers.delete(event);
    }, "unsubscribe");
    return connection2.then((x) => {
      connected2(x);
      onsubscribe();
      stream && stream.on("error", onerror);
      return { unsubscribe, state, sql };
    });
  }
  __name(subscribe, "subscribe");
  function connected2(x) {
    stream = x.stream;
    state.pid = x.state.pid;
    state.secret = x.state.secret;
  }
  __name(connected2, "connected");
  async function init(sql2, slot2, publications) {
    if (!publications)
      throw new Error("Missing publication names");
    const xs = await sql2.unsafe(
      `CREATE_REPLICATION_SLOT ${slot2} TEMPORARY LOGICAL pgoutput NOEXPORT_SNAPSHOT`
    );
    const [x] = xs;
    const stream2 = await sql2.unsafe(
      `START_REPLICATION SLOT ${slot2} LOGICAL ${x.consistent_point} (proto_version '1', publication_names '${publications}')`
    ).writable();
    const state2 = {
      lsn: Buffer6.concat(x.consistent_point.split("/").map((x2) => Buffer6.from(("00000000" + x2).slice(-8), "hex")))
    };
    stream2.on("data", data);
    stream2.on("error", error3);
    stream2.on("close", sql2.close);
    return { stream: stream2, state: xs.state };
    function error3(e) {
      console.error("Unexpected error during logical streaming - reconnecting", e);
    }
    __name(error3, "error");
    function data(x2) {
      if (x2[0] === 119) {
        parse(x2.subarray(25), state2, sql2.options.parsers, handle, options.transform);
      } else if (x2[0] === 107 && x2[17]) {
        state2.lsn = x2.subarray(1, 9);
        pong();
      }
    }
    __name(data, "data");
    function handle(a, b2) {
      const path = b2.relation.schema + "." + b2.relation.table;
      call("*", a, b2);
      call("*:" + path, a, b2);
      b2.relation.keys.length && call("*:" + path + "=" + b2.relation.keys.map((x2) => a[x2.name]), a, b2);
      call(b2.command, a, b2);
      call(b2.command + ":" + path, a, b2);
      b2.relation.keys.length && call(b2.command + ":" + path + "=" + b2.relation.keys.map((x2) => a[x2.name]), a, b2);
    }
    __name(handle, "handle");
    function pong() {
      const x2 = Buffer6.alloc(34);
      x2[0] = "r".charCodeAt(0);
      x2.fill(state2.lsn, 1);
      x2.writeBigInt64BE(BigInt(Date.now() - Date.UTC(2e3, 0, 1)) * BigInt(1e3), 25);
      stream2.write(x2);
    }
    __name(pong, "pong");
  }
  __name(init, "init");
  function call(x, a, b2) {
    subscribers.has(x) && subscribers.get(x).forEach(({ fn }) => fn(a, b2, x));
  }
  __name(call, "call");
}
__name(Subscribe, "Subscribe");
function Time(x) {
  return new Date(Date.UTC(2e3, 0, 1) + Number(x / BigInt(1e3)));
}
__name(Time, "Time");
function parse(x, state, parsers2, handle, transform) {
  const char = /* @__PURE__ */ __name((acc, [k, v]) => (acc[k.charCodeAt(0)] = v, acc), "char");
  Object.entries({
    R: /* @__PURE__ */ __name((x2) => {
      let i = 1;
      const r = state[x2.readUInt32BE(i)] = {
        schema: x2.toString("utf8", i += 4, i = x2.indexOf(0, i)) || "pg_catalog",
        table: x2.toString("utf8", i + 1, i = x2.indexOf(0, i + 1)),
        columns: Array(x2.readUInt16BE(i += 2)),
        keys: []
      };
      i += 2;
      let columnIndex = 0, column;
      while (i < x2.length) {
        column = r.columns[columnIndex++] = {
          key: x2[i++],
          name: transform.column.from ? transform.column.from(x2.toString("utf8", i, i = x2.indexOf(0, i))) : x2.toString("utf8", i, i = x2.indexOf(0, i)),
          type: x2.readUInt32BE(i += 1),
          parser: parsers2[x2.readUInt32BE(i)],
          atttypmod: x2.readUInt32BE(i += 4)
        };
        column.key && r.keys.push(column);
        i += 4;
      }
    }, "R"),
    Y: /* @__PURE__ */ __name(() => {
    }, "Y"),
    // Type
    O: /* @__PURE__ */ __name(() => {
    }, "O"),
    // Origin
    B: /* @__PURE__ */ __name((x2) => {
      state.date = Time(x2.readBigInt64BE(9));
      state.lsn = x2.subarray(1, 9);
    }, "B"),
    I: /* @__PURE__ */ __name((x2) => {
      let i = 1;
      const relation = state[x2.readUInt32BE(i)];
      const { row } = tuples(x2, relation.columns, i += 7, transform);
      handle(row, {
        command: "insert",
        relation
      });
    }, "I"),
    D: /* @__PURE__ */ __name((x2) => {
      let i = 1;
      const relation = state[x2.readUInt32BE(i)];
      i += 4;
      const key = x2[i] === 75;
      handle(
        key || x2[i] === 79 ? tuples(x2, relation.columns, i += 3, transform).row : null,
        {
          command: "delete",
          relation,
          key
        }
      );
    }, "D"),
    U: /* @__PURE__ */ __name((x2) => {
      let i = 1;
      const relation = state[x2.readUInt32BE(i)];
      i += 4;
      const key = x2[i] === 75;
      const xs = key || x2[i] === 79 ? tuples(x2, relation.columns, i += 3, transform) : null;
      xs && (i = xs.i);
      const { row } = tuples(x2, relation.columns, i + 3, transform);
      handle(row, {
        command: "update",
        relation,
        key,
        old: xs && xs.row
      });
    }, "U"),
    T: /* @__PURE__ */ __name(() => {
    }, "T"),
    // Truncate,
    C: /* @__PURE__ */ __name(() => {
    }, "C")
    // Commit
  }).reduce(char, {})[x[0]](x);
}
__name(parse, "parse");
function tuples(x, columns, xi, transform) {
  let type, column, value;
  const row = transform.raw ? new Array(columns.length) : {};
  for (let i = 0; i < columns.length; i++) {
    type = x[xi++];
    column = columns[i];
    value = type === 110 ? null : type === 117 ? void 0 : column.parser === void 0 ? x.toString("utf8", xi + 4, xi += 4 + x.readUInt32BE(xi)) : column.parser.array === true ? column.parser(x.toString("utf8", xi + 5, xi += 4 + x.readUInt32BE(xi))) : column.parser(x.toString("utf8", xi + 4, xi += 4 + x.readUInt32BE(xi)));
    transform.raw ? row[i] = transform.raw === true ? value : transform.value.from ? transform.value.from(value, column) : value : row[column.name] = transform.value.from ? transform.value.from(value, column) : value;
  }
  return { i: xi, row: transform.row.from ? transform.row.from(row) : row };
}
__name(tuples, "tuples");
function parseEvent(x) {
  const xs = x.match(/^(\*|insert|update|delete)?:?([^.]+?\.?[^=]+)?=?(.+)?/i) || [];
  if (!xs)
    throw new Error("Malformed subscribe pattern: " + x);
  const [, command, path, key] = xs;
  return (command || "*") + (path ? ":" + (path.indexOf(".") === -1 ? "public." + path : path) : "") + (key ? "=" + key : "");
}
__name(parseEvent, "parseEvent");

// node_modules/postgres/cf/src/large.js
import Stream2 from "node:stream";
function largeObject(sql, oid, mode = 131072 | 262144) {
  return new Promise(async (resolve, reject) => {
    await sql.begin(async (sql2) => {
      let finish;
      !oid && ([{ oid }] = await sql2`select lo_creat(-1) as oid`);
      const [{ fd }] = await sql2`select lo_open(${oid}, ${mode}) as fd`;
      const lo = {
        writable,
        readable,
        close: /* @__PURE__ */ __name(() => sql2`select lo_close(${fd})`.then(finish), "close"),
        tell: /* @__PURE__ */ __name(() => sql2`select lo_tell64(${fd})`, "tell"),
        read: /* @__PURE__ */ __name((x) => sql2`select loread(${fd}, ${x}) as data`, "read"),
        write: /* @__PURE__ */ __name((x) => sql2`select lowrite(${fd}, ${x})`, "write"),
        truncate: /* @__PURE__ */ __name((x) => sql2`select lo_truncate64(${fd}, ${x})`, "truncate"),
        seek: /* @__PURE__ */ __name((x, whence = 0) => sql2`select lo_lseek64(${fd}, ${x}, ${whence})`, "seek"),
        size: /* @__PURE__ */ __name(() => sql2`
          select
            lo_lseek64(${fd}, location, 0) as position,
            seek.size
          from (
            select
              lo_lseek64($1, 0, 2) as size,
              tell.location
            from (select lo_tell64($1) as location) tell
          ) seek
        `, "size")
      };
      resolve(lo);
      return new Promise(async (r) => finish = r);
      async function readable({
        highWaterMark = 2048 * 8,
        start = 0,
        end = Infinity
      } = {}) {
        let max = end - start;
        start && await lo.seek(start);
        return new Stream2.Readable({
          highWaterMark,
          async read(size2) {
            const l = size2 > max ? size2 - max : size2;
            max -= size2;
            const [{ data }] = await lo.read(l);
            this.push(data);
            if (data.length < size2)
              this.push(null);
          }
        });
      }
      __name(readable, "readable");
      async function writable({
        highWaterMark = 2048 * 8,
        start = 0
      } = {}) {
        start && await lo.seek(start);
        return new Stream2.Writable({
          highWaterMark,
          write(chunk, encoding, callback) {
            lo.write(chunk).then(() => callback(), callback);
          }
        });
      }
      __name(writable, "writable");
    }).catch(reject);
  });
}
__name(largeObject, "largeObject");

// node_modules/postgres/cf/src/index.js
Object.assign(Postgres, {
  PostgresError,
  toPascal,
  pascal,
  toCamel,
  camel,
  toKebab,
  kebab,
  fromPascal,
  fromCamel,
  fromKebab,
  BigInt: {
    to: 20,
    from: [20],
    parse: /* @__PURE__ */ __name((x) => BigInt(x), "parse"),
    // eslint-disable-line
    serialize: /* @__PURE__ */ __name((x) => x.toString(), "serialize")
  }
});
var src_default = Postgres;
function Postgres(a, b2) {
  const options = parseOptions(a, b2), subscribe = options.no_subscribe || Subscribe(Postgres, { ...options });
  let ending = false;
  const queries = queue_default(), connecting = queue_default(), reserved = queue_default(), closed = queue_default(), ended = queue_default(), open = queue_default(), busy = queue_default(), full = queue_default(), queues = { connecting, reserved, closed, ended, open, busy, full };
  const connections = [...Array(options.max)].map(() => connection_default(options, queues, { onopen, onend, onclose }));
  const sql = Sql(handler);
  Object.assign(sql, {
    get parameters() {
      return options.parameters;
    },
    largeObject: largeObject.bind(null, sql),
    subscribe,
    CLOSE,
    END: CLOSE,
    PostgresError,
    options,
    reserve,
    listen,
    begin,
    close,
    end
  });
  return sql;
  function Sql(handler2) {
    handler2.debug = options.debug;
    Object.entries(options.types).reduce((acc, [name, type]) => {
      acc[name] = (x) => new Parameter(x, type.to);
      return acc;
    }, typed);
    Object.assign(sql2, {
      types: typed,
      typed,
      unsafe,
      notify,
      array,
      json,
      file
    });
    return sql2;
    function typed(value, type) {
      return new Parameter(value, type);
    }
    __name(typed, "typed");
    function sql2(strings, ...args) {
      const query = strings && Array.isArray(strings.raw) ? new Query(strings, args, handler2, cancel) : typeof strings === "string" && !args.length ? new Identifier(options.transform.column.to ? options.transform.column.to(strings) : strings) : new Builder(strings, args);
      return query;
    }
    __name(sql2, "sql");
    function unsafe(string, args = [], options2 = {}) {
      arguments.length === 2 && !Array.isArray(args) && (options2 = args, args = []);
      const query = new Query([string], args, handler2, cancel, {
        prepare: false,
        ...options2,
        simple: "simple" in options2 ? options2.simple : args.length === 0
      });
      return query;
    }
    __name(unsafe, "unsafe");
    function file(path, args = [], options2 = {}) {
      arguments.length === 2 && !Array.isArray(args) && (options2 = args, args = []);
      const query = new Query([], args, (query2) => {
        fs.readFile(path, "utf8", (err, string) => {
          if (err)
            return query2.reject(err);
          query2.strings = [string];
          handler2(query2);
        });
      }, cancel, {
        ...options2,
        simple: "simple" in options2 ? options2.simple : args.length === 0
      });
      return query;
    }
    __name(file, "file");
  }
  __name(Sql, "Sql");
  async function listen(name, fn, onlisten) {
    const listener = { fn, onlisten };
    const sql2 = listen.sql || (listen.sql = Postgres({
      ...options,
      max: 1,
      idle_timeout: null,
      max_lifetime: null,
      fetch_types: false,
      onclose() {
        Object.entries(listen.channels).forEach(([name2, { listeners: listeners2 }]) => {
          delete listen.channels[name2];
          Promise.all(listeners2.map((l) => listen(name2, l.fn, l.onlisten).catch(() => {
          })));
        });
      },
      onnotify(c, x) {
        c in listen.channels && listen.channels[c].listeners.forEach((l) => l.fn(x));
      }
    }));
    const channels = listen.channels || (listen.channels = {}), exists = name in channels;
    if (exists) {
      channels[name].listeners.push(listener);
      const result2 = await channels[name].result;
      listener.onlisten && listener.onlisten();
      return { state: result2.state, unlisten };
    }
    channels[name] = { result: sql2`listen ${sql2.unsafe('"' + name.replace(/"/g, '""') + '"')}`, listeners: [listener] };
    const result = await channels[name].result;
    listener.onlisten && listener.onlisten();
    return { state: result.state, unlisten };
    async function unlisten() {
      if (name in channels === false)
        return;
      channels[name].listeners = channels[name].listeners.filter((x) => x !== listener);
      if (channels[name].listeners.length)
        return;
      delete channels[name];
      return sql2`unlisten ${sql2.unsafe('"' + name.replace(/"/g, '""') + '"')}`;
    }
    __name(unlisten, "unlisten");
  }
  __name(listen, "listen");
  async function notify(channel2, payload) {
    return await sql`select pg_notify(${channel2}, ${"" + payload})`;
  }
  __name(notify, "notify");
  async function reserve() {
    const queue = queue_default();
    const c = open.length ? open.shift() : await new Promise((resolve, reject) => {
      const query = { reserve: resolve, reject };
      queries.push(query);
      closed.length && connect(closed.shift(), query);
    });
    move(c, reserved);
    c.reserved = () => queue.length ? c.execute(queue.shift()) : move(c, reserved);
    c.reserved.release = true;
    const sql2 = Sql(handler2);
    sql2.release = () => {
      c.reserved = null;
      onopen(c);
    };
    return sql2;
    function handler2(q) {
      c.queue === full ? queue.push(q) : c.execute(q) || move(c, full);
    }
    __name(handler2, "handler");
  }
  __name(reserve, "reserve");
  async function begin(options2, fn) {
    !fn && (fn = options2, options2 = "");
    const queries2 = queue_default();
    let savepoints = 0, connection2, prepare = null;
    try {
      await sql.unsafe("begin " + options2.replace(/[^a-z ]/ig, ""), [], { onexecute }).execute();
      return await Promise.race([
        scope(connection2, fn),
        new Promise((_, reject) => connection2.onclose = reject)
      ]);
    } catch (error3) {
      throw error3;
    }
    async function scope(c, fn2, name) {
      const sql2 = Sql(handler2);
      sql2.savepoint = savepoint;
      sql2.prepare = (x) => prepare = x.replace(/[^a-z0-9$-_. ]/gi);
      let uncaughtError, result;
      name && await sql2`savepoint ${sql2(name)}`;
      try {
        result = await new Promise((resolve, reject) => {
          const x = fn2(sql2);
          Promise.resolve(Array.isArray(x) ? Promise.all(x) : x).then(resolve, reject);
        });
        if (uncaughtError)
          throw uncaughtError;
      } catch (e) {
        await (name ? sql2`rollback to ${sql2(name)}` : sql2`rollback`);
        throw e instanceof PostgresError && e.code === "25P02" && uncaughtError || e;
      }
      if (!name) {
        prepare ? await sql2`prepare transaction '${sql2.unsafe(prepare)}'` : await sql2`commit`;
      }
      return result;
      function savepoint(name2, fn3) {
        if (name2 && Array.isArray(name2.raw))
          return savepoint((sql3) => sql3.apply(sql3, arguments));
        arguments.length === 1 && (fn3 = name2, name2 = null);
        return scope(c, fn3, "s" + savepoints++ + (name2 ? "_" + name2 : ""));
      }
      __name(savepoint, "savepoint");
      function handler2(q) {
        q.catch((e) => uncaughtError || (uncaughtError = e));
        c.queue === full ? queries2.push(q) : c.execute(q) || move(c, full);
      }
      __name(handler2, "handler");
    }
    __name(scope, "scope");
    function onexecute(c) {
      connection2 = c;
      move(c, reserved);
      c.reserved = () => queries2.length ? c.execute(queries2.shift()) : move(c, reserved);
    }
    __name(onexecute, "onexecute");
  }
  __name(begin, "begin");
  function move(c, queue) {
    c.queue.remove(c);
    queue.push(c);
    c.queue = queue;
    queue === open ? c.idleTimer.start() : c.idleTimer.cancel();
    return c;
  }
  __name(move, "move");
  function json(x) {
    return new Parameter(x, 3802);
  }
  __name(json, "json");
  function array(x, type) {
    if (!Array.isArray(x))
      return array(Array.from(arguments));
    return new Parameter(x, type || (x.length ? inferType(x) || 25 : 0), options.shared.typeArrayMap);
  }
  __name(array, "array");
  function handler(query) {
    if (ending)
      return query.reject(Errors.connection("CONNECTION_ENDED", options, options));
    if (open.length)
      return go(open.shift(), query);
    if (closed.length)
      return connect(closed.shift(), query);
    busy.length ? go(busy.shift(), query) : queries.push(query);
  }
  __name(handler, "handler");
  function go(c, query) {
    return c.execute(query) ? move(c, busy) : move(c, full);
  }
  __name(go, "go");
  function cancel(query) {
    return new Promise((resolve, reject) => {
      query.state ? query.active ? connection_default(options).cancel(query.state, resolve, reject) : query.cancelled = { resolve, reject } : (queries.remove(query), query.cancelled = true, query.reject(Errors.generic("57014", "canceling statement due to user request")), resolve());
    });
  }
  __name(cancel, "cancel");
  async function end({ timeout = null } = {}) {
    if (ending)
      return ending;
    await 1;
    let timer2;
    return ending = Promise.race([
      new Promise((r) => timeout !== null && (timer2 = setTimeout(destroy, timeout * 1e3, r))),
      Promise.all(connections.map((c) => c.end()).concat(
        listen.sql ? listen.sql.end({ timeout: 0 }) : [],
        subscribe.sql ? subscribe.sql.end({ timeout: 0 }) : []
      ))
    ]).then(() => clearTimeout(timer2));
  }
  __name(end, "end");
  async function close() {
    await Promise.all(connections.map((c) => c.end()));
  }
  __name(close, "close");
  async function destroy(resolve) {
    await Promise.all(connections.map((c) => c.terminate()));
    while (queries.length)
      queries.shift().reject(Errors.connection("CONNECTION_DESTROYED", options));
    resolve();
  }
  __name(destroy, "destroy");
  function connect(c, query) {
    move(c, connecting);
    c.connect(query);
    return c;
  }
  __name(connect, "connect");
  function onend(c) {
    move(c, ended);
  }
  __name(onend, "onend");
  function onopen(c) {
    if (queries.length === 0)
      return move(c, open);
    let max = Math.ceil(queries.length / (connecting.length + 1)), ready = true;
    while (ready && queries.length && max-- > 0) {
      const query = queries.shift();
      if (query.reserve)
        return query.reserve(c);
      ready = c.execute(query);
    }
    ready ? move(c, busy) : move(c, full);
  }
  __name(onopen, "onopen");
  function onclose(c, e) {
    move(c, closed);
    c.reserved = null;
    c.onclose && (c.onclose(e), c.onclose = null);
    options.onclose && options.onclose(c.id);
    queries.length && connect(c, queries.shift());
  }
  __name(onclose, "onclose");
}
__name(Postgres, "Postgres");
function parseOptions(a, b2) {
  if (a && a.shared)
    return a;
  const env2 = process2.env, o = (!a || typeof a === "string" ? b2 : a) || {}, { url, multihost } = parseUrl(a), query = [...url.searchParams].reduce((a2, [b3, c]) => (a2[b3] = c, a2), {}), host = o.hostname || o.host || multihost || url.hostname || env2.PGHOST || "localhost", port = o.port || url.port || env2.PGPORT || 5432, user = o.user || o.username || url.username || env2.PGUSERNAME || env2.PGUSER || osUsername();
  o.no_prepare && (o.prepare = false);
  query.sslmode && (query.ssl = query.sslmode, delete query.sslmode);
  "timeout" in o && (console.log("The timeout option is deprecated, use idle_timeout instead"), o.idle_timeout = o.timeout);
  query.sslrootcert === "system" && (query.ssl = "verify-full");
  const ints = ["idle_timeout", "connect_timeout", "max_lifetime", "max_pipeline", "backoff", "keep_alive"];
  const defaults = {
    max: globalThis.Cloudflare ? 3 : 10,
    ssl: false,
    sslnegotiation: null,
    idle_timeout: null,
    connect_timeout: 30,
    max_lifetime,
    max_pipeline: 100,
    backoff,
    keep_alive: 60,
    prepare: true,
    debug: false,
    fetch_types: true,
    publications: "alltables",
    target_session_attrs: null
  };
  return {
    host: Array.isArray(host) ? host : host.split(",").map((x) => x.split(":")[0]),
    port: Array.isArray(port) ? port : host.split(",").map((x) => parseInt(x.split(":")[1] || port)),
    path: o.path || host.indexOf("/") > -1 && host + "/.s.PGSQL." + port,
    database: o.database || o.db || (url.pathname || "").slice(1) || env2.PGDATABASE || user,
    user,
    pass: o.pass || o.password || url.password || env2.PGPASSWORD || "",
    ...Object.entries(defaults).reduce(
      (acc, [k, d]) => {
        const value = k in o ? o[k] : k in query ? query[k] === "disable" || query[k] === "false" ? false : query[k] : env2["PG" + k.toUpperCase()] || d;
        acc[k] = typeof value === "string" && ints.includes(k) ? +value : value;
        return acc;
      },
      {}
    ),
    connection: {
      application_name: env2.PGAPPNAME || "postgres.js",
      ...o.connection,
      ...Object.entries(query).reduce((acc, [k, v]) => (k in defaults || (acc[k] = v), acc), {})
    },
    types: o.types || {},
    target_session_attrs: tsa(o, url, env2),
    onnotice: o.onnotice,
    onnotify: o.onnotify,
    onclose: o.onclose,
    onparameter: o.onparameter,
    socket: o.socket,
    transform: parseTransform(o.transform || { undefined: void 0 }),
    parameters: {},
    shared: { retries: 0, typeArrayMap: {} },
    ...mergeUserTypes(o.types)
  };
}
__name(parseOptions, "parseOptions");
function tsa(o, url, env2) {
  const x = o.target_session_attrs || url.searchParams.get("target_session_attrs") || env2.PGTARGETSESSIONATTRS;
  if (!x || ["read-write", "read-only", "primary", "standby", "prefer-standby"].includes(x))
    return x;
  throw new Error("target_session_attrs " + x + " is not supported");
}
__name(tsa, "tsa");
function backoff(retries) {
  return (0.5 + Math.random() / 2) * Math.min(3 ** retries / 100, 20);
}
__name(backoff, "backoff");
function max_lifetime() {
  return 60 * (30 + Math.random() * 30);
}
__name(max_lifetime, "max_lifetime");
function parseTransform(x) {
  return {
    undefined: x.undefined,
    column: {
      from: typeof x.column === "function" ? x.column : x.column && x.column.from,
      to: x.column && x.column.to
    },
    value: {
      from: typeof x.value === "function" ? x.value : x.value && x.value.from,
      to: x.value && x.value.to
    },
    row: {
      from: typeof x.row === "function" ? x.row : x.row && x.row.from,
      to: x.row && x.row.to
    }
  };
}
__name(parseTransform, "parseTransform");
function parseUrl(url) {
  if (!url || typeof url !== "string")
    return { url: { searchParams: /* @__PURE__ */ new Map() } };
  let host = url;
  host = host.slice(host.indexOf("://") + 3).split(/[?/]/)[0];
  host = decodeURIComponent(host.slice(host.indexOf("@") + 1));
  const urlObj = new URL(url.replace(host, host.split(",")[0]));
  return {
    url: {
      username: decodeURIComponent(urlObj.username),
      password: decodeURIComponent(urlObj.password),
      host: urlObj.host,
      hostname: urlObj.hostname,
      port: urlObj.port,
      pathname: urlObj.pathname,
      searchParams: urlObj.searchParams
    },
    multihost: host.indexOf(",") > -1 && host
  };
}
__name(parseUrl, "parseUrl");
function osUsername() {
  try {
    return os.userInfo().username;
  } catch (_) {
    return process2.env.USERNAME || process2.env.USER || process2.env.LOGNAME;
  }
}
__name(osUsername, "osUsername");

// src/server/db.ts
var DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
var cachedSql = null;
var cachedDbUrl = null;
function getSql(env2) {
  const dbUrl = env2?.DATABASE_URL || (typeof process !== "undefined" ? process.env.DATABASE_URL : void 0) || DEFAULT_LOCAL_DB_URL;
  const isCloudflareWorker = typeof navigator !== "undefined" && true;
  if (isCloudflareWorker) {
    return src_default(dbUrl, {
      max: 2,
      idle_timeout: 1,
      connect_timeout: 10,
      prepare: false,
      fetch_types: false,
      onnotice: /* @__PURE__ */ __name(() => {
      }, "onnotice")
    });
  }
  if (!cachedSql || cachedDbUrl !== dbUrl) {
    cachedSql = src_default(dbUrl, {
      max: 15,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      onnotice: /* @__PURE__ */ __name(() => {
      }, "onnotice")
    });
    cachedDbUrl = dbUrl;
  }
  return cachedSql;
}
__name(getSql, "getSql");
async function withUserRls(userId, fn, env2) {
  const sql = getSql(env2);
  return sql.begin(async (tx) => {
    const claims = JSON.stringify({
      sub: userId,
      role: "authenticated"
    });
    await tx`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`;
    await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
    await tx.unsafe(`SET LOCAL ROLE authenticated`);
    return fn(tx);
  });
}
__name(withUserRls, "withUserRls");
async function withServiceTransaction(fn, env2) {
  const sql = getSql(env2);
  return sql.begin(async (tx) => {
    return fn(tx);
  });
}
__name(withServiceTransaction, "withServiceTransaction");

// src/server/auth.ts
var DEFAULT_SECRET = "dev_only_secret_key_for_dr_agenda_nucleos_local_testing_32";
function getSecret(env2) {
  return env2?.APP_JWT_SECRET || (typeof process !== "undefined" ? process.env.APP_JWT_SECRET : void 0) || DEFAULT_SECRET;
}
__name(getSecret, "getSecret");
function signSessionToken(payload, env2, ttlSeconds = 60 * 60 * 12) {
  const now = Math.floor(Date.now() / 1e3);
  const fullPayload = {
    sub: payload.userId,
    orgId: payload.organizationId,
    role: payload.role,
    iat: now,
    exp: now + ttlSeconds
  };
  const headerB64 = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const bodyB64 = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const sig = crypto3.createHmac("sha256", getSecret(env2)).update(`${headerB64}.${bodyB64}`).digest("base64url");
  return `${headerB64}.${bodyB64}.${sig}`;
}
__name(signSessionToken, "signSessionToken");
function verifySessionToken(token, env2) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, sig] = parts;
    const expectedSig = crypto3.createHmac("sha256", getSecret(env2)).update(`${headerB64}.${bodyB64}`).digest("base64url");
    if (sig.length !== expectedSig.length || !crypto3.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null;
    }
    const decoded = JSON.parse(Buffer.from(bodyB64, "base64url").toString("utf-8"));
    const now = Math.floor(Date.now() / 1e3);
    if (!decoded.exp || decoded.exp < now) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
__name(verifySessionToken, "verifySessionToken");
async function authenticateWithPassword(email, password, env2) {
  const sql = getSql(env2);
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await sql`
    SELECT
      u.id AS user_id,
      u.email,
      public.is_auth_user_active(u.id) AS user_active,
      m.organization_id,
      m.role,
      m.full_name,
      m.initials,
      m.is_active AS membership_active,
      o.slug AS org_slug,
      o.name AS org_name,
      o.default_timezone,
      o.currency,
      p.id AS professional_id
    FROM auth.users u
    JOIN public.memberships m ON m.user_id = u.id
    JOIN public.organizations o ON o.id = m.organization_id
    LEFT JOIN public.professionals p
      ON p.organization_id = m.organization_id
      AND p.user_id = u.id
      AND p.is_active = true
    WHERE LOWER(u.email) = ${normalizedEmail}
      AND u.encrypted_password = crypt(${password}, u.encrypted_password)
      AND public.is_auth_user_active(u.id) = true
      AND m.is_active = true
      AND o.status = 'active'
    ORDER BY m.created_at ASC
    LIMIT 1
  `;
  if (rows.length === 0) {
    return null;
  }
  const row = rows[0];
  const sessionUser = {
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    initials: row.initials,
    organizationId: row.organization_id,
    organizationSlug: row.org_slug,
    organizationName: row.org_name,
    role: row.role,
    professionalId: row.professional_id || null,
    timezone: row.default_timezone,
    currency: "MXN"
  };
  const token = signSessionToken(
    {
      userId: sessionUser.userId,
      organizationId: sessionUser.organizationId,
      role: sessionUser.role
    },
    env2
  );
  return { user: sessionUser, token };
}
__name(authenticateWithPassword, "authenticateWithPassword");
async function resolveActiveSessionUser(token, env2) {
  const payload = verifySessionToken(token, env2);
  if (!payload) return null;
  const sql = getSql(env2);
  const rows = await sql`
    SELECT
      u.id AS user_id,
      u.email,
      m.organization_id,
      m.role,
      m.full_name,
      m.initials,
      o.slug AS org_slug,
      o.name AS org_name,
      o.default_timezone,
      p.id AS professional_id
    FROM auth.users u
    JOIN public.memberships m ON m.user_id = u.id AND m.organization_id = ${payload.orgId}
    JOIN public.organizations o ON o.id = m.organization_id
    LEFT JOIN public.professionals p
      ON p.organization_id = m.organization_id
      AND p.user_id = u.id
      AND p.is_active = true
    WHERE u.id = ${payload.sub}
      AND public.is_auth_user_active(u.id) = true
      AND m.is_active = true
      AND o.status = 'active'
    LIMIT 1
  `;
  if (rows.length === 0) {
    return null;
  }
  const row = rows[0];
  return {
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    initials: row.initials,
    organizationId: row.organization_id,
    organizationSlug: row.org_slug,
    organizationName: row.org_name,
    role: row.role,
    professionalId: row.professional_id || null,
    timezone: row.default_timezone,
    currency: "MXN"
  };
}
__name(resolveActiveSessionUser, "resolveActiveSessionUser");

// src/shared/timezone.ts
function getLocalParts(utcDate, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(utcDate);
  const map = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }
  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  const minute = Number(map.minute);
  const second = Number(map.second);
  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };
  const weekday = weekdayMap[map.weekday] ?? 0;
  const dateString = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const timeString = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return { year, month, day, weekday, hour, minute, second, dateString, timeString };
}
__name(getLocalParts, "getLocalParts");
function localDateTimeToUtc(localDateStr, localTimeStr, timeZone) {
  const [year, month, day] = localDateStr.split("-").map(Number);
  const timeParts = localTimeStr.split(":").map(Number);
  const hour = timeParts[0] || 0;
  const minute = timeParts[1] || 0;
  const second = timeParts[2] || 0;
  const utcGuessMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const guessDate = new Date(utcGuessMs);
  const actualParts = getLocalParts(guessDate, timeZone);
  const actualAsUtcMs = Date.UTC(
    actualParts.year,
    actualParts.month - 1,
    actualParts.day,
    actualParts.hour,
    actualParts.minute,
    actualParts.second
  );
  const diffMs = utcGuessMs - actualAsUtcMs;
  const refinedDate = new Date(utcGuessMs + diffMs);
  const verifyParts = getLocalParts(refinedDate, timeZone);
  const verifyAsUtcMs = Date.UTC(
    verifyParts.year,
    verifyParts.month - 1,
    verifyParts.day,
    verifyParts.hour,
    verifyParts.minute,
    verifyParts.second
  );
  const secondDiffMs = utcGuessMs - verifyAsUtcMs;
  return new Date(utcGuessMs + diffMs + secondDiffMs);
}
__name(localDateTimeToUtc, "localDateTimeToUtc");
function getLocalDayUtcBounds(localDateStr, timeZone) {
  const dayStartUtc = localDateTimeToUtc(localDateStr, "00:00:00", timeZone);
  const [y, m, d] = localDateStr.split("-").map(Number);
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
  const nextDateStr = `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDay.getUTCDate()).padStart(2, "0")}`;
  const dayEndUtc = localDateTimeToUtc(nextDateStr, "00:00:00", timeZone);
  const { weekday } = getLocalParts(dayStartUtc, timeZone);
  return { dayStartUtc, dayEndUtc, weekday };
}
__name(getLocalDayUtcBounds, "getLocalDayUtcBounds");
function normalizeMexicanPhone(raw2) {
  const digits = raw2.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+52${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("52")) {
    return `+${digits}`;
  }
  return `+${digits}`;
}
__name(normalizeMexicanPhone, "normalizeMexicanPhone");

// src/server/availability.ts
async function computeAvailableSlots(db, params) {
  const { organizationId, professionalId, serviceId, dateStr, resourceIdOverride, excludeAppointmentId } = params;
  const profRows = await db`
    SELECT
      p.id AS professional_id,
      p.is_active AS prof_active,
      p.default_location_id,
      p.default_resource_id AS prof_resource_id,
      l.timezone,
      s.id AS service_id,
      s.duration_minutes,
      s.buffer_before_minutes,
      s.buffer_after_minutes,
      s.price_cents,
      s.default_resource_id AS srv_resource_id,
      s.is_active AS srv_active
    FROM public.professionals p
    JOIN public.locations l
      ON l.id = p.default_location_id
      AND l.organization_id = p.organization_id
    JOIN public.services s
      ON s.id = ${serviceId}
      AND s.professional_id = p.id
      AND s.organization_id = p.organization_id
    WHERE p.id = ${professionalId}
      AND p.organization_id = ${organizationId}
    LIMIT 1
  `;
  if (profRows.length === 0) {
    throw Object.assign(new Error("Profesional o servicio no encontrado en este n\xFAcleo."), {
      status: 404
    });
  }
  const info3 = profRows[0];
  if (!info3.prof_active || !info3.srv_active) {
    return {
      timezone: info3.timezone,
      locationId: info3.default_location_id,
      resourceId: resourceIdOverride || info3.srv_resource_id || info3.prof_resource_id,
      resourceName: "Inactivo",
      durationMinutes: Number(info3.duration_minutes),
      bufferBeforeMinutes: Number(info3.buffer_before_minutes),
      bufferAfterMinutes: Number(info3.buffer_after_minutes),
      agreedPriceCents: Number(info3.price_cents),
      slots: []
    };
  }
  const targetResourceId = resourceIdOverride || info3.srv_resource_id || info3.prof_resource_id;
  const resRows = await db`
    SELECT id, name, is_active
    FROM public.resources
    WHERE id = ${targetResourceId}
      AND organization_id = ${organizationId}
    LIMIT 1
  `;
  if (resRows.length === 0 || !resRows[0].is_active) {
    throw Object.assign(new Error("Consultorio o recurso requerido no disponible."), {
      status: 422
    });
  }
  const resourceName = resRows[0].name;
  const timezone = info3.timezone;
  const locationId = info3.default_location_id;
  const durationMinutes = Number(info3.duration_minutes);
  const bufferBeforeMinutes = Number(info3.buffer_before_minutes);
  const bufferAfterMinutes = Number(info3.buffer_after_minutes);
  const agreedPriceCents = Number(info3.price_cents);
  const { dayStartUtc, dayEndUtc, weekday } = getLocalDayUtcBounds(dateStr, timezone);
  const rules = await db`
    SELECT
      start_local_time::text AS start_local_time,
      end_local_time::text AS end_local_time,
      break_start_local_time::text AS break_start_local_time,
      break_end_local_time::text AS break_end_local_time,
      slot_interval_minutes
    FROM public.availability_rules
    WHERE organization_id = ${organizationId}
      AND professional_id = ${professionalId}
      AND location_id = ${locationId}
      AND day_of_week = ${weekday}
      AND is_active = true
    ORDER BY start_local_time ASC
  `;
  if (rules.length === 0) {
    return {
      timezone,
      locationId,
      resourceId: targetResourceId,
      resourceName,
      durationMinutes,
      bufferBeforeMinutes,
      bufferAfterMinutes,
      agreedPriceCents,
      slots: []
    };
  }
  const reservations = await db`
    SELECT
      starts_at,
      ends_at,
      appointment_id
    FROM public.resource_reservations
    WHERE organization_id = ${organizationId}
      AND status = 'active'
      AND (professional_id = ${professionalId} OR resource_id = ${targetResourceId})
      AND starts_at < ${dayEndUtc.toISOString()}::timestamptz
      AND ends_at > ${dayStartUtc.toISOString()}::timestamptz
  `;
  const exceptions = await db`
    SELECT
      starts_at,
      ends_at
    FROM public.availability_exceptions
    WHERE organization_id = ${organizationId}
      AND is_active = true
      AND (professional_id = ${professionalId} OR resource_id = ${targetResourceId})
      AND starts_at < ${dayEndUtc.toISOString()}::timestamptz
      AND ends_at > ${dayStartUtc.toISOString()}::timestamptz
  `;
  const busyIntervals = [];
  for (const r of reservations) {
    if (excludeAppointmentId && r.appointment_id === excludeAppointmentId) {
      continue;
    }
    busyIntervals.push({
      startMs: new Date(r.starts_at).getTime(),
      endMs: new Date(r.ends_at).getTime()
    });
  }
  for (const ex of exceptions) {
    busyIntervals.push({
      startMs: new Date(ex.starts_at).getTime(),
      endMs: new Date(ex.ends_at).getTime()
    });
  }
  const slots = [];
  for (const rule of rules) {
    const shiftStartUtc = localDateTimeToUtc(dateStr, rule.start_local_time, timezone);
    const shiftEndUtc = localDateTimeToUtc(dateStr, rule.end_local_time, timezone);
    const intervalMs = Number(rule.slot_interval_minutes) * 60 * 1e3;
    let breakStartMs = null;
    let breakEndMs = null;
    if (rule.break_start_local_time && rule.break_end_local_time) {
      breakStartMs = localDateTimeToUtc(dateStr, rule.break_start_local_time, timezone).getTime();
      breakEndMs = localDateTimeToUtc(dateStr, rule.break_end_local_time, timezone).getTime();
    }
    for (let cursorMs = shiftStartUtc.getTime(); cursorMs < shiftEndUtc.getTime(); cursorMs += intervalMs) {
      const apptStartMs = cursorMs;
      const apptEndMs = apptStartMs + durationMinutes * 60 * 1e3;
      const occupiedStartMs = apptStartMs - bufferBeforeMinutes * 60 * 1e3;
      const occupiedEndMs = apptEndMs + bufferAfterMinutes * 60 * 1e3;
      if (occupiedStartMs < shiftStartUtc.getTime() || occupiedEndMs > shiftEndUtc.getTime()) {
        continue;
      }
      if (breakStartMs !== null && breakEndMs !== null && occupiedStartMs < breakEndMs && occupiedEndMs > breakStartMs) {
        continue;
      }
      const hasOverlap = busyIntervals.some(
        (b2) => occupiedStartMs < b2.endMs && occupiedEndMs > b2.startMs
      );
      if (hasOverlap) {
        continue;
      }
      const startParts = getLocalParts(new Date(apptStartMs), timezone);
      const endParts = getLocalParts(new Date(apptEndMs), timezone);
      slots.push({
        startsAt: new Date(apptStartMs).toISOString(),
        endsAt: new Date(apptEndMs).toISOString(),
        localTimeLabel: startParts.timeString,
        localEndTimeLabel: endParts.timeString,
        resourceId: targetResourceId,
        resourceName
      });
    }
  }
  return {
    timezone,
    locationId,
    resourceId: targetResourceId,
    resourceName,
    durationMinutes,
    bufferBeforeMinutes,
    bufferAfterMinutes,
    agreedPriceCents,
    slots
  };
}
__name(computeAvailableSlots, "computeAvailableSlots");
async function validateSlotInSchedule(db, params) {
  const startsAtUtc = new Date(params.startsAtIso);
  if (Number.isNaN(startsAtUtc.getTime())) {
    throw Object.assign(new Error("Fecha/hora de inicio inv\xE1lida."), { status: 422 });
  }
  const locRow = await db`
    SELECT l.timezone
    FROM public.professionals p
    JOIN public.locations l ON l.id = p.default_location_id AND l.organization_id = p.organization_id
    WHERE p.id = ${params.professionalId}
      AND p.organization_id = ${params.organizationId}
    LIMIT 1
  `;
  if (locRow.length === 0) {
    throw Object.assign(new Error("Profesional no encontrado."), { status: 404 });
  }
  const timezone = locRow[0].timezone;
  const localParts = getLocalParts(startsAtUtc, timezone);
  const computed = await computeAvailableSlots(db, {
    organizationId: params.organizationId,
    professionalId: params.professionalId,
    serviceId: params.serviceId,
    dateStr: localParts.dateString,
    resourceIdOverride: params.resourceIdOverride,
    excludeAppointmentId: params.excludeAppointmentId
  });
  const endsAtUtc = new Date(startsAtUtc.getTime() + computed.durationMinutes * 60 * 1e3);
  const occupiedStartsAtUtc = new Date(
    startsAtUtc.getTime() - computed.bufferBeforeMinutes * 60 * 1e3
  );
  const occupiedEndsAtUtc = new Date(
    endsAtUtc.getTime() + computed.bufferAfterMinutes * 60 * 1e3
  );
  const matchingSlot = computed.slots.find(
    (s) => new Date(s.startsAt).getTime() === startsAtUtc.getTime()
  );
  if (!matchingSlot) {
    const { weekday } = getLocalDayUtcBounds(localParts.dateString, timezone);
    const rules = await db`
      SELECT
        start_local_time::text AS start_local_time,
        end_local_time::text AS end_local_time,
        break_start_local_time::text AS break_start_local_time,
        break_end_local_time::text AS break_end_local_time
      FROM public.availability_rules
      WHERE organization_id = ${params.organizationId}
        AND professional_id = ${params.professionalId}
        AND location_id = ${computed.locationId}
        AND day_of_week = ${weekday}
        AND is_active = true
    `;
    let fitsInShift = false;
    for (const r of rules) {
      const shiftStart = localDateTimeToUtc(localParts.dateString, r.start_local_time, timezone);
      const shiftEnd = localDateTimeToUtc(localParts.dateString, r.end_local_time, timezone);
      let crossesBreak = false;
      if (r.break_start_local_time && r.break_end_local_time) {
        const bStart = localDateTimeToUtc(localParts.dateString, r.break_start_local_time, timezone);
        const bEnd = localDateTimeToUtc(localParts.dateString, r.break_end_local_time, timezone);
        if (occupiedStartsAtUtc < bEnd && occupiedEndsAtUtc > bStart) {
          crossesBreak = true;
        }
      }
      if (occupiedStartsAtUtc >= shiftStart && occupiedEndsAtUtc <= shiftEnd && !crossesBreak) {
        fitsInShift = true;
      }
    }
    if (!fitsInShift) {
      throw Object.assign(
        new Error(
          "El horario solicitado o la duraci\xF3n total del servicio excede la jornada laboral o cruza el horario de descanso del profesional."
        ),
        {
          status: 422,
          code: "OUTSIDE_WORKING_HOURS",
          availableSlots: computed.slots
        }
      );
    }
    throw Object.assign(
      new Error(
        "Conflicto de horario: el profesional o el consultorio ya se encuentran ocupados o bloqueados en ese intervalo."
      ),
      {
        status: 409,
        code: "SLOT_CONFLICT",
        availableSlots: computed.slots
      }
    );
  }
  return {
    timezone,
    locationId: computed.locationId,
    resourceId: computed.resourceId,
    resourceName: computed.resourceName,
    startsAtUtc,
    endsAtUtc,
    occupiedStartsAtUtc,
    occupiedEndsAtUtc,
    agreedPriceCents: computed.agreedPriceCents,
    localDateStr: localParts.dateString,
    availableAlternatives: computed.slots
  };
}
__name(validateSlotInSchedule, "validateSlotInSchedule");

// src/server/booking-service.ts
import crypto4 from "node:crypto";
function hashToken(raw2) {
  return crypto4.createHash("sha256").update(raw2).digest("hex");
}
__name(hashToken, "hashToken");
function hashPayload(payload) {
  return crypto4.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
__name(hashPayload, "hashPayload");
async function scheduleAppointmentNotifications(tx, params) {
  const { organizationId, appointmentId, appointmentVersion, startsAtUtc, nowUtc } = params;
  const confirmKey = `${appointmentId}:v${appointmentVersion}:booking_confirmation:email`;
  await tx`
    INSERT INTO public.notification_jobs (
      organization_id, appointment_id, appointment_version, channel, job_type,
      scheduled_for, status, idempotency_key
    )
    VALUES (
      ${organizationId}, ${appointmentId}, ${appointmentVersion}, 'email', 'booking_confirmation',
      ${nowUtc.toISOString()}::timestamptz, 'pending', ${confirmKey}
    )
    ON CONFLICT (idempotency_key) DO NOTHING
  `;
  const reminders = [
    { type: "reminder_24h", offsetMs: 24 * 60 * 60 * 1e3 },
    { type: "reminder_1h", offsetMs: 1 * 60 * 60 * 1e3 }
  ];
  for (const rem of reminders) {
    const scheduledFor = new Date(startsAtUtc.getTime() - rem.offsetMs);
    const key = `${appointmentId}:v${appointmentVersion}:${rem.type}:email`;
    const status = scheduledFor.getTime() <= nowUtc.getTime() ? "skipped_past" : "pending";
    await tx`
      INSERT INTO public.notification_jobs (
        organization_id, appointment_id, appointment_version, channel, job_type,
        scheduled_for, status, idempotency_key
      )
      VALUES (
        ${organizationId}, ${appointmentId}, ${appointmentVersion}, 'email', ${rem.type},
        ${scheduledFor.toISOString()}::timestamptz, ${status}, ${key}
      )
      ON CONFLICT (idempotency_key) DO NOTHING
    `;
  }
}
__name(scheduleAppointmentNotifications, "scheduleAppointmentNotifications");
async function getAppointmentById(tx, organizationId, appointmentId) {
  const rows = await tx`
    SELECT
      a.id,
      a.organization_id,
      a.folio,
      a.location_id,
      l.name AS location_name,
      l.timezone,
      a.professional_id,
      p.full_name AS professional_name,
      p.specialty AS professional_specialty,
      p.color_hex AS professional_color,
      a.service_id,
      s.name AS service_name,
      s.duration_minutes,
      a.resource_id,
      r.name AS resource_name,
      a.patient_id,
      pat.full_name AS patient_name,
      pat.phone_display AS patient_phone,
      pat.email AS patient_email,
      pc.full_name AS contact_name,
      pc.relationship AS contact_relationship,
      pc.phone_display AS contact_phone,
      a.starts_at,
      a.ends_at,
      a.attendance_status,
      a.financial_status,
      a.agreed_price_cents,
      a.currency,
      a.origin_channel,
      a.campaign_source,
      a.admin_notes,
      a.cancellation_reason,
      a.version,
      a.created_at,
      COALESCE((
        SELECT SUM(CASE
          WHEN fm.movement_type = 'payment' THEN fm.amount_cents
          WHEN fm.movement_type IN ('refund', 'reversal') THEN -fm.amount_cents
          ELSE 0
        END)
        FROM public.financial_movements fm
        WHERE fm.organization_id = a.organization_id AND fm.appointment_id = a.id
      ), 0) AS net_paid_cents,
      COALESCE((
        SELECT SUM(CASE
          WHEN fm.movement_type = 'charge' THEN fm.amount_cents
          WHEN fm.movement_type IN ('discount', 'adjustment') THEN -fm.amount_cents
          ELSE 0
        END)
        FROM public.financial_movements fm
        WHERE fm.organization_id = a.organization_id AND fm.appointment_id = a.id
      ), 0) AS net_charged_cents
    FROM public.appointments a
    JOIN public.locations l ON l.id = a.location_id AND l.organization_id = a.organization_id
    JOIN public.professionals p ON p.id = a.professional_id AND p.organization_id = a.organization_id
    JOIN public.services s ON s.id = a.service_id AND s.organization_id = a.organization_id
    JOIN public.resources r ON r.id = a.resource_id AND r.organization_id = a.organization_id
    JOIN public.patients pat ON pat.id = a.patient_id AND pat.organization_id = a.organization_id
    LEFT JOIN public.patient_contacts pc ON pc.id = a.contact_id AND pc.organization_id = a.organization_id
    WHERE a.id = ${appointmentId}
      AND a.organization_id = ${organizationId}
    LIMIT 1
  `;
  if (rows.length === 0) {
    throw Object.assign(new Error("Cita no encontrada o acceso no autorizado."), { status: 404 });
  }
  const row = rows[0];
  const startsParts = getLocalParts(new Date(row.starts_at), row.timezone);
  const endsParts = getLocalParts(new Date(row.ends_at), row.timezone);
  const netPaid = Math.max(0, Number(row.net_paid_cents));
  const netCharged = Math.max(0, Number(row.net_charged_cents));
  const balanceCents = Math.max(0, netCharged - netPaid);
  return {
    id: row.id,
    organization_id: row.organization_id,
    folio: row.folio,
    location_id: row.location_id,
    location_name: row.location_name,
    professional_id: row.professional_id,
    professional_name: row.professional_name,
    professional_specialty: row.professional_specialty,
    professional_color: row.professional_color,
    service_id: row.service_id,
    service_name: row.service_name,
    duration_minutes: Number(row.duration_minutes),
    resource_id: row.resource_id,
    resource_name: row.resource_name,
    patient_id: row.patient_id,
    patient_name: row.patient_name,
    patient_phone: row.patient_phone,
    patient_email: row.patient_email,
    contact_name: row.contact_name,
    contact_relationship: row.contact_relationship,
    contact_phone: row.contact_phone,
    starts_at: new Date(row.starts_at).toISOString(),
    ends_at: new Date(row.ends_at).toISOString(),
    local_time: startsParts.timeString,
    local_end_time: endsParts.timeString,
    local_date: startsParts.dateString,
    attendance_status: row.attendance_status,
    financial_status: row.financial_status,
    agreed_price_cents: Number(row.agreed_price_cents),
    net_paid_cents: netPaid,
    balance_cents: balanceCents,
    currency: "MXN",
    origin_channel: row.origin_channel,
    campaign_source: row.campaign_source,
    admin_notes: row.admin_notes,
    cancellation_reason: row.cancellation_reason,
    version: Number(row.version),
    created_at: new Date(row.created_at).toISOString()
  };
}
__name(getAppointmentById, "getAppointmentById");
async function createBookingAtomic(tx, input) {
  const scope = "create_booking";
  const reqHash = hashPayload({
    professionalId: input.professionalId,
    serviceId: input.serviceId,
    startsAtIso: input.startsAtIso,
    patientName: input.patientName.trim(),
    patientPhone: normalizeMexicanPhone(input.patientPhone)
  });
  const existingIdem = await tx`
    SELECT request_hash, response_body
    FROM public.idempotency_keys
    WHERE organization_id = ${input.organizationId}
      AND scope = ${scope}
      AND idempotency_key = ${input.idempotencyKey}
      AND expires_at > now()
    LIMIT 1
  `;
  if (existingIdem.length > 0) {
    const saved = existingIdem[0].response_body;
    return {
      ...saved,
      idempotentReplay: true
    };
  }
  await tx`
    SELECT pg_advisory_xact_lock(hashtext(${input.organizationId + ":" + input.professionalId}))
  `;
  const slotValidation = await validateSlotInSchedule(tx, {
    organizationId: input.organizationId,
    professionalId: input.professionalId,
    serviceId: input.serviceId,
    startsAtIso: input.startsAtIso,
    resourceIdOverride: input.resourceIdOverride
  });
  await tx`
    SELECT pg_advisory_xact_lock(hashtext(${input.organizationId + ":" + slotValidation.resourceId}))
  `;
  const phoneNormalized = normalizeMexicanPhone(input.patientPhone);
  const existingPhoneMatches = await tx`
    SELECT id, full_name
    FROM public.patients
    WHERE organization_id = ${input.organizationId}
      AND phone_normalized = ${phoneNormalized}
  `;
  let patientId;
  const exactMatch = existingPhoneMatches.find(
    (p) => p.full_name.trim().toLowerCase() === input.patientName.trim().toLowerCase()
  );
  if (exactMatch) {
    patientId = exactMatch.id;
  } else {
    const [createdPat] = await tx`
      INSERT INTO public.patients (organization_id, full_name, phone_normalized, phone_display, email)
      VALUES (
        ${input.organizationId},
        ${input.patientName.trim()},
        ${phoneNormalized},
        ${input.patientPhone.trim()},
        ${input.patientEmail?.trim() || null}
      )
      RETURNING id
    `;
    patientId = createdPat.id;
  }
  let contactId = null;
  if (input.contactName && input.contactName.trim().length > 0) {
    const [createdContact] = await tx`
      INSERT INTO public.patient_contacts (
        organization_id, patient_id, full_name, relationship, phone_display, email
      )
      VALUES (
        ${input.organizationId},
        ${patientId},
        ${input.contactName.trim()},
        ${input.contactRelationship?.trim() || "Familiar / Tutor"},
        ${input.contactPhone?.trim() || input.patientPhone.trim()},
        ${input.patientEmail?.trim() || null}
      )
      RETURNING id
    `;
    contactId = createdContact.id;
  }
  const randomSuffix = crypto4.randomInt(1e3, 9999);
  const dateCompact = slotValidation.localDateStr.replace(/-/g, "");
  const folio = `NUC-${dateCompact}-${randomSuffix}`;
  let appointmentId;
  try {
    const [insertedAppt] = await tx`
      INSERT INTO public.appointments (
        organization_id, folio, location_id, professional_id, service_id, resource_id,
        patient_id, contact_id, starts_at, ends_at, occupied_starts_at, occupied_ends_at,
        attendance_status, financial_status, agreed_price_cents, currency,
        origin_channel, campaign_source, admin_notes, version, created_by
      )
      VALUES (
        ${input.organizationId},
        ${folio},
        ${slotValidation.locationId},
        ${input.professionalId},
        ${input.serviceId},
        ${slotValidation.resourceId},
        ${patientId},
        ${contactId},
        ${slotValidation.startsAtUtc.toISOString()}::timestamptz,
        ${slotValidation.endsAtUtc.toISOString()}::timestamptz,
        ${slotValidation.occupiedStartsAtUtc.toISOString()}::timestamptz,
        ${slotValidation.occupiedEndsAtUtc.toISOString()}::timestamptz,
        'scheduled',
        'pending',
        ${slotValidation.agreedPriceCents},
        'MXN',
        ${input.originChannel},
        ${input.campaignSource || null},
        ${input.adminNotes || null},
        1,
        ${input.actorUserId}
      )
      RETURNING id
    `;
    appointmentId = insertedAppt.id;
    await tx`
      INSERT INTO public.resource_reservations (
        organization_id, professional_id, resource_id, appointment_id, kind, starts_at, ends_at, status
      )
      VALUES (
        ${input.organizationId},
        ${input.professionalId},
        ${slotValidation.resourceId},
        ${appointmentId},
        'appointment',
        ${slotValidation.occupiedStartsAtUtc.toISOString()}::timestamptz,
        ${slotValidation.occupiedEndsAtUtc.toISOString()}::timestamptz,
        'active'
      )
    `;
  } catch (err) {
    const pgErr = err;
    if (pgErr.code === "23P01" || pgErr.code === "23505") {
      throw Object.assign(
        new Error(
          "Conflicto de concurrencia: el horario o consultorio acaba de ser ocupado por otra operaci\xF3n."
        ),
        {
          status: 409,
          code: "CONCURRENT_BOOKING_CONFLICT"
        }
      );
    }
    throw err;
  }
  await tx`
    INSERT INTO public.appointment_events (
      organization_id, appointment_id, event_type, previous_state, new_state, reason, actor_user_id, actor_label
    )
    VALUES (
      ${input.organizationId},
      ${appointmentId},
      'created',
      '{}'::jsonb,
      ${tx.json({
    attendance_status: "scheduled",
    starts_at: slotValidation.startsAtUtc.toISOString(),
    ends_at: slotValidation.endsAtUtc.toISOString(),
    resource_id: slotValidation.resourceId,
    agreed_price_cents: slotValidation.agreedPriceCents
  })},
      ${"Reserva creada v\xEDa " + input.originChannel},
      ${input.actorUserId},
      ${input.actorLabel}
    )
  `;
  await tx`
    INSERT INTO public.financial_movements (
      organization_id, appointment_id, movement_type, amount_cents, currency,
      beneficiary_type, notes, recorded_by, recorded_by_label
    )
    VALUES (
      ${input.organizationId},
      ${appointmentId},
      'charge',
      ${slotValidation.agreedPriceCents},
      'MXN',
      'organization',
      'Cargo inicial por servicio reservado',
      ${input.actorUserId},
      ${input.actorLabel}
    )
  `;
  await tx`
    SELECT * FROM public.recalculate_appointment_financial_status(${input.organizationId}, ${appointmentId})
  `;
  await tx`
    INSERT INTO public.consents (
      organization_id, patient_id, appointment_id, purpose, policy_version, accepted
    )
    VALUES (
      ${input.organizationId},
      ${patientId},
      ${appointmentId},
      'operational_booking',
      'v1.0-2026-10',
      ${input.policyAccepted !== false}
    )
  `;
  const rawToken = `mgt_${crypto4.randomBytes(24).toString("base64url")}`;
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(slotValidation.endsAtUtc.getTime() + 7 * 24 * 60 * 60 * 1e3);
  await tx`
    INSERT INTO public.management_tokens (
      organization_id, appointment_id, token_hash, scopes, expires_at
    )
    VALUES (
      ${input.organizationId},
      ${appointmentId},
      ${tokenHash},
      ARRAY['read', 'confirm', 'reschedule', 'cancel'],
      ${expiresAt.toISOString()}::timestamptz
    )
  `;
  await scheduleAppointmentNotifications(tx, {
    organizationId: input.organizationId,
    appointmentId,
    appointmentVersion: 1,
    startsAtUtc: slotValidation.startsAtUtc,
    nowUtc: input.nowOverride || /* @__PURE__ */ new Date()
  });
  await tx`
    INSERT INTO public.audit_logs (
      organization_id, actor_user_id, actor_role, entity_type, entity_id, action, before_sanitized, after_sanitized
    )
    VALUES (
      ${input.organizationId},
      ${input.actorUserId},
      ${input.actorRole},
      'appointment',
      ${appointmentId},
      'appointment.created',
      '{}'::jsonb,
      ${tx.json({
    folio,
    professional_id: input.professionalId,
    service_id: input.serviceId,
    starts_at: slotValidation.startsAtUtc.toISOString(),
    origin_channel: input.originChannel
  })}
    )
  `;
  const appointment = await getAppointmentById(tx, input.organizationId, appointmentId);
  const result = {
    appointment,
    managementToken: rawToken,
    managementUrl: `/gestionar/${rawToken}`,
    duplicatePhoneCount: existingPhoneMatches.length,
    idempotentReplay: false
  };
  await tx`
    INSERT INTO public.idempotency_keys (
      organization_id, scope, idempotency_key, request_hash, response_status, response_body
    )
    VALUES (
      ${input.organizationId},
      ${scope},
      ${input.idempotencyKey},
      ${reqHash},
      201,
      ${tx.json(JSON.parse(JSON.stringify(result)))}
    )
  `;
  return result;
}
__name(createBookingAtomic, "createBookingAtomic");
async function rescheduleBookingAtomic(tx, params) {
  const currentRows = await tx`
    SELECT
      id, professional_id, service_id, resource_id, starts_at, ends_at,
      attendance_status, version
    FROM public.appointments
    WHERE id = ${params.appointmentId}
      AND organization_id = ${params.organizationId}
    FOR UPDATE
  `;
  if (currentRows.length === 0) {
    throw Object.assign(new Error("Cita no encontrada."), { status: 404 });
  }
  const current = currentRows[0];
  if (Number(current.version) !== Number(params.expectedVersion)) {
    throw Object.assign(
      new Error(
        `Conflicto de versi\xF3n: la cita fue modificada por otro operador (versi\xF3n actual ${current.version}, esperada ${params.expectedVersion}). Recargue la agenda.`
      ),
      { status: 409, code: "VERSION_CONFLICT" }
    );
  }
  if (["cancelled", "completed", "no_show"].includes(current.attendance_status)) {
    throw Object.assign(
      new Error(`No se puede reprogramar una cita en estado ${current.attendance_status}.`),
      { status: 422 }
    );
  }
  const slotValidation = await validateSlotInSchedule(tx, {
    organizationId: params.organizationId,
    professionalId: current.professional_id,
    serviceId: current.service_id,
    startsAtIso: params.newStartsAtIso,
    resourceIdOverride: params.newResourceIdOverride || current.resource_id,
    excludeAppointmentId: params.appointmentId
  });
  const nextVersion = Number(current.version) + 1;
  try {
    await tx`
      UPDATE public.appointments
      SET
        starts_at = ${slotValidation.startsAtUtc.toISOString()}::timestamptz,
        ends_at = ${slotValidation.endsAtUtc.toISOString()}::timestamptz,
        occupied_starts_at = ${slotValidation.occupiedStartsAtUtc.toISOString()}::timestamptz,
        occupied_ends_at = ${slotValidation.occupiedEndsAtUtc.toISOString()}::timestamptz,
        resource_id = ${slotValidation.resourceId},
        version = ${nextVersion},
        updated_at = now()
      WHERE id = ${params.appointmentId}
        AND organization_id = ${params.organizationId}
        AND version = ${params.expectedVersion}
    `;
    await tx`
      UPDATE public.resource_reservations
      SET
        starts_at = ${slotValidation.occupiedStartsAtUtc.toISOString()}::timestamptz,
        ends_at = ${slotValidation.occupiedEndsAtUtc.toISOString()}::timestamptz,
        resource_id = ${slotValidation.resourceId}
      WHERE appointment_id = ${params.appointmentId}
        AND organization_id = ${params.organizationId}
        AND status = 'active'
    `;
  } catch (err) {
    const pgErr = err;
    if (pgErr.code === "23P01") {
      throw Object.assign(
        new Error("El nuevo horario seleccionado ya se encuentra ocupado por otra cita o bloqueo."),
        { status: 409, code: "RESCHEDULE_SLOT_OCCUPIED" }
      );
    }
    throw err;
  }
  await tx`
    UPDATE public.notification_jobs
    SET status = 'cancelled_obsolete', updated_at = now()
    WHERE organization_id = ${params.organizationId}
      AND appointment_id = ${params.appointmentId}
      AND status = 'pending'
  `;
  await scheduleAppointmentNotifications(tx, {
    organizationId: params.organizationId,
    appointmentId: params.appointmentId,
    appointmentVersion: nextVersion,
    startsAtUtc: slotValidation.startsAtUtc,
    nowUtc: params.nowOverride || /* @__PURE__ */ new Date()
  });
  await tx`
    INSERT INTO public.appointment_events (
      organization_id, appointment_id, event_type, previous_state, new_state, reason, actor_user_id, actor_label
    )
    VALUES (
      ${params.organizationId},
      ${params.appointmentId},
      'rescheduled',
      ${tx.json({
    starts_at: new Date(current.starts_at).toISOString(),
    ends_at: new Date(current.ends_at).toISOString(),
    resource_id: current.resource_id,
    version: Number(current.version)
  })},
      ${tx.json({
    starts_at: slotValidation.startsAtUtc.toISOString(),
    ends_at: slotValidation.endsAtUtc.toISOString(),
    resource_id: slotValidation.resourceId,
    version: nextVersion
  })},
      ${params.reason || "Reprogramaci\xF3n solicitada"},
      ${params.actorUserId},
      ${params.actorLabel}
    )
  `;
  await tx`
    INSERT INTO public.audit_logs (
      organization_id, actor_user_id, actor_role, entity_type, entity_id, action, before_sanitized, after_sanitized
    )
    VALUES (
      ${params.organizationId},
      ${params.actorUserId},
      ${params.actorRole},
      'appointment',
      ${params.appointmentId},
      'appointment.rescheduled',
      ${tx.json({ starts_at: new Date(current.starts_at).toISOString(), version: Number(current.version) })},
      ${tx.json({ starts_at: slotValidation.startsAtUtc.toISOString(), version: nextVersion })}
    )
  `;
  return getAppointmentById(tx, params.organizationId, params.appointmentId);
}
__name(rescheduleBookingAtomic, "rescheduleBookingAtomic");
async function cancelBookingAtomic(tx, params) {
  const rows = await tx`
    SELECT id, attendance_status, starts_at, ends_at, version
    FROM public.appointments
    WHERE id = ${params.appointmentId}
      AND organization_id = ${params.organizationId}
    FOR UPDATE
  `;
  if (rows.length === 0) {
    throw Object.assign(new Error("Cita no encontrada."), { status: 404 });
  }
  const current = rows[0];
  if (params.expectedVersion !== void 0 && Number(current.version) !== Number(params.expectedVersion)) {
    throw Object.assign(
      new Error("Conflicto de versi\xF3n: la cita fue modificada por otro operador."),
      { status: 409, code: "VERSION_CONFLICT" }
    );
  }
  if (current.attendance_status === "cancelled") {
    return getAppointmentById(tx, params.organizationId, params.appointmentId);
  }
  const nextVersion = Number(current.version) + 1;
  await tx`
    UPDATE public.appointments
    SET
      attendance_status = 'cancelled',
      cancellation_reason = ${params.reason.trim() || "Cancelada por solicitud"},
      cancelled_at = now(),
      cancelled_by = ${params.actorUserId},
      version = ${nextVersion},
      updated_at = now()
    WHERE id = ${params.appointmentId}
      AND organization_id = ${params.organizationId}
  `;
  await tx`
    UPDATE public.resource_reservations
    SET status = 'released'
    WHERE appointment_id = ${params.appointmentId}
      AND organization_id = ${params.organizationId}
      AND status = 'active'
  `;
  await tx`
    UPDATE public.notification_jobs
    SET status = 'cancelled_obsolete', updated_at = now()
    WHERE organization_id = ${params.organizationId}
      AND appointment_id = ${params.appointmentId}
      AND status = 'pending'
  `;
  await tx`
    INSERT INTO public.appointment_events (
      organization_id, appointment_id, event_type, previous_state, new_state, reason, actor_user_id, actor_label
    )
    VALUES (
      ${params.organizationId},
      ${params.appointmentId},
      'cancelled',
      ${tx.json({ attendance_status: current.attendance_status, version: Number(current.version) })},
      ${tx.json({ attendance_status: "cancelled", version: nextVersion })},
      ${params.reason.trim()},
      ${params.actorUserId},
      ${params.actorLabel}
    )
  `;
  await tx`
    INSERT INTO public.audit_logs (
      organization_id, actor_user_id, actor_role, entity_type, entity_id, action, before_sanitized, after_sanitized
    )
    VALUES (
      ${params.organizationId},
      ${params.actorUserId},
      ${params.actorRole},
      'appointment',
      ${params.appointmentId},
      'appointment.cancelled',
      ${tx.json({ attendance_status: current.attendance_status })},
      ${tx.json({ attendance_status: "cancelled", reason: params.reason.trim() })}
    )
  `;
  return getAppointmentById(tx, params.organizationId, params.appointmentId);
}
__name(cancelBookingAtomic, "cancelBookingAtomic");
async function updateAttendanceStatusAtomic(tx, params) {
  if (params.newStatus === "cancelled") {
    return cancelBookingAtomic(tx, {
      organizationId: params.organizationId,
      appointmentId: params.appointmentId,
      reason: params.reason || "Cancelada desde panel",
      expectedVersion: params.expectedVersion,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      actorLabel: params.actorLabel
    });
  }
  const rows = await tx`
    SELECT id, attendance_status, financial_status, starts_at, version
    FROM public.appointments
    WHERE id = ${params.appointmentId}
      AND organization_id = ${params.organizationId}
    FOR UPDATE
  `;
  if (rows.length === 0) {
    throw Object.assign(new Error("Cita no encontrada."), { status: 404 });
  }
  const current = rows[0];
  if (params.expectedVersion !== void 0 && Number(current.version) !== Number(params.expectedVersion)) {
    throw Object.assign(
      new Error(
        `Conflicto de versi\xF3n: la cita fue modificada por otro operador (versi\xF3n actual ${current.version}, esperada ${params.expectedVersion}).`
      ),
      { status: 409, code: "VERSION_CONFLICT" }
    );
  }
  const nowUtc = params.nowOverride || /* @__PURE__ */ new Date();
  const startsAtUtc = new Date(current.starts_at);
  if (params.newStatus === "no_show" && startsAtUtc.getTime() > nowUtc.getTime()) {
    throw Object.assign(
      new Error(
        'No se puede registrar inasistencia ("No asisti\xF3") en una cita cuya hora de inicio a\xFAn es futura.'
      ),
      { status: 422, code: "FUTURE_NO_SHOW_FORBIDDEN" }
    );
  }
  const nextVersion = Number(current.version) + 1;
  await tx`
    UPDATE public.appointments
    SET
      attendance_status = ${params.newStatus},
      version = ${nextVersion},
      updated_at = now()
    WHERE id = ${params.appointmentId}
      AND organization_id = ${params.organizationId}
  `;
  await tx`
    INSERT INTO public.appointment_events (
      organization_id, appointment_id, event_type, previous_state, new_state, reason, actor_user_id, actor_label
    )
    VALUES (
      ${params.organizationId},
      ${params.appointmentId},
      'status_changed',
      ${tx.json({ attendance_status: current.attendance_status, version: Number(current.version) })},
      ${tx.json({ attendance_status: params.newStatus, version: nextVersion })},
      ${params.reason || `Cambio de estado a ${params.newStatus}`},
      ${params.actorUserId},
      ${params.actorLabel}
    )
  `;
  await tx`
    INSERT INTO public.audit_logs (
      organization_id, actor_user_id, actor_role, entity_type, entity_id, action, before_sanitized, after_sanitized
    )
    VALUES (
      ${params.organizationId},
      ${params.actorUserId},
      ${params.actorRole},
      'appointment',
      ${params.appointmentId},
      'appointment.status_changed',
      ${tx.json({ attendance_status: current.attendance_status })},
      ${tx.json({ attendance_status: params.newStatus })}
    )
  `;
  return getAppointmentById(tx, params.organizationId, params.appointmentId);
}
__name(updateAttendanceStatusAtomic, "updateAttendanceStatusAtomic");
async function recordPaymentAtomic(tx, params) {
  if (params.amountCents <= 0 || !Number.isInteger(params.amountCents)) {
    throw Object.assign(new Error("El importe del pago debe ser un entero positivo en centavos."), {
      status: 422
    });
  }
  const scope = `payment:${params.appointmentId}`;
  const reqHash = hashPayload({
    appointmentId: params.appointmentId,
    amountCents: params.amountCents,
    paymentMethod: params.paymentMethod
  });
  const existingIdem = await tx`
    SELECT response_body
    FROM public.idempotency_keys
    WHERE organization_id = ${params.organizationId}
      AND scope = ${scope}
      AND idempotency_key = ${params.idempotencyKey}
      AND expires_at > now()
    LIMIT 1
  `;
  if (existingIdem.length > 0) {
    const saved = existingIdem[0].response_body;
    return { ...saved, idempotentReplay: true };
  }
  const [mov] = await tx`
    INSERT INTO public.financial_movements (
      organization_id, appointment_id, movement_type, amount_cents, currency,
      payment_method, beneficiary_type, reference_code, notes, recorded_by, recorded_by_label
    )
    VALUES (
      ${params.organizationId},
      ${params.appointmentId},
      'payment',
      ${params.amountCents},
      'MXN',
      ${params.paymentMethod},
      ${params.beneficiaryType || "organization"},
      ${params.referenceCode || null},
      ${params.notes || "Pago registrado en recepci\xF3n"},
      ${params.actorUserId},
      ${params.actorLabel}
    )
    RETURNING id
  `;
  await tx`
    SELECT * FROM public.recalculate_appointment_financial_status(${params.organizationId}, ${params.appointmentId})
  `;
  await tx`
    INSERT INTO public.appointment_events (
      organization_id, appointment_id, event_type, previous_state, new_state, reason, actor_user_id, actor_label
    )
    VALUES (
      ${params.organizationId},
      ${params.appointmentId},
      'payment_recorded',
      '{}'::jsonb,
      ${tx.json({ movement_id: mov.id, amount_cents: params.amountCents, method: params.paymentMethod })},
      ${params.notes || "Cobro manual registrado"},
      ${params.actorUserId},
      ${params.actorLabel}
    )
  `;
  const appointment = await getAppointmentById(tx, params.organizationId, params.appointmentId);
  const responsePayload = {
    appointment,
    movementId: mov.id,
    idempotentReplay: false
  };
  await tx`
    INSERT INTO public.idempotency_keys (
      organization_id, scope, idempotency_key, request_hash, response_status, response_body
    )
    VALUES (
      ${params.organizationId},
      ${scope},
      ${params.idempotencyKey},
      ${reqHash},
      201,
      ${tx.json(JSON.parse(JSON.stringify(responsePayload)))}
    )
  `;
  return responsePayload;
}
__name(recordPaymentAtomic, "recordPaymentAtomic");
async function reverseOrRefundMovementAtomic(tx, params) {
  const origRows = await tx`
    SELECT id, appointment_id, movement_type, amount_cents, payment_method, beneficiary_type
    FROM public.financial_movements
    WHERE id = ${params.movementId}
      AND organization_id = ${params.organizationId}
    LIMIT 1
  `;
  if (origRows.length === 0) {
    throw Object.assign(new Error("Movimiento financiero original no encontrado."), { status: 404 });
  }
  const orig = origRows[0];
  if (orig.movement_type !== "payment") {
    throw Object.assign(new Error("Solo se pueden revertir o reembolsar movimientos de tipo pago."), {
      status: 422
    });
  }
  const targetAmount = params.amountCents ?? Number(orig.amount_cents);
  if (targetAmount <= 0 || targetAmount > Number(orig.amount_cents)) {
    throw Object.assign(
      new Error("El monto de devoluci\xF3n/reverso no puede exceder el pago original."),
      { status: 422 }
    );
  }
  const [rev] = await tx`
    INSERT INTO public.financial_movements (
      organization_id, appointment_id, movement_type, amount_cents, currency,
      payment_method, beneficiary_type, related_movement_id, notes, recorded_by, recorded_by_label
    )
    VALUES (
      ${params.organizationId},
      ${orig.appointment_id},
      ${params.type},
      ${targetAmount},
      'MXN',
      ${orig.payment_method},
      ${orig.beneficiary_type},
      ${orig.id},
      ${params.reason.trim()},
      ${params.actorUserId},
      ${params.actorLabel}
    )
    RETURNING id
  `;
  await tx`
    SELECT * FROM public.recalculate_appointment_financial_status(${params.organizationId}, ${orig.appointment_id})
  `;
  await tx`
    INSERT INTO public.appointment_events (
      organization_id, appointment_id, event_type, previous_state, new_state, reason, actor_user_id, actor_label
    )
    VALUES (
      ${params.organizationId},
      ${orig.appointment_id},
      'payment_reversed',
      ${tx.json({ original_movement_id: orig.id })},
      ${tx.json({ reversal_movement_id: rev.id, type: params.type, amount_cents: targetAmount })},
      ${params.reason.trim()},
      ${params.actorUserId},
      ${params.actorLabel}
    )
  `;
  const appointment = await getAppointmentById(tx, params.organizationId, orig.appointment_id);
  return { appointment, reversalMovementId: rev.id };
}
__name(reverseOrRefundMovementAtomic, "reverseOrRefundMovementAtomic");
async function createAvailabilityBlockAtomic(tx, params) {
  await tx`
    SELECT pg_advisory_xact_lock(hashtext(${params.organizationId + ":" + params.professionalId}))
  `;
  const profRows = await tx`
    SELECT default_location_id, default_resource_id
    FROM public.professionals
    WHERE id = ${params.professionalId}
      AND organization_id = ${params.organizationId}
    LIMIT 1
  `;
  if (profRows.length === 0) {
    throw Object.assign(new Error("Profesional no encontrado."), { status: 404 });
  }
  const locationId = profRows[0].default_location_id;
  const resourceId = params.resourceId ?? profRows[0].default_resource_id;
  try {
    const [ex] = await tx`
      INSERT INTO public.availability_exceptions (
        organization_id, professional_id, location_id, resource_id, kind,
        starts_at, ends_at, reason, created_by
      )
      VALUES (
        ${params.organizationId},
        ${params.professionalId},
        ${locationId},
        ${resourceId},
        ${params.kind},
        ${params.startsAtIso}::timestamptz,
        ${params.endsAtIso}::timestamptz,
        ${params.reason.trim()},
        ${params.actorUserId}
      )
      RETURNING *
    `;
    await tx`
      INSERT INTO public.resource_reservations (
        organization_id, professional_id, resource_id, exception_id, kind,
        starts_at, ends_at, status
      )
      VALUES (
        ${params.organizationId},
        ${params.professionalId},
        ${resourceId},
        ${ex.id},
        'block',
        ${params.startsAtIso}::timestamptz,
        ${params.endsAtIso}::timestamptz,
        'active'
      )
    `;
    return ex;
  } catch (err) {
    const pgErr = err;
    if (pgErr.code === "23P01") {
      throw Object.assign(
        new Error(
          "Conflicto al bloquear horario: ya existe una cita activa o bloqueo en ese intervalo para el profesional o consultorio."
        ),
        { status: 409, code: "BLOCK_CONFLICT" }
      );
    }
    throw err;
  }
}
__name(createAvailabilityBlockAtomic, "createAvailabilityBlockAtomic");

// src/server/evolution.ts
function buildDemoQrSvg(instanceName) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
    <rect width="240" height="240" rx="16" fill="#FFFFFF" stroke="#0F766E" stroke-width="4"/>
    <rect x="24" y="24" width="56" height="56" rx="8" fill="#0B2138"/>
    <rect x="34" y="34" width="36" height="36" rx="4" fill="#FFFFFF"/>
    <rect x="42" y="42" width="20" height="20" rx="2" fill="#14B8A6"/>
    <rect x="160" y="24" width="56" height="56" rx="8" fill="#0B2138"/>
    <rect x="170" y="34" width="36" height="36" rx="4" fill="#FFFFFF"/>
    <rect x="178" y="42" width="20" height="20" rx="2" fill="#14B8A6"/>
    <rect x="24" y="160" width="56" height="56" rx="8" fill="#0B2138"/>
    <rect x="34" y="170" width="36" height="36" rx="4" fill="#FFFFFF"/>
    <rect x="42" y="178" width="20" height="20" rx="2" fill="#14B8A6"/>
    <rect x="96" y="32" width="12" height="12" fill="#0B2138"/>
    <rect x="116" y="32" width="20" height="12" fill="#0B2138"/>
    <rect x="96" y="52" width="24" height="12" fill="#14B8A6"/>
    <rect x="92" y="92" width="56" height="56" rx="10" fill="#0B2138"/>
    <text x="120" y="124" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="bold">WA QR</text>
    <rect x="32" y="100" width="44" height="12" fill="#0B2138"/>
    <rect x="164" y="104" width="44" height="12" fill="#0B2138"/>
    <rect x="100" y="164" width="48" height="12" fill="#0B2138"/>
    <rect x="160" y="160" width="24" height="24" fill="#14B8A6"/>
    <rect x="192" y="184" width="24" height="24" fill="#0B2138"/>
    <text x="120" y="228" text-anchor="middle" fill="#475569" font-family="monospace" font-size="9">${instanceName}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
__name(buildDemoQrSvg, "buildDemoQrSvg");
async function connectEvolutionInstance(params) {
  const baseUrl = params.baseUrl.replace(/\/+$/, "");
  const apiKey = params.apiKey || (typeof process !== "undefined" ? process.env.EVOLUTION_API_KEY : void 0) || "";
  if (apiKey && baseUrl.startsWith("http")) {
    try {
      const connectRes = await fetch(
        `${baseUrl}/instance/connect/${encodeURIComponent(params.instanceName)}`,
        {
          method: "GET",
          headers: {
            apikey: apiKey,
            "Content-Type": "application/json"
          },
          signal: AbortSignal.timeout(5e3)
        }
      );
      if (connectRes.ok) {
        const data = await connectRes.json();
        if (data.instance?.state === "open") {
          return {
            instanceName: params.instanceName,
            status: "connected",
            qrBase64: null,
            pairingCode: null,
            simulated: false,
            message: `Instancia ${params.instanceName} conectada en vivo con Evolution API (${baseUrl}).`
          };
        }
        if (data.base64) {
          return {
            instanceName: params.instanceName,
            status: "connecting",
            qrBase64: data.base64,
            pairingCode: data.pairingCode || null,
            simulated: false,
            message: `Escanea el c\xF3digo QR desde el WhatsApp personal de la especialista (${baseUrl}).`
          };
        }
      }
      const createRes = await fetch(`${baseUrl}/instance/create`, {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          instanceName: params.instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        }),
        signal: AbortSignal.timeout(5e3)
      });
      if (createRes.ok) {
        const created = await createRes.json();
        if (created.qrcode?.base64) {
          return {
            instanceName: params.instanceName,
            status: "connecting",
            qrBase64: created.qrcode.base64,
            pairingCode: created.qrcode.pairingCode || null,
            simulated: false,
            message: `Instancia ${params.instanceName} creada en Evolution API. Escanea el QR para vincular.`
          };
        }
      }
    } catch {
    }
  }
  return {
    instanceName: params.instanceName,
    status: "connecting",
    qrBase64: buildDemoQrSvg(params.instanceName),
    pairingCode: "DRAG-2026",
    simulated: true,
    message: `Modo Demo Interactivo (${baseUrl}): al encender el contenedor Docker de Evolution API y configurar su API Key, aqu\xED se mostrar\xE1 el QR real de WhatsApp Baileys.`
  };
}
__name(connectEvolutionInstance, "connectEvolutionInstance");
async function sendEvolutionWhatsAppMessage(params) {
  const baseUrl = params.baseUrl.replace(/\/+$/, "");
  const apiKey = params.apiKey || (typeof process !== "undefined" ? process.env.EVOLUTION_API_KEY : void 0) || "";
  const cleanNumber = params.phoneNormalized.replace(/\D/g, "");
  const formattedNumber = cleanNumber.length === 10 ? `521${cleanNumber}` : cleanNumber;
  if (apiKey && baseUrl.startsWith("http")) {
    try {
      const res = await fetch(
        `${baseUrl}/message/sendText/${encodeURIComponent(params.instanceName)}`,
        {
          method: "POST",
          headers: {
            apikey: apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            number: formattedNumber,
            text: params.text,
            delay: 1500
          }),
          signal: AbortSignal.timeout(6e3)
        }
      );
      if (res.ok) {
        return {
          sent: true,
          simulated: false,
          providerResponse: `Enviado en vivo desde instancia ${params.instanceName} (${baseUrl}) al +${formattedNumber}`
        };
      }
    } catch {
    }
  }
  return {
    sent: true,
    simulated: true,
    providerResponse: `Mensaje procesado para instancia ${params.instanceName} (+${formattedNumber}) en cola de servidor.`
  };
}
__name(sendEvolutionWhatsAppMessage, "sendEvolutionWhatsAppMessage");
function renderWhatsAppTemplate(template, vars) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
  }
  return out;
}
__name(renderWhatsAppTemplate, "renderWhatsAppTemplate");

// src/server/app.ts
var app = new Hono3();
app.use("/api/*", cors());
app.onError((err, c) => {
  const e = err;
  const status = e.status || 500;
  return c.json(
    {
      error: e.message || "Error interno del servidor",
      code: e.code || "SERVER_ERROR",
      ...e.availableSlots ? { availableSlots: e.availableSlots } : {}
    },
    status
  );
});
app.get("/api/v1/health", async (c) => {
  const sql = getSql(c.env);
  const [res] = await sql`SELECT now() AS server_time`;
  return c.json({
    status: "ok",
    service: "dr-agenda-nucleos-api",
    serverTime: res.server_time
  });
});
app.post("/api/v1/auth/login", async (c) => {
  const body = await c.req.json();
  if (!body.email || !body.password) {
    return c.json({ error: "Ingrese correo electr\xF3nico y contrase\xF1a." }, 422);
  }
  const authResult = await authenticateWithPassword(body.email, body.password, c.env);
  if (!authResult) {
    return c.json({ error: "Credenciales inv\xE1lidas o cuenta inactiva." }, 401);
  }
  return c.json({
    token: authResult.token,
    user: authResult.user
  });
});
app.post("/api/v1/auth/logout", async (c) => {
  return c.json({ ok: true });
});
app.get("/api/v1/auth/demo-accounts", async (c) => {
  return c.json({
    accounts: [
      {
        label: "Laura \xB7 Asistente (Control General de Citas)",
        email: "laura@nucleodemo.mx",
        role: "Asistente",
        description: "Controla las agendas de todas las especialistas, registra llegadas/cobros y gestiona recordatorios."
      },
      {
        label: "Direcci\xF3n \xB7 Administrador del N\xFAcleo",
        email: "admin@nucleodemo.mx",
        role: "Administrador",
        description: "Vista consolidada, configuraci\xF3n de Evolution API (WhatsApp), Doctoralia, horarios y reversos."
      },
      {
        label: "Ginec\xF3loga \xB7 Ginecolog\xEDa y Obstetricia",
        email: "sofia@nucleodemo.mx",
        role: "Especialista",
        description: "Agenda individual, expediente ginecol\xF3gico privado y WhatsApp propio (consultorio-ginecologa)."
      },
      {
        label: "Internista \xB7 Medicina Interna",
        email: "pablo@nucleodemo.mx",
        role: "Especialista",
        description: "Agenda individual, expediente cl\xEDnico de medicina interna y WhatsApp propio (consultorio-internista)."
      },
      {
        label: "Nutri\xF3loga \xB7 Nutrici\xF3n Cl\xEDnica",
        email: "elena@nucleodemo.mx",
        role: "Especialista",
        description: "Agenda individual, expediente antropom\xE9trico/nutricional y WhatsApp propio (consultorio-nutriologa)."
      },
      {
        label: "Psic\xF3loga \xB7 Psicolog\xEDa Cl\xEDnica",
        email: "psicologa@nucleodemo.mx",
        role: "Especialista",
        description: "Agenda individual, notas psicoterap\xE9uticas confidenciales y WhatsApp propio (consultorio-psicologa)."
      }
    ]
  });
});
app.use("/api/v1/*", async (c, next) => {
  const path = c.req.path;
  if (path.startsWith("/api/v1/health") || path === "/api/v1/auth/login" || path === "/api/v1/auth/logout" || path === "/api/v1/auth/demo-accounts" || path.startsWith("/api/v1/public/") || path.startsWith("/api/v1/booking-access/") || path.startsWith("/api/v1/bookings/") || path.startsWith("/api/v1/webhooks/")) {
    return next();
  }
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Sesi\xF3n no autenticada. Inicie sesi\xF3n nuevamente." }, 401);
  }
  const token = authHeader.slice("Bearer ".length).trim();
  const sessionUser = await resolveActiveSessionUser(token, c.env);
  if (!sessionUser) {
    return c.json(
      { error: "Sesi\xF3n expirada o usuario revocado. Inicie sesi\xF3n nuevamente." },
      401
    );
  }
  c.set("user", sessionUser);
  return next();
});
app.get("/api/v1/auth/me", async (c) => {
  const user = c.get("user");
  return c.json({ user });
});
function assertCanAccessProfessional(user, targetProfessionalId) {
  if (user.role === "professional" && user.professionalId !== targetProfessionalId) {
    throw Object.assign(
      new Error("Acceso denegado: un profesional no puede consultar ni modificar la agenda de otro profesional."),
      { status: 403, code: "FORBIDDEN_PROFESSIONAL_SCOPE" }
    );
  }
}
__name(assertCanAccessProfessional, "assertCanAccessProfessional");
app.get("/api/v1/public/:slug/professionals", async (c) => {
  const orgSlug = c.req.param("slug");
  const sql = getSql(c.env);
  const orgs = await sql`
    SELECT id, slug, name, currency, default_timezone
    FROM public.organizations
    WHERE slug = ${orgSlug} AND status = 'active'
    LIMIT 1
  `;
  if (orgs.length === 0) {
    return c.json({ error: "N\xFAcleo m\xE9dico no encontrado." }, 404);
  }
  const org = orgs[0];
  const locations = await sql`
    SELECT id, slug, name, address, timezone, phone
    FROM public.locations
    WHERE organization_id = ${org.id} AND is_active = true
    ORDER BY created_at ASC
  `;
  const professionals = await sql`
    SELECT
      p.id,
      p.slug,
      p.full_name,
      p.specialty,
      p.license_number,
      p.color_hex,
      p.bio,
      p.default_location_id,
      l.name AS location_name,
      l.address AS location_address,
      l.timezone
    FROM public.professionals p
    JOIN public.locations l ON l.id = p.default_location_id AND l.organization_id = p.organization_id
    WHERE p.organization_id = ${org.id}
      AND p.is_public = true
      AND p.is_active = true
    ORDER BY p.created_at ASC
  `;
  const services = await sql`
    SELECT
      id,
      professional_id,
      name,
      description,
      duration_minutes,
      CASE WHEN publish_price THEN price_cents ELSE NULL END AS price_cents,
      currency,
      publish_price
    FROM public.services
    WHERE organization_id = ${org.id}
      AND is_public = true
      AND is_active = true
    ORDER BY price_cents ASC
  `;
  return c.json({
    organization: org,
    locations,
    professionals,
    services
  });
});
app.get("/api/v1/public/:slug/availability", async (c) => {
  const orgSlug = c.req.param("slug");
  const professionalId = c.req.query("professional_id");
  const serviceId = c.req.query("service_id");
  const dateStr = c.req.query("date");
  if (!professionalId || !serviceId || !dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return c.json(
      { error: "Par\xE1metros requeridos: professional_id, service_id y date (YYYY-MM-DD)." },
      422
    );
  }
  const sql = getSql(c.env);
  const orgs = await sql`
    SELECT id FROM public.organizations WHERE slug = ${orgSlug} AND status = 'active' LIMIT 1
  `;
  if (orgs.length === 0) {
    return c.json({ error: "N\xFAcleo no encontrado." }, 404);
  }
  const result = await computeAvailableSlots(sql, {
    organizationId: orgs[0].id,
    professionalId,
    serviceId,
    dateStr
  });
  return c.json({
    date: dateStr,
    timezone: result.timezone,
    durationMinutes: result.durationMinutes,
    slots: result.slots.map((s) => ({
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      localTimeLabel: s.localTimeLabel,
      localEndTimeLabel: s.localEndTimeLabel
    }))
  });
});
app.post("/api/v1/public/:slug/bookings", async (c) => {
  const orgSlug = c.req.param("slug");
  const body = await c.req.json();
  const headerIdem = c.req.header("Idempotency-Key");
  const idempotencyKey = headerIdem || body.idempotencyKey;
  if (!body.professionalId || !body.serviceId || !body.startsAt || !body.patientName?.trim() || !body.patientPhone?.trim() || !idempotencyKey) {
    return c.json(
      {
        error: "Datos incompletos: profesional, servicio, horario, nombre, tel\xE9fono y clave de idempotencia son obligatorios."
      },
      422
    );
  }
  if (body.policyAccepted === false) {
    return c.json({ error: "Debe aceptar el aviso de privacidad y pol\xEDticas de reserva." }, 422);
  }
  const sql = getSql(c.env);
  const orgs = await sql`
    SELECT id, name FROM public.organizations WHERE slug = ${orgSlug} AND status = 'active' LIMIT 1
  `;
  if (orgs.length === 0) {
    return c.json({ error: "N\xFAcleo m\xE9dico no encontrado." }, 404);
  }
  const created = await withServiceTransaction(
    async (tx) => createBookingAtomic(tx, {
      organizationId: orgs[0].id,
      professionalId: body.professionalId,
      serviceId: body.serviceId,
      startsAtIso: body.startsAt,
      patientName: body.patientName,
      patientPhone: body.patientPhone,
      patientEmail: body.patientEmail,
      contactName: body.contactName,
      contactRelationship: body.contactRelationship,
      contactPhone: body.contactPhone,
      originChannel: "public_link",
      campaignSource: body.campaignSource || null,
      policyAccepted: true,
      idempotencyKey,
      actorUserId: null,
      actorRole: "patient",
      actorLabel: "Paciente (Reserva P\xFAblica)"
    }),
    c.env
  );
  return c.json(
    {
      booking: {
        id: created.appointment.id,
        folio: created.appointment.folio,
        professionalName: created.appointment.professional_name,
        specialty: created.appointment.professional_specialty,
        serviceName: created.appointment.service_name,
        locationName: created.appointment.location_name,
        startsAt: created.appointment.starts_at,
        endsAt: created.appointment.ends_at,
        localDate: created.appointment.local_date,
        localTime: created.appointment.local_time,
        localEndTime: created.appointment.local_end_time,
        agreedPriceCents: created.appointment.agreed_price_cents,
        currency: created.appointment.currency,
        attendanceStatus: created.appointment.attendance_status,
        version: created.appointment.version
      },
      managementToken: created.managementToken,
      managementUrl: created.managementUrl,
      idempotentReplay: created.idempotentReplay
    },
    created.idempotentReplay ? 200 : 201
  );
});
async function verifyManagementTokenInDb(tokenRaw, env2) {
  if (!tokenRaw || tokenRaw.trim().length < 10) {
    throw Object.assign(new Error("Token de gesti\xF3n inv\xE1lido o ausente."), {
      status: 401,
      code: "INVALID_MANAGEMENT_TOKEN"
    });
  }
  const sql = getSql(env2);
  const hashed = hashToken(tokenRaw.trim());
  const rows = await sql`
    SELECT
      mt.id AS token_id,
      mt.organization_id,
      mt.appointment_id,
      mt.scopes,
      mt.expires_at,
      mt.revoked_at
    FROM public.management_tokens mt
    WHERE mt.token_hash = ${hashed}
    LIMIT 1
  `;
  if (rows.length === 0) {
    throw Object.assign(new Error("Enlace de gesti\xF3n no v\xE1lido o inexistente."), {
      status: 401,
      code: "INVALID_MANAGEMENT_TOKEN"
    });
  }
  const tok = rows[0];
  if (tok.revoked_at || new Date(tok.expires_at).getTime() <= Date.now()) {
    throw Object.assign(new Error("El enlace de gesti\xF3n de esta reserva ha expirado o fue revocado."), {
      status: 401,
      code: "EXPIRED_MANAGEMENT_TOKEN"
    });
  }
  return tok;
}
__name(verifyManagementTokenInDb, "verifyManagementTokenInDb");
app.post("/api/v1/booking-access/verify", async (c) => {
  const body = await c.req.json();
  const tok = await verifyManagementTokenInDb(body.token || "", c.env);
  const appt = await withServiceTransaction(
    async (tx) => {
      await tx`
        UPDATE public.management_tokens SET last_used_at = now() WHERE id = ${tok.token_id}
      `;
      return getAppointmentById(tx, tok.organization_id, tok.appointment_id);
    },
    c.env
  );
  return c.json({
    booking: {
      id: appt.id,
      folio: appt.folio,
      professionalId: appt.professional_id,
      professionalName: appt.professional_name,
      specialty: appt.professional_specialty,
      serviceId: appt.service_id,
      serviceName: appt.service_name,
      locationName: appt.location_name,
      patientName: appt.patient_name,
      startsAt: appt.starts_at,
      endsAt: appt.ends_at,
      localDate: appt.local_date,
      localTime: appt.local_time,
      localEndTime: appt.local_end_time,
      attendanceStatus: appt.attendance_status,
      financialStatus: appt.financial_status,
      agreedPriceCents: appt.agreed_price_cents,
      balanceCents: appt.balance_cents,
      version: appt.version
    },
    scopes: tok.scopes
  });
});
app.post("/api/v1/bookings/:id/confirm", async (c) => {
  const appointmentId = c.req.param("id");
  const body = await c.req.json();
  const tok = await verifyManagementTokenInDb(body.token || "", c.env);
  if (tok.appointment_id !== appointmentId) {
    return c.json({ error: "El token no corresponde a la cita solicitada." }, 403);
  }
  const updated = await withServiceTransaction(
    async (tx) => updateAttendanceStatusAtomic(tx, {
      organizationId: tok.organization_id,
      appointmentId,
      newStatus: "confirmed",
      reason: "Asistencia confirmada por el paciente mediante enlace seguro",
      actorUserId: null,
      actorRole: "patient",
      actorLabel: "Paciente (Autogesti\xF3n)"
    }),
    c.env
  );
  return c.json({ booking: updated });
});
app.post("/api/v1/bookings/:id/reschedule", async (c) => {
  const appointmentId = c.req.param("id");
  const body = await c.req.json();
  const tok = await verifyManagementTokenInDb(body.token || "", c.env);
  if (tok.appointment_id !== appointmentId) {
    return c.json({ error: "El token no corresponde a la cita solicitada." }, 403);
  }
  if (!body.newStartsAt || body.expectedVersion === void 0) {
    return c.json({ error: "Se requiere newStartsAt y expectedVersion." }, 422);
  }
  const updated = await withServiceTransaction(
    async (tx) => rescheduleBookingAtomic(tx, {
      organizationId: tok.organization_id,
      appointmentId,
      newStartsAtIso: body.newStartsAt,
      expectedVersion: Number(body.expectedVersion),
      reason: body.reason || "Reprogramada por el paciente desde enlace seguro",
      actorUserId: null,
      actorRole: "patient",
      actorLabel: "Paciente (Autogesti\xF3n)"
    }),
    c.env
  );
  return c.json({ booking: updated });
});
app.post("/api/v1/bookings/:id/cancel", async (c) => {
  const appointmentId = c.req.param("id");
  const body = await c.req.json();
  const tok = await verifyManagementTokenInDb(body.token || "", c.env);
  if (tok.appointment_id !== appointmentId) {
    return c.json({ error: "El token no corresponde a la cita solicitada." }, 403);
  }
  const updated = await withServiceTransaction(
    async (tx) => cancelBookingAtomic(tx, {
      organizationId: tok.organization_id,
      appointmentId,
      reason: body.reason || "Cancelada por el paciente desde enlace seguro",
      expectedVersion: body.expectedVersion,
      actorUserId: null,
      actorRole: "patient",
      actorLabel: "Paciente (Autogesti\xF3n)"
    }),
    c.env
  );
  return c.json({ booking: updated });
});
app.get("/api/v1/reports/daily", async (c) => {
  const user = c.get("user");
  const dateStr = c.req.query("date") || getLocalParts(/* @__PURE__ */ new Date(), user.timezone).dateString;
  const filterProfId = c.req.query("professional_id") || null;
  if (filterProfId) {
    assertCanAccessProfessional(user, filterProfId);
  }
  const effectiveProfId = user.role === "professional" ? user.professionalId : filterProfId;
  const { dayStartUtc, dayEndUtc } = getLocalDayUtcBounds(dateStr, user.timezone);
  const summary = await withUserRls(
    user.userId,
    async (tx) => {
      const appts = await tx`
        SELECT
          a.id,
          a.professional_id,
          a.attendance_status,
          a.financial_status,
          a.agreed_price_cents,
          COALESCE((
            SELECT SUM(CASE
              WHEN fm.movement_type = 'payment' THEN fm.amount_cents
              WHEN fm.movement_type IN ('refund', 'reversal') THEN -fm.amount_cents
              ELSE 0
            END)
            FROM public.financial_movements fm
            WHERE fm.organization_id = a.organization_id AND fm.appointment_id = a.id
          ), 0) AS net_paid_cents
        FROM public.appointments a
        WHERE a.organization_id = ${user.organizationId}
          AND a.starts_at >= ${dayStartUtc.toISOString()}::timestamptz
          AND a.starts_at < ${dayEndUtc.toISOString()}::timestamptz
          ${effectiveProfId ? tx`AND a.professional_id = ${effectiveProfId}` : tx``}
      `;
      const paymentsRows = await tx`
        SELECT
          COALESCE(SUM(CASE
            WHEN fm.movement_type = 'payment' THEN fm.amount_cents
            WHEN fm.movement_type IN ('refund', 'reversal') THEN -fm.amount_cents
            ELSE 0
          END), 0) AS collected_today_cents
        FROM public.financial_movements fm
        JOIN public.appointments a
          ON a.id = fm.appointment_id
          AND a.organization_id = fm.organization_id
        WHERE fm.organization_id = ${user.organizationId}
          AND a.starts_at >= ${dayStartUtc.toISOString()}::timestamptz
          AND a.starts_at < ${dayEndUtc.toISOString()}::timestamptz
          ${effectiveProfId ? tx`AND a.professional_id = ${effectiveProfId}` : tx``}
      `;
      const rescheduledEvents = await tx`
        SELECT COUNT(*)::int AS cnt
        FROM public.appointment_events ae
        JOIN public.appointments a
          ON a.id = ae.appointment_id
          AND a.organization_id = ae.organization_id
        WHERE ae.organization_id = ${user.organizationId}
          AND ae.event_type = 'rescheduled'
          AND a.starts_at >= ${dayStartUtc.toISOString()}::timestamptz
          AND a.starts_at < ${dayEndUtc.toISOString()}::timestamptz
          ${effectiveProfId ? tx`AND a.professional_id = ${effectiveProfId}` : tx``}
      `;
      const profs = await tx`
        SELECT id, slug, full_name, specialty, color_hex
        FROM public.professionals
        WHERE organization_id = ${user.organizationId}
          AND is_active = true
          ${user.role === "professional" && user.professionalId ? tx`AND id = ${user.professionalId}` : tx``}
        ORDER BY created_at ASC
      `;
      const allDayApptsByProf = await tx`
        SELECT
          professional_id,
          COUNT(*) FILTER (WHERE attendance_status <> 'cancelled')::int AS active_cnt,
          COUNT(*) FILTER (WHERE attendance_status = 'completed')::int AS completed_cnt
        FROM public.appointments
        WHERE organization_id = ${user.organizationId}
          AND starts_at >= ${dayStartUtc.toISOString()}::timestamptz
          AND starts_at < ${dayEndUtc.toISOString()}::timestamptz
        GROUP BY professional_id
      `;
      const countsMap = /* @__PURE__ */ new Map();
      for (const r of allDayApptsByProf) {
        countsMap.set(r.professional_id, {
          active: Number(r.active_cnt),
          completed: Number(r.completed_cnt)
        });
      }
      const activeAppts = appts.filter((a) => a.attendance_status !== "cancelled");
      const toConfirm = activeAppts.filter((a) => a.attendance_status === "scheduled").length;
      const waiting = activeAppts.filter((a) => a.attendance_status === "waiting").length;
      const inConsultation = activeAppts.filter(
        (a) => a.attendance_status === "in_consultation"
      ).length;
      const completed = activeAppts.filter((a) => a.attendance_status === "completed").length;
      const cancelled = appts.filter((a) => a.attendance_status === "cancelled").length;
      const noShow = appts.filter((a) => a.attendance_status === "no_show").length;
      let pendingBalanceCount = 0;
      let pendingBalanceTotalCents = 0;
      for (const a of activeAppts) {
        const bal = Math.max(0, Number(a.agreed_price_cents) - Number(a.net_paid_cents));
        if (bal > 0) {
          pendingBalanceCount++;
          pendingBalanceTotalCents += bal;
        }
      }
      const report2 = {
        date: dateStr,
        timezone: user.timezone,
        kpis: {
          appointmentsToday: activeAppts.length,
          toConfirm,
          waiting,
          inConsultation,
          completed,
          cancelled,
          noShow,
          collectedTodayCents: Math.max(0, Number(paymentsRows[0]?.collected_today_cents || 0)),
          pendingBalanceCount,
          pendingBalanceTotalCents,
          rescheduledRequestsCount: Number(rescheduledEvents[0]?.cnt || 0)
        },
        teamAgendas: profs.map((p) => ({
          id: p.id,
          slug: p.slug,
          fullName: p.full_name,
          specialty: p.specialty,
          colorHex: p.color_hex,
          appointmentsCount: countsMap.get(p.id)?.active ?? 0,
          completedCount: countsMap.get(p.id)?.completed ?? 0
        }))
      };
      return report2;
    },
    c.env
  );
  return c.json(summary);
});
app.get("/api/v1/appointments", async (c) => {
  const user = c.get("user");
  const dateStr = c.req.query("date") || getLocalParts(/* @__PURE__ */ new Date(), user.timezone).dateString;
  const professionalId = c.req.query("professional_id") || null;
  const statusFilter = c.req.query("status") || null;
  const search = c.req.query("search")?.trim() || null;
  if (professionalId) {
    assertCanAccessProfessional(user, professionalId);
  }
  const effectiveProfId = user.role === "professional" ? user.professionalId : professionalId;
  const { dayStartUtc, dayEndUtc } = getLocalDayUtcBounds(dateStr, user.timezone);
  const appointments = await withUserRls(
    user.userId,
    async (tx) => {
      const rows = await tx`
        SELECT
          a.id,
          a.organization_id,
          a.folio,
          a.location_id,
          l.name AS location_name,
          l.timezone,
          a.professional_id,
          p.full_name AS professional_name,
          p.specialty AS professional_specialty,
          p.color_hex AS professional_color,
          a.service_id,
          s.name AS service_name,
          s.duration_minutes,
          a.resource_id,
          r.name AS resource_name,
          a.patient_id,
          pat.full_name AS patient_name,
          pat.phone_display AS patient_phone,
          pat.email AS patient_email,
          pc.full_name AS contact_name,
          pc.relationship AS contact_relationship,
          pc.phone_display AS contact_phone,
          a.starts_at,
          a.ends_at,
          a.attendance_status,
          a.financial_status,
          a.agreed_price_cents,
          a.currency,
          a.origin_channel,
          a.campaign_source,
          a.admin_notes,
          a.cancellation_reason,
          a.version,
          a.created_at,
          COALESCE((
            SELECT SUM(CASE
              WHEN fm.movement_type = 'payment' THEN fm.amount_cents
              WHEN fm.movement_type IN ('refund', 'reversal') THEN -fm.amount_cents
              ELSE 0
            END)
            FROM public.financial_movements fm
            WHERE fm.organization_id = a.organization_id AND fm.appointment_id = a.id
          ), 0) AS net_paid_cents
        FROM public.appointments a
        JOIN public.locations l ON l.id = a.location_id AND l.organization_id = a.organization_id
        JOIN public.professionals p ON p.id = a.professional_id AND p.organization_id = a.organization_id
        JOIN public.services s ON s.id = a.service_id AND s.organization_id = a.organization_id
        JOIN public.resources r ON r.id = a.resource_id AND r.organization_id = a.organization_id
        JOIN public.patients pat ON pat.id = a.patient_id AND pat.organization_id = a.organization_id
        LEFT JOIN public.patient_contacts pc ON pc.id = a.contact_id AND pc.organization_id = a.organization_id
        WHERE a.organization_id = ${user.organizationId}
          AND a.starts_at >= ${dayStartUtc.toISOString()}::timestamptz
          AND a.starts_at < ${dayEndUtc.toISOString()}::timestamptz
          ${effectiveProfId ? tx`AND a.professional_id = ${effectiveProfId}` : tx``}
          ${statusFilter ? tx`AND a.attendance_status = ${statusFilter}` : tx``}
        ORDER BY a.starts_at ASC
      `;
      let mapped = rows.map((row) => {
        const startsParts = getLocalParts(new Date(row.starts_at), row.timezone);
        const endsParts = getLocalParts(new Date(row.ends_at), row.timezone);
        const netPaid = Math.max(0, Number(row.net_paid_cents));
        const agreed = Number(row.agreed_price_cents);
        return {
          id: row.id,
          organization_id: row.organization_id,
          folio: row.folio,
          location_id: row.location_id,
          location_name: row.location_name,
          professional_id: row.professional_id,
          professional_name: row.professional_name,
          professional_specialty: row.professional_specialty,
          professional_color: row.professional_color,
          service_id: row.service_id,
          service_name: row.service_name,
          duration_minutes: Number(row.duration_minutes),
          resource_id: row.resource_id,
          resource_name: row.resource_name,
          patient_id: row.patient_id,
          patient_name: row.patient_name,
          patient_phone: row.patient_phone,
          patient_email: row.patient_email,
          contact_name: row.contact_name,
          contact_relationship: row.contact_relationship,
          contact_phone: row.contact_phone,
          starts_at: new Date(row.starts_at).toISOString(),
          ends_at: new Date(row.ends_at).toISOString(),
          local_time: startsParts.timeString,
          local_end_time: endsParts.timeString,
          local_date: startsParts.dateString,
          attendance_status: row.attendance_status,
          financial_status: row.financial_status,
          agreed_price_cents: agreed,
          net_paid_cents: netPaid,
          balance_cents: Math.max(0, agreed - netPaid),
          currency: "MXN",
          origin_channel: row.origin_channel,
          campaign_source: row.campaign_source,
          admin_notes: row.admin_notes,
          cancellation_reason: row.cancellation_reason,
          version: Number(row.version),
          created_at: new Date(row.created_at).toISOString()
        };
      });
      if (search) {
        const q = search.toLowerCase();
        mapped = mapped.filter(
          (a) => a.patient_name.toLowerCase().includes(q) || a.folio.toLowerCase().includes(q) || a.professional_name.toLowerCase().includes(q) || a.patient_phone.includes(q)
        );
      }
      return mapped;
    },
    c.env
  );
  return c.json({ date: dateStr, appointments });
});
app.get("/api/v1/appointments/:id", async (c) => {
  const user = c.get("user");
  const appointmentId = c.req.param("id");
  const detail = await withUserRls(
    user.userId,
    async (tx) => {
      const appointment = await getAppointmentById(tx, user.organizationId, appointmentId);
      assertCanAccessProfessional(user, appointment.professional_id);
      const events = await tx`
        SELECT id, appointment_id, event_type, previous_state, new_state, reason, actor_label, created_at
        FROM public.appointment_events
        WHERE organization_id = ${user.organizationId}
          AND appointment_id = ${appointmentId}
        ORDER BY created_at DESC
      `;
      const movements = await tx`
        SELECT
          id, organization_id, appointment_id, movement_type, amount_cents, currency,
          payment_method, beneficiary_type, reference_code, notes, related_movement_id,
          recorded_by_label, created_at
        FROM public.financial_movements
        WHERE organization_id = ${user.organizationId}
          AND appointment_id = ${appointmentId}
        ORDER BY created_at ASC
      `;
      const jobs = await tx`
        SELECT id, channel, job_type, scheduled_for, status, attempts, last_error, appointment_version
        FROM public.notification_jobs
        WHERE organization_id = ${user.organizationId}
          AND appointment_id = ${appointmentId}
        ORDER BY scheduled_for ASC
      `;
      return { appointment, events, movements, notificationJobs: jobs };
    },
    c.env
  );
  return c.json(detail);
});
app.post("/api/v1/appointments", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const headerIdem = c.req.header("Idempotency-Key");
  const idempotencyKey = headerIdem || body.idempotencyKey;
  if (!body.professionalId || !body.serviceId || !body.startsAt || !body.patientName?.trim() || !body.patientPhone?.trim() || !idempotencyKey) {
    return c.json(
      {
        error: "Faltan campos obligatorios: professionalId, serviceId, startsAt, patientName, patientPhone e idempotencyKey."
      },
      422
    );
  }
  assertCanAccessProfessional(user, body.professionalId);
  const created = await withUserRls(
    user.userId,
    async (tx) => createBookingAtomic(tx, {
      organizationId: user.organizationId,
      professionalId: body.professionalId,
      serviceId: body.serviceId,
      resourceIdOverride: body.resourceId || null,
      startsAtIso: body.startsAt,
      patientName: body.patientName,
      patientPhone: body.patientPhone,
      patientEmail: body.patientEmail,
      contactName: body.contactName,
      contactRelationship: body.contactRelationship,
      contactPhone: body.contactPhone,
      originChannel: body.originChannel || "reception",
      campaignSource: body.campaignSource || null,
      adminNotes: body.adminNotes || null,
      policyAccepted: true,
      idempotencyKey,
      actorUserId: user.userId,
      actorRole: user.role,
      actorLabel: user.fullName
    }),
    c.env
  );
  return c.json(created, created.idempotentReplay ? 200 : 201);
});
app.post("/api/v1/appointments/:id/reschedule", async (c) => {
  const user = c.get("user");
  const appointmentId = c.req.param("id");
  const body = await c.req.json();
  if (!body.newStartsAt || body.expectedVersion === void 0) {
    return c.json({ error: "Se requiere newStartsAt y expectedVersion." }, 422);
  }
  const updated = await withUserRls(
    user.userId,
    async (tx) => {
      const current = await getAppointmentById(tx, user.organizationId, appointmentId);
      assertCanAccessProfessional(user, current.professional_id);
      return rescheduleBookingAtomic(tx, {
        organizationId: user.organizationId,
        appointmentId,
        newStartsAtIso: body.newStartsAt,
        newResourceIdOverride: body.newResourceId || null,
        expectedVersion: Number(body.expectedVersion),
        reason: body.reason || "Reprogramaci\xF3n desde recepci\xF3n/panel",
        actorUserId: user.userId,
        actorRole: user.role,
        actorLabel: user.fullName
      });
    },
    c.env
  );
  return c.json({ appointment: updated });
});
app.post("/api/v1/appointments/:id/cancel", async (c) => {
  const user = c.get("user");
  const appointmentId = c.req.param("id");
  const body = await c.req.json();
  if (!body.reason?.trim()) {
    return c.json({ error: "Indique el motivo de cancelaci\xF3n para el registro de auditor\xEDa." }, 422);
  }
  const updated = await withUserRls(
    user.userId,
    async (tx) => {
      const current = await getAppointmentById(tx, user.organizationId, appointmentId);
      assertCanAccessProfessional(user, current.professional_id);
      return cancelBookingAtomic(tx, {
        organizationId: user.organizationId,
        appointmentId,
        reason: body.reason,
        expectedVersion: body.expectedVersion,
        actorUserId: user.userId,
        actorRole: user.role,
        actorLabel: user.fullName
      });
    },
    c.env
  );
  return c.json({ appointment: updated });
});
app.post("/api/v1/appointments/:id/status", async (c) => {
  const user = c.get("user");
  const appointmentId = c.req.param("id");
  const body = await c.req.json();
  if (!body.status) {
    return c.json({ error: "Especifique el nuevo estado de atenci\xF3n." }, 422);
  }
  const updated = await withUserRls(
    user.userId,
    async (tx) => {
      const current = await getAppointmentById(tx, user.organizationId, appointmentId);
      assertCanAccessProfessional(user, current.professional_id);
      return updateAttendanceStatusAtomic(tx, {
        organizationId: user.organizationId,
        appointmentId,
        newStatus: body.status,
        expectedVersion: body.expectedVersion,
        reason: body.reason,
        actorUserId: user.userId,
        actorRole: user.role,
        actorLabel: user.fullName
      });
    },
    c.env
  );
  return c.json({ appointment: updated });
});
app.post("/api/v1/appointments/:id/payments", async (c) => {
  const user = c.get("user");
  const appointmentId = c.req.param("id");
  if (!["admin", "reception", "cashier"].includes(user.role)) {
    return c.json({ error: "Su rol no tiene permiso para registrar cobros." }, 403);
  }
  const body = await c.req.json();
  const headerIdem = c.req.header("Idempotency-Key");
  const idempotencyKey = headerIdem || body.idempotencyKey;
  if (!body.amountCents || !body.paymentMethod || !idempotencyKey) {
    return c.json(
      { error: "Se requiere amountCents, paymentMethod e idempotencyKey." },
      422
    );
  }
  const res = await withUserRls(
    user.userId,
    async (tx) => recordPaymentAtomic(tx, {
      organizationId: user.organizationId,
      appointmentId,
      amountCents: Number(body.amountCents),
      paymentMethod: body.paymentMethod,
      beneficiaryType: body.beneficiaryType || "organization",
      referenceCode: body.referenceCode,
      notes: body.notes,
      idempotencyKey,
      actorUserId: user.userId,
      actorRole: user.role,
      actorLabel: user.fullName
    }),
    c.env
  );
  return c.json(res, res.idempotentReplay ? 200 : 201);
});
app.post("/api/v1/payments/:id/reversals", async (c) => {
  const user = c.get("user");
  const movementId = c.req.param("id");
  if (user.role !== "admin") {
    return c.json(
      { error: "Solo el administrador del n\xFAcleo puede autorizar reversos o devoluciones." },
      403
    );
  }
  const body = await c.req.json();
  if (!body.reason?.trim()) {
    return c.json({ error: "Indique el motivo del reverso o devoluci\xF3n." }, 422);
  }
  const res = await withUserRls(
    user.userId,
    async (tx) => reverseOrRefundMovementAtomic(tx, {
      organizationId: user.organizationId,
      movementId,
      type: body.type || "reversal",
      amountCents: body.amountCents ? Number(body.amountCents) : void 0,
      reason: body.reason,
      actorUserId: user.userId,
      actorRole: user.role,
      actorLabel: user.fullName
    }),
    c.env
  );
  return c.json(res, 201);
});
app.get("/api/v1/financial-movements", async (c) => {
  const user = c.get("user");
  const dateStr = c.req.query("date") || null;
  const data = await withUserRls(
    user.userId,
    async (tx) => {
      let dateFilter = tx``;
      if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const { dayStartUtc, dayEndUtc } = getLocalDayUtcBounds(dateStr, user.timezone);
        dateFilter = tx`AND fm.created_at >= ${dayStartUtc.toISOString()}::timestamptz AND fm.created_at < ${dayEndUtc.toISOString()}::timestamptz`;
      }
      const movements = await tx`
        SELECT
          fm.id,
          fm.organization_id,
          fm.appointment_id,
          a.folio,
          pat.full_name AS patient_name,
          p.full_name AS professional_name,
          fm.movement_type,
          fm.amount_cents,
          fm.currency,
          fm.payment_method,
          fm.beneficiary_type,
          fm.reference_code,
          fm.notes,
          fm.related_movement_id,
          fm.recorded_by_label,
          fm.created_at
        FROM public.financial_movements fm
        JOIN public.appointments a ON a.id = fm.appointment_id AND a.organization_id = fm.organization_id
        JOIN public.patients pat ON pat.id = a.patient_id AND pat.organization_id = a.organization_id
        JOIN public.professionals p ON p.id = a.professional_id AND p.organization_id = a.organization_id
        WHERE fm.organization_id = ${user.organizationId}
          ${user.role === "professional" && user.professionalId ? tx`AND a.professional_id = ${user.professionalId}` : tx``}
          ${dateFilter}
        ORDER BY fm.created_at DESC
        LIMIT 200
      `;
      return { movements };
    },
    c.env
  );
  return c.json(data);
});
app.get("/api/v1/catalog", async (c) => {
  const user = c.get("user");
  const catalog = await withUserRls(
    user.userId,
    async (tx) => {
      const [organization] = await tx`
        SELECT id, slug, name, currency, default_timezone, settings
        FROM public.organizations
        WHERE id = ${user.organizationId}
      `;
      const locations = await tx`
        SELECT id, slug, name, address, timezone, phone, is_active
        FROM public.locations
        WHERE organization_id = ${user.organizationId}
        ORDER BY created_at ASC
      `;
      const resources = await tx`
        SELECT id, organization_id, location_id, code, name, type, capacity, is_active
        FROM public.resources
        WHERE organization_id = ${user.organizationId}
        ORDER BY code ASC
      `;
      const professionals = await tx`
        SELECT
          p.id,
          p.organization_id,
          p.user_id,
          p.default_location_id,
          p.default_resource_id,
          r.name AS default_resource_name,
          p.slug,
          p.full_name,
          p.specialty,
          p.license_number,
          p.color_hex,
          p.bio,
          p.is_public,
          p.is_active,
          p.whatsapp_instance_name,
          p.whatsapp_status,
          p.whatsapp_phone,
          p.whatsapp_connected_at,
          p.whatsapp_auto_confirm,
          p.whatsapp_auto_reminder_24h,
          p.whatsapp_auto_reminder_1h,
          p.doctoralia_url,
          p.doctoralia_sync_enabled
        FROM public.professionals p
        LEFT JOIN public.resources r ON r.id = p.default_resource_id AND r.organization_id = p.organization_id
        WHERE p.organization_id = ${user.organizationId}
          ${user.role === "professional" && user.professionalId ? tx`AND p.id = ${user.professionalId}` : tx``}
        ORDER BY p.created_at ASC
      `;
      const services = await tx`
        SELECT
          s.id,
          s.organization_id,
          s.professional_id,
          p.full_name AS professional_name,
          s.default_resource_id,
          r.name AS default_resource_name,
          s.name,
          s.description,
          s.duration_minutes,
          s.buffer_before_minutes,
          s.buffer_after_minutes,
          s.price_cents,
          s.currency,
          s.publish_price,
          s.is_public,
          s.is_active
        FROM public.services s
        JOIN public.professionals p ON p.id = s.professional_id AND p.organization_id = s.organization_id
        LEFT JOIN public.resources r ON r.id = s.default_resource_id AND r.organization_id = s.organization_id
        WHERE s.organization_id = ${user.organizationId}
          ${user.role === "professional" && user.professionalId ? tx`AND s.professional_id = ${user.professionalId}` : tx``}
        ORDER BY p.created_at ASC, s.name ASC
      `;
      const rules = await tx`
        SELECT
          id,
          organization_id,
          professional_id,
          location_id,
          day_of_week,
          start_local_time::text AS start_local_time,
          end_local_time::text AS end_local_time,
          break_start_local_time::text AS break_start_local_time,
          break_end_local_time::text AS break_end_local_time,
          slot_interval_minutes,
          is_active
        FROM public.availability_rules
        WHERE organization_id = ${user.organizationId}
          ${user.role === "professional" && user.professionalId ? tx`AND professional_id = ${user.professionalId}` : tx``}
        ORDER BY professional_id, day_of_week ASC
      `;
      const blocks = await tx`
        SELECT
          ex.id,
          ex.organization_id,
          ex.professional_id,
          p.full_name AS professional_name,
          ex.location_id,
          ex.resource_id,
          r.name AS resource_name,
          ex.kind,
          ex.starts_at,
          ex.ends_at,
          ex.reason,
          ex.is_active
        FROM public.availability_exceptions ex
        JOIN public.professionals p ON p.id = ex.professional_id AND p.organization_id = ex.organization_id
        LEFT JOIN public.resources r ON r.id = ex.resource_id AND r.organization_id = ex.organization_id
        WHERE ex.organization_id = ${user.organizationId}
          AND ex.is_active = true
        ORDER BY ex.starts_at DESC
        LIMIT 50
      `;
      const [integrations] = await tx`
        SELECT
          organization_id,
          evolution_api_url,
          evolution_api_key_encrypted,
          confirm_template,
          reschedule_template,
          cancel_template,
          reminder_24h_template,
          reminder_1h_template,
          auto_send_enabled,
          doctoralia_bridge_mode
        FROM public.organization_integrations
        WHERE organization_id = ${user.organizationId}
      `;
      return {
        organization,
        locations,
        resources,
        professionals,
        services,
        availabilityRules: rules,
        availabilityBlocks: blocks,
        integrations: integrations || null
      };
    },
    c.env
  );
  return c.json(catalog);
});
app.post("/api/v1/services", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  if (!body.professionalId || !body.name?.trim() || !body.durationMinutes || body.priceCents === void 0) {
    return c.json({ error: "Datos de servicio incompletos." }, 422);
  }
  assertCanAccessProfessional(user, body.professionalId);
  if (user.role === "reception") {
    return c.json({ error: "Recepci\xF3n no tiene permisos para modificar el cat\xE1logo de servicios." }, 403);
  }
  const created = await withUserRls(
    user.userId,
    async (tx) => {
      const [srv] = await tx`
        INSERT INTO public.services (
          organization_id, professional_id, default_resource_id, name, description,
          duration_minutes, buffer_before_minutes, buffer_after_minutes, price_cents, publish_price
        )
        VALUES (
          ${user.organizationId},
          ${body.professionalId},
          ${body.defaultResourceId || null},
          ${body.name.trim()},
          ${body.description?.trim() || null},
          ${Number(body.durationMinutes)},
          ${Number(body.bufferBeforeMinutes || 0)},
          ${Number(body.bufferAfterMinutes || 0)},
          ${Number(body.priceCents)},
          ${body.publishPrice !== false}
        )
        RETURNING *
      `;
      return srv;
    },
    c.env
  );
  return c.json({ service: created }, 201);
});
app.patch("/api/v1/services/:id", async (c) => {
  const user = c.get("user");
  const serviceId = c.req.param("id");
  const body = await c.req.json();
  if (user.role === "reception") {
    return c.json({ error: "Recepci\xF3n no puede alterar precios ni duraci\xF3n del cat\xE1logo." }, 403);
  }
  const updated = await withUserRls(
    user.userId,
    async (tx) => {
      const existing = await tx`
        SELECT id, professional_id FROM public.services
        WHERE id = ${serviceId} AND organization_id = ${user.organizationId}
        LIMIT 1
      `;
      if (existing.length === 0) {
        throw Object.assign(new Error("Servicio no encontrado."), { status: 404 });
      }
      assertCanAccessProfessional(user, existing[0].professional_id);
      const [srv] = await tx`
        UPDATE public.services
        SET
          name = COALESCE(${body.name?.trim() || null}, name),
          duration_minutes = COALESCE(${body.durationMinutes !== void 0 ? Number(body.durationMinutes) : null}, duration_minutes),
          buffer_before_minutes = COALESCE(${body.bufferBeforeMinutes !== void 0 ? Number(body.bufferBeforeMinutes) : null}, buffer_before_minutes),
          buffer_after_minutes = COALESCE(${body.bufferAfterMinutes !== void 0 ? Number(body.bufferAfterMinutes) : null}, buffer_after_minutes),
          price_cents = COALESCE(${body.priceCents !== void 0 ? Number(body.priceCents) : null}, price_cents),
          default_resource_id = COALESCE(${body.defaultResourceId || null}, default_resource_id),
          is_active = COALESCE(${body.isActive !== void 0 ? body.isActive : null}, is_active),
          updated_at = now()
        WHERE id = ${serviceId} AND organization_id = ${user.organizationId}
        RETURNING *
      `;
      return srv;
    },
    c.env
  );
  return c.json({ service: updated });
});
app.put("/api/v1/availability/rules", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  if (!body.professionalId || body.dayOfWeek === void 0 || !body.startLocalTime || !body.endLocalTime) {
    return c.json({ error: "Datos de horario semanal incompletos." }, 422);
  }
  assertCanAccessProfessional(user, body.professionalId);
  const rule = await withUserRls(
    user.userId,
    async (tx) => {
      const [prof] = await tx`
        SELECT default_location_id FROM public.professionals
        WHERE id = ${body.professionalId} AND organization_id = ${user.organizationId}
      `;
      if (!prof) {
        throw Object.assign(new Error("Profesional no encontrado."), { status: 404 });
      }
      const existing = await tx`
        SELECT id FROM public.availability_rules
        WHERE organization_id = ${user.organizationId}
          AND professional_id = ${body.professionalId}
          AND day_of_week = ${Number(body.dayOfWeek)}
        LIMIT 1
      `;
      if (existing.length > 0) {
        const [updated] = await tx`
          UPDATE public.availability_rules
          SET
            start_local_time = ${body.startLocalTime}::time,
            end_local_time = ${body.endLocalTime}::time,
            break_start_local_time = ${body.breakStartLocalTime ? body.breakStartLocalTime : null}::time,
            break_end_local_time = ${body.breakEndLocalTime ? body.breakEndLocalTime : null}::time,
            slot_interval_minutes = ${Number(body.slotIntervalMinutes || 30)},
            is_active = ${body.isActive !== false},
            updated_at = now()
          WHERE id = ${existing[0].id}
          RETURNING *
        `;
        return updated;
      } else {
        const [inserted] = await tx`
          INSERT INTO public.availability_rules (
            organization_id, professional_id, location_id, day_of_week,
            start_local_time, end_local_time, break_start_local_time, break_end_local_time,
            slot_interval_minutes, is_active
          )
          VALUES (
            ${user.organizationId},
            ${body.professionalId},
            ${prof.default_location_id},
            ${Number(body.dayOfWeek)},
            ${body.startLocalTime}::time,
            ${body.endLocalTime}::time,
            ${body.breakStartLocalTime ? body.breakStartLocalTime : null}::time,
            ${body.breakEndLocalTime ? body.breakEndLocalTime : null}::time,
            ${Number(body.slotIntervalMinutes || 30)},
            ${body.isActive !== false}
          )
          RETURNING *
        `;
        return inserted;
      }
    },
    c.env
  );
  return c.json({ rule });
});
app.post("/api/v1/availability/blocks", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  if (!body.professionalId || !body.startsAt || !body.endsAt || !body.reason?.trim()) {
    return c.json(
      { error: "Se requiere professionalId, startsAt, endsAt y motivo (reason)." },
      422
    );
  }
  assertCanAccessProfessional(user, body.professionalId);
  const block = await withUserRls(
    user.userId,
    async (tx) => createAvailabilityBlockAtomic(tx, {
      organizationId: user.organizationId,
      professionalId: body.professionalId,
      resourceId: body.resourceId,
      kind: body.kind || "block",
      startsAtIso: body.startsAt,
      endsAtIso: body.endsAt,
      reason: body.reason,
      actorUserId: user.userId
    }),
    c.env
  );
  return c.json({ block }, 201);
});
app.get("/api/v1/patients", async (c) => {
  const user = c.get("user");
  const search = c.req.query("search")?.trim() || "";
  const patients = await withUserRls(
    user.userId,
    async (tx) => {
      const rows = await tx`
        SELECT
          pat.id,
          pat.full_name,
          pat.phone_normalized,
          pat.phone_display,
          pat.email,
          pat.notes_admin,
          pat.created_at,
          (
            SELECT COUNT(*)::int
            FROM public.patients p2
            WHERE p2.organization_id = pat.organization_id
              AND p2.phone_normalized = pat.phone_normalized
          ) AS shared_phone_count,
          (
            SELECT COUNT(*)::int
            FROM public.appointments a
            WHERE a.organization_id = pat.organization_id
              AND a.patient_id = pat.id
          ) AS total_appointments
        FROM public.patients pat
        WHERE pat.organization_id = ${user.organizationId}
        ORDER BY pat.created_at DESC
        LIMIT 100
      `;
      if (!search) return rows;
      const q = search.toLowerCase();
      return rows.filter(
        (r) => r.full_name.toLowerCase().includes(q) || r.phone_display.includes(q) || r.phone_normalized.includes(q) || r.email && r.email.toLowerCase().includes(q)
      );
    },
    c.env
  );
  return c.json({ patients });
});
app.get("/api/v1/reports/metrics", async (c) => {
  const user = c.get("user");
  const fromDate = c.req.query("from") || "2026-10-01";
  const toDate = c.req.query("to") || "2026-10-31";
  const { dayStartUtc: startUtc } = getLocalDayUtcBounds(fromDate, user.timezone);
  const { dayEndUtc: endUtc } = getLocalDayUtcBounds(toDate, user.timezone);
  const metrics = await withUserRls(
    user.userId,
    async (tx) => {
      const appts = await tx`
        SELECT
          a.id,
          a.professional_id,
          p.full_name AS professional_name,
          a.attendance_status,
          a.agreed_price_cents,
          a.origin_channel,
          s.duration_minutes,
          COALESCE((
            SELECT SUM(CASE
              WHEN fm.movement_type = 'payment' THEN fm.amount_cents
              WHEN fm.movement_type IN ('refund', 'reversal') THEN -fm.amount_cents
              ELSE 0
            END)
            FROM public.financial_movements fm
            WHERE fm.organization_id = a.organization_id AND fm.appointment_id = a.id
          ), 0) AS net_paid_cents
        FROM public.appointments a
        JOIN public.professionals p ON p.id = a.professional_id AND p.organization_id = a.organization_id
        JOIN public.services s ON s.id = a.service_id AND s.organization_id = a.organization_id
        WHERE a.organization_id = ${user.organizationId}
          AND a.starts_at >= ${startUtc.toISOString()}::timestamptz
          AND a.starts_at < ${endUtc.toISOString()}::timestamptz
          ${user.role === "professional" && user.professionalId ? tx`AND a.professional_id = ${user.professionalId}` : tx``}
      `;
      const totalPeriodAppointments = appts.length;
      const completedCount = appts.filter((a) => a.attendance_status === "completed").length;
      const noShowCount = appts.filter((a) => a.attendance_status === "no_show").length;
      const cancelledCount = appts.filter((a) => a.attendance_status === "cancelled").length;
      const resolvedDenominator = completedCount + noShowCount;
      let netCollectedCents = 0;
      let pendingBalanceCents = 0;
      let occupiedMinutes = 0;
      const byOrigin = {};
      const byProfessional = {};
      for (const a of appts) {
        const paid = Math.max(0, Number(a.net_paid_cents));
        const price = Number(a.agreed_price_cents);
        const bal = a.attendance_status === "cancelled" ? 0 : Math.max(0, price - paid);
        netCollectedCents += paid;
        pendingBalanceCents += bal;
        if (a.attendance_status !== "cancelled") {
          occupiedMinutes += Number(a.duration_minutes);
        }
        byOrigin[a.origin_channel] = (byOrigin[a.origin_channel] || 0) + 1;
        if (!byProfessional[a.professional_id]) {
          byProfessional[a.professional_id] = {
            professionalName: a.professional_name,
            total: 0,
            completed: 0,
            cancelled: 0,
            noShow: 0,
            collectedCents: 0,
            pendingCents: 0
          };
        }
        const bp = byProfessional[a.professional_id];
        bp.total++;
        if (a.attendance_status === "completed") bp.completed++;
        if (a.attendance_status === "cancelled") bp.cancelled++;
        if (a.attendance_status === "no_show") bp.noShow++;
        bp.collectedCents += paid;
        bp.pendingCents += bal;
      }
      return {
        period: { from: fromDate, to: toDate, timezone: user.timezone },
        indicators: {
          periodAppointments: totalPeriodAppointments,
          attendanceRatePercent: resolvedDenominator > 0 ? Math.round(completedCount / resolvedDenominator * 100) : 0,
          attendanceNumerator: completedCount,
          attendanceDenominator: resolvedDenominator,
          cancellationRatePercent: totalPeriodAppointments > 0 ? Math.round(cancelledCount / totalPeriodAppointments * 100) : 0,
          cancellationNumerator: cancelledCount,
          cancellationDenominator: totalPeriodAppointments,
          occupiedMinutes,
          netCollectedCents,
          pendingBalanceCents
        },
        byOrigin,
        byProfessional: Object.values(byProfessional)
      };
    },
    c.env
  );
  return c.json(metrics);
});
app.get("/api/v1/communications/jobs", async (c) => {
  const user = c.get("user");
  const jobs = await withUserRls(
    user.userId,
    async (tx) => {
      return tx`
        SELECT
          nj.id,
          nj.appointment_id,
          a.folio,
          pat.full_name AS patient_name,
          p.full_name AS professional_name,
          nj.appointment_version,
          nj.channel,
          nj.job_type,
          nj.scheduled_for,
          nj.status,
          nj.attempts,
          nj.last_error,
          nj.updated_at
        FROM public.notification_jobs nj
        JOIN public.appointments a ON a.id = nj.appointment_id AND a.organization_id = nj.organization_id
        JOIN public.patients pat ON pat.id = a.patient_id AND pat.organization_id = a.organization_id
        JOIN public.professionals p ON p.id = a.professional_id AND p.organization_id = a.organization_id
        WHERE nj.organization_id = ${user.organizationId}
        ORDER BY nj.created_at DESC
        LIMIT 100
      `;
    },
    c.env
  );
  return c.json({ jobs });
});
app.post("/api/v1/communications/jobs/:id/process", async (c) => {
  const user = c.get("user");
  const jobId = c.req.param("id");
  const body = await c.req.json();
  const result = await withUserRls(
    user.userId,
    async (tx) => {
      const rows = await tx`
        SELECT nj.*, a.attendance_status, a.version AS current_appt_version
        FROM public.notification_jobs nj
        JOIN public.appointments a ON a.id = nj.appointment_id AND a.organization_id = nj.organization_id
        WHERE nj.id = ${jobId} AND nj.organization_id = ${user.organizationId}
        FOR UPDATE
      `;
      if (rows.length === 0) {
        throw Object.assign(new Error("Tarea de comunicaci\xF3n no encontrada."), { status: 404 });
      }
      const job = rows[0];
      if (job.attendance_status === "cancelled" || Number(job.appointment_version) !== Number(job.current_appt_version)) {
        const [cancelledJob] = await tx`
          UPDATE public.notification_jobs
          SET status = 'cancelled_obsolete', updated_at = now()
          WHERE id = ${jobId}
          RETURNING *
        `;
        return cancelledJob;
      }
      if (body.simulateFailure) {
        const nextAttempts = Number(job.attempts) + 1;
        const [failedJob] = await tx`
          UPDATE public.notification_jobs
          SET
            status = 'failed',
            attempts = ${nextAttempts},
            last_error = ${`Proveedor SMTP/Transaccional no disponible (intento ${nextAttempts}/3)`},
            updated_at = now()
          WHERE id = ${jobId}
          RETURNING *
        `;
        return failedJob;
      }
      const [sentJob] = await tx`
        UPDATE public.notification_jobs
        SET
          status = 'sent',
          attempts = attempts + 1,
          last_error = NULL,
          updated_at = now()
        WHERE id = ${jobId}
        RETURNING *
      `;
      return sentJob;
    },
    c.env
  );
  return c.json({ job: result });
});
app.get("/api/v1/availability/slots", async (c) => {
  const user = c.get("user");
  const professionalId = c.req.query("professional_id");
  const serviceId = c.req.query("service_id");
  const dateStr = c.req.query("date");
  const resourceId = c.req.query("resource_id") || null;
  const excludeAppointmentId = c.req.query("exclude_appointment_id") || null;
  if (!professionalId || !serviceId || !dateStr) {
    return c.json({ error: "Se requiere professional_id, service_id y date." }, 422);
  }
  assertCanAccessProfessional(user, professionalId);
  const result = await withUserRls(
    user.userId,
    async (tx) => computeAvailableSlots(tx, {
      organizationId: user.organizationId,
      professionalId,
      serviceId,
      dateStr,
      resourceIdOverride: resourceId,
      excludeAppointmentId
    }),
    c.env
  );
  return c.json(result);
});
app.post("/api/v1/appointments/:id/management-link", async (c) => {
  const user = c.get("user");
  const appointmentId = c.req.param("id");
  const linkData = await withUserRls(
    user.userId,
    async (tx) => {
      const appt = await getAppointmentById(tx, user.organizationId, appointmentId);
      assertCanAccessProfessional(user, appt.professional_id);
      const rawToken = `mgt_${Buffer.from(
        `${appointmentId}:${Date.now()}:${Math.random()}`
      ).toString("base64url")}`;
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3);
      await tx`
        INSERT INTO public.management_tokens (
          organization_id, appointment_id, token_hash, scopes, expires_at
        )
        VALUES (
          ${user.organizationId},
          ${appointmentId},
          ${tokenHash},
          ARRAY['read', 'confirm', 'reschedule', 'cancel'],
          ${expiresAt.toISOString()}::timestamptz
        )
      `;
      return {
        token: rawToken,
        managementUrl: `/gestionar/${rawToken}`,
        expiresAt: expiresAt.toISOString(),
        folio: appt.folio,
        patientName: appt.patient_name,
        professionalName: appt.professional_name,
        localDate: appt.local_date,
        localTime: appt.local_time
      };
    },
    c.env
  );
  return c.json(linkData, 201);
});
app.patch("/api/v1/organization/settings", async (c) => {
  const user = c.get("user");
  if (user.role !== "admin") {
    return c.json({ error: "Solo el administrador puede modificar la configuraci\xF3n del n\xFAcleo." }, 403);
  }
  const body = await c.req.json();
  const updated = await withUserRls(
    user.userId,
    async (tx) => {
      if (body.organizationName?.trim() || body.timezone?.trim()) {
        await tx`
          UPDATE public.organizations
          SET
            name = COALESCE(${body.organizationName?.trim() || null}, name),
            default_timezone = COALESCE(${body.timezone?.trim() || null}, default_timezone),
            updated_at = now()
          WHERE id = ${user.organizationId}
        `;
      }
      if (body.locationName?.trim() || body.locationAddress?.trim() || body.timezone?.trim() || body.phone !== void 0) {
        await tx`
          UPDATE public.locations
          SET
            name = COALESCE(${body.locationName?.trim() || null}, name),
            address = COALESCE(${body.locationAddress?.trim() || null}, address),
            timezone = COALESCE(${body.timezone?.trim() || null}, timezone),
            phone = COALESCE(${body.phone?.trim() || null}, phone),
            updated_at = now()
          WHERE organization_id = ${user.organizationId}
        `;
      }
      const [org] = await tx`SELECT * FROM public.organizations WHERE id = ${user.organizationId}`;
      const [loc] = await tx`SELECT * FROM public.locations WHERE organization_id = ${user.organizationId} LIMIT 1`;
      return { organization: org, location: loc };
    },
    c.env
  );
  return c.json(updated);
});
app.get("/api/v1/integrations/settings", async (c) => {
  const user = c.get("user");
  const data = await withUserRls(
    user.userId,
    async (tx) => {
      const [row] = await tx`
        SELECT
          organization_id,
          evolution_api_url,
          evolution_api_key_encrypted,
          confirm_template,
          reschedule_template,
          cancel_template,
          reminder_24h_template,
          reminder_1h_template,
          auto_send_enabled,
          doctoralia_bridge_mode
        FROM public.organization_integrations
        WHERE organization_id = ${user.organizationId}
      `;
      return row || null;
    },
    c.env
  );
  return c.json({ integrations: data, settings: data });
});
app.put("/api/v1/integrations/settings", async (c) => {
  const user = c.get("user");
  if (!["admin", "reception"].includes(user.role)) {
    return c.json({ error: "Solo Direcci\xF3n o la Asistente pueden actualizar la configuraci\xF3n de integraciones." }, 403);
  }
  const body = await c.req.json();
  const updated = await withUserRls(
    user.userId,
    async (tx) => {
      const [row] = await tx`
        INSERT INTO public.organization_integrations (
          organization_id,
          evolution_api_url,
          evolution_api_key_encrypted,
          confirm_template,
          reschedule_template,
          cancel_template,
          reminder_24h_template,
          reminder_1h_template,
          auto_send_enabled,
          doctoralia_bridge_mode,
          updated_at
        )
        VALUES (
          ${user.organizationId},
          ${body.evolutionApiUrl?.trim() || "https://whatsapp.dragendas.com"},
          ${body.evolutionApiKey?.trim() || ""},
          ${body.confirmTemplate?.trim() || "Hola {{paciente}}, te saluda tu {{especialista}}. Tu cita de {{servicio}} qued\xF3 confirmada para el {{fecha}} a las {{hora}} en {{sede}}. Gestiona o confirma tu asistencia aqu\xED: {{link}}"},
          ${body.rescheduleTemplate?.trim() || "Hola {{paciente}}, tu cita con {{especialista}} ha sido reprogramada para el {{fecha}} a las {{hora}}."},
          ${body.cancelTemplate?.trim() || "Hola {{paciente}}, tu cita con {{especialista}} del {{fecha}} a las {{hora}} ha sido cancelada."},
          ${body.reminder24hTemplate?.trim() || "Recordatorio 24h: Hola {{paciente}}, ma\xF1ana {{fecha}} a las {{hora}} tienes cita con {{especialista}} ({{servicio}}). Confirma tu asistencia en: {{link}}"},
          ${body.reminder1hTemplate?.trim() || "Recordatorio 1h: Hola {{paciente}}, te esperamos en 1 hora ({{hora}}) para tu consulta con {{especialista}} en {{sede}}."},
          ${body.autoSendEnabled !== false},
          ${body.doctoraliaBridgeMode || "email_and_ics"},
          now()
        )
        ON CONFLICT (organization_id) DO UPDATE SET
          evolution_api_url = COALESCE(${body.evolutionApiUrl?.trim() || null}, public.organization_integrations.evolution_api_url),
          evolution_api_key_encrypted = COALESCE(${body.evolutionApiKey !== void 0 ? body.evolutionApiKey.trim() : null}, public.organization_integrations.evolution_api_key_encrypted),
          confirm_template = COALESCE(${body.confirmTemplate?.trim() || null}, public.organization_integrations.confirm_template),
          reschedule_template = COALESCE(${body.rescheduleTemplate?.trim() || null}, public.organization_integrations.reschedule_template),
          cancel_template = COALESCE(${body.cancelTemplate?.trim() || null}, public.organization_integrations.cancel_template),
          reminder_24h_template = COALESCE(${body.reminder24hTemplate?.trim() || null}, public.organization_integrations.reminder_24h_template),
          reminder_1h_template = COALESCE(${body.reminder1hTemplate?.trim() || null}, public.organization_integrations.reminder_1h_template),
          auto_send_enabled = COALESCE(${body.autoSendEnabled !== void 0 ? body.autoSendEnabled : null}, public.organization_integrations.auto_send_enabled),
          doctoralia_bridge_mode = COALESCE(${body.doctoraliaBridgeMode || null}, public.organization_integrations.doctoralia_bridge_mode),
          updated_at = now()
        RETURNING *
      `;
      return row;
    },
    c.env
  );
  return c.json({ integrations: updated, settings: updated });
});
app.post("/api/v1/professionals/:id/whatsapp/connect", async (c) => {
  const user = c.get("user");
  const professionalId = c.req.param("id");
  assertCanAccessProfessional(user, professionalId);
  const body = await c.req.json();
  const result = await withUserRls(
    user.userId,
    async (tx) => {
      const [prof] = await tx`
        SELECT id, slug, full_name, whatsapp_instance_name, whatsapp_phone
        FROM public.professionals
        WHERE id = ${professionalId} AND organization_id = ${user.organizationId}
      `;
      if (!prof) {
        throw Object.assign(new Error("Especialista no encontrada."), { status: 404 });
      }
      const [integ] = await tx`
        SELECT evolution_api_url, evolution_api_key_encrypted
        FROM public.organization_integrations
        WHERE organization_id = ${user.organizationId}
      `;
      const instanceName = body.instanceName?.trim() || prof.whatsapp_instance_name || `consultorio-${prof.slug}`;
      const effectiveApiKey = integ?.evolution_api_key_encrypted || c.env?.EVOLUTION_API_KEY || (typeof process !== "undefined" ? process.env.EVOLUTION_API_KEY : "") || "DrAgendas_WA_ClaveSecreta_2026_Demo";
      const evoRes = await connectEvolutionInstance({
        baseUrl: integ?.evolution_api_url || "https://whatsapp.dragendas.com",
        apiKey: effectiveApiKey,
        instanceName
      });
      const nextStatus = evoRes.status === "connected" ? "connected" : "qr_ready";
      const [updatedProf] = await tx`
        UPDATE public.professionals
        SET
          whatsapp_instance_name = ${instanceName},
          whatsapp_status = ${nextStatus},
          whatsapp_phone = COALESCE(${body.whatsappPhone?.trim() || null}, whatsapp_phone),
          updated_at = now()
        WHERE id = ${professionalId} AND organization_id = ${user.organizationId}
        RETURNING *
      `;
      return {
        professional: updatedProf,
        evolution: evoRes,
        instanceName: evoRes.instanceName,
        qrCodeBase64: evoRes.qrBase64
      };
    },
    c.env
  );
  return c.json(result);
});
app.post("/api/v1/professionals/:id/whatsapp/confirm-link", async (c) => {
  const user = c.get("user");
  const professionalId = c.req.param("id");
  assertCanAccessProfessional(user, professionalId);
  const body = await c.req.json();
  const updated = await withUserRls(
    user.userId,
    async (tx) => {
      const [prof] = await tx`
        UPDATE public.professionals
        SET
          whatsapp_status = COALESCE(${body.status || null}, whatsapp_status),
          whatsapp_phone = COALESCE(${body.whatsappPhone?.trim() || null}, whatsapp_phone),
          whatsapp_instance_name = COALESCE(${body.instanceName?.trim() || null}, whatsapp_instance_name),
          whatsapp_connected_at = CASE
            WHEN ${body.status || null} = 'connected' THEN now()
            ELSE whatsapp_connected_at
          END,
          whatsapp_auto_confirm = COALESCE(${body.autoConfirm !== void 0 ? body.autoConfirm : null}, whatsapp_auto_confirm),
          whatsapp_auto_reminder_24h = COALESCE(${body.autoReminder24h !== void 0 ? body.autoReminder24h : null}, whatsapp_auto_reminder_24h),
          whatsapp_auto_reminder_1h = COALESCE(${body.autoReminder1h !== void 0 ? body.autoReminder1h : null}, whatsapp_auto_reminder_1h),
          doctoralia_url = COALESCE(${body.doctoraliaUrl !== void 0 ? body.doctoraliaUrl.trim() : null}, doctoralia_url),
          doctoralia_sync_enabled = COALESCE(${body.doctoraliaSyncEnabled !== void 0 ? body.doctoraliaSyncEnabled : null}, doctoralia_sync_enabled),
          updated_at = now()
        WHERE id = ${professionalId} AND organization_id = ${user.organizationId}
        RETURNING *
      `;
      if (!prof) {
        throw Object.assign(new Error("Especialista no encontrada."), { status: 404 });
      }
      return prof;
    },
    c.env
  );
  return c.json({ professional: updated });
});
app.post("/api/v1/professionals/:id/whatsapp/test", async (c) => {
  const user = c.get("user");
  const professionalId = c.req.param("id");
  assertCanAccessProfessional(user, professionalId);
  const body = await c.req.json();
  const res = await withUserRls(
    user.userId,
    async (tx) => {
      const [prof] = await tx`
        SELECT p.*, l.name AS location_name
        FROM public.professionals p
        JOIN public.locations l ON l.id = p.default_location_id AND l.organization_id = p.organization_id
        WHERE p.id = ${professionalId} AND p.organization_id = ${user.organizationId}
      `;
      if (!prof) {
        throw Object.assign(new Error("Especialista no encontrada."), { status: 404 });
      }
      const [integ] = await tx`
        SELECT * FROM public.organization_integrations
        WHERE organization_id = ${user.organizationId}
      `;
      const templateType = body.templateType || "confirm";
      const rawTemplate = templateType === "reschedule" ? integ?.reschedule_template : templateType === "cancel" ? integ?.cancel_template : templateType === "reminder_24h" ? integ?.reminder_24h_template : templateType === "reminder_1h" ? integ?.reminder_1h_template : integ?.confirm_template;
      const renderedMessage = renderWhatsAppTemplate(
        rawTemplate || "Hola {{paciente}}, te saluda tu {{especialista}}. Tu cita qued\xF3 confirmada para el {{fecha}} a las {{hora}} en {{sede}}.",
        {
          paciente: body.patientName?.trim() || "Mar\xEDa Fernanda Soto",
          especialista: prof.full_name,
          especialidad: prof.specialty,
          servicio: `Consulta de ${prof.specialty}`,
          fecha: "17/10/2026",
          hora: "11:00",
          sede: prof.location_name || "N\xFAcleo M\xE9dico Especializado",
          link: "https://multiagenda.dragendas.com/reservar/nucleo-demo"
        }
      );
      const targetPhone = body.recipientPhone?.trim() || prof.whatsapp_phone || "+525511223344";
      const instanceName = prof.whatsapp_instance_name || `consultorio-${prof.slug}`;
      const effectiveApiKey = integ?.evolution_api_key_encrypted || c.env?.EVOLUTION_API_KEY || (typeof process !== "undefined" ? process.env.EVOLUTION_API_KEY : "") || "DrAgendas_WA_ClaveSecreta_2026_Demo";
      const sendResult = await sendEvolutionWhatsAppMessage({
        baseUrl: integ?.evolution_api_url || "https://whatsapp.dragendas.com",
        apiKey: effectiveApiKey,
        instanceName,
        phoneNormalized: targetPhone,
        text: renderedMessage
      });
      return {
        sent: sendResult.sent,
        simulated: sendResult.simulated,
        instanceName,
        senderPhone: prof.whatsapp_phone || "WhatsApp Personal Vinculado",
        recipientPhone: targetPhone,
        renderedMessage,
        providerResponse: sendResult.providerResponse
      };
    },
    c.env
  );
  return c.json(res);
});
app.post("/api/v1/integrations/doctoralia/simulate-booking", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const targetDate = body.date || getLocalParts(/* @__PURE__ */ new Date(), user.timezone).dateString;
  const result = await withUserRls(
    user.userId,
    async (tx) => {
      const profId = body.professionalId || (user.role === "professional" ? user.professionalId : null);
      const profRows = await tx`
        SELECT p.*, l.name AS location_name
        FROM public.professionals p
        JOIN public.locations l ON l.id = p.default_location_id AND l.organization_id = p.organization_id
        WHERE p.organization_id = ${user.organizationId}
          ${profId ? tx`AND p.id = ${profId}` : tx``}
        ORDER BY p.created_at ASC
        LIMIT 1
      `;
      if (profRows.length === 0) {
        throw Object.assign(new Error("No se encontr\xF3 especialista para sincronizar con Doctoralia."), { status: 404 });
      }
      const prof = profRows[0];
      const [service] = await tx`
        SELECT id, name FROM public.services
        WHERE organization_id = ${user.organizationId} AND professional_id = ${prof.id} AND is_active = true
        ORDER BY created_at ASC
        LIMIT 1
      `;
      if (!service) {
        throw Object.assign(new Error("La especialista no tiene servicios activos configurados."), { status: 422 });
      }
      const slotsRes = await computeAvailableSlots(tx, {
        organizationId: user.organizationId,
        professionalId: prof.id,
        serviceId: service.id,
        dateStr: targetDate
      });
      if (slotsRes.slots.length === 0) {
        throw Object.assign(
          new Error(`No hay horarios disponibles el ${targetDate} para reflejar la cita de Doctoralia.`),
          { status: 409, code: "NO_SLOTS_FOR_DOCTORALIA_SYNC" }
        );
      }
      const chosenSlot = slotsRes.slots[0];
      const patientName = body.patientName?.trim() || "Luc\xEDa Dom\xEDnguez (Paciente Doctoralia)";
      const patientPhone = body.patientPhone?.trim() || "5566778899";
      const created = await createBookingAtomic(tx, {
        organizationId: user.organizationId,
        professionalId: prof.id,
        serviceId: service.id,
        startsAtIso: chosenSlot.startsAt,
        patientName,
        patientPhone,
        patientEmail: "paciente.doctoralia@ejemplo.mx",
        originChannel: "referral",
        campaignSource: "doctoralia_sync",
        adminNotes: `Cita sincronizada autom\xE1ticamente desde Doctoralia (${prof.doctoralia_url || "Perfil Doctoralia"}). Confirmaci\xF3n enviada por WhatsApp desde instancia ${prof.whatsapp_instance_name || prof.slug}.`,
        policyAccepted: true,
        idempotencyKey: `doctoralia-sim-${prof.id}-${chosenSlot.startsAt}-${Date.now()}`,
        actorUserId: user.userId,
        actorRole: user.role,
        actorLabel: "Puente Doctoralia Sync"
      });
      return {
        appointment: created.appointment,
        whatsappDispatchedFrom: prof.whatsapp_instance_name || `consultorio-${prof.slug}`,
        specialistPhone: prof.whatsapp_phone || "+525500000000"
      };
    },
    c.env
  );
  return c.json(result, 201);
});
app.get("/api/v1/clinical-records", async (c) => {
  const user = c.get("user");
  if (user.role === "reception") {
    return c.json(
      {
        error: "Por privacidad m\xE9dica (NOM-004 / RLS), la Asistente controla la agenda y cobros pero no tiene acceso a las notas cl\xEDnicas privadas de cada especialista.",
        code: "FORBIDDEN_CLINICAL_RECORDS_FOR_ASSISTANT"
      },
      403
    );
  }
  const patientId = c.req.query("patient_id") || null;
  const professionalId = c.req.query("professional_id") || null;
  if (professionalId) {
    assertCanAccessProfessional(user, professionalId);
  }
  const effectiveProfId = user.role === "professional" ? user.professionalId : professionalId;
  const records = await withUserRls(
    user.userId,
    async (tx) => {
      return tx`
        SELECT
          cr.id,
          cr.organization_id,
          cr.patient_id,
          pat.full_name AS patient_name,
          pat.phone_display AS patient_phone,
          cr.professional_id,
          p.full_name AS professional_name,
          p.specialty AS professional_specialty,
          cr.appointment_id,
          cr.specialty_type,
          cr.chief_complaint,
          cr.evolution_notes,
          COALESCE(cr.subjective_notes, cr.evolution_notes) AS subjective_notes,
          cr.objective_notes,
          cr.diagnosis,
          cr.treatment_plan,
          cr.vital_signs,
          cr.specialty_data,
          cr.created_at,
          cr.updated_at
        FROM public.clinical_records cr
        JOIN public.patients pat ON pat.id = cr.patient_id AND pat.organization_id = cr.organization_id
        JOIN public.professionals p ON p.id = cr.professional_id AND p.organization_id = cr.organization_id
        WHERE cr.organization_id = ${user.organizationId}
          ${effectiveProfId ? tx`AND cr.professional_id = ${effectiveProfId}` : tx``}
          ${patientId ? tx`AND cr.patient_id = ${patientId}` : tx``}
        ORDER BY cr.created_at DESC
        LIMIT 100
      `;
    },
    c.env
  );
  return c.json({ records });
});
app.post("/api/v1/clinical-records", async (c) => {
  const user = c.get("user");
  if (user.role === "reception") {
    return c.json(
      {
        error: "La Asistente no puede crear ni editar notas de expediente cl\xEDnico.",
        code: "FORBIDDEN_CLINICAL_RECORDS_FOR_ASSISTANT"
      },
      403
    );
  }
  const body = await c.req.json();
  const targetProfId = user.role === "professional" ? user.professionalId : body.professionalId;
  if (!body.patientId || !targetProfId || !body.chiefComplaint?.trim()) {
    return c.json(
      { error: "Seleccione paciente, especialista y motivo de consulta (chiefComplaint)." },
      422
    );
  }
  assertCanAccessProfessional(user, targetProfId);
  const created = await withUserRls(
    user.userId,
    async (tx) => {
      const [rec] = await tx`
        INSERT INTO public.clinical_records (
          organization_id,
          patient_id,
          professional_id,
          appointment_id,
          specialty_type,
          chief_complaint,
          evolution_notes,
          subjective_notes,
          objective_notes,
          diagnosis,
          treatment_plan,
          vital_signs,
          specialty_data,
          created_by
        )
        VALUES (
          ${user.organizationId},
          ${body.patientId},
          ${targetProfId},
          ${body.appointmentId || null},
          ${body.specialtyType || "general"},
          ${body.chiefComplaint.trim()},
          ${body.subjectiveNotes?.trim() || ""},
          ${body.subjectiveNotes?.trim() || null},
          ${body.objectiveNotes?.trim() || null},
          ${body.diagnosis?.trim() || null},
          ${body.treatmentPlan?.trim() || null},
          ${JSON.stringify(body.vitalSigns || {})}::jsonb,
          ${JSON.stringify(body.specialtyData || {})}::jsonb,
          ${user.userId}
        )
        RETURNING *
      `;
      return rec;
    },
    c.env
  );
  return c.json({ record: created }, 201);
});

// src/worker.ts
var worker_default = {
  async fetch(request, env2, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return app.fetch(request, env2, ctx);
    }
    if (env2.ASSETS) {
      return env2.ASSETS.fetch(request);
    }
    return new Response("Dr Agenda N\xFAcleos Worker API Activo", { status: 200 });
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
