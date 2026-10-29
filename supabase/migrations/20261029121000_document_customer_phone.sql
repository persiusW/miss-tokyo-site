-- Optional customer WhatsApp number on an invoice or pay link, so it can be
-- sent on WhatsApp (template miss_tokyo_document_ready) as well as by email.
-- Stored as 233… digits (lib/phone normaliseOrderPhone). Additive.
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS customer_phone text;

COMMENT ON COLUMN public.documents.customer_phone IS 'Customer''s WhatsApp number (233…), optional; invoices and pay links can be sent there';
