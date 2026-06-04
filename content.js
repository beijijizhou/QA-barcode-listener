import { registerPhysicalScanner } from './scanner/physicalScanner.js';
import { registerMockScanner } from './scanner/mockScanner.js';
import { registerUserSwitcher } from './listener/userSwitcher.js';
import { initBadge } from './init/initBadge.js';
initBadge();
registerPhysicalScanner();
registerMockScanner();
registerUserSwitcher();



