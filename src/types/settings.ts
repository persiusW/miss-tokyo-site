export interface TrustBarItem {
  id: string;
  text: string;
  enabled: boolean;
}

export interface SiteSettings {
  id: string;
  store_name: string;
  store_tagline: string | null;
  store_description: string | null;
  store_email: string | null;
  store_phone: string | null;
  store_address: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  social_facebook: string | null;
  social_twitter: string | null;
  social_pinterest: string | null;
  social_youtube: string | null;
  social_snapchat: string | null;
  social_threads: string | null;
  instagram_access_token: string | null;
  welcome_coupon_enabled: boolean;
  welcome_coupon_percentage: number;
  welcome_coupon_code: string;
  trust_bar_enabled: boolean;
  trust_bar_items: TrustBarItem[];
  nav_show_home: boolean;
  nav_show_shop: boolean;
  nav_show_new_arrivals: boolean;
  nav_show_gift_card: boolean;
  nav_show_contact: boolean;
  nav_show_about: boolean;
  homepage_new_arrivals_category_id: string | null;
  homepage_new_arrivals_title: string;
  homepage_new_arrivals_limit: number;
  optin_section_enabled: boolean;
  optin_title: string;
  optin_subtitle: string;
  pickup_enabled: boolean;
  pickup_instructions: string;
  pickup_address: string | null;
  pickup_contact_phone: string | null;
  pickup_estimated_wait: string;
  hours_weekday: string;
  hours_saturday: string;
  hours_sunday: string;
  hours_note: string;
  // About page
  about_eyebrow: string;
  about_headline_line1: string;
  about_headline_line2: string;
  about_manifesto_p1: string;
  about_manifesto_p2: string;
  about_manifesto_p3: string;
  about_stat_1_value: string;
  about_stat_1_label: string;
  about_stat_2_value: string;
  about_stat_2_label: string;
  about_stat_3_value: string;
  about_stat_3_label: string;
  about_story_heading: string;
  about_story_p1: string;
  about_story_p2: string;
  about_quote_text: string;
  about_quote_author: string;
  about_timeline: AboutTimelineEntry[];
  about_values: AboutValue[];
  about_team: AboutTeamMember[];
  about_cta_eyebrow: string;
  about_cta_headline: string;
  about_cta_body: string;
  about_cta_btn_label: string;
  about_cta_btn_url: string;
  // Gift cards
  gc_enabled: boolean;
  gc_min_amount: number;
  gc_max_amount: number;
  gc_preset_amounts: number[];
  gc_never_expires: boolean;
  gc_validity_days: number;
  gc_delivery_note: string;
  updated_at: string;
}

export interface HeroSlide {
  id: string;
  position: number;
  enabled: boolean;
  eyebrow: string | null;
  headline_line1: string;
  headline_line2: string | null;
  headline_line3: string | null;
  body_text: string | null;
  cta_primary_label: string;
  cta_primary_url: string;
  cta_secondary_label: string | null;
  cta_secondary_url: string | null;
  image_url: string | null;
  image_storage_path: string | null;
  overlay_opacity: number;
}

export interface FeaturedCategory {
  id: string;
  position: number;
  category_id: string;
  custom_label: string | null;
  custom_image_url: string | null;
  item_count_override: number | null;
  enabled: boolean;
  category: {
    name: string;
    slug: string;
    image_url: string | null;
  } | null;
}

export interface AboutTimelineEntry {
  year: string;
  title: string;
  body: string;
}

export interface AboutValue {
  icon: string;
  title: string;
  body: string;
}

export interface AboutTeamMember {
  name: string;
  role: string;
  bio: string;
  avatar_color: string;
  photo_url?: string;
}

export interface HomepageReview {
  id: string;
  position: number;
  enabled: boolean;
  reviewer_name: string;
  reviewer_location: string | null;
  avatar_initials: string;
  avatar_color: string;
  star_rating: number;
  review_text: string;
}
