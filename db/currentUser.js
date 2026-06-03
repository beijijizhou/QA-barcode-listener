import { USERS } from '../data/users.js';


export function getCurrentUser() {
    return localStorage.getItem('currentUser');
}

export function setCurrentUser(employeeId) {

    const user = USERS.find(
        user => user.employeeId === employeeId
    );

    if (user) {
        currentUser = user;
    }
}