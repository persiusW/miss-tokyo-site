-- Optional WhatsApp numbers on a gift card, so the card and the buyer's
-- confirmation can go on WhatsApp beside the emails (templates
-- miss_tokyo_gift_card_ready / _from_sender / _sent). Stored as 233… digits
-- (lib/phone normaliseOrderPhone). Blank = email only, as before. Additive.
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS sender_phone text;
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS recipient_phone text;

COMMENT ON COLUMN public.gift_cards.sender_phone IS 'Buyer''s WhatsApp number (233…), optional; gets the card (kept for themselves) or a sent confirmation';
COMMENT ON COLUMN public.gift_cards.recipient_phone IS 'Recipient''s WhatsApp number (233…), optional; gets the card on WhatsApp';
