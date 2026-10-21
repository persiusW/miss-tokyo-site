import { test, expect } from "@playwright/test";
import { WORDING, wordingNote, wordingText } from "../../../src/lib/content/wording";

// Shop wording: saved text, else the original the page always showed.

test("wording: saved text, else the original; old wording says where it's edited now", () => {
    expect(wordingText({}, "craft_heritage_heading")).toBe("The Name Is Personal");
    expect(wordingText({ craft_heritage_heading: "" }, "craft_heritage_heading")).toBe("The Name Is Personal");
    expect(wordingText({ craft_heritage_heading: "Ours" }, "craft_heritage_heading")).toBe("Ours");
    expect(wordingNote("craft_heritage_body")).toBeNull();
    expect(wordingNote("hero_title")).toMatch(/Hero slides/);
    expect(wordingNote("about_founder_p1")).toMatch(/Pages › About/);
    expect(wordingNote("something_else")).toMatch(/No shop page/);
    // Every piece of wording names the page that shows it, so a save refreshes it.
    for (const w of WORDING) expect(w.path).toMatch(/^\//);
});
