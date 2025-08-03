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
var receipt_exports = {};
__export(receipt_exports, {
  default: () => Receipt
});
module.exports = __toCommonJS(receipt_exports);
var import_react = __toESM(require("react"));
function ReceiptItem({ item }) {
  return /* @__PURE__ */ import_react.default.createElement("li", null, /* @__PURE__ */ import_react.default.createElement("span", null, item.name, " (", item.price, "\u0440 x ", item.quantity, ")"), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "remove-btn",
      type: "button",
      "atom-action": "POST /action/removeItem",
      "atom-target": "#receipt-container",
      name: "id",
      value: item.id
    },
    "\xD7"
  ));
}
function Receipt({ data }) {
  const { receipt } = data;
  const hasItems = receipt.items && receipt.items.length > 0;
  return /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      "atom-socket": "receipt-updates",
      "atom-on-event": "receipt-changed",
      "atom-action": "POST /action/soft-refresh-receipt",
      "atom-target": "#receipt-container"
    },
    /* @__PURE__ */ import_react.default.createElement("h3", null, "\u0427\u0435\u043A"),
    receipt.statusMessage && /* @__PURE__ */ import_react.default.createElement("p", { className: "status-message" }, receipt.statusMessage),
    hasItems ? /* @__PURE__ */ import_react.default.createElement("ul", { className: "receipt-items" }, receipt.items.map((item) => /* @__PURE__ */ import_react.default.createElement(ReceiptItem, { key: item.id, item }))) : /* @__PURE__ */ import_react.default.createElement("div", { className: "empty-state" }, /* @__PURE__ */ import_react.default.createElement("p", null, "\u0427\u0435\u043A \u043F\u0443\u0441\u0442"), /* @__PURE__ */ import_react.default.createElement("span", null, "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0442\u043E\u0432\u0430\u0440\u044B \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430 \u0441\u043B\u0435\u0432\u0430.")),
    /* @__PURE__ */ import_react.default.createElement("hr", null),
    /* @__PURE__ */ import_react.default.createElement("div", { className: "totals" }, /* @__PURE__ */ import_react.default.createElement("p", null, /* @__PURE__ */ import_react.default.createElement("span", null, "\u041F\u043E\u0437\u0438\u0446\u0438\u0439:"), " ", /* @__PURE__ */ import_react.default.createElement("span", null, receipt.itemCount || 0, " \u0448\u0442.")), /* @__PURE__ */ import_react.default.createElement("p", null, /* @__PURE__ */ import_react.default.createElement("span", null, "\u0421\u0443\u043C\u043C\u0430:"), " ", /* @__PURE__ */ import_react.default.createElement("span", null, receipt.total || "0.00", " \u0440\u0443\u0431.")), /* @__PURE__ */ import_react.default.createElement("p", { className: "discount" }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u0421\u043A\u0438\u0434\u043A\u0430 (", receipt.discountPercent || 0, "%):"), " ", /* @__PURE__ */ import_react.default.createElement("span", null, "-", receipt.discount || "0.00", " \u0440\u0443\u0431.")), /* @__PURE__ */ import_react.default.createElement("p", { className: "final-total" }, /* @__PURE__ */ import_react.default.createElement("b", null, "\u0418\u0442\u043E\u0433\u043E:"), " ", /* @__PURE__ */ import_react.default.createElement("b", null, receipt.finalTotal || "0.00", " \u0440\u0443\u0431."))),
    /* @__PURE__ */ import_react.default.createElement("form", { className: "coupon-form", "atom-action": "POST /action/applyCoupon", "atom-target": "#receipt-container" }, /* @__PURE__ */ import_react.default.createElement("input", { type: "text", name: "coupon_code", placeholder: "\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434" }), /* @__PURE__ */ import_react.default.createElement("button", { type: "submit", className: "action-button" }, "\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C")),
    /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        id: "clear-btn",
        type: "button",
        className: "action-button danger",
        "atom-action": "POST /action/clearReceipt",
        "atom-target": "#receipt-container"
      },
      "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0447\u0435\u043A"
    ),
    /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        type: "button",
        className: "action-button",
        style: { marginTop: "10px", backgroundColor: "#e6f7ff" },
        "atom-action": "GET /action/showInfo"
      },
      "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0438\u043D\u0444\u043E (\u0422\u0435\u0441\u0442 \u041C\u043E\u0441\u0442\u0430)"
    ),
    /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        type: "button",
        className: "action-button",
        style: { marginTop: "10px" },
        "atom-action": "GET /action/open-file"
      },
      "\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0444\u0430\u0439\u043B..."
    ),
    /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        type: "button",
        className: "action-button",
        style: { marginTop: "10px" },
        "atom-action": "POST /action/saveReceipt"
      },
      "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0447\u0435\u043A \u0432 \u0444\u0430\u0439\u043B"
    )
  );
}
