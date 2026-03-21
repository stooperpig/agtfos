//module contains function that rely on random number generation like dice.

export const roll6SidedDie = (): number => {
    return Math.floor(Math.random() * 6) + 1;
}

export const rollXSidedDie = (x: number): number => {
    return Math.floor(Math.random() * x) + 1;
}

export const getRandomIndex = (max: number): number => {
    return Math.floor(Math.random() * max);
}

export const getRandomIntInclusive = (min: number, max: number): number => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export const shuffleArray = <T>(array: T[]): T[] => {
    const result = [...array]; // make a copy to avoid mutating original
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]]; // swap
    }
    return result;
}

export type WeightedOption<T> = {
    weight: number; // weight (does NOT have to sum to 1)
    value: T;
};

export function pickWeightedRandom<T>(options: WeightedOption<T>[]): T {
    const totalWeight = options.reduce(
        (sum, opt) => sum + opt.weight,
        0
    );

    if (totalWeight <= 0) {
        throw new Error('Total weight must be > 0');
    }

    let r = Math.random() * totalWeight;

    for (const opt of options) {
        r -= opt.weight;
        if (r <= 0) {
            return opt.value;
        }
    }

    // Fallback (floating-point safety)
    return options[options.length - 1].value;
}


export function weightedShuffle<T>(options: WeightedOption<T>[]): T[] {
    return options
        .map(opt => ({
            value: opt.value,
            // Key formula: higher probability => higher expected key
            key: Math.pow(Math.random(), 1 / opt.weight)
        }))
        .sort((a, b) => b.key - a.key)
        .map(item => item.value);
}