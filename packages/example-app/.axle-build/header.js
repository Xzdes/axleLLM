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
var header_exports = {};
__export(header_exports, {
  default: () => Header
});
module.exports = __toCommonJS(header_exports);
var import_react = __toESM(require("react"));
function Header({ globals, user }) {
  return /* @__PURE__ */ import_react.default.createElement("header", { className: "app-header" }, /* @__PURE__ */ import_react.default.createElement("h1", null, globals.appName || "AxleLLM App"), /* @__PURE__ */ import_react.default.createElement("div", { className: "user-info" }, /* @__PURE__ */ import_react.default.createElement("a", { "atom-action": "GET /action/open-docs", style: { cursor: "pointer", marginRight: "15px" } }, "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u044F"), user && /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, /* @__PURE__ */ import_react.default.createElement("span", null, user.name, " (", user.role, ")"), /* @__PURE__ */ import_react.default.createElement("a", { "atom-action": "GET /auth/logout", style: { cursor: "pointer" } }, "\u0412\u044B\u0445\u043E\u0434"))));
}
