import { test, expect } from "@playwright/test";
import { parseReviewsSource, reviewSummary } from "../../../src/lib/content/homeSections";
import { isConfigCopyKey } from "../../../src/lib/content/wording";

// Which reviews the home page shows; the widget unless the team chooses its own.

test("reviews: the widget unless 'own' is chosen; the average comes from the reviews shown", () => {
    expect(parseReviewsSource(undefined)).toBe("widget");
    expect(parseReviewsSource("widget")).toBe("widget");
    expect(parseReviewsSource("Own")).toBe("widget");
    expect(parseReviewsSource(" own ")).toBe("own");
    expect(reviewSummary([])).toBeNull();
    expect(reviewSummary([5, 5, 4])).toEqual({ average: "4.7", count: 3 });
    expect(reviewSummary([5, 0, 9, Number.NaN])).toEqual({ average: "5.0", count: 1 });
    // The choice is a setting, never listed as shop wording.
    expect(isConfigCopyKey("homepage_reviews_source")).toBe(true);
});
