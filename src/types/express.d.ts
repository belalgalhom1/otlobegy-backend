import { JwtAccessPayload } from '../common/interfaces/jwt-payload.interface';
import { VendorMemberRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: JwtAccessPayload;
      vendorMemberRole?: VendorMemberRole;
    }
  }
}
