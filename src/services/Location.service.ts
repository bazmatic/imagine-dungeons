import { Location } from "@/entity/Location";
import { AppDataSource } from "@/data-source";
import { Repository } from "typeorm";

export class LocationService {
    private locationRepository: Repository<Location>;

    constructor() {
        this.locationRepository = AppDataSource.getRepository(Location);
    }

    async getAllLocations(): Promise<Location[]> {
        
        const locations = await this.locationRepository.find({
            relations: [
                "exits"
            ]
        });
        return locations;  
    }

    async getLocationById(id: string): Promise<Location> {
        return this.locationRepository.findOneOrFail({
            where: { locationId: id },
            // relations: [

            // ]
        });
    }
    
    async createLocation(locationData: Partial<Location>): Promise<Location> {
        const location = this.locationRepository.create(locationData);
        return this.locationRepository.save(location);
    }

    async updateLocation(id: string, locationData: Partial<Location>): Promise<Location | undefined> {
        const location = await this.locationRepository.findOneOrFail({ where: { locationId: id } });
        return this.locationRepository.save({ ...location, ...locationData });
    }
}
