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
            relations: ['exits', 'items', 'agents', 'creatureTemplates']
        });
    }

    async getLocationById(id: string): Promise<Location> {
        const location = await this.locationRepository.findOne({
            where: { locationId: id },
            relations: ['exits', 'items', 'agents', 'creatureTemplates']
        });
        if (!location) {
            throw new Error(`Location with id ${id} not found`);
        }
        return location;
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
