
import { USERS } from "../data/users.js";
// import  {findUser}  from "../db/userRepo.js";
import { findUser } from "../db/userRepo.js";
import {
    getCurrentUserFromPage,
    getSharedCurrentUser,
    setSharedCurrentUser
} from "../storage/sharedState.js";
export async function requireLogin() {
    // let user =     {
    //     employeeId: 'EMP003',
    //     name: '1',
    //     password: '1'
    // };
    //const user = await findUser();

    let user = await getSharedCurrentUser() 
    
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
        await setSharedCurrentUser(null);
        return null;
    }
    await setSharedCurrentUser(found);
    return found;
}

export function getCurrentUser() {
    return getCurrentUserFromPage();
}
export async function logout() {
    await setSharedCurrentUser(null);
}
