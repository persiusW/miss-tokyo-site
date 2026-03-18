import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AboutSections } from "./AboutSections";
import type { AboutTimelineEntry, AboutValue, AboutTeamMember } from "@/types/settings";

export const revalidate = 60;

export const metadata: Metadata = {
    title: "About — Miss Tokyo",
    description:
        "Learn the story behind Miss Tokyo — Accra's favourite women's fashion destination. Cute, cool, and unmistakably feminine.",
};

export default async function AboutPage() {
    const { data: s } = await supabaseAdmin
        .from("site_settings")
        .select("*")
        .eq("id", "singleton")
        .single();

    const d = {
        eyebrow:        s?.about_eyebrow        ?? "Our story",
        headLine1:      s?.about_headline_line1 ?? "Born in Accra.",
        headLine2:      s?.about_headline_line2 ?? "Dressed for Everywhere.",
        p1:             s?.about_manifesto_p1   ?? "",
        p2:             s?.about_manifesto_p2   ?? "",
        p3:             s?.about_manifesto_p3   ?? "",
        stat1Value:     s?.about_stat_1_value   ?? "240+",
        stat1Label:     s?.about_stat_1_label   ?? "Styles in store",
        stat2Value:     s?.about_stat_2_value   ?? "2K+",
        stat2Label:     s?.about_stat_2_label   ?? "Happy customers",
        stat3Value:     s?.about_stat_3_value   ?? "4.9★",
        stat3Label:     s?.about_stat_3_label   ?? "Average rating",
        storyHeading:   s?.about_story_heading  ?? "The Miss Tokyo Story",
        storyP1:        s?.about_story_p1       ?? "",
        storyP2:        s?.about_story_p2       ?? "",
        quoteText:      s?.about_quote_text     ?? "",
        quoteAuthor:    s?.about_quote_author   ?? "Miss Tokyo Team",
        timeline:       (s?.about_timeline      ?? []) as AboutTimelineEntry[],
        values:         (s?.about_values        ?? []) as AboutValue[],
        team:           (s?.about_team          ?? []) as AboutTeamMember[],
        ctaEyebrow:     s?.about_cta_eyebrow    ?? "Ready to shop?",
        ctaHeadline:    s?.about_cta_headline   ?? "Start Your Miss Tokyo Journey",
        ctaBody:        s?.about_cta_body       ?? "",
        ctaBtnLabel:    s?.about_cta_btn_label  ?? "Shop Now",
        ctaBtnUrl:      s?.about_cta_btn_url    ?? "/shop",
    };

    return <AboutSections {...d} />;
}
