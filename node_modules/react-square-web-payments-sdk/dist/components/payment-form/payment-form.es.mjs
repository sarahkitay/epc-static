import * as r from "react";
import d from "../../contexts/form/form.es.mjs";
function i({
  applicationId: e,
  cardTokenizeResponseReceived: t,
  locationId: o,
  children: m,
  formProps: a = {
    "aria-label": "Payment form",
    id: "rswps-form"
  },
  overrides: n,
  ...f
}, s) {
  return /* @__PURE__ */ r.createElement(
    d,
    {
      ...f,
      applicationId: e,
      cardTokenizeResponseReceived: t,
      locationId: o,
      overrides: n
    },
    /* @__PURE__ */ r.createElement("div", { "data-testid": "rswps-form", ...a, ref: s, role: "form" }, m)
  );
}
const c = r.forwardRef(i), p = c;
export {
  p as default
};
//# sourceMappingURL=payment-form.es.mjs.map
