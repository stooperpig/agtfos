export const one = .75 / 6.0;
export const two = 1.75 / 6.0;
export const three = 2.75 / 6.0;
export const four = 3.75 / 6.0;
export const five = 4.75 / 6.0;
export const six = 5.75 / 6.0;

export const RandomGenerator = {
    random: Math.random
};

export const roll6SidedDie = (): number => {
    return Math.floor(RandomGenerator.random() * 6) + 1;
};

export const pickRandom = (max: number): number => {
    return Math.floor(RandomGenerator.random() * max) + 1;
};

// export const rollWhiteDie = (): number => {
//     switch (roll6SidedDie()) {
//         case 1:
//         case 2:
//             return 0;
//         case 3:
//             return 1;
//         case 4:
//             return 2;
//         case 5:
//             return 3;
//         case 6:
//             return 4;
//         default:
//             return -1;
//     }
// };

// export const rollRedDie = (): number => {
//     switch (roll6SidedDie()) {
//         case 1:
//         case 2:
//         case 3:
//             return 1;
//         case 4:
//         case 5:
//             return 2;
//         case 6:
//             return 3;
//         default:
//             return -1;
//     }
// };

// export const rollGreenDie = (): number => {
//     switch (roll6SidedDie()) {
//         case 1:
//         case 2:
//         case 3:
//         case 4:
//             return 0;
//         case 5:
//             return 1;
//         case 6:
//             return 2;
//         default:
//             return -1;
//     }
// };

// export const rollBlackAndWhiteDie = (): string => {
//     return rollBlackDie() + '' + (rollWhiteDie() + rollWhiteDie());
// }

// export const rollRedAndGreenDie = (): string => {
//     return rollGreenDie() + rollRedDie() + '';
// }

// export const pickRandom = (number: number): number => {
//     return Math.floor(RandomGenerator.random() * number);
// };