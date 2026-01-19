
/**
 * Formats a given timestamp or date into 'YYYY-MM-DD' string
 * strictly using 'Asia/Jakarta' (WIB) timezone.
 * 
 * This prevents the "Yesterday" bug where early morning transactions (00:00 - 07:00 WIB)
 * are calculated as the previous day in UTC.
 */
export function formatDateToWIB(dateInput: number | Date | string): string {
    const date = new Date(dateInput);
    return date.toLocaleDateString('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}
