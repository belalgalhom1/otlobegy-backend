import { Global, Module } from '@nestjs/common';
import { LocationRepository } from './location.repository';

@Global()
@Module({
  providers: [LocationRepository],
  exports: [LocationRepository],
})
export class LocationModule {}
