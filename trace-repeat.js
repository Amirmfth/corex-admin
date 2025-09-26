const originalRepeat = String.prototype.repeat;
String.prototype.repeat = function patchedRepeat(count) {
  if (count < 0) {
    console.error("String.repeat called with count:", count);
    console.error(new Error().stack);
  }
  return originalRepeat.call(this, count);
};

const Module = require("module");
const path = require("path");
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  const resolved = Module._resolveFilename(request, parent, isMain);
  const exported = originalLoad.apply(this, arguments);
  if (resolved.includes(path.join("turbopack", "utils.js"))) {
    const cachedModule = Module._cache[resolved];
    if (cachedModule && !cachedModule.__patchedProcessIssues) {
      const originalProcessIssues = exported.processIssues;
      const proxy = new Proxy(exported, {
        get(target, prop, receiver) {
          const value = Reflect.get(target, prop, receiver);
          if (prop === "processIssues" && typeof originalProcessIssues === "function") {
            return function patchedProcessIssues(...args) {
              const [, key, result] = args;
              try {
                console.error("[processIssues] key=", key);
                console.error("[processIssues] issues=", JSON.stringify(result, null, 2));
              } catch (error) {
                console.error("[processIssues] issues (non-json)", result);
              }
              return originalProcessIssues.apply(this, args);
            };
          }
          return value;
        },
      });
      cachedModule.exports = proxy;
      cachedModule.__patchedProcessIssues = true;
      return proxy;
    }
  }
  return exported;
};
