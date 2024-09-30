import { Location } from "@/entity/Location";
import { AppDataSource } from "@/data-source";
import { Repository } from "typeorm";

export class LocationService {
    private locationRepository: Repository<Location>;

    constructor() {
        this.locationRepository = AppDataSource.getRepository(Location);
    }

    async getAllLocations(): Promise<Location[]> {
        
        return this.locationRepository.find({
            relations: ["base_item"]
        });
    }

    async getLocationById(id: number): Promise<Location | undefined> {
        return this.locationRepository.findOneOrFail({
            where: { location_id: id },
            relations: [
                "base_item",
                "base_item.inventory"
            ]
        });
    }
    
    async createLocation(locationData: Partial<Location>): Promise<Location> {
        const location = this.locationRepository.create(locationData);
        return this.locationRepository.save(location);
    }

    async updateLocation(id: number, locationData: Partial<Location>): Promise<Location | undefined> {
        const location = await this.locationRepository.findOneOrFail({ where: { location_id: id } });
        return this.locationRepository.save({ ...location, ...locationData });
    }
}
