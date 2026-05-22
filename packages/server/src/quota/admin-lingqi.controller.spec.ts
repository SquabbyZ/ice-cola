import { ForbiddenException } from '@nestjs/common';
import { AdminRole } from '../admin-admin/dto/invite.dto';
import { ADMIN_ROLES_KEY } from '../common/decorators/admin-roles.decorator';
import { AdminLingqiController } from './admin-lingqi.controller';
import { QuotaService } from './quota.service';

type AdminLingqiServiceFixture = jest.Mocked<Pick<QuotaService,
  | 'createAdminRedemptionCode'
  | 'listAdminRedemptionCodes'
  | 'getAdminRedemptionCode'
  | 'disableAdminRedemptionCode'
  | 'listAdminLingqiLedgerEntries'
>>;

describe('AdminLingqiController', () => {
  let controller: AdminLingqiController;
  let quotaService: AdminLingqiServiceFixture;

  beforeEach(() => {
    quotaService = {
      createAdminRedemptionCode: jest.fn(),
      listAdminRedemptionCodes: jest.fn(),
      getAdminRedemptionCode: jest.fn(),
      disableAdminRedemptionCode: jest.fn(),
      listAdminLingqiLedgerEntries: jest.fn(),
    };
    controller = new AdminLingqiController(quotaService as unknown as QuotaService);
  });

  it('creates a redemption code for the authenticated admin user', async () => {
    quotaService.createAdminRedemptionCode.mockResolvedValue({
      id: 'code-1',
      code: 'ABCD1234EFGH5678IJKL9999',
    } as Awaited<ReturnType<QuotaService['createAdminRedemptionCode']>>);

    await expect(controller.createRedemptionCode({ user: { sub: 'admin-1' } }, {
      type: 'lingqi_only',
      lingqiAmount: 1000,
    })).resolves.toEqual({
      success: true,
      data: { id: 'code-1', code: 'ABCD1234EFGH5678IJKL9999' },
    });
    expect(quotaService.createAdminRedemptionCode).toHaveBeenCalledWith('admin-1', {
      type: 'lingqi_only',
      lingqiAmount: 1000,
    });
  });

  it('lists redemption codes for the authenticated admin user', async () => {
    quotaService.listAdminRedemptionCodes.mockResolvedValue({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
    });

    await expect(controller.listRedemptionCodes({ user: { sub: 'admin-1' } }, { status: 'active' })).resolves.toEqual({
      success: true,
      data: { items: [], total: 0, limit: 50, offset: 0 },
    });
    expect(quotaService.listAdminRedemptionCodes).toHaveBeenCalledWith('admin-1', { status: 'active' });
  });

  it('gets redemption code details for the authenticated admin user', async () => {
    quotaService.getAdminRedemptionCode.mockResolvedValue({
      id: 'code-1',
      codePreview: 'ABCD...WXYZ',
    } as Awaited<ReturnType<QuotaService['getAdminRedemptionCode']>>);

    await expect(controller.getRedemptionCode('code-1', { user: { sub: 'admin-1' } })).resolves.toEqual({
      success: true,
      data: { id: 'code-1', codePreview: 'ABCD...WXYZ' },
    });
    expect(quotaService.getAdminRedemptionCode).toHaveBeenCalledWith('code-1', 'admin-1');
  });

  it('disables a redemption code for the authenticated admin user', async () => {
    quotaService.disableAdminRedemptionCode.mockResolvedValue({
      id: 'code-1',
      status: 'disabled',
    } as Awaited<ReturnType<QuotaService['disableAdminRedemptionCode']>>);

    await expect(controller.disableRedemptionCode('code-1', { user: { sub: 'admin-1' } }, {
      reason: 'mistake',
    })).resolves.toEqual({
      success: true,
      data: { id: 'code-1', status: 'disabled' },
    });
    expect(quotaService.disableAdminRedemptionCode).toHaveBeenCalledWith('code-1', 'admin-1', 'mistake');
  });

  it('lists Admin Lingqi ledger entries for an explicitly selected team', async () => {
    quotaService.listAdminLingqiLedgerEntries.mockResolvedValue({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
    });

    await expect(controller.listLedger({ teamId: 'team-1', transactionType: 'redemption_code' })).resolves.toEqual({
      success: true,
      data: { items: [], total: 0, limit: 50, offset: 0 },
    });
    expect(quotaService.listAdminLingqiLedgerEntries).toHaveBeenCalledWith('team-1', { transactionType: 'redemption_code' });
  });

  it('restricts Admin Lingqi ledger access to owners', () => {
    const roles = Reflect.getMetadata(ADMIN_ROLES_KEY, AdminLingqiController.prototype.listLedger);

    expect(roles).toEqual([AdminRole.OWNER]);
  });

  it('requires Admin Lingqi ledger team selection', async () => {
    await expect(controller.listLedger({ transactionType: 'redemption_code' })).rejects.toThrow(ForbiddenException);
    expect(quotaService.listAdminLingqiLedgerEntries).not.toHaveBeenCalled();
  });
});
