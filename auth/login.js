
import { USERS } from "../data/users";
export function requireLogin() {
    let user =     {
        employeeId: 'EMP003',
        name: '1',
        password: '1'
    };
    // let user = getCurrentUser() 
    if (!user) {
        const name = prompt('请输入用户名');
        const password = prompt('请输入密码');
        user = { name, password };
    }
    const found = USERS.find(
        u => u.name === user.name && u.password === user.password
    );
    if (!found) {
        alert('登录失败，请重试');
        localStorage.removeItem('currentUser');
        return requireLogin();
    }
    localStorage.setItem('currentUser', JSON.stringify(found));
    return found;
}

export function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        console.error('Failed to parse user from localStorage', e);
        return null;
    }
}