import { Global, Module, DynamicModule, Provider } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';
import { QUEUES } from '../queue/queues.constants';

@Global()
@Module({})
export class MailModule {
  static register({
    enableWorker = false,
  }: {
    enableWorker: boolean;
  }): DynamicModule {
    const providers: Provider[] = [MailService];

    if (enableWorker) {
      providers.push(MailProcessor);
    }

    return {
      module: MailModule,
      imports: [],
      providers: providers,
      exports: [MailService],
    };
  }
}
