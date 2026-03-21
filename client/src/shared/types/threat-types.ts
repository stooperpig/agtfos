export interface Edge {
    starId: string
    distance: number
}

export interface ThreatGraph {
    [key: string]: StarNode
}

export interface StarNode {
    starId: string
    edges: Edge[]
    colonyStrength: number
    colonyThreat: number
    localThreat: number
    localStrength: number
    remoteThreat: number
    remoteStrength: number
    localThreatRawShipAverage: number
    localThreatShipCount: number
}