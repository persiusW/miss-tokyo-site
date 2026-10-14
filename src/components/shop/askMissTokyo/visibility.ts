// Pages where Ask Miss Tokyo stays out of the way: paying and account set-up.
const HIDDEN = ["/checkout", "/pay", "/gift-cards/success", "/auth", "/reset-password", "/claim-account"];

export function widgetHiddenOn(pathname: string): boolean {
    return HIDDEN.some(p => pathname === p || pathname.startsWith(`${p}/`));
}
