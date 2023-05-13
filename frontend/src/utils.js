
export const getDateAsString = (date) => {
    const dateStr = `${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getMonth()+1).padStart(2, '0')}-${date.getFullYear()}`
    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

    return `${dateStr} ${timeStr}`
}