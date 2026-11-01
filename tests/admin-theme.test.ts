import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

test("global Tailwind compilation emits admin semantic colors and solid surface tokens", async () => {
  const from = resolve("src/app/globals.css");
  const result = await postcss([tailwindcss({ optimize: false })]).process(await readFile(from, "utf8"), { from });
  function hasDeclaration(selector: string, property: string, value: string) {
    let found = false;
    result.root.walkRules(rule => {
      if (!rule.selectors.includes(selector)) return;
      rule.walkDecls(property, declaration => { if (declaration.value === value) found = true; });
    });
    assert.ok(found, `${selector} must emit ${property}: ${value}`);
  }
  for (const [selector, token] of [[".bg-card", "card"], [".bg-sidebar", "sidebar"], [".bg-primary", "primary"], [".bg-muted", "muted"]]) {
    hasDeclaration(selector, "background-color", `var(--${token})`);
  }
  hasDeclaration(".text-primary-foreground", "color", "var(--primary-foreground)");
  hasDeclaration(".bg-popover", "background-color", "var(--popover)");
  hasDeclaration(".border-border", "border-color", "var(--border)");
  hasDeclaration(":root", "--public-muted", "#8d776a");
  hasDeclaration(":root", "--muted", "#f5ede1");
  hasDeclaration(":root", "--popover", "#ffffff");
  hasDeclaration(":root", "--primary", "#392820");
  hasDeclaration(".page-heading p", "color", "var(--public-muted)");
  hasDeclaration(".character-info p", "color", "var(--public-muted)");
  hasDeclaration(".school-admin", "--card", "#ffffff");
  hasDeclaration(".school-admin", "--sidebar", "#ffffff");
  hasDeclaration(".school-admin", "--background", "#f7f4ee");
  hasDeclaration(".school-admin", "--primary", "var(--ink)");
  hasDeclaration(".school-admin .admin-drawer[hidden]", "display", "none");
  hasDeclaration(".school-admin .admin-backdrop[hidden]", "display", "none");
  hasDeclaration(".school-admin .book-editor .admin-form-field img.book-cover-preview", "aspect-ratio", "1/1");
  hasDeclaration(".school-admin .book-editor .admin-form-field img.book-cover-preview", "object-fit", "contain");
  hasDeclaration(".school-admin .book-editor .admin-form-field img.book-cover-preview", "max-width", "min(100%,18rem)");
  // The combobox highlighted-item rule recolors every descendant. A checked
  // category's indicator must retain its contrasting foreground instead.
  let protectedCheckmark = false;
  result.root.walkRules(rule => {
    if (!rule.selector.includes("text-primary-foreground\\!")) return;
    rule.walkDecls("color", declaration => {
      if (declaration.value === "var(--primary-foreground)" && declaration.important) protectedCheckmark = true;
    });
  });
  assert.ok(protectedCheckmark, "category checkmark must emit an important contrasting color");
  // A plain h-10 must not lose to a more specific 32px Select size variant.
  for (const size of ["default", "sm"]) {
    let heightEmitted = false;
    result.root.walkRules(rule => {
      if (!rule.selector.includes(`data-\\[size\\=${size}\\]\\:h-10`)) return;
      rule.walkDecls("height", declaration => {
        if (declaration.value === "calc(var(--spacing) * 10)") heightEmitted = true;
      });
    });
    assert.ok(heightEmitted, `Select ${size} variant must emit the 40px height utility`);
  }
  assert.doesNotMatch(result.css, /revert-layer/);
});
