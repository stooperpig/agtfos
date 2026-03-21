import express, { Request, Response } from 'express';
import { readScenario, readScenarioList} from '../utils/file-utils';

const router = express.Router();
export default router;


//retrieve list of scenarios
router.get('/list', function (req: Request, res: Response) {
    try {
        const scenarioList = readScenarioList();
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(scenarioList.scenarios));
    } catch (error) {
        console.log(error);
        res.status(500);
        res.send({ message: 'Error: Retreiving games failed' });
    }
})

//retrieve specific map
router.get('/:scenarioId', function (req: Request, res: Response) {
    try {
        const scenarioId = req.params.scenarioId as string;

        if (scenarioId === undefined) {
            res.status(500);
            res.send({ message: 'Error: scenarioId is required part of uri' });
        } else {
            const scenario = readScenario(scenarioId);

            res.setHeader('Content-Type', 'application/json');
            res.send(scenario);
        }
    } catch (error) {
        console.log(error);
        res.status(500);
        res.send({ message: 'Error: Retreiving game failed' });
    }
});