import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PushNotificationErrors } from 'src/common/constants/response.constants';

export const FIREBASE_MESSAGING = 'FIREBASE_MESSAGING';
const FIREBASE_APP_NAME = 'otlob';

export const FirebaseMessagingProvider: Provider = {
  provide: FIREBASE_MESSAGING,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const projectId = config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = config.get<string>('FIREBASE_CLIENT_EMAIL');
    const rawKey = config.get<string>('FIREBASE_PRIVATE_KEY');
    const privateKey = rawKey?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(PushNotificationErrors.MISSING_CREDENTIALS);
    }

    const existing = getApps().find((app) => app?.name === FIREBASE_APP_NAME);
    const app =
      existing ??
      initializeApp(
        {
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        },
        FIREBASE_APP_NAME,
      );

    return getMessaging(app);
  },
};
