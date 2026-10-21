// Kill switches for the inbox's teaching and composer (same names as GlowBook's
// flags). On unless set to "off"; read on the server.
const on = (v: string | undefined) => (v ?? "").trim().toLowerCase() !== "off";

/** Correct, Tell the assistant, and the Teach page. */
export const teachOn = () => on(process.env.WHATSAPP_TEACH);
/** Reply myself from the inbox. */
export const composerOn = () => on(process.env.WHATSAPP_INBOX_COMPOSER);
