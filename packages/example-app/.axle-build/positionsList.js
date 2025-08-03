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
var positionsList_exports = {};
__export(positionsList_exports, {
  default: () => PositionsList
});
module.exports = __toCommonJS(positionsList_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = __toESM(require("react"));
function PositionItem({ item }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
      item.name,
      " (",
      item.price,
      " \u0440\u0443\u0431.)"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        "atom-action": "POST /action/addItem",
        "atom-target": "#receipt-container",
        name: "id",
        value: item.id,
        children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C"
      }
    )
  ] });
}
function PositionsList({ data }) {
  const { positions, viewState } = data;
  const hasQuery = viewState.query && viewState.query.length > 0;
  const itemsToDisplay = hasQuery ? viewState.filtered : positions.items;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u0422\u043E\u0432\u0430\u0440\u044B" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "search-bar", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        id: "search-input",
        type: "text",
        name: "query",
        placeholder: "\u041D\u0430\u0439\u0442\u0438 \u0442\u043E\u0432\u0430\u0440...",
        defaultValue: viewState.query,
        "atom-action": "POST /action/filterPositions",
        "atom-target": "#positionsList-container",
        "atom-event": "input"
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: itemsToDisplay && itemsToDisplay.length > 0 ? itemsToDisplay.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PositionItem, { item }, item.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: hasQuery ? `\u041F\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0443 "${viewState.query}" \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.` : "\u0421\u043F\u0438\u0441\u043E\u043A \u0442\u043E\u0432\u0430\u0440\u043E\u0432 \u043F\u0443\u0441\u0442." }) }) }) })
  ] });
}
