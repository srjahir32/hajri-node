import { Router } from 'express';
import { authRouter } from './auth.routes';
import { adminRouter } from './admin';
import { employeeRouter } from './employee.routes';
import { superAdminRouter } from './superAdmin.routes';
import { subscriptionPublicRouter } from './admin/subscription.routes';

export const apiV1 = Router();

apiV1.get('/health', (_req, res) => res.json({ status: 1, message: 'ok', time: new Date().toISOString() }));
apiV1.use('/auth', authRouter);
apiV1.use('/admin/subscriptions', subscriptionPublicRouter); // callbacks + webhooks (no auth), registered before the guarded router
apiV1.use('/admin', adminRouter);
apiV1.use('/employee', employeeRouter);
apiV1.use('/super-admin', superAdminRouter);
