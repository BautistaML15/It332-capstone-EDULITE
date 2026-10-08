import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

test("validated inputs reject invalid changes and block invalid form submission", async (t) => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: "http://localhost/" });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const vite = await createServer({ server: { middlewareMode: true, ws: false, hmr: false }, appType: "custom" });
  const { default: ValidatedInput } = await vite.ssrLoadModule("/src/components/ValidatedInput.jsx");
  const root = createRoot(document.getElementById("root"));
  t.after(async () => { await React.act(() => root.unmount()); await vite.close(); dom.window.close(); });
  const changed = [];
  let submitted = 0;

  function Form({ kind, initial, ...options }) {
    const [value, setValue] = React.useState(initial);
    return React.createElement("form", { onSubmit(event) { event.preventDefault(); submitted += 1; } },
      React.createElement(ValidatedInput, {
        kind, label: "Test field", value, required: true,
        onChange(event) { changed.push(event.target.value); setValue(event.target.value); }, ...options,
      }),
      React.createElement("button", { type: "submit" }, "Save"),
    );
  }
  const mount = async (kind, initial, options = {}) => {
    await React.act(() => root.render(React.createElement(Form, { key: `${kind}-${initial}`, kind, initial, ...options })));
    return document.querySelector("input");
  };
  const change = async (input, value) => {
    await React.act(() => {
      // Bypass the value tracker to simulate the browser changing an input.
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set.call(input, value);
      input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
  };
  const submit = () => React.act(() => document.querySelector("form").requestSubmit());

  await t.test("typing or pasting digits into a name preserves the valid value and shows an error", async () => {
    const input = await mount("personName", "Maria");
    changed.length = 0;
    await change(input, "Maria2");
    assert.equal(input.value, "Maria");
    assert.equal(changed.length, 0);
    assert.match(document.body.textContent, /Numbers are not allowed/);
    assert.equal(input.getAttribute("aria-invalid"), "true");
    await change(input, "123 Santos");
    assert.equal(input.value, "Maria");
    await change(input, "María O’Neill");
    assert.equal(input.value, "María O’Neill");
    assert.equal(input.getAttribute("aria-invalid"), "false");
    assert.equal(input.validationMessage, "");
  });

  await t.test("integer fields reject exponents, decimals, signs, and letters", async () => {
    const input = await mount("integer", "7", { min: 1 });
    assert.equal(input.type, "text");
    assert.equal(input.inputMode, "numeric");
    for (const invalid of ["7e2", "7.5", "-7", "7abc"]) {
      await change(input, invalid);
      assert.equal(input.value, "7");
      assert.match(document.body.textContent, /whole-number digits only/);
    }
    await change(input, "8");
    assert.equal(input.value, "8");
    assert.equal(input.validationMessage, "");
  });

  await t.test("out-of-range scores cannot submit, while zero can", async () => {
    const input = await mount("integer", "0", { min: 0, max: 50 });
    submitted = 0;
    await change(input, "51");
    assert.match(input.validationMessage, /from 0 to 50/);
    await submit();
    assert.equal(submitted, 0);
    await change(input, "0");
    assert.equal(input.validationMessage, "");
    await submit();
    assert.equal(submitted, 1);
  });

  await t.test("a changed maximum revalidates an existing score", async () => {
    const input = await mount("integer", "20", { min: 0, max: 50 });
    assert.equal(input.validationMessage, "");
    await React.act(() => root.render(React.createElement(Form, { key: "integer-20", kind: "integer", initial: "20", min: 0, max: 10 })));
    assert.match(input.validationMessage, /from 0 to 10/);
    submitted = 0;
    await submit();
    assert.equal(submitted, 0);
  });

  await t.test("required fields show an inline message when submitted empty", async () => {
    await mount("personName", "");
    submitted = 0;
    await submit();
    assert.equal(submitted, 0);
    assert.match(document.body.textContent, /Test field is required/);
  });

  await t.test("subjects allow names with numbers but reject number-only submissions", async () => {
    const input = await mount("subject", "Science 7");
    assert.equal(input.validationMessage, "");
    await change(input, "123");
    assert.match(input.validationMessage, /numbers alone are not a name/);
    submitted = 0;
    await submit();
    assert.equal(submitted, 0);
  });

  await t.test("password length errors remain inline without accepting an overlong paste", async () => {
    const input = await mount("password", "secret123", { type: "password", minLength: 6 });
    await change(input, "abc");
    assert.match(input.validationMessage, /at least 6 characters/);
    await change(input, "é".repeat(37));
    assert.equal(input.value, "abc");
    assert.match(document.body.textContent, /72 UTF-8 bytes/);
    await change(input, "secret123");
    assert.equal(input.validationMessage, "");
  });
});
