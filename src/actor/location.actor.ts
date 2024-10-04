import { Agent } from "@/entity/Agent";
import { Location } from "@/entity/Location";
import { AgentService } from "@/services/Agent.service";
import { LocationService } from "@/services/Location.service";

export class LocationActor {
    private locationService: LocationService;
    private agentService: AgentService;

    constructor (public locationId: string, public agentId: string) {
        this.locationService = new LocationService();
        this.agentService = new AgentService();
    }

    public async location(): Promise<Location> {
        return this.locationService.getLocationById(this.locationId);
    }

    public async agent(): Promise<Agent> {
        return this.agentService.getAgentById(this.agentId);
    }


}
