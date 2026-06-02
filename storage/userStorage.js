export async function setUserName(
    userName
) {

    await chrome.storage.local.set({
        userName
    });

}

export async function getUserName() {

    const result =
        await chrome.storage.local.get(
            'userName'
        );

    return result.userName;

}