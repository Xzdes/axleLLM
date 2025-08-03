var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var register_form_exports = {};
__export(register_form_exports, {
  default: () => RegisterForm
});
module.exports = __toCommonJS(register_form_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = __toESM(require("react"));
function RegisterForm({ url }) {
  const query = url?.query || {};
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u043D\u043E\u0432\u043E\u0433\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F" }),
    query.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "error", children: "\u042D\u0442\u043E\u0442 \u043B\u043E\u0433\u0438\u043D \u0443\u0436\u0435 \u0437\u0430\u043D\u044F\u0442 \u0438\u043B\u0438 \u043F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430." }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { "atom-action": "POST /auth/register", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "form-group", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "name", children: "\u0412\u0430\u0448\u0435 \u0438\u043C\u044F" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "text", id: "name", name: "name", required: true })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "form-group", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "login", children: "\u041B\u043E\u0433\u0438\u043D" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "text", id: "login", name: "login", required: true })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "form-group", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "password", children: "\u041F\u0430\u0440\u043E\u043B\u044C" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "password", id: "password", name: "password", required: true })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "form-group", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", children: "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F" }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "links", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: "/login", children: "\u0423 \u043C\u0435\u043D\u044F \u0443\u0436\u0435 \u0435\u0441\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442" }) })
  ] });
}
