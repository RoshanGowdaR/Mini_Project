import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export async function parseJsonSafely(response, fallback = {}) {
    try {
        return await response.json();
    } catch {
        return fallback;
    }
}
