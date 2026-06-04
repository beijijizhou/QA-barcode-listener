import { registerPhysicalScanner } from './scanner/physicalScanner.js';
import { registerMockScanner } from './scanner/mockScanner.js';
import { registerUserSwitcher } from './listener/userSwitcher.js';
import { showActiveBadge } from './ui/badge.js';
showActiveBadge();

registerPhysicalScanner();
registerMockScanner();
registerUserSwitcher();



