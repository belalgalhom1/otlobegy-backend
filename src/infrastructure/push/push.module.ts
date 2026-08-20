import { Global, Module, DynamicModule, Provider } from '@nestjs/common';

import { FirebaseMessagingProvider } from './firebase.provider';
import { PushService } from './push.service';
import { PushProcessor } from './push.processor';

@Global()
@Module({})
export class PushModule {
  static register({
    enableWorker = false,
  }: {
    enableWorker?: boolean;
  }): DynamicModule {
    const providers: Provider[] = [PushService];

    if (enableWorker) {
      providers.push(FirebaseMessagingProvider, PushProcessor);
    }

    return {
      module: PushModule,
      imports: [],
      providers,
      exports: [PushService],
    };
  }
}
