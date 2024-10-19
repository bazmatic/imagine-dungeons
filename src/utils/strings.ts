export function startsWithVowel(word: string): boolean {
    return ["a", "e", "i", "o", "u"].includes(word[0].toLowerCase());
}

export function generateId(): string {
    return 'xxxxxxxxxxxx'.replace(/[x]/g, function() {
        return (Math.random() * 36 | 0).toString(36);
    });
}

