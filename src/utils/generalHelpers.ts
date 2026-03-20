export const getTimeSlot = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours}:${minutes}`;
}


export enum DATE_FORMAT {
    ISO = 'ISO',
    DATE = 'DATE',
    TIME = 'TIME',
    TIME_WITH_Z = 'TIME_WITH_Z',
    FORMAT_TIME = 'FORMAT_TIME',
}

export const dateHelper = {
    getDate: (date: Date): string => {
        return date.toISOString().split('T')[0];
    },
    getTimeWithZ: (date: Date): string => {
        return date.toISOString().split('T')[1];
    },
    getTime: (date: Date): string => {
        return date.toISOString().split('T')[1].split('.')[0];
    },
    formatHoursAndMinutes: (date: Date): string => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        return `${hours}:${minutes}`;
    },
    today: (time: boolean = false): Date => {
        const d = new Date();
        if (!time) d.setHours(0, 0, 0, 0);
        return d;
    },
    tomorrow: (time: boolean = false): Date => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        if (!time) d.setHours(0, 0, 0, 0);
        return d;
    },
    yesterday: (time: boolean = false): Date => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        if (!time) d.setHours(0, 0, 0, 0);
        return d;
    },
    addHours: (date: Date, hours: number): Date => {
        const d = new Date(date);
        d.setHours(d.getHours() + hours);
        return d;
    },
    addDays: (date: Date, days: number): Date => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    },
}
