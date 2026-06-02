import { USERS }
from '../data/users.js';

import { setCurrentUser }
from '../db/currentUser.js';

export function registerUserSwitcher() {

    window.addEventListener(
        'keydown',
        event => {

            if (
                event.ctrlKey &&
                event.shiftKey &&
                event.key === '1'
            ) {

                setCurrentUser(
                    'EMP001'
                );

                console.log(
                    'Current user:',
                    USERS[0].name
                );
            }

            if (
                event.ctrlKey &&
                event.shiftKey &&
                event.key === '2'
            ) {

                setCurrentUser(
                    'EMP002'
                );

                console.log(
                    'Current user:',
                    USERS[1].name
                );
            }
        }
    );
}