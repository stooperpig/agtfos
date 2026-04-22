import { writeFileSync } from "fs"

function rollDice(n: number): number {
    let sum = 0
    for (let i = 0; i < n; i++) {
        sum += 1 + Math.floor(Math.random() * 6)
    }
    return sum
}

function estimate(
    nDice: number,
    target: number,
    trials: number
): number {
    let success = 0

    for (let i = 0; i < trials; i++) {
        if (rollDice(nDice) >= target) {
            success++
        }
    }

    return success / trials
}

function buildDiceTable(
    probability: number,
    maxTarget = 32,
    maxDice = 30,
    trials = 20000
) {
    const table: Record<number, number> = {}

    for (let target = 1; target <= maxTarget; target++) {
        let best = maxDice

        for (let n = 1; n <= maxDice; n++) {
            const p = estimate(n, target, trials)

            if (p >= probability) {
                best = n
                break
            }
        }

        table[target] = best
    }

    return table
}

function writeTable(percentage: number) {
    const table = buildDiceTable(percentage)

    writeFileSync(
        `./dice-table-${percentage}.json`,
        JSON.stringify(table, null, 2)
    )
}

writeTable(.5);
writeTable(.6);
writeTable(.75);
writeTable(.80);
writeTable(.90);
