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
var login_form_exports = {};
__export(login_form_exports, {
  default: () => LoginForm
});
module.exports = __toCommonJS(login_form_exports);
var import_react = __toESM(require("react"));
function LoginForm({ url }) {
  const query = url?.query || {};
  return /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("h2", null, "\u0412\u0445\u043E\u0434 \u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u0443"), query.registered && /* @__PURE__ */ import_react.default.createElement("p", { style: { color: "green", textAlign: "center" } }, "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u043F\u0440\u043E\u0448\u043B\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E! \u0422\u0435\u043F\u0435\u0440\u044C \u0432\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u0432\u043E\u0439\u0442\u0438."), query.error && /* @__PURE__ */ import_react.default.createElement("p", { className: "error" }, "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043B\u043E\u0433\u0438\u043D \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C."), /* @__PURE__ */ import_react.default.createElement("form", { "atom-action": "POST /auth/login" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "form-group" }, /* @__PURE__ */ import_react.default.createElement("label", { htmlFor: "login" }, "\u041B\u043E\u0433\u0438\u043D"), /* @__PURE__ */ import_react.default.createElement("input", { type: "text", id: "login", name: "login", required: true })), /* @__PURE__ */ import_react.default.createElement("div", { className: "form-group" }, /* @__PURE__ */ import_react.default.createElement("label", { htmlFor: "password" }, "\u041F\u0430\u0440\u043E\u043B\u044C"), /* @__PURE__ */ import_react.default.createElement("input", { type: "password", id: "password", name: "password", required: true })), /* @__PURE__ */ import_react.default.createElement("div", { className: "form-group" }, /* @__PURE__ */ import_react.default.createElement("button", { type: "submit" }, "\u0412\u043E\u0439\u0442\u0438"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "links" }, /* @__PURE__ */ import_react.default.createElement("a", { href: "/register" }, "\u0423 \u043C\u0435\u043D\u044F \u0435\u0449\u0435 \u043D\u0435\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430")));
}
