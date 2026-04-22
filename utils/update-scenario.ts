import { Scenario } from "../server/src/shared/types/game-types";
import { readFileSync, writeFileSync } from "fs";
import * as path from "path";

const readScenario = (scenarioId: string): Scenario => {
    const file = path.join(process.cwd(), `../server/data/scenarios/scenario-${scenarioId}.json`);
    const scenario = JSON.parse(readFileSync(file, 'utf8'));
    return scenario;
}

const writeScenario = (scenario: Scenario): void => {
    const dir = path.join(process.cwd(), '../server/data/scenarios');
    const baseName = `scenario-${scenario.id}`;
    const latestFile = path.join(dir, `${baseName}-updated.json`);

    writeFileSync(latestFile, JSON.stringify(scenario));
};

const main = () => {
    console.log('Reading scenario 0...');
    const scenario = readScenario('0');
    const areas = Object.values(scenario.board.areaDefinitionMap);
    areas.forEach(area => {
        area.losAreas = [];
    });
    writeScenario(scenario);
};

main();
