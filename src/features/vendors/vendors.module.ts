import { Module } from '@nestjs/common';

import { VendorVerticalsController } from './verticals/vendor-verticals.controller';
import { VendorsController } from './vendors.controller';
import { VendorMembersController } from './members/vendor-members.controller';
import { VendorBranchesController } from './branches/vendor-branches.controller';
import { VendorWalletController } from './wallet/vendor-wallet.controller';
import { MenuCategoriesController } from './menu/menu-categories.controller';
import { ProductsController } from './products/products.controller';

import { VendorVerticalsService } from './verticals/vendor-verticals.service';
import { VendorsService } from './vendors.service';
import { VendorMembersService } from './members/vendor-members.service';
import { VendorBranchesService } from './branches/vendor-branches.service';
import { VendorWalletService } from './wallet/vendor-wallet.service';
import { MenuCategoriesService } from './menu/menu-categories.service';
import { ProductsService } from './products/products.service';

import { VendorMemberGuard } from 'src/common/guards/vendor-member.guard';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';

@Module({
  imports: [PlatformSettingsModule],
  controllers: [
    VendorVerticalsController,
    VendorsController,
    VendorMembersController,
    VendorBranchesController,
    VendorWalletController,
    MenuCategoriesController,
    ProductsController,
  ],
  providers: [
    VendorVerticalsService,
    VendorsService,
    VendorMembersService,
    VendorBranchesService,
    VendorWalletService,
    MenuCategoriesService,
    ProductsService,
    VendorMemberGuard,
  ],
  exports: [
    VendorsService,
    VendorMembersService,
    VendorBranchesService,
    VendorWalletService,
    MenuCategoriesService,
    ProductsService,
  ],
})
export class VendorsModule {}
