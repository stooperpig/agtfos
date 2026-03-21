import { Colony, ColonyProductionMap, Player, PlayerTechnologies, Production, SpentProductionMap, SpentProductionType, TechnologyResearchMap } from "../../../../shared/types/game-types";
import { calculatedEmigratingOrMigratingPopulation, calculatePropulationIncrement } from "../../../../shared/utils/colony-utils";
// import { getIuRatio } from "../../../../shared/utils/player-utils";
// import { getResearch } from "../modal/production-modal/production-modal";
// import { calculateResearchBalance } from "../modal/production-modal/technology-panel";

// export const areColonyProductionsValid = (colonies: Colony[], playerTechnologies: PlayerTechnologies, colonyProductionMap: ColonyProductionMap, technologyResearchMap: TechnologyResearchMap, player: Player): string[] => {
//     const messages: string[] = [];

//     const technicalTechnologies = [...playerTechnologies.technical];
//     if (technologyResearchMap[SpentProductionType.technologyResearch]) {
//         technicalTechnologies.push(...technologyResearchMap[SpentProductionType.technologyResearch].map(technology => technology.symbol));
//     }

//     const weaponSystemTechnologies = [...playerTechnologies.weaponSystems];
//     if (technologyResearchMap[SpentProductionType.weaponsResearch]) {
//         weaponSystemTechnologies.push(...technologyResearchMap[SpentProductionType.weaponsResearch].map(technology => technology.symbol));
//     }

//     const colonyIds = Object.keys(colonyProductionMap);
//     colonyIds.forEach(colonyId => {
//         const colony = colonies.find(colony => colony.id === colonyId);
//         if (colony) {
//             const spentProduction = colonyProductionMap[colonyId];
//             messages.push(...isColonyProductionValid(colony, spentProduction, technicalTechnologies, weaponSystemTechnologies, player));
//         }
//     });


//     return messages;
// }

export const areResearchBalancesValid = (playerTechnologies: PlayerTechnologies, production: Production): string[] => {
    if (isResearchBalanceValid(SpentProductionType.movementResearch, production.technologyResearchMap, production.colonyProductionMap, playerTechnologies) &&
        isResearchBalanceValid(SpentProductionType.weaponsResearch, production.technologyResearchMap, production.colonyProductionMap, playerTechnologies) &&
        isResearchBalanceValid(SpentProductionType.technologyResearch, production.technologyResearchMap, production.colonyProductionMap, playerTechnologies)) {
        return [];
    }
    else {
        return ["You have negative research balances"]
    }
}

export const isColonyProductionValid = (colony: Colony, spentProductionMap: SpentProductionMap, technicalResearch: string[], weaponSystemResearch: string[], player: Player): string[] => {
    const messages: string[] = [];

    if (spentProductionMap[SpentProductionType.colonyTransportsWithCet] && spentProductionMap[SpentProductionType.colonyTransportsWithCet] > 0 && !technicalResearch.includes("CET")) {
        messages.push("Can not build CT/CET without CET technology");
    }

    if (spentProductionMap[SpentProductionType.attackShips] && spentProductionMap[SpentProductionType.attackShips] > 0 && !weaponSystemResearch.includes("ATK")) {
        messages.push("Can not build ATKs without ATK technology");
    }

    if (spentProductionMap[SpentProductionType.dreadnaughts] && spentProductionMap[SpentProductionType.dreadnaughts] > 0 && !weaponSystemResearch.includes("DN")) {
        messages.push("Can not build DNs without DN technology");
    }

    if (spentProductionMap[SpentProductionType.missileBases] && spentProductionMap[SpentProductionType.missileBases] > 0 && !weaponSystemResearch.includes("MB")) {
        messages.push("Can not build MBs without MB technology");
    }

    if (spentProductionMap[SpentProductionType.advancedMissileBases] && spentProductionMap[SpentProductionType.advancedMissileBases] > 0 && !weaponSystemResearch.includes("AMB")) {
        messages.push("Can not build AMBs without AMB technology");
    }

    if (spentProductionMap[SpentProductionType.planetaryForceScreen] && spentProductionMap[SpentProductionType.planetaryForceScreen] > 0 && !weaponSystemResearch.includes("PFS")) {
        messages.push("Can not build PFS without PFS technology");
    }

    if (spentProductionMap[SpentProductionType.industrialUnits] && spentProductionMap[SpentProductionType.industrialUnits] > 0) {
        const iuRatio = 1; //getIuRatio(player, technicalResearch);
        if (iuRatio === 1) {
            messages.push("Can not build IU without IIT or AIT technology");
        }

        const startingIu = colony.industrialUnits;
        const startingPopulation = colony.population;
        const industrialUnits = spentProductionMap[SpentProductionType.industrialUnits]
        const colonyTransports = spentProductionMap[SpentProductionType.colonyTransports];
        const colonyTransportsWithCet = spentProductionMap[SpentProductionType.colonyTransportsWithCet];
        const emigrationOrMigrationPopulation = calculatedEmigratingOrMigratingPopulation(colony, colonyTransports + colonyTransportsWithCet);
        const growth = calculatePropulationIncrement(colony);
        const newPopulation = Math.min(colony.maxPopulation, startingPopulation + growth - emigrationOrMigrationPopulation);
        const newIu = startingIu + industrialUnits + growth - emigrationOrMigrationPopulation;
        if (newIu > newPopulation * iuRatio) {
            messages.push(`Colony ${colony.id} IU limits ${newIu} > ${newPopulation * iuRatio}`);
        }
    }

    if (spentProductionMap[SpentProductionType.roboticIndustrialUnits] && spentProductionMap[SpentProductionType.roboticIndustrialUnits] > 0 && !technicalResearch.includes("RIU")) {
        messages.push("Can not build RIUs without RIU technology");
    }

    return messages;
}

export const isResearchBalanceValid = (researchType: SpentProductionType, technologyResearchMap: TechnologyResearchMap, colonyProductionMap: ColonyProductionMap, playerTechnologies: PlayerTechnologies): boolean => {
    //const researchBalance = getResearch(SpentProductionType.movementResearch, colonyProductionMap);
    //const updatedResearchBalance = calculateResearchBalance(SpentProductionType.movementResearch, researchBalance, technologyResearchMap[SpentProductionType.movementResearch] || [], playerTechnologies);
    return true; //updatedResearchBalance >= 0;
}