import { getData } from './api-utils';

export const getTaskForceMovements = async (gameId: string, playerId: string): Promise<Record<string, string>> => {
    const url = `/api/games/${gameId}/player/${playerId}/task-force-movements`;
    const response = await getData<{ success: boolean; taskForceAssignments: Record<string, string> }>(url);
    return response.taskForceAssignments;
};
