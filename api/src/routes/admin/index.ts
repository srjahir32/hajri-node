import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { checkSubscription } from '../../middleware/subscription';
import { notificationRouter } from './notification.routes';
import { subscriptionRouter } from './subscription.routes';
import { businessRouter } from './business.routes';
import { dashboardRouter } from './dashboard.routes';
import { staffRouter } from './staff.routes';
import { departmentRouter } from './department.routes';
import { attendanceRouter } from './attendance.routes';
import { shiftRouter } from './shift.routes';
import { holidayRouter } from './holiday.routes';
import { leavePolicyRouter } from './leavePolicy.routes';
import { rulesRouter } from './rules.routes';
import { payrollRouter } from './payroll.routes';
import { reportRouter } from './report.routes';
import { roleRouter } from './role.routes';
import { adminUserRouter } from './adminUser.routes';
import { locationRouter } from './location.routes';
import { searchRouter } from './search.routes';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

// reachable even when the trial has expired, so the owner can subscribe
adminRouter.use('/subscriptions', subscriptionRouter);
adminRouter.use('/notifications', notificationRouter((req) => ({ userId: req.admin!.user.id })));

adminRouter.use(checkSubscription);
adminRouter.use('/', businessRouter);
adminRouter.use('/dashboard', dashboardRouter);
adminRouter.use('/staff', staffRouter);
adminRouter.use('/departments', departmentRouter);
adminRouter.use('/attendance', attendanceRouter);
adminRouter.use('/shifts', shiftRouter);
adminRouter.use('/holidays', holidayRouter);
adminRouter.use('/leave-policies', leavePolicyRouter);
adminRouter.use('/rules', rulesRouter);
adminRouter.use('/payroll', payrollRouter);
adminRouter.use('/reports', reportRouter);
adminRouter.use('/roles', roleRouter);
adminRouter.use('/admin-users', adminUserRouter);
adminRouter.use('/locations', locationRouter);
adminRouter.use('/search', searchRouter);
