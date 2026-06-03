import { registerPhysicalScanner } from './scanner/physicalScanner.js';
import { registerMockScanner } from './scanner/mockScanner.js';
import { registerUserSwitcher } from './listener/userSwitcher.js';
import { requireLogin } from './auth/login.js';
import { initBadge } from './init/initBadge.js';

requireLogin();
initBadge();

registerPhysicalScanner();
registerMockScanner();
registerUserSwitcher();



