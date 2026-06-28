
import { USERS } from "../data/users.js";
// import  {findUser}  from "../db/userRepo.js";
import { findUser } from "../db/userRepo.js";
export async function requireLogin() {
    // let user =     {
    //     employeeId: 'EMP003',
    //     name: '1',
    //     password: '1'
    // };
    //const user = await findUser();

    let user = getCurrentUser() 
    
    if (user) {
        return user;
    }

    if (!user) {
        const name = prompt('请输入用户名');
        const password = prompt('请输入密码');
        user = { name, password };
    }
    // const testuser = 
    // console.log('User found in database:', testuser);
    const found = await findUser(user.name, user.password);
    if (!found) {
        alert('登录失败，请重试');
        localStorage.removeItem('currentUser');
        return null;
    }
    localStorage.setItem('currentUser', JSON.stringify(found));
    return found;
}

export function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return null;
    // console.log('Retrieved user from localStorage:', userStr);
    try {
        return JSON.parse(userStr);
    } catch (e) {
        console.error('Failed to parse user from localStorage', e);
        return null;
    }
}
export function logout() {
    localStorage.removeItem('currentUser');
}
