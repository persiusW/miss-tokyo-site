// Calm denial bodies shared by the Miss Tokyo AI routes.
export const DENIED = {
    401: { error: "Please sign in again." },
    403: { error: "You don't have access to this." },
} as const;

export const CALM_ERROR = { error: "Something happened. Please try again shortly." } as const;
