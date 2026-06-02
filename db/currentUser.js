import { USERS } from '../data/users.js';

let currentUser = USERS[0]; // 吴雪珍 by default

export function getCurrentUser() {
    return currentUser;
}

export function setCurrentUser(employeeId) {

    const user = USERS.find(
        user => user.employeeId === employeeId
    );

    if (user) {
        currentUser = user;
    }
}