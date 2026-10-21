// The error catalogue as Admin Tools › System shows it.
import { ERRORS, errorText as catalogueText } from "@/lib/errors/catalogue";

export const ERROR_CODES = Object.keys(ERRORS);

export function errorText(code: string): string {
    return catalogueText(code, "staff");
}
