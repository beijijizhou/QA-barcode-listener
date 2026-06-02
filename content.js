import { showActiveBadge } from './ui/badge.js';
import { registerPhysicalScanner } from './scanner/physicalScanner.js';
import { registerMockScanner } from './scanner/mockScanner.js';
import { registerUserSwitcher } from './listener/userSwitcher.js';


showActiveBadge();

registerPhysicalScanner();
registerMockScanner();
registerUserSwitcher
