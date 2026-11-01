import { test } from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Checkbox } from "../src/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../src/components/ui/tabs";
import { cn } from "../src/lib/utils";

// All file-backed registry:ui entries in the official Base Nova registry.
// `form` is metadata-only; forms use the Field components and native form APIs.
const components = "accordion alert alert-dialog aspect-ratio avatar badge breadcrumb button button-group calendar card carousel chart checkbox collapsible combobox command context-menu dialog drawer dropdown-menu empty field hover-card input input-group input-otp item label menubar navigation-menu pagination popover progress radio-group resizable scroll-area select separator sheet sidebar skeleton slider sonner spinner switch table tabs textarea toast toggle toggle-group tooltip kbd native-select direction attachment bubble message-scroller questionnaire marker trace code-block message".split(" ");

test("all 64 official Base Nova component modules and configured aliases resolve", async () => {
  assert.equal(components.length, 64);
  const config = JSON.parse(await readFile("components.json", "utf8"));
  assert.equal(config.style, "base-nova");
  assert.equal(config.aliases.utils, "@/lib/utils");
  assert.equal(config.tailwind.css, "src/app/globals.css");
  for (const name of components) {
    const file = resolve(`src/components/ui/${name}.tsx`);
    await access(file);
    const componentModule = await import(pathToFileURL(file).href);
    assert.ok(Object.keys(componentModule).length > 0, `${name} must export its component API`);
  }
});

test("shared class helper retains conditional classes and caller utility overrides", () => {
  assert.equal(cn("h-8 px-2", false, { "font-medium": true }, "h-10"), "px-2 font-medium h-10");
});

test("Base UI checkbox and tabs preserve initial selection and accessible semantics during SSR", () => {
  const checkbox = renderToStaticMarkup(createElement(Checkbox, { defaultChecked: true, name: "accepted", "aria-label": "Setuju" }));
  assert.match(checkbox, /role="checkbox"/);
  assert.match(checkbox, /aria-checked="true"/);
  assert.match(checkbox, /name="accepted"/);
  const tabs = renderToStaticMarkup(createElement(Tabs, { defaultValue: "books" },
    createElement(TabsList, null,
      createElement(TabsTrigger, { value: "books" }, "Buku"),
      createElement(TabsTrigger, { value: "studio" }, "Studio")),
    createElement(TabsContent, { value: "books" }, "Daftar cerita"),
    createElement(TabsContent, { value: "studio" }, "Tentang studio")));
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /aria-selected="true"/);
  assert.match(tabs, /role="tabpanel"/);
  assert.match(tabs, /Daftar cerita/);
  assert.doesNotMatch(tabs, /Tentang studio/);
});
